const css=`
.enemy-meta strong{display:block;margin-top:4px;padding:8px 10px;border-top:1px solid #27313a;border-bottom:1px solid #27313a;font-size:10px;line-height:1.6;letter-spacing:.1em;color:#d9e5ec}

/* Larger field aberrant without adding image assets */
.play .aberrant-play{max-width:34vw!important;max-height:34vw!important;min-width:14vw!important;min-height:14vw!important;filter:drop-shadow(0 0 26px rgba(180,230,255,.14))}

/* QR birth scene — no image or video assets */
.fx-overlay.nqx-birth-fx{overflow:hidden;background:radial-gradient(circle at 50% 52%,rgba(18,28,42,.96),#030508 55%,#010203 100%);color:#eef4ff}
.nqx-birth-stage{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none;overflow:hidden}
.nqx-birth-core{width:12px;height:12px;border-radius:50%;background:#fff;box-shadow:0 0 10px #fff,0 0 28px #80d8ff,0 0 58px #9d7cff;animation:nqxBirthCore 7.8s cubic-bezier(.2,.7,.2,1) both}
.nqx-birth-ring,.nqx-birth-ring:before,.nqx-birth-ring:after{position:absolute;content:"";width:86px;height:86px;border:1px solid rgba(180,225,255,.55);border-radius:50%;animation:nqxBirthRing 2s ease-out infinite}
.nqx-birth-ring:before{inset:-18px;animation-delay:.35s}.nqx-birth-ring:after{inset:18px;animation-delay:.7s}
.nqx-birth-particles{position:absolute;width:210px;height:210px;animation:nqxBirthSpin 5.8s linear infinite}
.nqx-birth-particles i{position:absolute;left:50%;top:50%;width:3px;height:3px;background:#dff6ff;box-shadow:0 0 9px #79d7ff;transform:rotate(calc(var(--n)*30deg)) translateX(96px);animation:nqxBirthParticle 2.1s ease-in-out infinite;animation-delay:calc(var(--n)*-.11s)}
.nqx-birth-steps{position:absolute;bottom:22%;display:flex;gap:13px;font:8px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.14em;color:#70879a}
.nqx-birth-steps span{animation:nqxBirthText 7.8s linear both}.nqx-birth-steps span:nth-child(2){animation-delay:.8s}.nqx-birth-steps span:nth-child(3){animation-delay:1.6s}.nqx-birth-steps span:nth-child(4){animation-delay:2.4s}
@keyframes nqxBirthCore{0%{transform:scale(.15);opacity:.05;filter:hue-rotate(0)}18%{opacity:1}42%{transform:scale(1.2)}65%{transform:scale(2.2);filter:hue-rotate(90deg)}82%{transform:scale(4.4);opacity:.9}100%{transform:scale(12);opacity:0;filter:hue-rotate(180deg)}}
@keyframes nqxBirthRing{0%{transform:scale(.25);opacity:0}30%{opacity:.8}100%{transform:scale(2.7);opacity:0}}
@keyframes nqxBirthSpin{to{transform:rotate(360deg)}}
@keyframes nqxBirthParticle{0%,100%{opacity:.12;transform:rotate(calc(var(--n)*30deg)) translateX(100px) scale(.7)}50%{opacity:1;transform:rotate(calc(var(--n)*30deg)) translateX(24px) scale(1.4)}}
@keyframes nqxBirthText{0%,15%{color:#41505c}24%,76%{color:#d8edfa;text-shadow:0 0 8px #6dcfff}90%,100%{color:#566774;text-shadow:none}}

/* Three-turn battle scene */
.battle-fx-layer{background:radial-gradient(circle at 50% 50%,rgba(31,73,88,.3),rgba(1,4,7,.985) 48%,#010305 80%);overflow:hidden}
.battle-fx-layer::after{content:"";position:absolute;inset:-20%;pointer-events:none;background:repeating-linear-gradient(0deg,transparent 0 5px,rgba(176,229,244,.045) 6px);animation:nqxScan .42s linear infinite}
.battle-fx-head b{font-size:13px;text-shadow:0 0 16px rgba(176,229,244,.58)}
.battle-fx-head span{font-size:9px;color:#8aa8b7}
.battle-fx-arena{isolation:isolate;position:relative}
.battle-fx-arena canvas{width:min(38vw,170px)!important;height:min(38vw,170px)!important;filter:drop-shadow(0 0 22px rgba(117,211,238,.28))}
.battle-fx-arena::before{content:"";position:absolute;left:50%;top:50%;width:18px;height:18px;border:2px solid rgba(214,247,255,.9);border-radius:50%;transform:translate(-50%,-50%);box-shadow:0 0 24px rgba(142,224,245,1),0 0 70px rgba(142,224,245,.5);z-index:3}
.battle-fx-arena canvas:first-child{animation:nqxSelfStrike .78s cubic-bezier(.2,.7,.2,1) both}
.battle-fx-arena canvas:last-child{animation:nqxEnemyStrike .78s cubic-bezier(.2,.7,.2,1) both}
.battle-stream{height:3px;transform-origin:center;animation:nqxStream .28s ease-in-out infinite alternate;box-shadow:0 0 10px rgba(114,220,247,.8),0 0 30px rgba(114,220,247,.55)}
.battle-turn-dots i.on{height:3px;box-shadow:0 0 10px rgba(142,224,245,.9)}
.nqx-turn-1 .battle-fx-arena::before{animation:nqxImpact1 .72s ease-out both}
.nqx-turn-2 .battle-fx-arena::before{animation:nqxImpact2 .72s ease-out both}
.nqx-turn-2 .battle-fx-arena{animation:nqxShake .18s linear 3}
.nqx-turn-3 .battle-fx-arena::before,.nqx-final .battle-fx-arena::before{animation:nqxImpact3 .8s ease-out both}
.nqx-turn-3 .battle-fx-arena,.nqx-final .battle-fx-arena{animation:nqxShake .12s linear 5}
.nqx-final{animation:nqxFinalFlash .55s ease-out both}
.battle-reward{text-align:center!important;color:#91aab5!important;font-size:9px!important;letter-spacing:.08em!important}
@keyframes nqxSelfStrike{0%{transform:translateX(-34px) scale(.86);opacity:.5}42%{transform:translateX(30px) scale(1.14);opacity:1}62%{transform:translateX(10px) scale(1.04)}100%{transform:translateX(0) scale(1)}}
@keyframes nqxEnemyStrike{0%{transform:translateX(34px) scale(.86);opacity:.5}42%{transform:translateX(-30px) scale(1.14);opacity:1}62%{transform:translateX(-10px) scale(1.04)}100%{transform:translateX(0) scale(1)}}
@keyframes nqxImpact1{0%{opacity:0;transform:translate(-50%,-50%) scale(.15)}40%{opacity:1;transform:translate(-50%,-50%) scale(2.8)}100%{opacity:0;transform:translate(-50%,-50%) scale(5)}}
@keyframes nqxImpact2{0%{opacity:0;transform:translate(-50%,-50%) scale(.2) rotate(0)}35%{opacity:1;transform:translate(-50%,-50%) scale(3.4) rotate(90deg)}100%{opacity:0;transform:translate(-50%,-50%) scale(6.2) rotate(180deg)}}
@keyframes nqxImpact3{0%{opacity:0;transform:translate(-50%,-50%) scale(.2)}28%{opacity:1;background:#fff;transform:translate(-50%,-50%) scale(4.3)}100%{opacity:0;transform:translate(-50%,-50%) scale(9)}}
@keyframes nqxStream{from{opacity:.2;transform:scaleX(.16)}to{opacity:1;transform:scaleX(1.35)}}
@keyframes nqxScan{from{transform:translateY(-6px)}to{transform:translateY(6px)}}
@keyframes nqxShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
@keyframes nqxFinalFlash{0%{filter:brightness(1)}35%{filter:brightness(3)}100%{filter:brightness(1)}}

/* iPhoneの「視差効果を減らす」でも、戦闘そのものは短い演出を残す */
@media(prefers-reduced-motion:reduce){
  .nqx-birth-core,.nqx-birth-ring,.nqx-birth-particles,.nqx-birth-particles i,.nqx-birth-steps span,.battle-fx-layer::after{animation:none!important}
  .battle-fx-arena canvas:first-child{animation:nqxSelfStrike .48s ease-out both!important}
  .battle-fx-arena canvas:last-child{animation:nqxEnemyStrike .48s ease-out both!important}
  .battle-stream{animation:nqxStream .32s ease-in-out infinite alternate!important}
  .nqx-turn-1 .battle-fx-arena::before{animation:nqxImpact1 .48s ease-out both!important}
  .nqx-turn-2 .battle-fx-arena::before{animation:nqxImpact2 .48s ease-out both!important}
  .nqx-turn-2 .battle-fx-arena{animation:nqxShake .14s linear 2!important}
  .nqx-turn-3 .battle-fx-arena::before,.nqx-final .battle-fx-arena::before{animation:nqxImpact3 .52s ease-out both!important}
  .nqx-turn-3 .battle-fx-arena,.nqx-final .battle-fx-arena{animation:nqxShake .12s linear 3!important}
  .nqx-final{animation:nqxFinalFlash .4s ease-out both!important}
}
`;

