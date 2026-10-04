import test from 'node:test';
import assert from 'node:assert/strict';
import { TRACE_DATA } from '../src/data/traces.js';
import { freshState } from '../src/core/state.js';
import { createAberrant } from '../src/core/factory.js';
import { informationStrength, refreshClass, displayStrengthRange, displayAbility } from '../src/core/information.js';
import { makeBattleSnapshot, resolveBattle } from '../src/core/battle.js';
import { createLineage, archiveEntry, closeOrContinueLineage } from '../src/core/lineage.js';
import { migrateState } from '../src/core/migrate.js';
import { entitlements, setPlan } from '../src/core/monetization.js';
import { MONETIZATION } from '../src/core/config.js';
import { discoverTrace } from '../src/core/traces.js';

function qFixed(id='Q-0001'){
  return {
    id,uid:id,type:'NQX',class:'aberrant',name:'',generation:1,bornAt:Date.now()-1000,growth:50,
    abilities:{LIFE:100,POWER:100,GUARD:100,SPEED:100,ABSORB:100,ADAPT:100},
    hidden:{POTENTIAL:100,DECAY:100,MUTATION:100,INSTINCT:100},integration:50,anomaly:10,state:'stable',
    morphology:{membrane:50,tendrils:50,shell:30,crystal:20,asymmetry:40,fragments:20,glow:50},survival:{stability:50,persistence:50,recovery:50},
    personality:'quiet',evolution:{'侵食型':0,'防壁型':0,'統合型':0,'漂流型':0,'適応型':0,'異常型':0},mutationHistory:[],visualSeed:123,visual:{coreHue:220,glowHue:250,asymmetry:1},
    battle:{wins:0,losses:0,cpuWins:0,cpuLosses:0,pvpWins:0,pvpLosses:0},actionLifeMax:100,actionLifeRemaining:100,lifeEndsAt:Date.now()+10000000
  };
}

test('TRACE is exactly 666, unique and one record per TRACE',()=>{
  assert.equal(TRACE_DATA.length,666);
  assert.equal(new Set(TRACE_DATA.map(x=>x.no)).size,666);
  assert.equal(new Set(TRACE_DATA.map(x=>x.short)).size,666);
  assert.equal(new Set(TRACE_DATA.map(x=>x.accessKey)).size,666);
  assert.equal(TRACE_DATA[0].no,1);assert.equal(TRACE_DATA.at(-1).no,666);
});

test('trace discovery cannot blank on an already owned trace',()=>{
  const state=freshState();state.traces=Array.from({length:665},(_,i)=>i+1);
  const t=discoverTrace(state,()=>0.5);assert.equal(t.no,666);assert.equal(state.traces.length,666);
});

test('information strength follows frozen formula and class thresholds',()=>{
  const q=qFixed();
  assert.equal(informationStrength(q),Math.floor(100*.85+50*.5+10));
  for(const k of Object.keys(q.abilities))q.abilities[k]=360;q.integration=40;q.anomaly=10;refreshClass(q);assert.equal(q.class,'dominion');
  for(const k of Object.keys(q.abilities))q.abilities[k]=666;q.integration=220;q.anomaly=20;refreshClass(q);assert.equal(q.class,'unknown');
});



test('player parameter display reveals only the current class observation ceiling',()=>{
  const q=qFixed();refreshClass(q);
  assert.equal(q.class,'aberrant');
  assert.equal(displayStrengthRange(q),`${informationStrength(q)} / 332`);
  assert.equal(displayAbility(q,184).label,'184 / 332');

  for(const k of Object.keys(q.abilities))q.abilities[k]=360;q.integration=40;q.anomaly=10;refreshClass(q);
  assert.equal(q.class,'dominion');
  assert.equal(displayStrengthRange(q),`${informationStrength(q)} / 666`);
  assert.equal(displayAbility(q,444).label,'444 / 666');

  for(const k of Object.keys(q.abilities))q.abilities[k]=666;q.integration=220;q.anomaly=20;refreshClass(q);
  assert.equal(q.class,'unknown');
  assert.equal(displayStrengthRange(q),'>666');
  assert.equal(displayAbility(q,666).label,'666 / UNDEFINED');
});

