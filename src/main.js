import './styles.css';
import { registerSW } from 'virtual:pwa-register';
import { TYPE_BY_ID, STATES, GROWTH_STAGE, PLAY_SIZE, OBSERVATION_LIMITS, DEEP_RECORD_URL, MONETIZATION } from './core/config.js';
import { loadRaw, saveState } from './core/state.js';
import { migrateState } from './core/migrate.js';
import { createAberrant } from './core/factory.js';
import { currentLineage, ensureLineageForBirth, archiveEntry, closeOrContinueLineage } from './core/lineage.js';
import { ageDays, isExpired, startSleep, sleepStatus, resolveSleep, consumeAction, updateState, enterUnknownIfNeeded } from './core/lifecycle.js';
import { displayStrengthRange, displayAbility, classLabel, lifePressure, refreshClass } from './core/information.js';
import { hashObservedCode, canExternalObserve, applyExternalObservation } from './core/observation.js';
import { generateCpuOpponent, generateCpuUnknown, canEncounterCpuUnknown, makeBattleSnapshot, resolveBattle, applyCpuBattleResult } from './core/battle.js';
import { startScanner, stopScanner } from './core/camera.js';
import { drawAberrant } from './core/visual.js';
import { actionSound, chirp, enableAudio, suspendAudio, resumeAudio, clearPending } from './core/audio.js';
import { traceByNo, traceProgress, CREATOR_MESSAGE } from './core/traces.js';
import { maybeOpenSignal, resolveSignal } from './core/signal.js';
import { evolutionTendency } from './core/growth.js';
import { createChallenge, createResponse, parsePvp, resolvePair, createResultConfirm, verifyResultConfirm, createAck, verifyAck } from './core/pvp.js';
import { renderQr } from './core/qr-render.js';
import { entitlements, purchaseLabel } from './core/monetization.js';

registerSW({immediate:true});
let state=migrateState(loadRaw());
let screen=state.ui?.screen||'PLAY';
let recordTab=state.recordTab||'LINEAGE';
let overlay=null;
let toast='';
let playRaf=0, frame=0, locked=false;
const app=document.querySelector('#app');
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const fmtDate=ms=>ms?new Intl.DateTimeFormat('ja-JP',{year:'numeric',month:'2-digit',day:'2-digit'}).format(ms):'--';
const dayKey=()=>new Date().toISOString().slice(0,10);

function persist(){state.ui={...(state.ui||{}),screen};state.recordTab=recordTab;saveState(state)}
function activeSleep(){return state.q?sleepStatus(state.q):{active:false,complete:false,progress:0}}
function setToast(x){toast=x;render();setTimeout(()=>{if(toast===x){toast='';render()}},2600)}

function endCurrent(reason,extra={}){
  if(!state.q)return;
  refreshClass(state.q);
  const entry=archiveEntry(state.q,reason,extra);
  const continuity=closeOrContinueLineage(state,entry);
  entry.lineageStatus=continuity;
  state.archives.unshift(entry);
  state.q=null;overlay=null;locked=false;persist();
}
function temporalReconcile(){
  if(!state.q)return;
  refreshClass(state.q);
  const sl=sleepStatus(state.q);
  if(sl.active&&sl.complete)resolveSleep(state.q,Date.now(),false);
  if(isExpired(state.q)){endCurrent('lifespan');toast='TRACE LOST / LINEAGE TERMINATED';}
}
temporalReconcile();persist();

function birthFromObservation(hash){
  const lineage=ensureLineageForBirth(state);state.generation++;state.displayCounter++;
  state.q=createAberrant({generation:state.generation,displayNumber:state.displayCounter,lineage,originHash:hash});
  persist();
}

function header(){
  const q=state.q;
  return `<header class="hud-top"><div><b>${q?esc(q.name||q.id):'NQX'}</b><span>${q?`${esc(q.type)} / ${classLabel(q)} · GEN ${String(q.generation).padStart(2,'0')}`:'NO ABERRANT OBSERVED'}</span></div><div class="hud-right">${q?`DAY ${ageDays(q)}<small>IS ${displayStrengthRange(q)}</small>`:'--'}</div></header>`;
}
function nav(className='screen-nav'){return `<nav class="${className}"><button data-screen="PLAY" class="${screen==='PLAY'?'active':''}">PLAY</button><button data-screen="STATUS" class="${screen==='STATUS'?'active':''}">STATUS</button><button data-screen="RECORD" class="${screen==='RECORD'?'active':''}">RECORD</button></nav>`}
function adSlot(){const e=entitlements(state);return e.normalAds?`<aside class="ad-slot" aria-label="広告枠"><span>AD</span><small>広告プロバイダ接続領域</small></aside>`:''}

