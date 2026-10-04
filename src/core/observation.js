import { OBSERVATION_LIMITS, TYPE_BY_ID } from './config.js';
import { clamp, seeded } from './rng.js';
import { applyGrowth, addEvolution, maybeMatureMutation } from './growth.js';
import { consumeAction, dayKey, enterUnknownIfNeeded, updateState } from './lifecycle.js';
import { discoverTrace } from './traces.js';

export async function hashObservedCode(raw){
  const data=new TextEncoder().encode(String(raw));
  if(globalThis.crypto?.subtle){const digest=await crypto.subtle.digest('SHA-256',data);return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');}
  let h=2166136261;for(const b of data){h^=b;h=Math.imul(h,16777619)}return (h>>>0).toString(16).padStart(8,'0');
}
function dailyBucket(state,key){ state.observations.daily[key]??={success:0}; return state.observations.daily[key]; }
export function canExternalObserve(state, hash, now=Date.now()){
  const q=state.q;if(!q)return {ok:false,reason:'NO ACTIVE ABERRANT'};
  if(q.sleep?.startedAt&&!q.sleep.completedAt)return {ok:false,reason:'SLEEP ACTIVE'};
  if(now-(q.lastObservationAt??0)<OBSERVATION_LIMITS.externalCooldownMs)return {ok:false,reason:'OBSERVATION COOLDOWN'};
  const d=dailyBucket(state,dayKey(now));if(d.success>=OBSERVATION_LIMITS.externalDailyMax)return {ok:false,reason:'DAILY LIMIT'};
  const prev=state.observations.codes[hash];if(prev&&now-prev.at<OBSERVATION_LIMITS.duplicateCodeMs)return {ok:false,reason:'CODE ALREADY OBSERVED'};
  return {ok:true};
}
export function applyExternalObservation(state,{hash,format='UNKNOWN'},now=Date.now()){
  const q=state.q; const rng=seeded(`${hash}|${q.uid}|${now}`); const d=dailyBucket(state,dayKey(now));
  state.observations.codes[hash]={at:now,format}; d.success++; q.lastObservationAt=now;
  const abilityKeys=Object.keys(q.abilities); const k=abilityKeys[Math.floor(rng()*abilityKeys.length)]; const delta=2+Math.floor(rng()*10);
  q.abilities[k]=clamp(q.abilities[k]+delta,0,666);
  q.anomaly=clamp(q.anomaly+(rng()<.35?Math.floor(rng()*4):0),0,666);
  const g=applyGrowth(q,1+Math.floor(rng()*3),'external',now);
  if(k==='ADAPT')addEvolution(q,'適応型',2);if(rng()<.18)addEvolution(q,'異常型',1);
  if(rng()<.25) q.instability=clamp((q.instability??0)+(rng()<.5?-8:8),0,100);
  const mut=maybeMatureMutation(q,rng,1.1); let trace=null;
  let traceChance=.05*(TYPE_BY_ID[q.type]?.trace??1); if(q.class==='dominion')traceChance*=1.3;if(q.class==='unknown')traceChance*=1.7;
  if(rng()<traceChance) trace=discoverTrace(state,rng,{bonus:traceChance});
  consumeAction(q,1); updateState(q); const unknown=enterUnknownIfNeeded(q,now,rng);
  return {ability:k,delta,growth:g.gain,mutation:mut,trace,unknown};
}