function decorate(root=document){
  const fx=root.querySelector?.('.fx-overlay');
  if(fx&&!fx.classList.contains('nqx-birth-fx')&&/FIRST OBSERVATION/.test(fx.textContent||'')){
    fx.classList.add('nqx-birth-fx');
    const stage=document.createElement('div');stage.className='nqx-birth-stage';
    stage.innerHTML=`<div class="nqx-birth-ring"></div><div class="nqx-birth-core"></div><div class="nqx-birth-particles">${Array.from({length:12},(_,i)=>`<i style="--n:${i}"></i>`).join('')}</div><div class="nqx-birth-steps"><span>QR LOCK</span><span>SEED</span><span>CORE</span><span>FORM</span></div>`;
    fx.appendChild(stage);
  }
  const battle=root.querySelector?.('.battle-fx-layer');
  if(battle){
    const idx=battle.querySelectorAll('.battle-turn-dots i.on').length;
    battle.classList.add(`nqx-turn-${Math.max(1,idx)}`);
    if(/BREAKTHROUGH/.test(battle.textContent||''))battle.classList.add('nqx-final');
  }
}
if(typeof document!=='undefined'){
  if(!document.querySelector('style[data-nqx-light-fx]')){const style=document.createElement('style');style.dataset.nqxLightFx='1';style.textContent=css;document.head.appendChild(style)}
  const observer=new MutationObserver(()=>decorate(document));observer.observe(document.documentElement,{childList:true,subtree:true});
  queueMicrotask(()=>decorate(document));
}
