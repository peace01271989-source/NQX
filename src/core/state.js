import { SCHEMA_VERSION, STORAGE_KEY, LEGACY_KEYS } from './config.js';
import { createLineage } from './lineage.js';

export function freshState(){
  const l=createLineage(1);
  return {
    schemaVersion:SCHEMA_VERSION,
    createdAt:Date.now(), updatedAt:Date.now(), generation:0, displayCounter:0,
    q:null, archives:[], lineages:[l], activeLineageId:l.id,
    traces:[], traceMeta:{}, observations:{codes:{}, daily:{}},
    signals:{daily:{}, lastAt:0, pending:null}, cpu:{daily:{}, cooldownUntil:0},
    pvp:{pending:null, history:[]}, recordTab:'LINEAGE',
    monetization:{plan:'FREE', purchasedAt:null},
    scenario:{observer0:false, creatorRevealed:false, finalSeen:false},
    ui:{screen:'PLAY'}
  };
}
function readJson(key){ try{const v=localStorage.getItem(key);return v?JSON.parse(v):null}catch{return null} }
export function loadRaw(){
  const current=readJson(STORAGE_KEY); if(current) return current;
  for(const k of LEGACY_KEYS){const v=readJson(k);if(v) return v}
  return null;
}
export function saveState(state){ state.schemaVersion=SCHEMA_VERSION;state.updatedAt=Date.now();localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); }
