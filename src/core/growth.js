import { clamp } from './rng.js';
import { GROWTH_STAGE } from './config.js';
import { dayKey } from './lifecycle.js';

function individualModifier(q){ return Math.min(1.75,0.75+(q.abilities.ADAPT??0)/1332+(q.hidden.POTENTIAL??0)/1332); }
function repetitionModifier(n){ return n<=1 ? 1 : n===2 ? .7 : n===3 ? .4 : .1; }
export function applyGrowth(q,base,action,now=Date.now()){
  const key=dayKey(now);
  if(q.growthDayKey!==key){q.growthDayKey=key;q.growthToday=0;q.actionRepetition={};}
  const dailyCap=Math.round(10+Math.min(4,(q.hidden.POTENTIAL??0)/166.5));
  const rep=(q.actionRepetition[action]??0)+1; q.actionRepetition[action]=rep;
  const raw=base*individualModifier(q)*repetitionModifier(rep);
  const room=Math.max(0,dailyCap-q.growthToday);
  const gain=Math.min(room,Math.max(0,Math.round(raw)));
  q.growthToday+=gain; q.growth=clamp(q.growth+gain,0,100);
  return {gain,dailyCap,stage:GROWTH_STAGE(q.growth)};
}
export function addEvolution(q,axis,amount){ if(axis in q.evolution) q.evolution[axis]=Math.max(0,(q.evolution[axis]??0)+amount); }
export function evolutionTendency(q){ return Object.entries(q.evolution).sort((a,b)=>b[1]-a[1]).slice(0,2); }
export function maybeMatureMutation(q,rng=Math.random,weight=1){
  if(q.growth<75) return null;
  const p=Math.min(.35,.06*weight*(1+(q.hidden.MUTATION??0)/666+(q.anomaly??0)/666));
  if(rng()>=p) return null;
  const opts=['追加触手','追加核','殻','膜','結晶','液状化','群体','色変化','敵由来器官','輪郭欠損','粒子','非対称化'];
  const feature=opts[Math.floor(rng()*opts.length)];
  const m={at:Date.now(),feature}; q.mutationHistory.push(m);
  const map={ '追加触手':'tendrils','殻':'shell','膜':'membrane','結晶':'crystal','粒子':'fragments','非対称化':'asymmetry' };
  if(map[feature]) q.morphology[map[feature]]=clamp((q.morphology[map[feature]]??20)+5+Math.floor(rng()*16),0,99);
  q.anomaly=clamp(q.anomaly+2+Math.floor(rng()*5),0,666);
  return m;
}
