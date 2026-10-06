const SAVE_KEY='nqx.save';
const BACKUP_KEY='nqx.save.backup';
const isStandalone=()=>window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true;

function readSave(){
  try{return JSON.parse(localStorage.getItem(SAVE_KEY)||'null')}catch{return null}
}
function summaryOf(s){
  const q=s?.q;
  if(!q)return 'NO ACTIVE ABERRANT';
  return `${q.id||'UNKNOWN'} · ${q.type||'--'} · ${String(q.class||'').toUpperCase()} · GROWTH ${q.growth??0}`;
}
function encodeSave(s){
  const bytes=new TextEncoder().encode(JSON.stringify(s));
  let bin='';for(let i=0;i<bytes.length;i+=0x8000)bin+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
  return 'NQX1.'+btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function decodeSave(token){
  if(!token?.startsWith('NQX1.'))throw new Error('INVALID TOKEN');
  let b64=token.slice(5).replace(/-/g,'+').replace(/_/g,'/');while(b64.length%4)b64+='=';
  const bin=atob(b64);const bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
  const obj=JSON.parse(new TextDecoder().decode(bytes));
  if(!obj||typeof obj!=='object'||!Array.isArray(obj.archives)||!Array.isArray(obj.lineages)||!obj.ui)throw new Error('INVALID SAVE');
  return obj;
}
function css(){return `
  :root{color-scheme:dark;font-family:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#050608;color:#e8ebf1}
  *{box-sizing:border-box}html,body,#app{margin:0;min-height:100%;background:#050608}body{min-height:100dvh;background:#050608 url('/nqx-field-bg.webp') center/cover fixed no-repeat}
  .boot-wrap{min-height:100dvh;padding:max(env(safe-area-inset-top),28px) 28px calc(28px + env(safe-area-inset-bottom));display:flex;flex-direction:column;justify-content:center;gap:18px;background:rgba(5,6,8,.78)}
  .boot-mark{font-weight:800;letter-spacing:.24em;font-size:20px}.boot-kicker{font-size:10px;letter-spacing:.18em;color:#8d96a2}.boot-title{font-size:18px;letter-spacing:.12em;margin-top:12px}.boot-copy{font-size:13px;line-height:1.9;color:#b4bcc7}.boot-card{border:1px solid #28303a;background:rgba(8,11,15,.78);padding:16px}.boot-card b{display:block;font-size:12px;letter-spacing:.08em}.boot-card small{display:block;margin-top:7px;color:#7c8591;font-size:10px;line-height:1.7}.boot-actions{display:grid;gap:10px}.boot-btn{min-height:48px;border:1px solid #3a4552;background:#0b1016;color:#e8edf3;font:inherit;font-size:12px;letter-spacing:.08em}.boot-btn.secondary{color:#9ca6b2;border-color:#242c35}.boot-status{min-height:20px;font-size:11px;color:#9edbff}.boot-import{position:fixed;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:9999;border:1px solid #303945;background:rgba(7,10,14,.9);color:#aab5c2;font-size:9px;letter-spacing:.12em;padding:8px 10px}
`}
function injectStyle(){const s=document.createElement('style');s.textContent=css();document.head.appendChild(s)}
async function copyText(t){
  try{await navigator.clipboard.writeText(t);return true}catch{
    const ta=document.createElement('textarea');ta.value=t;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();let ok=false;try{ok=document.execCommand('copy')}catch{}ta.remove();return ok;
  }
}
function renderExternal(){
  injectStyle();const save=readSave();
  document.querySelector('#app').innerHTML=`<main class="boot-wrap"><div><div class="boot-mark">NQX</div><div class="boot-kicker">SINGLE SAVE MODE</div><div class="boot-title">ホーム画面版が本体です</div></div><div class="boot-copy">iPhoneではSafari、アプリ内ブラウザ、ホーム画面PWAが別の保存領域になるため、ここではゲームを起動しません。これで別個体・別成長・別履歴が増える問題を停止します。</div>${save?`<div class="boot-card"><b>このブラウザに既存セーブを検出</b><small>${summaryOf(save)}<br>消していません。ホーム画面版へ移す場合だけコピーしてください。</small></div><div class="boot-actions"><button id="copy-save" class="boot-btn">このセーブをコピー</button></div>`:`<div class="boot-card"><b>このブラウザには有効なセーブがありません</b><small>新しいプレイはホーム画面のNQXから開始してください。</small></div>`}<div id="boot-status" class="boot-status"></div></main>`;
  document.querySelector('#copy-save')?.addEventListener('click',async()=>{const ok=await copyText(encodeSave(save));document.querySelector('#boot-status').textContent=ok?'セーブをコピーしました。ホーム画面のNQXを開いて DATA IMPORT を押してください。':'コピーに失敗しました。もう一度押してください。';});
}
async function importIntoApp(){
  let token='';
  try{token=await navigator.clipboard.readText()}catch{}
  if(!token?.startsWith('NQX1.'))token=prompt('コピーしたNQXセーブコードを貼り付けてください','')||'';
  if(!token)return;
  try{
    const incoming=decodeSave(token.trim());
    const current=readSave();
    const msg=`IMPORT SAVE\n${summaryOf(incoming)}\n\n現在: ${summaryOf(current)}\n\nこの内容で置き換えますか？`;
    if(!confirm(msg))return;
    if(current)localStorage.setItem(BACKUP_KEY,JSON.stringify(current));
    incoming.saveRevision=Number(incoming.saveRevision||0)+1000;incoming.updatedAt=Date.now();
    localStorage.setItem(SAVE_KEY,JSON.stringify(incoming));
    location.reload();
  }catch{alert('セーブコードを読み取れませんでした。')}
}
function attachAppImport(){
  const b=document.createElement('button');b.className='boot-import';b.textContent='DATA IMPORT';b.type='button';b.addEventListener('click',importIntoApp);document.body.appendChild(b);
}

if(isStandalone()){
  import('./main.js').then(()=>attachAppImport()).catch(err=>{console.error(err);injectStyle();document.querySelector('#app').innerHTML='<main class="boot-wrap"><div class="boot-mark">NQX</div><div class="boot-title">LOAD ERROR</div><div class="boot-copy">再起動してください。</div></main>';});
}else{
  renderExternal();
}
