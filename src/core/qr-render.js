import QRCode from 'qrcode';
export async function renderQr(canvas,text){
  await QRCode.toCanvas(canvas,text,{errorCorrectionLevel:'M',margin:1,width:260,color:{dark:'#e9edf6',light:'#050608'}});
}
