let ctx=null;let enabled=false;let timers=[];
export async function enableAudio(){
  if(!ctx)ctx=new (globalThis.AudioContext||globalThis.webkitAudioContext)();
  enabled=true;if(ctx.state==='suspended')await ctx.resume();return true;
}
export async function suspendAudio(){clearPending();if(ctx&&ctx.state==='running')await ctx.suspend();}
export async function resumeAudio(){if(enabled&&ctx&&ctx.state==='suspended'&&document.visibilityState==='visible')await ctx.resume();}
export function clearPending(){for(const t of timers)clearTimeout(t);timers=[];}
function tone(freq=700,duration=.08,delay=0,type='sine',gain=.035){
  if(!enabled||!ctx||ctx.state!=='running')return;
  const id=setTimeout(()=>{if(document.visibilityState!=='visible')return;const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,ctx.currentTime);o.frequency.exponentialRampToValueAtTime(freq*1.04,ctx.currentTime+duration);g.gain.setValueAtTime(gain,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+duration);o.connect(g).connect(ctx.destination);o.start();o.stop(ctx.currentTime+duration);},delay);timers.push(id);
}
export function chirp(kind='normal'){
  if(kind==='unknown'){tone(920,.05,0,'triangle',.025);return}
  tone(650,.055,0,'sine');tone(760,.045,70,'triangle',.025);
}
export function actionSound(kind){
  const map={observe:[620,820],battle:[430,610],sleep:[520,430],signal:[880,1040],evolve:[700,920]};const [a,b]=map[kind]||[600,720];tone(a,.07);tone(b,.06,90,'triangle',.028);
}