function signalStrip(){
  const p=state.signals?.pending;if(!p)return'';const left=Math.max(0,Math.ceil((p.endsAt-Date.now())/1000));if(!left)return'';
  return `<button id="signal-scan" class="signal-strip"><b>SIGNAL DETECTED</b><span>SIGNAL WINDOW OPEN · ${left}s</span></button>`;
}
function playScreen(){
  const q=state.q, sl=activeSleep();
  return `<main class="screen play"><div class="field-grid"></div>
    <section class="observation-field ${q?.class||'empty'}">
      <div class="field-interface">
        ${header()}
        <section class="primary-actions" aria-label="観測操作">
          <button id="observe-btn" ${locked||sl.active?'disabled':''}><b>OBSERVE</b><span>観測</span></button>
          <button id="battle-btn" ${!q||locked||sl.active?'disabled':''}><b>BATTLE</b><span>侵食</span></button>
          <button id="sleep-btn" ${!q||locked?'disabled':''}><b>SLEEP</b><span>${sl.active?'途中覚醒':'休眠'}</span></button>
        </section>
        ${nav('field-nav')}
      </div>
      ${signalStrip()}
      <div class="aberrant-stage">
        ${q?`<canvas id="play-canvas" class="aberrant-play" style="--play-size:${PLAY_SIZE(q.growth)}vw"></canvas>`:
        `<div class="empty-observation"><div class="scan-mark"></div><b>NO ABERRANT</b><span>外部世界を観測し、存在を確定する。</span></div>`}
      </div>
      ${q?`<div class="field-meta"><span>${STATES[q.state]||q.state}</span><b>${GROWTH_STAGE(q.growth)} · GROWTH ${q.growth}</b>${sl.active?`<small>SLEEP ${Math.round(sl.progress*100)}%</small>`:''}</div>`:''}
      ${q&&q.actionCount>=q.namePromptEligibleAt&&!q.name&&q.namePromptEligibleAt>=0?`<button id="name-prompt" class="name-prompt">NAME THIS ABERRANT ?</button>`:''}
      ${overlay?.kind==='fx'?`<div class="fx-overlay"><b>${esc(overlay.title)}</b><span>${esc(overlay.sub||'')}</span></div>`:''}
    </section>
    ${adSlot()}${toast?`<div class="toast">${esc(toast)}</div>`:''}</main>${overlay&&overlay.kind!=='fx'?overlayHtml():''}`;
}
function meter(q,label,value){const d=displayAbility(q,value);const p=Math.round(d.ratio*100);return `<div class="meter"><div><span>${label}</span><b>${d.label}</b></div><i><em style="width:${p}%"></em></i></div>`}
function statusScreen(){
  const q=state.q;if(!q)return `<main class="screen details">${header()}${nav()}<div class="empty-page">NO ACTIVE ABERRANT</div></main>`;
  const evo=evolutionTendency(q);
  const morph=Object.entries(q.morphology).sort((a,b)=>b[1]-a[1]);
  return `<main class="screen details">${header()}${nav()}
    <section class="status-visual"><canvas id="status-canvas"></canvas><div><span>${esc(q.id)}</span><b>${esc(q.name||'UNNAMED')}</b><small>${TYPE_BY_ID[q.type]?.label||q.type}</small></div></section>
    <section class="detail-grid">
      <div><span>CLASS</span><b>${classLabel(q)}</b></div><div><span>GEN</span><b>${q.generation}</b></div><div><span>GROWTH STAGE</span><b>${GROWTH_STAGE(q.growth)}</b></div><div><span>GROWTH</span><b>${q.growth}</b></div>
      <div><span>INFO STRENGTH</span><b>${displayStrengthRange(q)}</b></div><div><span>STATE</span><b>${STATES[q.state]}</b></div><div><span>AGE</span><b>${ageDays(q)} DAYS</b></div><div><span>BORN</span><b>${fmtDate(q.bornAt)}</b></div>
      <div><span>${q.class==='unknown'?'OBSERVATION STABILITY':'LIFE PRESSURE'}</span><b>${lifePressure(q)}</b></div><div><span>INTEGRATION</span><b>${q.integration}</b></div><div><span>ANOMALY</span><b>${q.anomaly}</b></div><div><span>PERSONALITY</span><b>${esc(q.personality)}</b></div>
    </section>
    <section class="detail-section"><h2>ABILITIES</h2>${Object.entries(q.abilities).map(([k,v])=>meter(q,k,v)).join('')}</section>
    <section class="detail-section"><h2>EVOLUTION TENDENCY</h2><p>PRIMARY : ${esc(evo[0]?.[0]||'--')}</p><p>SECONDARY : ${esc(evo[1]?.[0]||'--')}</p></section>
    <section class="detail-section"><h2>MORPHOLOGY</h2><div class="chips">${morph.slice(0,7).map(([k,v])=>`<span>${k.toUpperCase()} : ${v>=67?'HIGH':v>=34?'MID':'LOW'}</span>`).join('')}</div></section>
    <section class="detail-section"><h2>SURVIVAL</h2><div class="chips">${Object.entries(q.survival).map(([k,v])=>`<span>${k.toUpperCase()} : ${v>=67?'HIGH':v>=34?'MID':'LOW'}</span>`).join('')}</div></section>
    <section class="detail-section"><h2>BATTLE RECORD</h2><p>${q.battle.wins} W / ${q.battle.losses} L · CPU ${q.battle.cpuWins}/${q.battle.cpuLosses} · PVP ${q.battle.pvpWins}/${q.battle.pvpLosses}</p></section>
    <section class="detail-section"><h2>MATURE MUTATION</h2>${q.mutationHistory.length?q.mutationHistory.map(m=>`<p>${fmtDate(m.at)} · ${esc(m.feature)}</p>`).join(''):'<p>NO DATA</p>'}</section>
    <button id="rename-btn" class="subtle-btn">NAME / RENAME</button>${adSlot()}</main>`;
}
function lineagesHtml(){
  return state.lineages.slice().reverse().map(l=>`<article class="lineage-block"><header><div><b>${esc(l.name||l.id)}</b><small>${esc(l.id)}</small></div><span>${l.active?'ACTIVE':'ARCHIVED'}</span><button class="subtle-btn lineage-name" data-lineage-name="${esc(l.id)}">NAME</button></header><div class="lineage-line">${l.members.length?l.members.map(m=>`<button class="archive-card" data-archive="${esc(m.uid)}"><span>${esc(m.id)} · ${esc(m.type)}</span><b>${esc(m.name||'UNNAMED')}</b><small>${m.reason==='cpu-loss'?'LINEAGE CONTINUES':'LINEAGE TERMINATED'} · IS ${m.class==='unknown'?'>666':m.informationStrength}</small></button>`).join(''):'<p>NO PREVIOUS GENERATION</p>'}${l.mutations.map(m=>`<div class="lineage-mutation"><b>LINEAGE MUTATION</b><span>${esc(m.name)} / ${esc(m.tradeoff)}</span></div>`).join('')}</div></article>`).join('');
}
function historyHtml(){
  const e=entitlements(state);
  return `<section class="history-list">${state.archives.length?state.archives.map(a=>`<button class="history-row" data-archive="${esc(a.uid)}"><b>${esc(a.id)} · ${esc(a.name||'UNNAMED')}</b><span>${esc(a.type)} / ${String(a.class).toUpperCase()} · ${a.livedDays} DAYS · ${esc(a.reason)}</span></button>`).join(''):'<p>NO ARCHIVE</p>'}</section>
  <section class="access-plan"><span>ACCESS PLAN</span><b>${purchaseLabel(state)}</b><p>通常広告解除 ¥250＋個体系 / 全広告解除 ¥500＋個体系＋世代系＋継承系</p><small>実決済は決済プロバイダ接続後に有効化。現在は権利モデルのみ実装済み。</small><div class="chips"><span>INDIVIDUAL ${e.individual?'ON':'LOCKED'}</span><span>GENERATION ${e.generation?'ON':'LOCKED'}</span><span>INHERITANCE ${e.inheritance?'ON':'LOCKED'}</span></div></section>`;
}
function traceHtml(){
  const p=traceProgress(state);const owned=new Set(state.traces);
  return `<section class="trace-head"><div><b>TRACE 001—666</b><span>${p.count}/666</span></div><i><em style="width:${p.ratio*100}%"></em></i></section><section class="trace-phase-list">
  ${[[1,111,'観測対象'],[112,222,'個体という錯覚'],[223,333,'ECLYPSE'],[334,444,'HUMANITY'],[445,555,'反転観測'],[556,665,'ECLYPSEは何をしたのか'],[666,666,'最終観測記録']].map(([a,b,t])=>`<details><summary>${t}<span>${state.traces.filter(n=>n>=a&&n<=b).length}/${b-a+1}</span></summary><div class="trace-grid">${Array.from({length:b-a+1},(_,i)=>a+i).map(no=>owned.has(no)?`<button data-trace="${no}" class="owned">TRACE ${String(no).padStart(3,'0')}</button>`:`<button disabled>TRACE ${String(no).padStart(3,'0')}<small>NO DATA</small></button>`).join('')}</div></details>`).join('')}</section>`;
}
function recordScreen(){return `<main class="screen record">${header()}${nav()}<nav class="record-tabs"><button data-record="LINEAGE" class="${recordTab==='LINEAGE'?'active':''}">LINEAGE</button><button data-record="HISTORY" class="${recordTab==='HISTORY'?'active':''}">HISTORY</button><button data-record="TRACE" class="${recordTab==='TRACE'?'active':''}">TRACE</button></nav><section class="record-body">${recordTab==='LINEAGE'?lineagesHtml():recordTab==='HISTORY'?historyHtml():traceHtml()}</section></main>${overlay?overlayHtml():''}`}
function scannerOverlay(){return `<div class="modal scanner"><div class="modal-panel"><header><b>${esc(overlay.title)}</b><button id="overlay-close">×</button></header><video id="scanner-video" playsinline muted></video><p>QR / JAN・EAN / UPC / CODE128</p></div></div>`}
function cpuOverlay(){const o=overlay.opponent;return `<div class="modal"><div class="modal-panel"><header><b>CPU侵食</b><button id="overlay-close">×</button></header><canvas id="enemy-canvas"></canvas><div class="enemy-meta"><span>TYPE ${esc(o.type)}</span><b>CLASS ${o.class==='unknown'?'UNKNOWN':o.class==='dominion'?'DOMINION':'ABERRANT'}</b><span>INFO STRENGTH ${o.class==='unknown'?'>666':`~${o.informationStrength}`}</span><strong>RISK : ${o.risk}</strong></div><div class="modal-actions"><button id="cpu-go">侵食する</button><button id="cpu-retreat">撤退する</button></div></div></div>`}
function battleResultOverlay(){const r=overlay.result;const localSide=overlay.localSide||'A';const won=r.winner===localSide;return `<div class="modal"><div class="modal-panel result"><header><b>INTRUSION RESULT</b></header><div class="turns">${r.turns.map(t=>`<div><b>TURN ${t.turn}</b><span>A ${Math.round(t.aVital)} / B ${Math.round(t.bVital)}</span></div>`).join('')}</div><strong>${won?'INTEGRATION SUCCESS':'INDEPENDENT TRACE LOST'}</strong><button id="result-ok">OBSERVE RESULT</button></div></div>`}
function battleFxOverlay(){const r=overlay.result;const idx=Math.max(0,Math.min(3,overlay.turnIndex||0));const t=idx?r.turns[idx-1]:null;const phase=overlay.phase||'contact';const label=phase==='contact'?'TARGET TRACE ACQUIRED':phase==='integrate'?'INFORMATION STRUCTURE COLLAPSING':`TURN ${idx}`;const detail=t?`A ${Math.round(t.aVital)} / B ${Math.round(t.bVital)}`:'PHASE ALIGNMENT';return `<div class="battle-fx-layer"><div class="battle-fx-head"><b>${label}</b><span>${detail}</span></div><div class="battle-fx-arena"><canvas id="battle-self-canvas"></canvas><i class="battle-stream"></i><canvas id="battle-enemy-canvas"></canvas></div><div class="battle-turn-dots"><i class="${idx>=1?'on':''}"></i><i class="${idx>=2?'on':''}"></i><i class="${idx>=3?'on':''}"></i></div></div>`}
function traceOverlay(){const t=traceByNo(overlay.no);return `<div class="modal"><div class="modal-panel trace-modal"><header><b>TRACE ${String(t.no).padStart(3,'0')}</b><button id="overlay-close">×</button></header><span>${esc(t.phase)}</span><p>${esc(t.short)}</p><div class="access-key"><small>ACCESS KEY</small><b>${esc(t.accessKey)}</b></div>${DEEP_RECORD_URL?`<a href="${esc(DEEP_RECORD_URL)}" target="_blank" rel="noreferrer">DEEP RECORD</a>`:`<small>DEEP RECORD : EXTERNAL SUBSCRIPTION</small>`}${t.no===666?`<button id="creator-open">OBSERVER-0</button>`:''}</div></div>`}
function archiveOverlay(){const a=overlay.entry;return `<div class="modal"><div class="modal-panel"><header><b>${esc(a.id)} ARCHIVE</b><button id="overlay-close">×</button></header><canvas id="archive-canvas"></canvas><p>${esc(a.name||'UNNAMED')} · ${esc(a.type)} · ${String(a.class).toUpperCase()}</p><p>FINAL GROWTH ${a.growth} · IS ${a.class==='unknown'?'>666':a.informationStrength}</p><p>${a.livedDays} DAYS · ${esc(a.reason)}</p></div></div>`}
function battleMenuOverlay(){return `<div class="modal"><div class="modal-panel"><header><b>BATTLE / 侵食</b><button id="overlay-close">×</button></header><div class="modal-actions stacked"><button id="battle-cpu">CPU侵食</button><button id="battle-pvp">対人侵食</button></div></div></div>`}
function pvpMenuOverlay(){return `<div class="modal"><div class="modal-panel"><header><b>対人侵食</b><button id="overlay-close">×</button></header><p>対面専用。QRは10秒で失効します。</p><div class="modal-actions stacked"><button id="pvp-challenge">A｜侵食QRを表示</button><button id="pvp-scan">B｜相手QRを読み取る</button></div></div></div>`}
function pvpQrOverlay(){const p=state.pvp.pending||{};return `<div class="modal"><div class="modal-panel"><header><b>${esc(overlay.title)}</b><button id="overlay-close">×</button></header><canvas id="pvp-qr"></canvas><p>${esc(overlay.note||'10秒以内に相手端末で読み取る')}</p>${p.side==='A'&&p.stage==='challenge'?`<button id="pvp-scan-response">Bの応答QRを読み取る</button>`:''}${p.side==='B'&&p.stage==='response'?`<button id="pvp-scan-confirm">Aの結果確認QRを読み取る</button>`:''}${p.side==='A'&&p.stage==='confirm'?`<button id="pvp-scan-ack">Bの確認ACKを読み取る</button>`:''}${p.side==='B'&&p.stage==='ack'?`<button id="pvp-show-result">OBSERVE RESULT</button>`:''}</div></div>`}
function creatorOverlay(){return `<div class="modal creator"><div class="modal-panel"><header><b>OBSERVER-0</b><button id="overlay-close">×</button></header><span>SOURCE : OUTSIDE SYSTEM<br>ROUTE : ECLYPSE</span>${state.scenario.creatorRevealed?'<strong>DESIGNATION : CREATOR</strong>':''}<pre>${esc(CREATOR_MESSAGE)}</pre><div class="creator-end">HUMANITY OBSERVED.<br>ABERRANT OBSERVED.<br>MUTUAL OBSERVATION : ACTIVE<br><br>OBSERVER : 2<br>OBSERVER-0 : ACTIVE<br>OBSERVATION CONTINUES.<br>観測は続く。</div></div></div>`}
function overlayHtml(){if(!overlay)return'';if(overlay.kind==='scanner')return scannerOverlay();if(overlay.kind==='cpu')return cpuOverlay();if(overlay.kind==='battleResult')return battleResultOverlay();if(overlay.kind==='battleFx')return battleFxOverlay();if(overlay.kind==='trace')return traceOverlay();if(overlay.kind==='archive')return archiveOverlay();if(overlay.kind==='battleMenu')return battleMenuOverlay();if(overlay.kind==='pvpMenu')return pvpMenuOverlay();if(overlay.kind==='pvpQr')return pvpQrOverlay();if(overlay.kind==='creator')return creatorOverlay();return''}

