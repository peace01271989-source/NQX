import { seeded } from './rng.js';

function px(ctx,x,y,s,c,a=1){ctx.globalAlpha=a;ctx.fillStyle=c;ctx.fillRect(Math.round(x)*s,Math.round(y)*s,s,s)}
function hsl(h,s,l,a=1){return `hsla(${h} ${s}% ${l}% / ${a})`}
function line(ctx,x1,y1,x2,y2,s,c,a=1){
  const dx=x2-x1,dy=y2-y1,steps=Math.max(Math.abs(dx),Math.abs(dy),1);
  for(let i=0;i<=steps;i++)px(ctx,x1+dx*(i/steps),y1+dy*(i/steps),s,c,a);
}
