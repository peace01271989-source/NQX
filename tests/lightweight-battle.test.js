import test from 'node:test';
import assert from 'node:assert/strict';
import { makeBattleSnapshot, resolveBattle } from '../src/core/battle.js';

function q(id,power=120){
  return {
    id,uid:id,name:'',type:'NQX',class:'aberrant',
    abilities:{LIFE:power,POWER:power,GUARD:power,SPEED:power,ABSORB:power,ADAPT:power},
    hidden:{POTENTIAL:100,DECAY:100,MUTATION:100,INSTINCT:100},
    integration:40,anomaly:10,state:'stable',growth:50,
    morphology:{membrane:50,tendrils:50,shell:20,crystal:20,asymmetry:40,fragments:20,glow:50},
    visualSeed:1,visual:{coreHue:220,glowHue:250,asymmetry:1}
  };
}

test('battle resolves as exactly three probability turns and majority wins',()=>{
  const a=makeBattleSnapshot(q('A',160));
  const b=makeBattleSnapshot(q('B',120));
  a.nonce='a';b.nonce='b';
  const result=resolveBattle(a,b,'fixed');
  assert.equal(result.mode,'three-turn-lottery');
  assert.equal(result.turns.length,3);
  assert.ok(result.turns.every(t=>t.winner==='A'||t.winner==='B'));
  const aw=result.turns.filter(t=>t.winner==='A').length;
  const bw=3-aw;
  assert.equal(result.aScore,aw);
  assert.equal(result.bScore,bw);
  assert.equal(result.winner,aw>bw?'A':'B');
});

test('same snapshots and seed always reproduce the same three turns',()=>{
  const a=makeBattleSnapshot(q('A'));
  const b=makeBattleSnapshot(q('B'));
  a.nonce='same-a';b.nonce='same-b';
  assert.deepEqual(resolveBattle(a,b,'same'),resolveBattle(a,b,'same'));
});
