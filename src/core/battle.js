import '../battle-upgrade.js';
import { TYPE_DEFS, TYPE_BY_ID } from './config.js';
import { seeded, int, weighted, clamp, chance, pick } from './rng.js';
import { informationStrength, refreshClass } from './information.js';
import { consumeAction, extendLifeFromIntegration, enterUnknownIfNeeded, updateState } from './lifecycle.js';
import { applyGrowth, addEvolution, maybeMatureMutation } from './growth.js';
import { discoverTrace } from './traces.js';

const TYPE_MATCHUP={
  Q:{REMNANT:-.08},VEIL:{Q:.08,SIGNAL:-.10},DRIFT:{REMNANT:.08},ECHO:{FRAGMENT:.07},SIGNAL:{VEIL:.10},ENQ:{Q:.04}
};
const typeMod=(a,b)=>TYPE_MATCHUP[a]?.[b]??0;

function hiddenCombat(q){
  if(Number.isFinite(Number(q.hiddenCombat)))return clamp(Number(q.hiddenCombat),0,1332);
  return clamp(Number(q.hidden?.INSTINCT??0)+Number(q.hidden?.MUTATION??0),0,1332);
}
function cryptoRandom(){
  if(globalThis.crypto?.getRandomValues){const a=new Uint32Array(2);crypto.getRandomValues(a);return [...a].map(x=>x.toString(16)).join('')}
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}
export function makeBattleSnapshot(q){
  refreshClass(q);
  return {
    id:q.id,uid:q.uid,name:q.name,type:q.type,class:q.class,informationStrength:informationStrength(q),
    abilities:{...q.abilities},hiddenCombat:hiddenCombat(q),state:q.state,anomaly:q.anomaly,integration:q.integration,
    morphology:{...q.morphology},visualSeed:q.visualSeed,visual:{...q.visual},nonce:cryptoRandom()
  };
}
function battlePotential(q){
  const a=q.abilities||{};
  const state=q.state==='excited'?1.05:q.state==='stable'?1:q.state==='unstable'?.96:q.state==='tired'?.9:q.state==='terminal'?.84:1;
  const base=(informationStrength(q)*.34)+((a.POWER??0)*.18)+((a.SPEED??0)*.12)+((a.ABSORB??0)*.14)+((a.ADAPT??0)*.12)+((a.GUARD??0)*.06)+(hiddenCombat(q)*.02);
  return Math.max(1,base*state);
}
function breakthroughChance(a,b){
  const delta=battlePotential(a)-battlePotential(b);
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
  state.cpu??={daily:{},cooldownUntil:0,pendingOpponent:null};
  const pending=state.cpu.pendingOpponent;
  if(pending?.expiresAt>now&&pending?.opponent)return pending.opponent;
  const key=new Date(now).toISOString().slice(0,10);state.cpu.daily[key]??={observed:0,battled:0};const count=++state.cpu.daily[key].observed;
  const rng=seeded(`${q.uid}|cpu|${count}|${key}|${now}`);
  let bands=[
    {id:'much-lower',weight:15,min:.45,max:.70},{id:'lower',weight:25,min:.70,max:.90},{id:'peer',weight:30,min:.90,max:1.12},
    {id:'higher',weight:20,min:1.12,max:1.35},{id:'much-higher',weight:9,min:1.35,max:1.70},{id:'abnormal',weight:1,min:1.70,max:2.25}
  ];
  if(count>=6)bands=bands.map(x=>({...x,weight:x.id.includes('higher')||x.id==='abnormal'?x.weight*1.35:x.weight*.86}));
  if(count>=11)bands=bands.map(x=>({...x,weight:x.id==='much-higher'||x.id==='abnormal'?x.weight*1.6:x.weight*.82}));
  const band=weighted(rng,bands),own=Math.max(30,informationStrength(q));
  const target=Math.max(25,Math.round(own*(band.min+rng()*(band.max-band.min))));
  const type=weighted(rng,TYPE_DEFS.map(t=>({...t,weight:t.rate}))).id;
  const per=Math.max(18,Math.min(666,Math.round(target/1.15)));
  const abilities={LIFE:per,POWER:per,GUARD:per,SPEED:per,ABSORB:per,ADAPT:per};
  Object.keys(abilities).forEach(k=>abilities[k]=clamp(abilities[k]+int(rng,-35,35),0,666));
  const opponent={
    id:`CPU-${int(rng,1000,9999)}`,uid:`cpu-${now}-${int(rng,0,99999)}`,name:'',type,class:'aberrant',abilities,
    hidden:{POTENTIAL:int(rng,20,500),DECAY:int(rng,20,500),MUTATION:int(rng,20,500),INSTINCT:int(rng,20,500)},
    integration:Math.max(0,Math.round(target*.22)),anomaly:Math.max(0,Math.round(target*.08)),state:pick(rng,['stable','stable','stable','excited','unstable']),
    morphology:{membrane:int(rng,10,90),tendrils:int(rng,10,90),shell:int(rng,0,80),crystal:int(rng,0,80),asymmetry:int(rng,10,90),fragments:int(rng,0,85),glow:int(rng,20,95)},
    visualSeed:int(rng,1,2**30),visual:{coreHue:int(rng,0,360),glowHue:int(rng,0,360),asymmetry:rng()>.5?1:-1},risk:'',band:band.id
  };
  refreshClass(opponent);
  if(opponent.class==='unknown'){opponent.class='dominion';opponent.anomaly=Math.min(200,opponent.anomaly);refreshClass(opponent)}
  opponent.risk=breakthroughOutlook(q,opponent);
  state.cpu.pendingOpponent={expiresAt:now+10*60*1000,opponent};
  return opponent;
}
export function canEncounterCpuUnknown(q,state,rng=Math.random){
  refreshClass(q);const traceHigh=state.traces.filter(n=>n>=556).length;
  if(q.class!=='dominion'||informationStrength(q)<500||q.battle.wins<10||traceHigh<3)return false;
  return rng()<.005;
}
export function generateCpuUnknown(q,state,now=Date.now()){
  state.cpu??={daily:{},cooldownUntil:0,pendingOpponent:null};
  const pending=state.cpu.pendingOpponent;if(pending?.expiresAt>now&&pending?.opponent)return pending.opponent;
  const rng=seeded(`${q.uid}|UNKNOWN|${state.traces.join(',')}|${now}`),base=690+int(rng,0,320),per=Math.min(666,Math.round(base/1.15));
  const x={id:'UNDEFINED',uid:`unknown-${now}`,name:'',type:weighted(rng,TYPE_DEFS.map(t=>({...t,weight:t.rate}))).id,class:'unknown',
    abilities:{LIFE:per,POWER:per,GUARD:per,SPEED:per,ABSORB:per,ADAPT:per},hidden:{POTENTIAL:600,DECAY:500,MUTATION:620,INSTINCT:640},
    integration:260,anomaly:280,state:'unstable',morphology:{membrane:20,tendrils:65,shell:15,crystal:40,asymmetry:95,fragments:80,glow:99},
    visualSeed:int(rng,1,2**30),visual:{coreHue:225,glowHue:0,asymmetry:-1},risk:'UNDEFINED / 解析不能'};
  refreshClass(x);state.cpu.pendingOpponent={expiresAt:now+10*60*1000,opponent:x};return x;
}

