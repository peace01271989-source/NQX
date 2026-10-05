import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, saveState } from '../src/core/state.js';
import { createAberrant } from '../src/core/factory.js';
import { createLineage } from '../src/core/lineage.js';
import { startSleep, resolveSleep, enterUnknownIfNeeded } from '../src/core/lifecycle.js';
import { makeBattleSnapshot, generateCpuOpponent } from '../src/core/battle.js';
import { createChallenge } from '../src/core/pvp.js';

class MemoryStorage{
  constructor(){this.map=new Map()}
  getItem(k){return this.map.has(k)?this.map.get(k):null}
  setItem(k,v){this.map.set(k,String(v))}
  removeItem(k){this.map.delete(k)}
  clear(){this.map.clear()}
}

test('stale tab cannot overwrite a newer save',()=>{
  globalThis.localStorage=new MemoryStorage();
  const live=freshState();
  const stale=freshState();
  live.q={uid:'live'};
  assert.equal(saveState(live),true);
  assert.equal(live.saveRevision,1);
  stale.q={uid:'stale'};
  assert.equal(saveState(stale),false);
  const stored=JSON.parse(localStorage.getItem('nqx.save'));
  assert.equal(stored.q.uid,'live');
});

test('sleep never extends action lifespan',()=>{
  const q=createAberrant({generation:1,displayNumber:1,lineage:createLineage(1),originHash:'sleep-hardening'});
  q.actionLifeRemaining=Math.max(1,q.actionLifeRemaining-7);
  const before=q.actionLifeRemaining;
  const now=1_000_000;
  startSleep(q,now);
  resolveSleep(q,now+60*60*1000,false,()=>0);
  assert.equal(q.actionLifeRemaining,before);
});

test('UNKNOWN runtime limits initialize even if class was refreshed earlier',()=>{
  const q=createAberrant({generation:1,displayNumber:1,lineage:createLineage(1),originHash:'unknown-hardening'});
  for(const k of Object.keys(q.abilities))q.abilities[k]=666;
  q.integration=300;q.anomaly=200;q.class='unknown';q.unknownEndsAt=null;q.unknownActionsRemaining=null;
  assert.equal(enterUnknownIfNeeded(q,2_000_000,()=>0),true);
  assert.equal(q.unknownEndsAt,2_000_000+24*3600000);
  assert.equal(q.unknownActionsRemaining,12);
});

test('battle snapshots do not expose raw hidden stats',()=>{
  const q=createAberrant({generation:1,displayNumber:1,lineage:createLineage(1),originHash:'snapshot-hardening'});
  const s=makeBattleSnapshot(q);
  assert.equal('hidden' in s,false);
  assert.ok(Number.isFinite(s.hiddenCombat));
});

test('CPU encounter cannot be rerolled by closing and immediately reopening',()=>{
  const state=freshState();
  state.q=createAberrant({generation:1,displayNumber:1,lineage:createLineage(1),originHash:'cpu-hardening'});
  const a=generateCpuOpponent(state.q,state,5_000_000);
  const b=generateCpuOpponent(state.q,state,5_000_100);
  assert.equal(a.uid,b.uid);
});

test('PvP challenge contains only the derived hidden combat value',()=>{
  const q=createAberrant({generation:1,displayNumber:1,lineage:createLineage(1),originHash:'pvp-hardening'});
  const ch=createChallenge(q,1000);
  assert.equal('hidden' in ch.payload.snapshot,false);
  assert.ok(Number.isFinite(ch.payload.snapshot.hiddenCombat));
});