function render(){
  temporalReconcile();cancelAnimationFrame(playRaf);playRaf=0;
  app.innerHTML=screen==='PLAY'?playScreen():screen==='STATUS'?statusScreen():recordScreen();
  bind();drawCurrent();
}
function drawCurrent(){
  if(state.q&&screen==='PLAY')animatePlay();
  if(state.q&&screen==='STATUS')drawAberrant(document.querySelector('#status-canvas'),state.q,{mode:'normal',size:300});
  if(overlay?.kind==='cpu')drawAberrant(document.querySelector('#enemy-canvas'),overlay.opponent,{mode:'normal',size:250});
  if(overlay?.kind==='battleFx'){const self=document.querySelector('#battle-self-canvas'), enemy=document.querySelector('#battle-enemy-canvas');if(self&&state.q)drawAberrant(self,state.q,{mode:'play',frame:overlay.turnIndex||0,size:220});if(enemy&&overlay.opponent)drawAberrant(enemy,overlay.opponent,{mode:'play',frame:(overlay.turnIndex||0)+2,size:220});}
  if(overlay?.kind==='archive'){const a=overlay.entry;drawAberrant(document.querySelector('#archive-canvas'),{...a,growth:a.growth??75,class:a.class??'aberrant',visual:a.visual??{},morphology:a.morphology??{},type:a.type??'NQX'},{mode:'normal',size:240});}
  if(overlay?.kind==='pvpQr')renderQr(document.querySelector('#pvp-qr'),overlay.text).catch(()=>{});
  if(overlay?.kind==='scanner')startLiveScanner();
}
function animatePlay(){
  const canvas=document.querySelector('#play-canvas');if(!canvas||screen!=='PLAY'||document.visibilityState!=='visible')return;
  const loop=()=>{if(!document.querySelector('#play-canvas')||screen!=='PLAY'||document.visibilityState!=='visible')return;frame++;drawAberrant(canvas,state.q,{mode:'play',frame,size:Math.max(180,Math.min(360,innerWidth*.72))});playRaf=requestAnimationFrame(loop)};loop();
}
async function startLiveScanner(){
  const video=document.querySelector('#scanner-video');if(!video)return;
  try{await startScanner(video,async r=>{const handler=overlay?.onScan;overlay=null;if(handler)await handler(r);render();},e=>console.warn(e));}catch(e){overlay=null;setToast('CAMERA ERROR');}
}
async function openScanner(title,onScan){overlay={kind:'scanner',title,onScan};render();}
async function fx(title,sub,ms){locked=true;overlay={kind:'fx',title,sub};render();await wait(ms);overlay=null;locked=false;render();}
async function maybeSignal(source){if(!state.q)return;const p=maybeOpenSignal(state,state.q,source,Date.now(),Math.random);if(p){actionSound('signal');persist();setToast('SIGNAL WINDOW OPEN')}else persist();}
async function dominionTransition(){if(!state.q||state.q.class!=='dominion')return;locked=true;overlay={kind:'fx',title:'DOMINION',sub:'OBSERVATION LAYER SHIFT'};render();actionSound('evolve');await wait(13000);overlay=null;locked=false;persist();render();}
async function unknownTransition(){if(!state.q||state.q.class!=='unknown')return;locked=true;overlay={kind:'fx',title:'OBSERVATION LIMIT EXCEEDED',sub:'INFORMATION STRENGTH : 666 → >666'};render();actionSound('evolve');await wait(16000);overlay=null;locked=false;persist();render();}
function stageIndex(g){return g<15?0:g<40?1:g<75?2:3}
async function normalEvolutionTransition(){locked=true;overlay={kind:'fx',title:'MORPHOLOGY SHIFT',sub:'EVOLUTION TENDENCY UPDATED'};render();actionSound('evolve');await wait(8500);overlay=null;locked=false;render();}

