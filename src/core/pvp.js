import { makeBattleSnapshot, resolveBattle } from './battle.js';

const VERSION=2, TTL=10000;
const b64e=s=>btoa(unescape(encodeURIComponent(s))).replace(/=+$/,'');
const b64d=s=>decodeURIComponent(escape(atob(s.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(s.length/4)*4,'='))));
const wrap=payload=>({payload,text:`NQXPVP:${b64e(JSON.stringify(payload))}`});

export function createChallenge(q,now=Date.now()){
  const payload={v:VERSION,k:'CHALLENGE',createdAt:now,expiresAt:now+TTL,challenge:cryptoNonce(),snapshot:makeBattleSnapshot(q)};
  return wrap(payload);
}
export function createResponse(q,challenge,now=Date.now()){
  if(!challenge||challenge.k!=='CHALLENGE'||now>challenge.expiresAt)throw new Error('challenge expired');
  const payload={v:VERSION,k:'RESPONSE',createdAt:now,expiresAt:now+TTL,challenge:challenge.challenge,snapshot:makeBattleSnapshot(q)};
  return wrap(payload);
}
export function parsePvp(text,now=Date.now()){
  try{
    if(!String(text).startsWith('NQXPVP:'))return null;
    const p=JSON.parse(b64d(String(text).slice(7)));
    if(p.v!==VERSION||now>p.expiresAt)return null;
    return p;
  }catch{return null}
}
export function resolvePair(challenge,response){
  if(!challenge||!response||response.challenge!==challenge.challenge)throw new Error('challenge mismatch');
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
