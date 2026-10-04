import { SCHEMA_VERSION, ABILITIES } from './config.js';
import { freshState } from './state.js';
import { createLineage } from './lineage.js';
import { informationStrength, refreshClass } from './information.js';

const clone=x=>JSON.parse(JSON.stringify(x));
const LEGACY_99_TO_666 = new Map(Array.from({length:100},(_,n)=>[Math.round(n/99*666),n]));

function clampAbility(v){
  const n=Number(v??0);
  if(!Number.isFinite(n)) return 0;
  return Math.max(0,Math.min(666,Math.round(n)));
}
function scaleLegacy99Ability(v){
  const n=Number(v??0); if(!Number.isFinite(n)) return 0;
  return n<=99 ? Math.max(0,Math.min(666,Math.round(n/99*666))) : clampAbility(n);
}
function legacyScaledSource(v){
  const n=Math.round(Number(v??0));
  return LEGACY_99_TO_666.has(n) ? LEGACY_99_TO_666.get(n) : null;
}

// v10.0/v10.1 had a migration bug: every saved ability <=99 was treated as an old 0-99 stat
// on reload and was multiplied into the 0-666 scale. Repair only the strong fingerprint of that bug.
function repairV10AbilityScaleBug(q){
  if(!q?.abilities) return false;
  const values=ABILITIES.map(k=>clampAbility(q.abilities[k]));
  const fingerprint=values.map(v=>({value:v,source:legacyScaledSource(v)}));
  const scaledHigh=fingerprint.filter(x=>x.source!=null && x.value>=240).length;
  const core=values.reduce((a,b)=>a+b,0)/values.length;
  const strength=Math.floor(core*.85 + Number(q.integration??0)*.5 + Number(q.anomaly??0));
  const early=(Number(q.growth??0)<15) && Number(q.integration??0)<80 && Number(q.anomaly??0)<80;
  if(!(early && strength>=333 && scaledHigh>=4)) return false;

  for(const k of ABILITIES){
    const v=clampAbility(q.abilities[k]);
    const source=legacyScaledSource(v);
    // Factory v10 started at 38-135. The corrupted subset therefore appears at >=~256.
    if(source!=null && v>=240) q.abilities[k]=source;
    else q.abilities[k]=v;
  }
  q.migrationRepairs=[...(q.migrationRepairs||[]),'V10_ABILITY_SCALE_REPAIR'];
  return true;
}