// Lightweight battle core: each of the three turns is an independent probability draw.
// The player never sees the numeric probability; only the qualitative outlook is exposed.
export function resolveBattle(aSnap,bSnap,seedExtra=''){
  const seed=[aSnap.uid,aSnap.nonce,bSnap.uid,bSnap.nonce,seedExtra].sort().join('|'),rng=seeded(seed);
  const base=breakthroughChance(aSnap,bSnap);let aScore=0,bScore=0;const turns=[];
  for(let turn=1;turn<=3;turn++){
    const momentum=(aScore-bScore)*.025;
    const turnChance=clamp(base+momentum,.05,.95);
    const aWon=chance(rng,turnChance);
    if(aWon)aScore++;else bScore++;
    turns.push({turn,winner:aWon?'A':'B',events:[{side:'A',success:aWon},{side:'B',success:!aWon}],aScore,bScore});
  }
  const winner=aScore>bScore?'A':'B';
  return {winner,turns,seed,aScore,bScore,aVital:aScore,bVital:bScore,mode:'three-turn-lottery'};
}
export function applyCpuBattleResult(state,opponent,result,rng=Math.random){
  const q=state.q,key=new Date().toISOString().slice(0,10);state.cpu.daily[key]??={observed:0,battled:0};state.cpu.daily[key].battled++;state.cpu.pendingOpponent=null;
  consumeAction(q,2);applyGrowth(q,2+Math.floor(rng()*3),'battle');
  if(result.winner==='A'){
    q.battle.wins++;q.battle.cpuWins++;q.integration=clamp(q.integration+Math.max(2,Math.round(informationStrength(opponent)*.04)),0,666);
    const k=pick(rng,Object.keys(q.abilities));q.abilities[k]=clamp(q.abilities[k]+2+Math.floor(rng()*8),0,666);
    extendLifeFromIntegration(q,informationStrength(opponent),rng);addEvolution(q,'侵食型',2);addEvolution(q,'統合型',2);
    const p=.15*(TYPE_BY_ID[q.type]?.trace??1)*(q.class==='dominion'?1.25:q.class==='unknown'?1.5:1),trace=rng()<p?discoverTrace(state,rng,{bonus:p}):null;
    const mutation=maybeMatureMutation(q,rng,informationStrength(opponent)>informationStrength(q)?1.8:1.2);enterUnknownIfNeeded(q,Date.now(),rng);updateState(q);
    return {won:true,trace,mutation};
  }
  q.battle.losses++;q.battle.cpuLosses++;return {won:false};
}