async function doObserve(){
  if(locked)return;await enableAudio();
  if(!state.q){
    openScanner('FIRST OBSERVATION',async ({raw,format})=>{const hash=await hashObservedCode(raw);await fx('FIRST OBSERVATION','EXTERNAL CONTACT',8500);birthFromObservation(hash);actionSound('observe');persist();render();});return;
  }
  if(activeSleep().active)return;
  openScanner('EXTERNAL OBSERVATION',async ({raw,format})=>{const hash=await hashObservedCode(raw);const can=canExternalObserve(state,hash);if(!can.ok){setToast(can.reason);return}const classBefore=state.q.class, stageBefore=stageIndex(state.q.growth);await fx('EXTERNAL OBSERVATION',format,4200);const result=applyExternalObservation(state,{hash,format});actionSound('observe');if(result.trace)setToast(`TRACE ${String(result.trace.no).padStart(3,'0')} DETECTED`);persist();await maybeSignal('OBSERVE');if(stageIndex(state.q?.growth??0)>stageBefore)await normalEvolutionTransition();if(classBefore==='aberrant'&&state.q?.class==='dominion')await dominionTransition();if(classBefore!=='unknown'&&state.q?.class==='unknown')await unknownTransition();render();});
}
function doBattle(){if(!state.q||locked||activeSleep().active)return;overlay={kind:'battleMenu'};render();}
function showCpu(){
  if(Date.now()<(state.cpu.cooldownUntil||0)){setToast(`CPU COOLDOWN ${Math.ceil((state.cpu.cooldownUntil-Date.now())/60000)}m`);return}
  let opp;if(canEncounterCpuUnknown(state.q,state,Math.random))opp=generateCpuUnknown(state.q,state);else opp=generateCpuOpponent(state.q,state);overlay={kind:'cpu',opponent:opp};render();
}
async function runCpu(){
  const opponent=overlay.opponent;const self=makeBattleSnapshot(state.q), other=makeBattleSnapshot(opponent);const result=resolveBattle(self,other,`${Date.now()}`);
  locked=true;actionSound('battle');
  overlay={kind:'battleFx',opponent,result,turnIndex:0,phase:'contact'};render();await wait(1000);
  for(let turn=1;turn<=3;turn++){overlay={kind:'battleFx',opponent,result,turnIndex:turn,phase:'turn'};render();await wait(2400)}
  overlay={kind:'battleFx',opponent,result,turnIndex:3,phase:'integrate'};render();await wait(1400);
  overlay={kind:'battleResult',result,opponent};locked=false;render();
}
async function finalizeCpu(){
  const {result,opponent}=overlay;overlay=null;const classBefore=state.q.class, stageBefore=stageIndex(state.q.growth);const out=applyCpuBattleResult(state,opponent,result,Math.random);state.cpu.cooldownUntil=Date.now()+OBSERVATION_LIMITS.cpuBattleCooldownMs;
  if(!out.won){persist();endCurrent('cpu-loss',{integratedBy:opponent.id});setToast('INDEPENDENT TRACE LOST / LINEAGE CONTINUES');render();return}
  if(out.trace)setToast(`TRACE ${String(out.trace.no).padStart(3,'0')} DETECTED`);persist();await maybeSignal('BATTLE');if(stageIndex(state.q?.growth??0)>stageBefore)await normalEvolutionTransition();if(classBefore==='aberrant'&&state.q?.class==='dominion')await dominionTransition();if(classBefore!=='unknown'&&state.q?.class==='unknown')await unknownTransition();render();
}
function retreatCpu(){state.cpu.cooldownUntil=Date.now()+OBSERVATION_LIMITS.cpuRetreatCooldownMs;overlay=null;persist();setToast('WITHDRAWN / 10m');}
async function doSleep(){
  if(!state.q||locked)return;await enableAudio();const sl=activeSleep();
  if(sl.active){resolveSleep(state.q,Date.now(),true);persist();setToast('EARLY WAKE / EFFECT REDUCED');render();return}
  await fx('SLEEP','INFORMATION ACTIVITY REDUCED',4200);startSleep(state.q);actionSound('sleep');persist();render();
}
async function scanSignal(){
  if(!state.signals.pending)return;openScanner('SIGNAL WINDOW',async ({raw,format})=>{const hash=await hashObservedCode(raw);const classBefore=state.q?.class,stageBefore=stageIndex(state.q?.growth??0);const out=resolveSignal(state,{hash,format});if(state.q){enterUnknownIfNeeded(state.q,Date.now(),Math.random);refreshClass(state.q)}persist();setToast(out.expired?'SIGNAL LOST':out.detail);if(state.q&&stageIndex(state.q.growth)>stageBefore)await normalEvolutionTransition();if(classBefore==='aberrant'&&state.q?.class==='dominion')await dominionTransition();if(classBefore!=='unknown'&&state.q?.class==='unknown')await unknownTransition();render();});
}
function askName(){const v=prompt('NAME THIS ABERRANT ?','');if(v!==null&&state.q){state.q.name=String(v).trim().slice(0,24);state.q.namePromptEligibleAt=-1;persist();render()}}
function skipName(){if(state.q){state.q.namePromptEligibleAt=-1;persist();render()}}