function migrateQ(old,{legacy99=false,repairV10=false}={}){
  if(!old) return null;
  const q=clone(old);
  q.id=q.id || `Q-${String(q.displayNumber??1).padStart(4,'0')}`;
  q.uid=q.uid || `legacy-${q.id}-${q.bornAt||Date.now()}`;
  q.type=q.type || q.aberrantClass || 'NQX';
  q.generation=q.generation ?? 1;
  q.growth=q.growth ?? 40;
  q.abilities=q.abilities||{};
  for(const k of ABILITIES){
    const raw=q.abilities[k]??50;
    q.abilities[k]=legacy99 ? scaleLegacy99Ability(raw) : clampAbility(raw);
  }
  if(repairV10) repairV10AbilityScaleBug(q);
  q.hidden=q.hidden || {POTENTIAL:100,DECAY:80,MUTATION:80,INSTINCT:80};
  q.integration=q.integration ?? q.information?.integration ?? 0;
  q.anomaly=q.anomaly ?? q.information?.anomaly ?? 0;
  q.morphology=q.morphology || {};
  if(q.origin && !Object.keys(q.morphology).length) q.morphology={legacyOrigin:50,membrane:40,tendrils:30,shell:20,crystal:20,asymmetry:30,fragments:20,glow:40};
  delete q.origin;
  q.survival=q.survival || {stability:50,persistence:50,recovery:50};
  q.evolution=q.evolution || {'侵食型':0,'防壁型':0,'統合型':0,'漂流型':0,'適応型':0,'異常型':0};
  q.visualSeed=q.visualSeed ?? Math.abs(hashCode(q.uid));
  q.visual=q.visual || {coreHue:220,glowHue:250,asymmetry:1};
  q.mutationHistory=q.mutationHistory||[];
  q.battle=q.battle||{wins:0,losses:0,cpuWins:0,cpuLosses:0,pvpWins:0,pvpLosses:0};
  q.actionLifeMax=q.actionLifeMax ?? 100; q.actionLifeRemaining=q.actionLifeRemaining ?? q.actionLifeMax;
  q.lifeEndsAt=q.lifeEndsAt ?? ((q.bornAt??Date.now())+21*86400000);
  q.state=q.state==='hungry'?'deprived':(q.state||'stable');
  q.actionRepetition=q.actionRepetition||{}; q.growthToday=q.growthToday||0; q.growthDayKey=q.growthDayKey||'';
  refreshClass(q); return q;
}
function hashCode(s){let h=0;for(let i=0;i<String(s).length;i++)h=((h<<5)-h)+String(s).charCodeAt(i)|0;return h}
function tracesFromLegacy(old){
  const set=new Set();
  for(const n of old.traces||[]) { const x=Number(n?.no??n); if(x>=1&&x<=666)set.add(x); }
  for(const f of old.fragments||[]) { const raw=Number(f.traceNo??f.no??String(f.id||'').match(/\d+/)?.[0]); if(raw>=1&&raw<=666)set.add(raw); }
  return [...set].sort((a,b)=>a-b);
}
function migrateArchive(x,i,{legacy99=false,repairV10=false}={}){
  const abilities=Object.fromEntries(ABILITIES.map(k=>[k,legacy99?scaleLegacy99Ability(x.abilities?.[k]??50):clampAbility(x.abilities?.[k]??50)]));
  const entry={
    id:x.id||x.no||`Q-${String(i+1).padStart(4,'0')}`, uid:x.uid||`legacy-archive-${i}`,
    name:x.name||'', generation:x.generation??x.gen??i+1, type:x.type||x.aberrantClass||'NQX', class:x.class||x.observationTier||'aberrant',
    growth:x.growth??75, informationStrength:x.informationStrength??x.information?.strength??0,
    bornAt:x.bornAt??Date.now(), endedAt:x.endedAt??Date.now(), livedDays:x.livedDays??0,
    reason:x.reason||x.endReason||'legacy', abilities,
    morphology:x.morphology||{}, survival:x.survival||{}, personality:x.personality||'', evolution:x.evolution||{},
    mutationHistory:x.mutationHistory||[], visualSeed:x.visualSeed??Math.abs(hashCode(x.id||i)), visual:x.visual||{}, battle:x.battle||{}, inheritable:x.inheritable ?? ((x.endReason||x.reason)==='cpu-loss')
  };
  entry.integration=x.integration??x.information?.integration??0;
  entry.anomaly=x.anomaly??x.information?.anomaly??0;
  if(repairV10 && repairV10AbilityScaleBug(entry)){
    entry.informationStrength=informationStrength(entry);
    entry.class=entry.informationStrength>=667?'unknown':entry.informationStrength>=333?'dominion':'aberrant';
  }
  return entry;
}
export function migrateState(raw){
  if(!raw) return freshState();
  const sourceVersion=Number(raw.schemaVersion??0);

  // Current schema: normalize only. Never rescale 0-99 values again.
  if(sourceVersion===SCHEMA_VERSION){
    const s={...freshState(),...raw};
    s.q=migrateQ(s.q,{legacy99:false,repairV10:false});
    return s;
  }

  const legacy99=sourceVersion<10;
  const repairV10=sourceVersion===10;
  const s=freshState();
  s.createdAt=raw.createdAt??Date.now(); s.generation=raw.generation??raw.q?.generation??0; s.displayCounter=raw.displayCounter??raw.logs?.length??0;
  s.q=migrateQ(raw.q,{legacy99,repairV10});
  s.archives=(raw.archives??raw.logs??[]).map((x,i)=>migrateArchive(x,i,{legacy99,repairV10}));
  s.traces=tracesFromLegacy(raw);
  s.recordTab=raw.recordTab||'LINEAGE';
  s.monetization=raw.monetization||{plan:'FREE',purchasedAt:null};
  s.scenario=raw.scenario||s.scenario;
  s.observations=raw.observations||s.observations;
  s.signals=raw.signals||s.signals;
  s.cpu=raw.cpu||s.cpu;
  s.pvp=raw.pvp||s.pvp;
  s.ui=raw.ui||s.ui;
  const l=createLineage(1); l.members=s.archives.filter(a=>a.inheritable);
  s.lineages=raw.lineages?.length ? raw.lineages.map((lineage,li)=>({
    ...lineage,
    members:(lineage.members||[]).map((member,mi)=>migrateArchive(member,mi,{legacy99,repairV10})),
    mutations:[...(lineage.mutations||[])]
  })) : [l];
  s.activeLineageId=raw.activeLineageId??(s.q?(s.lineages.find(x=>x.active)?.id||s.lineages[0]?.id||l.id):(l.members.length?l.id:null));
  s.schemaVersion=SCHEMA_VERSION;
  return s;
}
