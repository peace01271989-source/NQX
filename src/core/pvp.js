import { makeBattleSnapshot, resolveBattle } from './battle.js';
import { ABILITIES, TYPE_DEFS } from './config.js';

const VERSION=2, TTL=10000;
const TYPES=new Set(TYPE_DEFS.map(x=>x.id));
const CLASSES=new Set(['aberrant','dominion','unknown']);
const STATES=new Set(['stable','deprived','excited','tired','unstable','terminal']);
const b64e=s=>btoa(unescape(encodeURIComponent(s))).replace(/=+$/,'');
const b64d=s=>decodeURIComponent(escape(atob(s.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(s.length/4)*4,'='))));
const wrap=payload=>({payload,text:`NQXPVP:${b64e(JSON.stringify(payload))}`});
const finite=(v,min,max)=>Number.isFinite(Number(v))&&Number(v)>=min&&Number(v)<=max;

function validSnapshot(s){
  if(!s||typeof s!=='object')return false;
  if(typeof s.uid!=='string'||s.uid.length<1||s.uid.length>128)return false;
  if(typeof s.nonce!=='string'||s.nonce.length<1||s.nonce.length>128)return false;
  if(!TYPES.has(s.type)||!CLASSES.has(s.class)||!STATES.has(s.state))return false;
  if(!s.abilities||ABILITIES.some(k=>!finite(s.abilities[k],0,666)))return false;
  if(!finite(s.integration,0,666)||!finite(s.anomaly,0,666)||!finite(s.hiddenCombat,0,1332))return false;
  if(s.hidden!=null)return false;
  if(!finite(s.visualSeed,0,2**31))return false;
  return true;
}
function validEnvelope(p,now){
  if(!p||p.v!==VERSION||typeof p.k!=='string'||!finite(p.createdAt,0,Number.MAX_SAFE_INTEGER)||!finite(p.expiresAt,0,Number.MAX_SAFE_INTEGER))return false;
  if(now>p.expiresAt||p.expiresAt-p.createdAt>TTL+1000)return false;
  if(p.k==='CHALLENGE')return typeof p.challenge==='string'&&p.challenge.length<=128&&validSnapshot(p.snapshot);
  if(p.k==='RESPONSE')return typeof p.challenge==='string'&&p.challenge.length<=128&&validSnapshot(p.snapshot);
  if(p.k==='RESULT_CONFIRM'||p.k==='RESULT_ACK')return typeof p.challenge==='string'&&typeof p.signature==='string'&&p.signature.length<=64;
  return false;
}

export function createChallenge(q,now=Date.now()){
  const payload={v:VERSION,k:'CHALLENGE',createdAt:now,expiresAt:now+TTL,challenge:cryptoNonce(),snapshot:makeBattleSnapshot(q)};
  return wrap(payload);
}
export function createResponse(q,challenge,now=Date.now()){
  if(!challenge||challenge.k!=='CHALLENGE'||now>challenge.expiresAt||!validSnapshot(challenge.snapshot))throw new Error('challenge expired');
  const payload={v:VERSION,k:'RESPONSE',createdAt:now,expiresAt:now+TTL,challenge:challenge.challenge,snapshot:makeBattleSnapshot(q)};
  return wrap(payload);
}
export function parsePvp(text,now=Date.now()){
  try{
    if(!String(text).startsWith('NQXPVP:'))return null;
    const p=JSON.parse(b64d(String(text).slice(7)));
    if(!validEnvelope(p,now))return null;
    return p;
  }catch{return null}
}
export function resolvePair(challenge,response){
  if(!challenge||!response||response.challenge!==challenge.challenge)throw new Error('challenge mismatch');
  if(!validSnapshot(challenge.snapshot)||!validSnapshot(response.snapshot))throw new Error('invalid snapshot');
  const result=resolveBattle(challenge.snapshot,response.snapshot,challenge.challenge);
  return {result,challenge,response,signature:simpleSig(result.seed,result.winner)};
}
export function createResultConfirm(pair,now=Date.now()){
  if(!pair?.challenge?.challenge||!pair?.signature)throw new Error('invalid pair');
  return wrap({v:VERSION,k:'RESULT_CONFIRM',createdAt:now,expiresAt:now+TTL,challenge:pair.challenge.challenge,signature:pair.signature});
}
export function verifyResultConfirm(pair,payload){
  return !!(pair&&payload&&payload.k==='RESULT_CONFIRM'&&payload.challenge===pair.challenge.challenge&&payload.signature===pair.signature);
}
export function createAck(pair,now=Date.now()){
  if(!pair?.challenge?.challenge||!pair?.signature)throw new Error('invalid pair');
  return wrap({v:VERSION,k:'RESULT_ACK',createdAt:now,expiresAt:now+TTL,challenge:pair.challenge.challenge,signature:pair.signature});
}
export function verifyAck(pair,payload){
  return !!(pair&&payload&&payload.k==='RESULT_ACK'&&payload.challenge===pair.challenge.challenge&&payload.signature===pair.signature);
}
function cryptoNonce(){
  if(globalThis.crypto?.getRandomValues){const a=new Uint32Array(2);crypto.getRandomValues(a);return [...a].map(x=>x.toString(16).padStart(8,'0')).join('')}
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}
function simpleSig(seed,w){let h=2166136261;for(const c of `${seed}|${w}`){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return (h>>>0).toString(16).padStart(8,'0');}
