import { SCHEMA_VERSION, STORAGE_KEY, LEGACY_KEYS } from './config.js';
import { createLineage } from './lineage.js';

const BACKUP_KEY=`${STORAGE_KEY}.backup`;
const CORRUPT_KEY=`${STORAGE_KEY}.corrupt`;

export function freshState(){
  const l=createLineage(1);
  return {
    schemaVersion:SCHEMA_VERSION,
    saveRevision:0,
    createdAt:Date.now(), updatedAt:Date.now(), generation:0, displayCounter:0,
    q:null, archives:[], lineages:[l], activeLineageId:l.id,
    traces:[], traceMeta:{}, observations:{codes:{}, daily:{}},
    signals:{daily:{}, lastAt:0, pending:null}, cpu:{daily:{}, cooldownUntil:0, pendingOpponent:null},
    pvp:{pending:null, history:[]}, recordTab:'LINEAGE',
    monetization:{plan:'FREE', purchasedAt:null},
    scenario:{observer0:false, creatorRevealed:false, finalSeen:false},
    ui:{screen:'PLAY'}
  };
}
function readJson(key,{preserveCorrupt=false}={}){
  const raw=localStorage.getItem(key);
  if(!raw)return null;
  try{return JSON.parse(raw)}catch{
    if(preserveCorrupt){
      try{if(!localStorage.getItem(CORRUPT_KEY))localStorage.setItem(CORRUPT_KEY,raw)}catch{}
    }
    return null;
  }
}
export function loadRaw(){
  const current=readJson(STORAGE_KEY,{preserveCorrupt:true}); if(current) return current;
  const backup=readJson(BACKUP_KEY); if(backup) return backup;
  for(const k of LEGACY_KEYS){const v=readJson(k);if(v)return v}
  return null;
}
export function saveState(state){
  const remote=readJson(STORAGE_KEY,{preserveCorrupt:true});
  const remoteRevision=Number(remote?.saveRevision??0);
  const localRevision=Number(state?.saveRevision??0);
  if(remote && remoteRevision>localRevision)return false;

  const nextRevision=Math.max(remoteRevision,localRevision)+1;
  const next={...state,schemaVersion:SCHEMA_VERSION,saveRevision:nextRevision,updatedAt:Date.now()};
  const previous=localStorage.getItem(STORAGE_KEY);
  try{
    if(previous)localStorage.setItem(BACKUP_KEY,previous);
    localStorage.setItem(STORAGE_KEY,JSON.stringify(next));
    Object.assign(state,next);
    return true;
  }catch{
    return false;
  }
}
export function currentStoredRevision(){return Number(readJson(STORAGE_KEY)?.saveRevision??0)}
