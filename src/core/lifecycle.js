import { OBSERVATION_LIMITS } from './config.js';
import { clamp } from './rng.js';
import { refreshClass } from './information.js';

export const dayKey=(t=Date.now())=>new Date(t).toISOString().slice(0,10);
export const ageDays=(q,now=Date.now())=>Math.max(0,Math.floor((now-q.bornAt)/86400000));
export function isExpired(q,now=Date.now()){
  refreshClass(q);
  if(q.class==='unknown') return now >= (q.unknownEndsAt ?? q.lifeEndsAt) || (q.unknownActionsRemaining ?? 1)<=0;
  return now>=q.lifeEndsAt || q.actionLifeRemaining<=0;
}
export function consumeAction(q,amount=1){
  refreshClass(q);
  const lifeCost=amount*(q.class==='dominion'?1.15:1);
  q.actionLifeRemaining=Math.max(0,q.actionLifeRemaining-lifeCost);
  if(q.class==='unknown') q.unknownActionsRemaining=Math.max(0,(q.unknownActionsRemaining ?? 0)-amount);
  q.actionCount=(q.actionCount ?? 0)+1;
  q.fatigue=clamp((q.fatigue ?? 0)+4,0,100);
  updateState(q);
}
export function extendLifeFromIntegration(q, defeatedStrength=100, rng=Math.random){
  refreshClass(q);
  let efficiency=q.class==='dominion'?1.25:1;
  if(q.class==='unknown') efficiency=.45;
  const hours=Math.max(2,Math.min(28,(defeatedStrength/50 + 2 + rng()*5)*efficiency));
  q.lifeEndsAt += hours*3600000;
  if(q.class==='unknown'){
    if(!q.unknownEndsAt)q.unknownEndsAt=Date.now()+24*3600000;
    q.unknownEndsAt += Math.min(12,hours*.45)*3600000;
    q.unknownActionsRemaining=Math.min(48,(q.unknownActionsRemaining ?? 0)+Math.max(1,Math.floor(hours/4)));
  }
  return hours;
}
export function enterUnknownIfNeeded(q, now=Date.now(), rng=Math.random){
  refreshClass(q);
  if(q.class==='unknown' && !q.unknownEndsAt){
    q.unknownEndsAt=now+(24+Math.floor(rng()*49))*3600000;
    q.unknownActionsRemaining=12+Math.floor(rng()*25);
    return true;
  }
  return false;
}
export function updateState(q){
  if((q.fatigue ?? 0)>=78) q.state='tired';
  else if((q.instability ?? 0)>=68) q.state='unstable';
  else if(q.actionLifeRemaining<=Math.max(5,q.actionLifeMax*.08)) q.state='terminal';
  else if((q.deprivation ?? 0)>=65) q.state='deprived';
  else if((q.excitement ?? 0)>=60) q.state='excited';
  else q.state='stable';
}
export function startSleep(q,now=Date.now()){
  if(q.sleep?.startedAt && !q.sleep.completedAt) return q.sleep;
  q.sleep={startedAt:now, endsAt:now+OBSERVATION_LIMITS.sleepMs, completedAt:null};
  return q.sleep;
}
export function sleepStatus(q,now=Date.now()){
  if(!q.sleep?.startedAt || q.sleep.completedAt) return {active:false,complete:false,progress:0};
  const progress=clamp((now-q.sleep.startedAt)/(q.sleep.endsAt-q.sleep.startedAt),0,1);
  return {active:true,complete:now>=q.sleep.endsAt,progress};
}
export function resolveSleep(q,now=Date.now(),early=false,rng=Math.random){
  const s=sleepStatus(q,now);
  if(!s.active) return null;
  const factor=early?Math.max(.1,s.progress*.35):1;
  q.fatigue=clamp((q.fatigue ?? 0)-Math.round(55*factor),0,100);
  q.instability=clamp((q.instability ?? 0)-Math.round(30*factor),0,100);
  q.growth=Math.min(100,q.growth+(early?0:1+Math.floor(rng()*2)));
  // Frozen rule: normal actions, including sleep, never extend action lifespan.
  q.sleep.completedAt=now;
  updateState(q);
  return {early,growth:early?0:1};
}
