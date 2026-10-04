import QrScanner from 'qr-scanner';

let stream=null;
let detector=null;
let scanner=null;
let zxingControls=null;
let raf=0;
let videoRef=null;
let settled=false;

async function deliver(onResult,result){
  if(settled)return;
  settled=true;
  await stopScanner();
  onResult(result);
}

export async function startScanner(video,onResult,onError=console.error){
  await stopScanner();
  videoRef=video;
  settled=false;
  try{
    if('BarcodeDetector' in globalThis){
      stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
      video.srcObject=stream;
      await video.play();
      const supported=await BarcodeDetector.getSupportedFormats();
      const wanted=['qr_code','ean_13','ean_8','upc_a','upc_e','code_128'].filter(x=>supported.includes(x));
      detector=new BarcodeDetector({formats:wanted.length?wanted:['qr_code']});
      const loop=async()=>{
        if(settled)return;
        try{
          const codes=await detector.detect(video);
          if(codes.length){const c=codes[0];await deliver(onResult,{raw:c.rawValue,format:c.format});return;}
        }catch(e){onError(e)}
        raf=requestAnimationFrame(loop);
      };
      loop();
      return;
    }

    // Safari/iOS fallback: dynamically load ZXing only on devices lacking BarcodeDetector.
    try{
      const { BrowserMultiFormatReader }=await import('@zxing/browser');
      const reader=new BrowserMultiFormatReader();
      zxingControls=await reader.decodeFromVideoDevice(undefined,video,(result,error)=>{
        if(result){
          const format=String(result.getBarcodeFormat?.() ?? 'UNKNOWN').toLowerCase();
          const normalized={
            'qr_code':'qr_code','qr code':'qr_code','ean_13':'ean_13','ean-13':'ean_13','ean_8':'ean_8','ean-8':'ean_8',
            'upc_a':'upc_a','upc-a':'upc_a','upc_e':'upc_e','upc-e':'upc_e','code_128':'code_128','code-128':'code_128'
          }[format] || format.replace(/\s+/g,'_');
          deliver(onResult,{raw:result.getText(),format:normalized}).catch(onError);
        }else if(error && error.name!=='NotFoundException') onError(error);
      });
      return;
    }catch(e){
      onError(e);
    }

    // Last-resort QR-only fallback if ZXing cannot load.
    scanner=new QrScanner(video,async result=>{
      await deliver(onResult,{raw:result.data,format:'qr_code'});
    },{preferredCamera:'environment',highlightScanRegion:true,returnDetailedScanResult:true});
    await scanner.start();
  }catch(e){
    await stopScanner();
    throw e;
  }
}

export async function stopScanner(){
  settled=true;
  cancelAnimationFrame(raf);raf=0;
  try{zxingControls?.stop?.()}catch{}zxingControls=null;
  try{scanner?.stop();scanner?.destroy()}catch{}scanner=null;
  detector=null;
  if(stream){for(const t of stream.getTracks())t.stop();stream=null;}
  if(videoRef){
    try{
      const s=videoRef.srcObject;
      if(s?.getTracks)for(const t of s.getTracks())t.stop();
      videoRef.pause();
    }catch{}
    videoRef.srcObject=null;videoRef=null;
  }
}
