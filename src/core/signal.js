import { OBSERVATION_LIMITS } from './config.js';
import { dayKey } from './lifecycle.js';
import { seeded, weighted, clamp } from './rng.js';
import { discoverTrace } from './traces.js';
import { applyGrowth, addEvolution, maybeMatureMutation } from './growth.js';

const RESULTS=[
  {id:'trace',weight:30},{id:'ability',weight:18},{id:'anomaly',weight:12},{id:'morphology',weight:12},{id:'evolution',weight:8},
  {id:'echo',weight:7},{id:'integration',weight:5},{id:'log',weight:4},{id:'negative',weight:3},{id:'rare',weight:1}
];
export function maybeOpenSignal(state,q,source,now=Date.now(),rng=Math.random){
  const k=dayKey(now);state.signals.daily[k]??=0;
  if(state.signals.daily[k]>=OBSERVATION_LIMITS.signalDailyMax)return null;
  if(now-(state.signals.lastAt??0)<OBSERVATION_LIMITS.signalMinGapMs)return null;
  let p=.05;if(q.type==='SIGNAL')p*=1.5;if(q.class==='dominion')p*=1.15;if(q.class==='unknown')p*=1.25;
  if(rng()>=p)return null;
  state.signals.lastAt=now;state.signals.daily[k]++;state.signals.pending={openedAt:now,endsAt:now+OBSERVATION_LIMITS.signalWindowMs,source};
  return state.signals.pending;
}
export function resolveSignal(state,{hash='',format='UNKNOWN'},now=Date.now()){
  const pending=state.signals.pending;if(!pending||now>pending.endsAt){state.signals.pending=null;return {expired:true};}
  const q=state.q;const rng=seeded(`${q.uid}|signal|${hash}|${pending.openedAt}`);const row=weighted(rng,RESULTS);
  let detail='';let trace=null;
  if(row.id==='trace'){trace=discoverTrace(state,rng,{bonus:.30});detail=trace?`TRACE ${String(trace.no).padStart(3,'0')}`:'NO UNREAD TRACE';}
  if(row.id==='ability'){const keys=Object.keys(q.abilities);const k=keys[Math.floor(rng()*keys.length)];const d=6+Math.floor(rng()*15);q.abilities[k]=clamp(q.abilities[k]+d,0,666);detail=`${k} +${d}`;}
  if(row.id==='anomaly'){const d=5+Math.floor(rng()*16);q.anomaly=clamp(q.anomaly+d,0,666);detail=`ANOMALY +${d}`;}
  if(row.id==='morphology'){const keys=Object.keys(q.morphology);const k=keys[Math.floor(rng()*keys.length)];q.morphology[k]=clamp(q.morphology[k]+5+Math.floor(rng()*15),0,99);detail=`MORPHOLOGY : ${k}`;}
  if(row.id==='evolution'){addEvolution(q,'異常型',3);detail='EVOLUTION TENDENCY SHIFT';}
  if(row.id==='echo'){detail='ECHO / REMNANT RESIDUE';q.instability=clamp((q.instability??0)-5,0,100);}
  if(row.id==='integration'){q.integration=clamp(q.integration+8+Math.floor(rng()*14),0,666);detail='SPECIAL INTEGRATION';}
  if(row.id==='log'){detail='HIGH-ORDER OBSERVATION LOG';}
  if(row.id==='negative'){q.instability=clamp((q.instability??0)+18,0,100);detail='NEGATIVE INTERFERENCE';}
  if(row.id==='rare'){q.anomaly=clamp(q.anomaly+25,0,666);maybeMatureMutation(q,rng,3);detail='RARE ANOMALOUS EVENT';}
  applyGrowth(q,1+Math.floor(rng()*4),'signal',now);state.signals.pending=null;return {expired:false,result:row.id,detail,trace};
}
