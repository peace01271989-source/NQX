import { TYPE_DEFS, TYPE_BY_ID } from './config.js';
import { seeded, int, weighted, clamp, chance, pick } from './rng.js';
import { informationStrength, refreshClass } from './information.js';
import { consumeAction, extendLifeFromIntegration, enterUnknownIfNeeded, updateState } from './lifecycle.js';
import { applyGrowth, addEvolution, maybeMatureMutation } from './growth.js';
import { discoverTrace } from './traces.js';

const TYPE_MATCHUP = {
  Q:{REMNANT:-.08}, VEIL:{Q:.08,SIGNAL:-.10}, DRIFT:{REMNANT:.08}, ECHO:{FRAGMENT:.07}, SIGNAL:{VEIL:.10}, ENQ:{Q:.04}
};
function typeMod(a,b){ return TYPE_MATCHUP[a]?.[b] ?? 0; }
function stateMods(q){
  const s=q.state; return {
    power:s==='excited'?1.12:s==='tired'?.88:s==='terminal'?.82:1,
    speed:s==='excited'?1.10:s==='tired'?.87:s==='terminal'?.84:1,
    guard:s==='excited'?.92:s==='terminal'?.86:1,
    variance:s==='unstable'?1.35:1
  };
}
export function makeBattleSnapshot(q){
  refreshClass(q);
  return {
    id:q.id, uid:q.uid, name:q.name, type:q.type, class:q.class, informationStrength:informationStrength(q),
    abilities:{...q.abilities}, hidden:{...q.hidden}, state:q.state, anomaly:q.anomaly, integration:q.integration,
    morphology:{...q.morphology}, visualSeed:q.visualSeed, visual:{...q.visual}, nonce:cryptoRandom()
  };
}
function cryptoRandom(){
  if(globalThis.crypto?.getRandomValues){const a=new Uint32Array(2);crypto.getRandomValues(a);return [...a].map(x=>x.toString(16)).join('')}
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}
function battlePotential(q){
  const a=q.abilities||{},h=q.hidden||{};
  const state=q.state==='excited'?1.05:q.state==='stable'?1:q.state==='unstable'?.96:q.state==='tired'?.9:q.state==='terminal'?.84:1;
  const base=(informationStrength(q)*.34)+((a.POWER??0)*.18)+((a.SPEED??0)*.12)+((a.ABSORB??0)*.14)+((a.ADAPT??0)*.12)+((a.GUARD??0)*.06)+((h.INSTINCT??0)*.02)+((h.MUTATION??0)*.02);
  return Math.max(1,base*state);
}
function breakthroughChance(a,b){
  const ap=battlePotential(a), bp=battlePotential(b);
  const delta=ap-bp;
  let p=1/(1+Math.exp(-delta/115));
  p+=typeMod(a.type,b.type)*.55;
  if(a.class==='unknown'&&b.class!=='unknown')p+=.035;
  if(b.class==='unknown'&&a.class!=='unknown')p-=.035;
  return clamp(p,.05,.95);
}
function breakthroughOutlook(a,b){
  if(b.class==='unknown')return 'UNDEFINED / 解析不能';
  const p=breakthroughChance(a,b);
  if(p>=.82)return 'DOMINANT / 圧倒的優勢';
  if(p>=.65)return 'FAVORABLE / 優勢';
  if(p>=.45)return 'EVEN / 拮抗';
  if(p>=.25)return 'UNFAVORABLE / 不利';
  return 'CRITICAL / 極めて危険';
}
export function generateCpuOpponent(q,state,now=Date.now()){
  const key=new Date(now).toISOString().slice(0,10); state.cpu.daily[key]??={observed:0,battled:0}; const count=++state.cpu.daily[key].observed;
  const rng=seeded(`${q.uid}|cpu|${count}|${key}|${now}`);
  let bands=[
    {id:'much-lower',weight:15,min:.45,max:.70},
    {id:'lower',weight:25,min:.70,max:.90},
    {id:'peer',weight:30,min:.90,max:1.12},
    {id:'higher',weight:20,min:1.12,max:1.35},
    {id:'much-higher',weight:9,min:1.35,max:1.70},
    {id:'abnormal',weight:1,min:1.70,max:2.25}
  ];
  if(count>=6){bands=bands.map(x=>({...x,weight:x.id.includes('higher')||x.id==='abnormal'?x.weight*1.35:x.weight*.86}))}
  if(count>=11){bands=bands.map(x=>({...x,weight:x.id==='much-higher'||x.id==='abnormal'?x.weight*1.6:x.weight*.82}))}
  const band=weighted(rng,bands); const own=Math.max(30,informationStrength(q));
  const target=Math.max(25,Math.round(own*(band.min+rng()*(band.max-band.min))));
  const type=weighted(rng,TYPE_DEFS.map(t=>({...t,weight:t.rate}))).id;
  const per=Math.max(18,Math.min(666,Math.round(target/1.15)));
  const abilities={LIFE:per,POWER:per,GUARD:per,SPEED:per,ABSORB:per,ADAPT:per};
  Object.keys(abilities).forEach(k=>abilities[k]=clamp(abilities[k]+int(rng,-35,35),0,666));
  const opponent={
    id:`CPU-${int(rng,1000,9999)}`,uid:`cpu-${now}-${int(rng,0,99999)}`,name:'',type,class:'aberrant',
    abilities,hidden:{POTENTIAL:int(rng,20,500),DECAY:int(rng,20,500),MUTATION:int(rng,20,500),INSTINCT:int(rng,20,500)},
    integration:Math.max(0,Math.round(target*.22)),anomaly:Math.max(0,Math.round(target*.08)),state:pick(rng,['stable','stable','stable','excited','unstable']),
    morphology:{membrane:int(rng,10,90),tendrils:int(rng,10,90),shell:int(rng,0,80),crystal:int(rng,0,80),asymmetry:int(rng,10,90),fragments:int(rng,0,85),glow:int(rng,20,95)},
    visualSeed:int(rng,1,2**30),visual:{coreHue:int(rng,180,300),glowHue:int(rng,160,320),asymmetry:rng()>.5?1:-1},
    risk:'',band:band.id
  };
  refreshClass(opponent);
  if(opponent.class==='unknown'){ opponent.class='dominion'; opponent.anomaly=Math.min(200,opponent.anomaly); refreshClass(opponent); }
  opponent.risk=breakthroughOutlook(q,opponent);
  return opponent;
}
export function canEncounterCpuUnknown(q,state,rng=Math.random){
  refreshClass(q);
  const traceHigh=state.traces.filter(n=>n>=556).length;
  if(q.class!=='dominion' || informationStrength(q)<500 || q.battle.wins<10 || traceHigh<3) return false;
  return rng()<.005;
}
export function generateCpuUnknown(q,state,now=Date.now()){
  const rng=seeded(`${q.uid}|UNKNOWN|${state.traces.join(',')}|${now}`); const base=690+int(rng,0,320);
  const per=Math.min(666,Math.round(base/1.15));
  const x={id:'UNDEFINED',uid:`unknown-${now}`,name:'',type:weighted(rng,TYPE_DEFS.map(t=>({...t,weight:t.rate}))).id,class:'unknown',
  abilities:{LIFE:per,POWER:per,GUARD:per,SPEED:per,ABSORB:per,ADAPT:per},hidden:{POTENTIAL:600,DECAY:500,MUTATION:620,INSTINCT:640},
  integration:260,anomaly:280,state:'unstable',morphology:{membrane:20,tendrils:65,shell:15,crystal:40,asymmetry:95,fragments:80,glow:99},visualSeed:int(rng,1,2**30),visual:{coreHue:225,glowHue:0,asymmetry:-1},risk:'UNDEFINED / 解析不能'};
  refreshClass(x); return x;
}
function vital(q){return 180+(q.abilities.LIFE??0)*.9+(q.abilities.GUARD??0)*.45}
function phaseBreakChance(a,b){
  const diff=Math.abs(informationStrength(a)-informationStrength(b));
  let p=diff<100?0:diff<200?.01:diff<300?.02:.03;
  p*=1+((a.hidden?.INSTINCT??0)+(a.hidden?.MUTATION??0)+(a.abilities?.ADAPT??0))/1998;
  if(a.state==='unstable'||a.state==='terminal')p*=1.2;return Math.min(.08,p);
}
function hit(att,def,rng,phaseBreak=false){
  const am=stateMods(att), dm=stateMods(def);
  let dmg=20+(att.abilities.POWER??0)*.32*am.power+(att.abilities.SPEED??0)*.08*am.speed-(def.abilities.GUARD??0)*.18*dm.guard;
  dmg*=1+typeMod(att.type,def.type);
  const strengthDelta=informationStrength(att)-informationStrength(def);
  dmg*=Math.max(.76,Math.min(1.24,1+strengthDelta/1400));
  dmg*=.88+rng()*.24*am.variance;
  if(phaseBreak)dmg*=1.45;
  return Math.max(1,Math.round(dmg));
}
export function resolveBattle(aSnap,bSnap,seedExtra=''){
  const seed=[aSnap.uid,aSnap.nonce,bSnap.uid,bSnap.nonce,seedExtra].sort().join('|'); const rng=seeded(seed);
  const breakthrough=breakthroughChance(aSnap,bSnap);
  const winner=chance(rng,breakthrough)?'A':'B';
  let av=vital(aSnap),bv=vital(bSnap); const turns=[];
  for(let turn=1;turn<=3;turn++){
    const progress=turn/3;
    const aBreak=chance(rng,phaseBreakChance(aSnap,bSnap)); const bBreak=chance(rng,phaseBreakChance(bSnap,aSnap));
    const aHit=hit(aSnap,bSnap,rng,aBreak); const bHit=hit(bSnap,aSnap,rng,bBreak);
    const swing=.72+progress*.2;
    if(winner==='A'){
      bv-=Math.max(1,Math.round(aHit*(1.05+swing)));
      av-=Math.max(1,Math.round(bHit*(.38+(1-progress)*.28)));
    }else{
      av-=Math.max(1,Math.round(bHit*(1.05+swing)));
      bv-=Math.max(1,Math.round(aHit*(.38+(1-progress)*.28)));
    }
    const events=[{side:'A',damage:aHit,phaseBreak:aBreak},{side:'B',damage:bHit,phaseBreak:bBreak}];
    turns.push({turn,events,aVital:Math.max(0,av),bVital:Math.max(0,bv)});
  }
  if(winner==='A'&&av<=bv)av=bv+Math.max(1,Math.round(vital(aSnap)*.04));
  if(winner==='B'&&bv<=av)bv=av+Math.max(1,Math.round(vital(bSnap)*.04));
  const last=turns.at(-1);if(last){last.aVital=Math.max(0,av);last.bVital=Math.max(0,bv)}
  return {winner,turns,seed,aVital:Math.max(0,av),bVital:Math.max(0,bv),mode:'breakthrough'};
}
export function applyCpuBattleResult(state,opponent,result,rng=Math.random){
  const q=state.q; state.cpu.daily[new Date().toISOString().slice(0,10)].battled++; consumeAction(q,2); applyGrowth(q,2+Math.floor(rng()*3),'battle');
  if(result.winner==='A'){
    q.battle.wins++;q.battle.cpuWins++;q.integration=clamp(q.integration+Math.max(2,Math.round(informationStrength(opponent)*.04)),0,666);
    const k=pick(rng,Object.keys(q.abilities));q.abilities[k]=clamp(q.abilities[k]+2+Math.floor(rng()*8),0,666);
    extendLifeFromIntegration(q,informationStrength(opponent),rng);addEvolution(q,'侵食型',2);addEvolution(q,'統合型',2);
    const p=.15*(TYPE_BY_ID[q.type]?.trace??1)*(q.class==='dominion'?1.25:q.class==='unknown'?1.5:1); const trace=rng()<p?discoverTrace(state,rng,{bonus:p}):null;
    const mutation=maybeMatureMutation(q,rng,informationStrength(opponent)>informationStrength(q)?1.8:1.2);enterUnknownIfNeeded(q,Date.now(),rng);updateState(q);
    return {won:true,trace,mutation};
  }
  q.battle.losses++;q.battle.cpuLosses++;return {won:false};
}
