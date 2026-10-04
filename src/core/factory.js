import { TYPE_DEFS, ABILITIES, HIDDEN, EVOLUTION_AXES } from './config.js';
import { weighted, int, pick, chance, clamp, uuidish, seeded } from './rng.js';
import { refreshClass } from './information.js';

function rollType(rng, lineage){
  const recent = lineage?.members?.slice(-3) ?? [];
  const parentType = recent.at(-1)?.type;
  const rows = TYPE_DEFS.map(t=>{
    let w=t.rate;
    if(parentType===t.id) w*=1.18;
    if(recent.filter(x=>x.type===t.id).length>=2) w*=1.12;
    return {...t, weight:w};
  });
  return weighted(rng,rows).id;
}
function morphologyFor(type,rng){
  const base={ membrane:int(rng,20,80), tendrils:int(rng,10,85), shell:int(rng,0,60), crystal:int(rng,0,55), asymmetry:int(rng,10,80), fragments:int(rng,0,65), glow:int(rng,20,90) };
  if(type==='NQX'){base.glow+=10;base.membrane+=10}
  if(type==='Q'){base.asymmetry+=15;base.tendrils+=12}
  if(type==='ENQ'){base.membrane+=18;base.glow+=8}
  if(type==='ECHO'){base.fragments+=16;base.glow+=8}
  if(type==='VEIL'){base.asymmetry+=10;base.membrane+=8}
  if(type==='DRIFT'){base.fragments+=12;base.tendrils+=8}
  if(type==='SIGNAL'){base.crystal+=12;base.glow+=15}
  if(type==='FRAGMENT'){base.fragments+=24;base.crystal+=8}
  if(type==='REMNANT'){base.shell+=24;base.membrane-=8}
  return Object.fromEntries(Object.entries(base).map(([k,v])=>[k,clamp(v,0,99)]));
}
function survivalFor(type,rng){
  const s={ stability:int(rng,20,85), persistence:int(rng,20,85), recovery:int(rng,10,80) };
  if(type==='REMNANT'){s.persistence+=15;s.recovery+=10}
  if(type==='VEIL'){s.stability-=10}
  return Object.fromEntries(Object.entries(s).map(([k,v])=>[k,clamp(v,0,99)]));
}
function weightedAncestor(rng, rows){
  const total=rows.reduce((s,x)=>s+x.weight,0);let cursor=rng()*total;
  for(const row of rows){cursor-=row.weight;if(cursor<=0)return row.ancestor}
  return rows.at(-1)?.ancestor;
}
function lineageInfluence(q,lineage,rng){
  const members=(lineage?.members ?? []).slice(-3).reverse();
  const rows=members.map((ancestor,i)=>({ancestor,weight:[1,.5,.25][i]})).filter(x=>x.ancestor?.inheritable);
  if(!rows.length) return;
  const influence=0.15 + rng()*0.15;

  // Frozen rule: only 1-2 ability aptitudes and 1-2 morphology traits influence the next generation.
  const abilityKeys=[...ABILITIES].sort(()=>rng()-.5).slice(0,chance(rng,.35)?2:1);
  for(const k of abilityKeys){
    const ancestor=weightedAncestor(rng,rows);const source=ancestor?.abilities?.[k];
    if(Number.isFinite(source))q.abilities[k]=clamp(Math.round(q.abilities[k]*(1-influence)+source*influence),0,666);
  }
  const morphKeys=Object.keys(q.morphology).sort(()=>rng()-.5).slice(0,chance(rng,.30)?2:1);
  for(const k of morphKeys){
    const ancestor=weightedAncestor(rng,rows);const source=ancestor?.morphology?.[k];
    if(Number.isFinite(source))q.morphology[k]=clamp(Math.round(q.morphology[k]*(1-influence)+source*influence),0,99);
  }

  const ancestor=weightedAncestor(rng,rows);
  if(ancestor?.personality && chance(rng,.08))q.personality=ancestor.personality;
  if(ancestor?.evolution && chance(rng,.35)){
    const [axis]=Object.entries(ancestor.evolution).sort((a,b)=>b[1]-a[1])[0]||[];
    if(axis && axis in q.evolution)q.evolution[axis]+=1+Math.floor(rng()*3);
  }
  if(ancestor?.visual && chance(rng,.06)){
    q.visual.coreHue=Math.round(q.visual.coreHue*.75+(ancestor.visual.coreHue??q.visual.coreHue)*.25);
    q.visual.glowHue=Math.round(q.visual.glowHue*.75+(ancestor.visual.glowHue??q.visual.glowHue)*.25);
  }
  if(lineage?.mutations?.length && chance(rng,.12)){
    const m=lineage.mutations.at(-1);
    q.lineageMutation={name:m.name,tradeoff:m.tradeoff};
    if(m.tradeoff==='GUARD安定性低下')q.abilities.GUARD=clamp(q.abilities.GUARD-8,0,666);
    if(m.tradeoff==='DECAY上昇')q.hidden.DECAY=clamp(q.hidden.DECAY+12,0,666);
    if(m.tradeoff==='SPEED変動増加')q.abilities.SPEED=clamp(q.abilities.SPEED-5,0,666);
    if(m.tradeoff==='観測反応の不安定化')q.instability=clamp((q.instability??0)+8,0,100);
  }
}