function showPvp(){overlay={kind:'pvpMenu'};render();}
function pvpChallenge(){
  const ch=createChallenge(state.q);
  state.pvp.pending={side:'A',stage:'challenge',challenge:ch.payload};
  overlay={kind:'pvpQr',title:'A｜侵食QR',text:ch.text,note:'Bが読み取った後、Bの応答QRをAで読み取る'};
  persist();render();
}
function pvpScanChallenge(){
  openScanner('B｜侵食QRを読み取る',async ({raw})=>{
    const ch=parsePvp(raw);
    if(!ch||ch.k!=='CHALLENGE'){setToast('INVALID / EXPIRED QR');return}
    try{
      const response=createResponse(state.q,ch);
      const pair=resolvePair(ch,response.payload);
      state.pvp.pending={side:'B',stage:'response',challenge:ch,response:response.payload,pair};
      overlay={kind:'pvpQr',title:'B｜応答QR',text:response.text,note:'Aが読み取った後、Aの結果確認QRを読み取る'};
      persist();render();
    }catch{setToast('PVP PAIR ERROR')}
  });
}
function pvpScanResponse(){
  openScanner('A｜Bの応答QRを読み取る',async ({raw})=>{
    const res=parsePvp(raw);const ch=state.pvp.pending?.challenge;
    if(!res||res.k!=='RESPONSE'||!ch){setToast('INVALID / EXPIRED QR');return}
    try{
      const pair=resolvePair(ch,res);
      const confirm=createResultConfirm(pair);
      state.pvp.pending={side:'A',stage:'confirm',challenge:ch,response:res,pair,confirm:confirm.payload};
      overlay={kind:'pvpQr',title:'A｜結果確認QR',text:confirm.text,note:`RESULT ${pair.signature} / Bが照合後にACKを返す`};
      persist();render();
    }catch{setToast('PVP PAIR MISMATCH')}
  });
}
function pvpScanConfirm(){
  openScanner('B｜Aの結果確認QRを読み取る',async ({raw})=>{
    const confirm=parsePvp(raw);const pending=state.pvp.pending;const pair=pending?.pair;
    if(!confirm||!pair||!verifyResultConfirm(pair,confirm)){setToast('RESULT MISMATCH / ABORT');return}
    await replayPvp(pair,'B');
    applyPvpOutcome(pair,'B');
    const ack=createAck(pair);
    state.pvp.pending={side:'B',stage:'ack',challenge:pair.challenge,response:pair.response,pair,confirm,ack:ack.payload,finalized:true};
    overlay={kind:'pvpQr',title:'B｜確認ACK',text:ack.text,note:`RESULT ${pair.signature} CONFIRMED / Aが読み取る`};
    persist();render();
  });
}
function pvpScanAck(){
  openScanner('A｜Bの確認ACKを読み取る',async ({raw})=>{
    const ack=parsePvp(raw);const pending=state.pvp.pending;const pair=pending?.pair;
    if(!ack||!pair||!verifyAck(pair,ack)){setToast('ACK MISMATCH / ABORT');return}
    await replayPvp(pair,'A');
    applyPvpOutcome(pair,'A');
    state.pvp.pending=null;persist();
    overlay={kind:'battleResult',result:pair.result,opponent:null,pvp:true,localSide:'A'};render();
  });
}
async function replayPvp(pair,localSide='A'){
  const opponent=localSide==='A'?pair.response.snapshot:pair.challenge.snapshot;
  locked=true;actionSound('battle');
  overlay={kind:'battleFx',opponent,result:pair.result,turnIndex:0,phase:'contact'};render();await wait(1000);
  for(let turn=1;turn<=3;turn++){overlay={kind:'battleFx',opponent,result:pair.result,turnIndex:turn,phase:'turn'};render();await wait(2400)}
  overlay={kind:'battleFx',opponent,result:pair.result,turnIndex:3,phase:'integrate'};render();await wait(1400);locked=false;
}
function applyPvpOutcome(pair,localSide){
  if(!state.q)return;
  const localWon=pair.result.winner===localSide;
  state.q.battle[localWon?'wins':'losses']++;
  state.q.battle[localWon?'pvpWins':'pvpLosses']++;
  consumeAction(state.q,2);updateState(state.q);
  state.pvp.history.unshift({at:Date.now(),signature:pair.signature,won:localWon,side:localSide,confirmed:true});
  if(!localWon){
    endCurrent('pvp-loss',{signature:pair.signature,mutualResultConfirmed:true});
  }else{
    state.q.integration=Math.min(666,state.q.integration+12);persist();
  }
}

