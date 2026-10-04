import { ABILITIES, CLASS_LABELS } from './config.js';
import { clamp } from './rng.js';

export function coreAverage(q){
  return ABILITIES.reduce((s,k)=>s + Number(q.abilities?.[k] ?? 0),0) / ABILITIES.length;
}
export function informationStrength(q){
  const core = coreAverage(q);
  return Math.min(1332, Math.max(0, Math.floor(core * 0.85 + Number(q.integration ?? 0) * 0.50 + Number(q.anomaly ?? 0))));
}
export function refreshClass(q){
  const value = informationStrength(q);
  q.informationStrength = value;
  q.class = value >= 667 ? 'unknown' : value >= 333 ? 'dominion' : 'aberrant';
  return q.class;
}
export function displayStrength(q){
  refreshClass(q);
  return q.class === 'unknown' ? '>666' : String(q.informationStrength);
}
export function observedStrengthCeiling(q){
  refreshClass(q);
  return q.class === 'aberrant' ? 332 : q.class === 'dominion' ? 666 : null;
}
export function displayStrengthRange(q){
  refreshClass(q);
  if(q.class === 'unknown') return '>666';
  const ceiling = observedStrengthCeiling(q);
  return `${Math.min(q.informationStrength, ceiling)} / ${ceiling}`;
}
export function observedAbilityCeiling(q){
  refreshClass(q);
  return q.class === 'aberrant' ? 332 : q.class === 'dominion' ? 666 : null;
}
export function displayAbility(q, value){
  const n = Math.max(0, Number(value ?? 0));
  const ceiling = observedAbilityCeiling(q);
  if(ceiling == null){
    return { label:`${Math.round(n)} / UNDEFINED`, ratio:Math.max(0,Math.min(1,n/666)), ceiling:null };
  }
  if(n > ceiling){
    return { label:`>${ceiling} / ${ceiling}`, ratio:1, ceiling };
  }
  return { label:`${Math.round(n)} / ${ceiling}`, ratio:Math.max(0,Math.min(1,n/ceiling)), ceiling };
}
export function classLabel(q){ refreshClass(q); return CLASS_LABELS[q.class]; }
export function lifePressure(q, now=Date.now()){
  const span = Math.max(1, q.lifeEndsAt - q.bornAt);
  const used = clamp((now-q.bornAt)/span,0,2);
  const actions = clamp((q.actionLifeMax - q.actionLifeRemaining) / Math.max(1,q.actionLifeMax), 0, 2);
  const pressure = Math.max(used, actions);
  if(q.class === 'unknown') return 'CRITICAL';
  if(pressure >= .90) return 'CRITICAL';
  if(pressure >= .72) return 'HIGH';
  if(pressure >= .45) return 'MODERATE';
  return 'LOW';
}
export function observationStability(q){ return q.class === 'unknown' ? 'CRITICAL' : lifePressure(q); }
