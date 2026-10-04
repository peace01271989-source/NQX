import { TRACE_DATA } from '../data/traces.js';
import { TRACE_PHASES } from './config.js';
import { pick } from './rng.js';

export const traceByNo=no=>TRACE_DATA[Number(no)-1] ?? null;
export function phaseForTrace(no){ return TRACE_PHASES.find(p=>no>=p.start&&no<=p.end) ?? TRACE_PHASES[0]; }
export function traceProgress(state){ return {count:state.traces.length,total:666,ratio:state.traces.length/666}; }
export function discoverTrace(state,rng=Math.random,{bonus=1,forced=false}={}){
  const owned=new Set(state.traces);
  const pool=TRACE_DATA.filter(t=>!owned.has(t.no) && (t.no!==666 || owned.size>=665));
  if(!pool.length) return null;
  const t=pick(rng,pool);
  state.traces.push(t.no); state.traces.sort((a,b)=>a-b);
  state.traceMeta[t.no]={obtainedAt:Date.now(),bonus,forced};
  if(t.no>=556) state.scenario.observer0=true;
  if(t.no===666) state.scenario.creatorRevealed=true;
  return t;
}
export const CREATOR_MESSAGE = `遠くを見てくれて、ありがとう。
あなたが観測していたものは、
最後まで完全には理解できなかったと思う。
それでいい。
私も、この世界のすべてを理解しているわけではない。
ただ、ひとつだけ伝えたかった。
宇宙のどれだけ遠くに誰かを探しても、
あなたの近くにも、
あなたには完全には理解できない誰かがいる。
だから、ときどき見ていてほしい。
変わったことに気づいてほしい。
まだそこにいることを、確かめてほしい。
観測とは、理解することではない。
見失わないことだ。`;