export function createAberrant({generation=1, displayNumber=1, lineage=null, originHash='' }={}){
  const seedText=`${Date.now()}|${Math.random()}|${generation}|${displayNumber}|${originHash}`;
  const rng=seeded(seedText);
  const type=rollType(rng,lineage);
  const abilities=Object.fromEntries(ABILITIES.map(k=>[k,int(rng,38,135)]));
  const hidden=Object.fromEntries(HIDDEN.map(k=>[k,int(rng,20,180)]));
  if(type==='REMNANT'){abilities.LIFE+=18;abilities.GUARD+=16}
  if(type==='DRIFT'){abilities.SPEED+=18}
  if(type==='Q'){abilities.ABSORB+=18}
  if(type==='NQX'){abilities.ADAPT+=12}
  const q={
    id:`Q-${String(displayNumber).padStart(4,'0')}`,
    uid:`nqx-${uuidish(rng)}-${Date.now().toString(36)}`,
    name:'', generation, type, class:'aberrant', bornAt:Date.now(), endedAt:null,
    growth:0, growthToday:0, growthDayKey:'', actionRepetition:{},
    abilities:Object.fromEntries(Object.entries(abilities).map(([k,v])=>[k,clamp(v,0,666)])),
    hidden, integration:int(rng,0,18), anomaly:int(rng,0,10),
    morphology:morphologyFor(type,rng), survival:survivalFor(type,rng),
    personality:pick(rng,['quiet','curious','cautious','restless','persistent','sensitive','distant','adaptive']),
    evolution:Object.fromEntries(EVOLUTION_AXES.map(k=>[k,int(rng,0,8)])),
    mutationHistory:[], battle:{wins:0,losses:0,cpuWins:0,cpuLosses:0,pvpWins:0,pvpLosses:0},
    visualSeed:Math.floor(rng()*2**31), visual:{coreHue:int(rng,185,290), glowHue:int(rng,170,320), asymmetry: rng()>.5?1:-1},
    state:'stable', fatigue:0, instability:0,
    actionLifeMax:int(rng,60,140), actionLifeRemaining:0,
    lifeEndsAt:0, unknownEndsAt:null, unknownActionsRemaining:null,
    lastObservationAt:0, lastSignalAt:0,
    inheritedFrom:lineage?.id ?? null,
    namePromptEligibleAt:3, actionCount:0
  };
  q.actionLifeRemaining=q.actionLifeMax;
  q.lifeEndsAt=q.bornAt + int(rng,14,35)*86400000;
  lineageInfluence(q,lineage,rng);
  refreshClass(q);
  return q;
}