test('v10 reload scaling bug is repaired without deleting the active aberrant',()=>{
  const raw={schemaVersion:10,generation:1,displayCounter:1,q:{
    id:'Q-0001',uid:'nqx-test',generation:1,type:'Q',bornAt:Date.now(),growth:2,actionCount:1,
    abilities:{LIFE:444,POWER:538,GUARD:491,SPEED:343,ABSORB:525,ADAPT:256},
    hidden:{POTENTIAL:100,DECAY:80,MUTATION:80,INSTINCT:80},integration:16,anomaly:6,state:'stable'
  },archives:[],traces:[]};
  const s=migrateState(raw);
  assert.deepEqual(s.q.abilities,{LIFE:66,POWER:80,GUARD:73,SPEED:51,ABSORB:78,ADAPT:38});
  assert.equal(s.q.class,'aberrant');
  assert.ok(s.q.migrationRepairs.includes('V10_ABILITY_SCALE_REPAIR'));
});

test('current-schema low ability values are normalized but never rescaled',()=>{
  const raw={schemaVersion:11,q:{id:'Q-0099',uid:'current',generation:1,type:'NQX',bornAt:Date.now(),growth:0,
    abilities:{LIFE:60,POWER:70,GUARD:80,SPEED:90,ABSORB:99,ADAPT:100},integration:0,anomaly:0,state:'stable'},archives:[],traces:[]};
  const s=migrateState(raw);
  assert.deepEqual(s.q.abilities,{LIFE:60,POWER:70,GUARD:80,SPEED:90,ABSORB:99,ADAPT:100});
});

test('battle is deterministic for identical snapshots and seed',()=>{
  const a=makeBattleSnapshot(qFixed('A'));const b=makeBattleSnapshot({...qFixed('B'),type:'Q'});
  a.nonce='aaa';b.nonce='bbb';
  const r1=resolveBattle(a,b,'same');const r2=resolveBattle(a,b,'same');assert.deepEqual(r1,r2);assert.equal(r1.turns.length,3);
});

test('CPU loss continues lineage but lifespan/PvP style reasons terminate',()=>{
  const state=freshState();state.lineages=[createLineage(1)];state.activeLineageId='LINEAGE-001';
  const q=qFixed();const cpu=archiveEntry(q,'cpu-loss');assert.equal(closeOrContinueLineage(state,cpu),'CONTINUES');assert.equal(state.activeLineageId,'LINEAGE-001');
  const q2=qFixed('Q-0002');const pvp=archiveEntry(q2,'pvp-loss');assert.equal(closeOrContinueLineage(state,pvp),'TERMINATED');assert.equal(state.activeLineageId,null);
});

test('legacy migration converts 99-scale stats, origin and legacy fragments without deletion',()=>{
  const legacy={schemaVersion:9,generation:3,q:{id:'Q-0003',generation:3,bornAt:Date.now(),abilities:{LIFE:99,POWER:50,GUARD:20,SPEED:10,ABSORB:70,ADAPT:80},origin:'virus-like',morphology:{},state:'hungry'},fragments:[{id:'TRACE-118-A',traceNo:118},{id:'TRACE-118-B',traceNo:118},{id:'TRACE-284-A',traceNo:284}],logs:[]};
  const s=migrateState(legacy);assert.equal(s.q.abilities.LIFE,666);assert.ok(s.q.morphology.legacyOrigin);assert.equal('origin' in s.q,false);assert.deepEqual(s.traces,[118,284]);assert.equal(s.q.state,'deprived');
});

test('monetization entitlements match frozen 250/500 plans',()=>{
  const s=freshState();let e=entitlements(s);assert.equal(e.normalAds,true);assert.equal(e.individual,false);
  setPlan(s,MONETIZATION.normalAdFree);e=entitlements(s);assert.equal(e.normalAds,false);assert.equal(e.rewardAds,true);assert.equal(e.individual,true);assert.equal(e.generation,false);
  setPlan(s,MONETIZATION.fullAdFree);e=entitlements(s);assert.equal(e.normalAds,false);assert.equal(e.rewardAds,false);assert.equal(e.instantReward,true);assert.equal(e.individual,true);assert.equal(e.generation,true);assert.equal(e.inheritance,true);
});


test('a newly observed aberrant cannot begin as DOMINION or UNKNOWN',()=>{
  const lineage=createLineage(1);
  for(let i=1;i<=250;i++){
    const q=createAberrant({generation:i,displayNumber:i,lineage,originHash:`seed-${i}`});
    assert.equal(q.class,'aberrant');
    assert.ok(informationStrength(q)<=332);
  }
});

