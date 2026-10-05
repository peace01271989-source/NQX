const css=`.enemy-meta strong{display:block;margin-top:4px;padding:8px 10px;border-top:1px solid #27313a;border-bottom:1px solid #27313a;font-size:10px;line-height:1.6;letter-spacing:.1em;color:#d9e5ec}
.battle-fx-layer{background:radial-gradient(circle at 50% 50%,rgba(31,73,88,.2),rgba(1,4,7,.96) 45%,#010305 78%)}
.battle-fx-layer::after{content:"";position:absolute;inset:-20%;pointer-events:none;background:repeating-linear-gradient(0deg,transparent 0 5px,rgba(176,229,244,.028) 6px);animation:nqxScan .48s linear infinite}
.battle-fx-head b{font-size:12px;text-shadow:0 0 12px rgba(176,229,244,.36)}
.battle-fx-arena{isolation:isolate}
.battle-fx-arena::before{content:"";position:absolute;left:50%;top:50%;width:14px;height:14px;border:1px solid rgba(184,235,247,.65);border-radius:50%;transform:translate(-50%,-50%);box-shadow:0 0 20px rgba(142,224,245,.8),0 0 54px rgba(142,224,245,.25);animation:nqxImpact .82s ease-out both;z-index:3}
.battle-fx-arena canvas:first-child{animation:nqxSelfStrike .84s cubic-bezier(.2,.7,.2,1) both}
.battle-fx-arena canvas:last-child{animation:nqxEnemyStrike .84s cubic-bezier(.2,.7,.2,1) both}
.battle-stream{height:2px;transform-origin:center;animation:nqxStream .38s ease-in-out infinite alternate;box-shadow:0 0 8px rgba(114,220,247,.55),0 0 22px rgba(114,220,247,.35)}
.battle-turn-dots i.on{height:2px}
.battle-reward{text-align:center!important;color:#91aab5!important;font-size:9px!important;letter-spacing:.08em!important}
@keyframes nqxSelfStrike{0%{transform:translateX(-12px) scale(.94);opacity:.72}45%{transform:translateX(18px) scale(1.08);opacity:1}62%{transform:translateX(7px) scale(1.02)}100%{transform:translateX(0) scale(1)}}
@keyframes nqxEnemyStrike{0%{transform:translateX(12px) scale(.94);opacity:.72}45%{transform:translateX(-18px) scale(1.08);opacity:1}62%{transform:translateX(-7px) scale(1.02)}100%{transform:translateX(0) scale(1)}}
@keyframes nqxImpact{0%{opacity:0;transform:translate(-50%,-50%) scale(.2)}40%{opacity:1;transform:translate(-50%,-50%) scale(2.7)}100%{opacity:0;transform:translate(-50%,-50%) scale(5)}}
@keyframes nqxStream{from{opacity:.28;transform:scaleX(.35)}to{opacity:1;transform:scaleX(1.18)}}
@keyframes nqxScan{from{transform:translateY(-6px)}to{transform:translateY(6px)}}
@media(prefers-reduced-motion:reduce){.battle-fx-layer::after,.battle-fx-arena::before,.battle-fx-arena canvas,.battle-stream{animation:none!important}}`;
if(typeof document!=='undefined'&&!document.querySelector('style[data-nqx-battle-upgrade]')){
  const style=document.createElement('style');style.dataset.nqxBattleUpgrade='1';style.textContent=css;document.head.appendChild(style);
}
