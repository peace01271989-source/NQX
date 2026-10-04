import { seeded, chance, pick } from './rng.js';

export function createLineage(index=1){
  return { id:`LINEAGE-${String(index).padStart(3,'0')}`, name:'', active:true, members:[], mutations:[], createdAt:Date.now(), endedAt:null };
}
export function archiveEntry(q, reason, extra={}){
  return {
    id:q.id, uid:q.uid, name:q.name, generation:q.generation, type:q.type, class:q.class,
    growth:q.growth, informationStrength:q.informationStrength, bornAt:q.bornAt, endedAt:Date.now(),
    livedDays:Math.max(0,Math.floor((Date.now()-q.bornAt)/86400000)), reason,
    abilities:{...q.abilities}, morphology:{...q.morphology}, survival:{...q.survival},
    personality:q.personality, evolution:{...q.evolution}, mutationHistory:[...(q.mutationHistory??[])],
    visualSeed:q.visualSeed, visual:{...q.visual}, battle:{...q.battle}, inheritable:reason==='cpu-loss', ...extra
  };
}
export function closeOrContinueLineage(state, entry){
  let lineage=state.lineages.find(x=>x.id===state.activeLineageId);
  if(!lineage){ lineage=createLineage(state.lineages.length+1); state.lineages.push(lineage); state.activeLineageId=lineage.id; }
  lineage.members.push(entry);
  if(entry.reason==='cpu-loss'){
    lineage.active=true;
    maybeLineageMutation(lineage);
    return 'CONTINUES';
  }
  lineage.active=false; lineage.endedAt=entry.endedAt; state.activeLineageId=null;
  return 'TERMINATED';
}
function maybeLineageMutation(lineage){
  if(lineage.members.length<3) return null;
  const seed=lineage.members.map(x=>`${x.type}:${x.class}:${x.id}`).join('|');
  const rng=seeded(seed);
  const recent=lineage.members.slice(-3);
  const sameType=new Set(recent.map(x=>x.type)).size===1;
  const high=recent.some(x=>['dominion','unknown'].includes(x.class));
  const p=.08+(sameType?.08:0)+(high?.07:0);
  if(!chance(rng,p)) return null;
  const mutation={
    at:Date.now(),
    name:pick(rng,['核色固定傾向','触手配列偏位','残存殻パターン','光位相偏り','適応成長偏差','非対称反復','特殊音残響']),
    tradeoff:pick(rng,['GUARD安定性低下','成長振れ幅増加','DECAY上昇','SPEED変動増加','観測反応の不安定化'])
  };
  lineage.mutations.push(mutation); return mutation;
}
export function currentLineage(state){ return state.lineages.find(x=>x.id===state.activeLineageId) ?? null; }
export function ensureLineageForBirth(state){
  let l=currentLineage(state);
  if(!l){ l=createLineage(state.lineages.length+1); state.lineages.push(l); state.activeLineageId=l.id; }
  return l;
}