function bind(){
  document.querySelectorAll('[data-screen]').forEach(b=>b.onclick=async()=>{screen=b.dataset.screen;overlay=null;await stopScanner();clearPending();if(screen!=='PLAY')await suspendAudio();else await resumeAudio();persist();render()});
  document.querySelectorAll('[data-record]').forEach(b=>b.onclick=()=>{recordTab=b.dataset.record;persist();render()});
  document.querySelector('#observe-btn')?.addEventListener('click',doObserve);document.querySelector('#battle-btn')?.addEventListener('click',doBattle);document.querySelector('#sleep-btn')?.addEventListener('click',doSleep);document.querySelector('#signal-scan')?.addEventListener('click',scanSignal);
  document.querySelector('#name-prompt')?.addEventListener('click',()=>{if(confirm('名前を付けますか？\nキャンセルで名無しのままにします。'))askName();else skipName()});document.querySelector('#rename-btn')?.addEventListener('click',askName);
  document.querySelector('#overlay-close')?.addEventListener('click',async()=>{await stopScanner();overlay=null;render()});
  document.querySelector('#battle-cpu')?.addEventListener('click',showCpu);document.querySelector('#battle-pvp')?.addEventListener('click',showPvp);document.querySelector('#cpu-go')?.addEventListener('click',runCpu);document.querySelector('#cpu-retreat')?.addEventListener('click',retreatCpu);document.querySelector('#result-ok')?.addEventListener('click',()=>{if(overlay?.pvp){overlay=null;render()}else finalizeCpu()});
  document.querySelector('#pvp-challenge')?.addEventListener('click',pvpChallenge);document.querySelector('#pvp-scan')?.addEventListener('click',pvpScanChallenge);
  document.querySelector('#pvp-scan-response')?.addEventListener('click',pvpScanResponse);
  document.querySelector('#pvp-scan-confirm')?.addEventListener('click',pvpScanConfirm);
  document.querySelector('#pvp-scan-ack')?.addEventListener('click',pvpScanAck);
  document.querySelector('#pvp-show-result')?.addEventListener('click',()=>{const pair=state.pvp.pending?.pair;if(pair){overlay={kind:'battleResult',result:pair.result,opponent:null,pvp:true,localSide:'B'};state.pvp.pending=null;persist();render();}});
  document.querySelectorAll('[data-trace]').forEach(b=>b.onclick=()=>{overlay={kind:'trace',no:Number(b.dataset.trace)};render()});
  document.querySelectorAll('[data-archive]').forEach(b=>{b.onclick=()=>{const e=state.archives.find(x=>x.uid===b.dataset.archive)||state.lineages.flatMap(x=>x.members).find(x=>x.uid===b.dataset.archive);if(e){overlay={kind:'archive',entry:e};render()}}});
  document.querySelectorAll('[data-lineage-name]').forEach(b=>{b.onclick=()=>{const l=state.lineages.find(x=>x.id===b.dataset.lineageName);if(!l)return;const v=prompt('LINEAGE NAME',l.name||'');if(v!==null){l.name=String(v).trim().slice(0,32);persist();render();}}});
  document.querySelector('#creator-open')?.addEventListener('click',()=>{state.scenario.finalSeen=true;persist();overlay={kind:'creator'};render()});
}

document.addEventListener('visibilitychange',async()=>{
  cancelAnimationFrame(playRaf);playRaf=0;
  if(document.visibilityState!=='visible'){await stopScanner();clearPending();await suspendAudio();return}
  temporalReconcile();if(screen==='PLAY')await resumeAudio();render();
});
window.addEventListener('pagehide',()=>{stopScanner();clearPending();persist()});
render();