test('new aberrant always uses supported type and required fields',()=>{
  const q=createAberrant({generation:1,displayNumber:1,lineage:createLineage(1),originHash:'abc'});assert.match(q.id,/^Q-\d{4}$/);assert.ok(q.visualSeed);assert.equal(q.growth,0);assert.ok(q.lifeEndsAt>q.bornAt);assert.ok(q.actionLifeRemaining>=60&&q.actionLifeRemaining<=140);
});

test('PvP destructive result requires matching result confirmation and ACK handshake',async()=>{
  const {createChallenge,createResponse,resolvePair,createResultConfirm,verifyResultConfirm,createAck,verifyAck,parsePvp}=await import('../src/core/pvp.js');
  const a=qFixed('A'), b={...qFixed('B'),uid:'B',id:'B'};
  const ch=createChallenge(a,1000);const res=createResponse(b,ch.payload,1001);const pair=resolvePair(ch.payload,res.payload);
  const confirm=createResultConfirm(pair,1002);const parsedConfirm=parsePvp(confirm.text,1003);
  assert.equal(verifyResultConfirm(pair,parsedConfirm),true);
  const ack=createAck(pair,1004);const parsedAck=parsePvp(ack.text,1005);
  assert.equal(verifyAck(pair,parsedAck),true);
  assert.equal(verifyAck(pair,{...parsedAck,signature:'bad'}),false);
});

test('CREATOR designation is not revealed before TRACE 666',()=>{
  const state=freshState();state.traces=Array.from({length:664},(_,i)=>i+1);state.traces.push(665);
  state.scenario.observer0=false;state.scenario.creatorRevealed=false;
  const t=discoverTrace(state,()=>0.5);assert.equal(t.no,666);assert.equal(state.scenario.observer0,true);assert.equal(state.scenario.creatorRevealed,true);
});

test('EXTERNAL OBSERVATION is a live action: it records code use, consumes action life and changes the active aberrant', async()=>{
  const { applyExternalObservation, canExternalObserve } = await import('../src/core/observation.js');
  const state=freshState();
  state.q=createAberrant({generation:1,displayNumber:1,lineage:createLineage(1),originHash:'obs-action'});
  const beforeLife=state.q.actionLifeRemaining;
  const beforeGrowth=state.q.growth;
  const now=Date.now()+1000;
  assert.equal(canExternalObserve(state,'hash-live',now).ok,true);
  const out=applyExternalObservation(state,{hash:'hash-live',format:'QR_CODE'},now);
  assert.ok(out.delta>=2);
  assert.equal(state.observations.codes['hash-live'].format,'QR_CODE');
  assert.ok(state.q.actionLifeRemaining<beforeLife);
  assert.ok(state.q.growth>=beforeGrowth);
});

test('SLEEP is timestamp based and resolves after sixty minutes without a background timer', async()=>{
  const { startSleep, sleepStatus, resolveSleep } = await import('../src/core/lifecycle.js');
  const q=createAberrant({generation:1,displayNumber:1,lineage:createLineage(1),originHash:'sleep-action'});
  const now=1_000_000;
  startSleep(q,now);
  assert.equal(sleepStatus(q,now+30*60*1000).active,true);
  assert.equal(sleepStatus(q,now+60*60*1000).complete,true);
  const out=resolveSleep(q,now+60*60*1000,false,()=>0);
  assert.equal(out.early,false);
  assert.ok(q.sleep.completedAt);
});

test('CPU BATTLE action produces three turns and applies a confirmed win result to state', async()=>{
  const { generateCpuOpponent, makeBattleSnapshot, resolveBattle, applyCpuBattleResult } = await import('../src/core/battle.js');
  const state=freshState();
  state.q=createAberrant({generation:1,displayNumber:1,lineage:createLineage(1),originHash:'battle-action'});
  for(const k of Object.keys(state.q.abilities)) state.q.abilities[k]=300;
  const opp=generateCpuOpponent(state.q,state,Date.now());
  const a=makeBattleSnapshot(state.q), b=makeBattleSnapshot(opp);a.nonce='action-a';b.nonce='action-b';
  const result=resolveBattle(a,b,'action-seed');
  assert.equal(result.turns.length,3);
  // Application path must mutate battle counters for the declared result.
  const forced={...result,winner:'A'};
  const before=state.q.battle.cpuWins;
  const out=applyCpuBattleResult(state,opp,forced,()=>0);
  assert.equal(out.won,true);
  assert.equal(state.q.battle.cpuWins,before+1);
});
