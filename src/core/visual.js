import { seeded } from './rng.js';

function px(ctx,x,y,s,c,a=1){ctx.globalAlpha=a;ctx.fillStyle=c;ctx.fillRect(Math.round(x)*s,Math.round(y)*s,s,s)}
function hsl(h,s,l,a=1){return `hsla(${h} ${s}% ${l}% / ${a})`}
function line(ctx,x1,y1,x2,y2,s,c,a=1){
  const dx=x2-x1,dy=y2-y1,steps=Math.max(Math.abs(dx),Math.abs(dy),1);
  for(let i=0;i<=steps;i++)px(ctx,x1+dx*(i/steps),y1+dy*(i/steps),s,c,a);
}
function ellipse(ctx,cx,cy,rx,ry,s,c,a=1,fill=.97){
  for(let y=-ry-1;y<=ry+1;y++)for(let x=-rx-1;x<=rx+1;x++){
    const d=(x*x)/(rx*rx)+(y*y)/(ry*ry);
    if(d<=fill)px(ctx,cx+x,cy+y,s,c,a);
  }
}
function diamond(ctx,cx,cy,w,h,s,c,a=1,fill=1){
  for(let y=-h;y<=h;y++){
    const t=1-Math.abs(y)/(h||1);
    const span=Math.max(0,Math.round(w*t*fill));
    for(let x=-span;x<=span;x++)px(ctx,cx+x,cy+y,s,c,a);
  }
}
function circle(ctx,cx,cy,r,s,c,a=1,fill=1){ellipse(ctx,cx,cy,r,r,s,c,a,fill)}
function ring(ctx,cx,cy,r,s,c,a=1){
  for(let y=-r-1;y<=r+1;y++)for(let x=-r-1;x<=r+1;x++){
    const d=Math.hypot(x,y);
    if(d>=r-.65&&d<=r+.65)px(ctx,cx+x,cy+y,s,c,a);
  }
}
function shard(ctx,cx,cy,len,dir,s,c,a=1){
  const vx=Math.cos(dir),vy=Math.sin(dir);
  for(let i=0;i<len;i++){
    px(ctx,cx+vx*i,cy+vy*i,s,c,a);
    if(i>1)px(ctx,cx+vx*i-vy*.7,cy+vy*i+vx*.7,s,c,a*.75);
  }
}
function orbitDots(ctx,cx,cy,r,count,phase,s,c,a=1){
  for(let i=0;i<count;i++){
    const ang=phase+(i/count)*Math.PI*2;
    px(ctx,cx+Math.cos(ang)*r,cy+Math.sin(ang)*r,s,c,a);
  }
}
function tendril(ctx,cx,cy,len,dir,curve,s,c,a=1){
  let x=cx,y=cy;
  for(let i=1;i<=len;i++){
    x+=Math.cos(dir)+Math.sin(i*.7+curve)*.35;
    y+=Math.sin(dir)+Math.cos(i*.45+curve)*.2;
    px(ctx,x,y,s,c,a);
  }
}
function core(ctx,cx,cy,s,glow,black){
  px(ctx,cx,cy,s,black?'#050507':glow,1);
  px(ctx,cx,cy-1,s,glow,.92);
  px(ctx,cx-1,cy,s,glow,.58);
  px(ctx,cx+1,cy,s,glow,.58);
}
function stageOf(q){return q.growth<15?0:q.growth<40?1:q.growth<75?2:3}
function familyFor(q){
  const pools={
    NQX:['orbital','altar','wraith'],
    Q:['maw','tendril','wraith'],
    ENQ:['obelisk','shard','orbital'],
    ECHO:['hourglass','swarm','orbital'],
    VEIL:['wraith','altar','hourglass'],
    DRIFT:['tendril','swarm','wraith'],
    SIGNAL:['shard','orbital','obelisk'],
    FRAGMENT:['shard','swarm','obelisk'],
    REMNANT:['obelisk','altar','maw']
  };
  const family=q.visual?.family;
  if(family)return family;
  const pool=pools[q.type]||pools.NQX;
  const idx=Math.abs(Number(q.visualSeed||0))%pool.length;
  return pool[idx];
}

export function drawAberrant(canvas,q,{mode='normal',frame=0,size=320}={}){
  if(!canvas||!q)return;
  const dpr=Math.min(2,globalThis.devicePixelRatio||1);
  canvas.width=size*dpr;canvas.height=size*dpr;canvas.style.width=`${size}px`;canvas.style.height=`${size}px`;
  const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,size,size);ctx.imageSmoothingEnabled=false;
  const logical=32,s=Math.max(1,Math.floor(size/logical));const ox=(size-logical*s)/2/s,oy=ox;ctx.save();ctx.translate(ox*s,oy*s);
  const stage=stageOf(q);
  const rng=seeded(`${q.visualSeed}|${q.type}|${familyFor(q)}|${stage}`);
  const coreH=q.visual?.coreHue??220, glowH=q.visual?.glowHue??260;
  const black=q.class==='unknown', white=q.class==='dominion';
  const body=black?'#05060a':white?'#eceff4':hsl(coreH,45,22+stage*4);
  const mid=black?'#10131c':white?'#d7deea':hsl(coreH,42,35+stage*4);
  const glow=white?'#ffffff':hsl(glowH,88,74);
  const pale=white?'#ffffff':hsl(coreH,28,68);
  const phase=mode==='play'?Math.sin(frame/16)*.85:0;
  const asym=(q.visual?.asymmetry??1)*(q.morphology?.asymmetry??30)/99;
  const cx=16+asym*2.3, cy=16+phase;
  const family=familyFor(q);
  const variant=Math.abs(Math.floor(Number(q.visualSeed||0)/7))%3;
  const frag=(q.morphology?.fragments??0), tend=(q.morphology?.tendrils??0), shell=(q.morphology?.shell??0), crystal=(q.morphology?.crystal??0);
  const auraCount=Math.max(2,Math.floor(frag/20)+stage+1);

  for(let i=0;i<auraCount;i++){
    const ang=rng()*Math.PI*2, r=7+stage*2+rng()*6;
    px(ctx,cx+Math.cos(ang)*r,cy+Math.sin(ang)*r,s,glow,black?.82:.34);
    if(rng()>.55)px(ctx,cx+Math.cos(ang)*(r+1),cy+Math.sin(ang)*(r+1),s,pale,.22);
  }

  const drawSwarmSatellites=(count,spread,withTails=false)=>{
    for(let i=0;i<count;i++){
      const ang=(i/count)*Math.PI*2+rng()*.4;const r=spread+rng()*2;
      const sx=cx+Math.cos(ang)*r, sy=cy+Math.sin(ang)*r;
      circle(ctx,sx,sy,1,s,mid,.95,.95);core(ctx,sx,sy,s,glow,black);
      if(withTails)tendril(ctx,sx,sy+1,2+stage,Math.PI/2,.4+i,s,mid,.65);
    }
  };

  switch(family){
    case 'wraith': {
      const headY=cy-5-stage-(variant===2?1:0), bodyH=8+stage*2+(variant===1?2:0);
      ellipse(ctx,cx,headY,3,3,s,mid,.95,.98);
      line(ctx,cx-2,headY+1,cx-4,headY+bodyH-1,s,mid,.9);
      line(ctx,cx+2,headY+1,cx+3,headY+bodyH-1,s,mid,.9);
      for(let y=0;y<bodyH;y++){
        const span=Math.max(1,Math.round((y/(bodyH))* (4+stage)));
        for(let x=-span;x<=span;x++)px(ctx,cx+x+(x>0?asym*.4:0),headY+2+y,s, y<bodyH*.45?body:mid,.9);
      }
      for(let i=0;i<2+Math.floor(tend/28);i++)tendril(ctx,cx-2+i*2,headY+bodyH-1,4+stage,Math.PI/2,.7+i,s,mid,.82);
      if(stage>=2||shell>42)ring(ctx,cx+(variant===1?2:0),headY-1,4+Math.floor(shell/45),s,pale,.72);
      if(variant===2)line(ctx,cx-4,headY+2,cx-7,headY+6,s,mid,.72);
      core(ctx,cx,headY,s,glow,black);
      break;
    }
    case 'obelisk': {
      const h=10+stage*2+(variant===2?2:0);
      diamond(ctx,cx,cy-1,4+stage, h/2,s,body,.95,1);
      line(ctx,cx,cy-h/2,cx,cy+h/2,s,mid,.8);
      if(stage>=1){line(ctx,cx-2,cy-2,cx-4-stage,cy+4+stage,s,mid,.75);line(ctx,cx+2,cy-2,cx+4+stage,cy+4+stage,s,mid,.75)}
      const shardCount=2+Math.floor(crystal/28)+stage;
      for(let i=0;i<shardCount;i++){
        const side=i%2?-1:1, sy=cy-h/2+2+i*2.3, sx=cx+side*(4+stage*1.3);
        shard(ctx,sx,sy,2+stage*.6,side<0?Math.PI:.0,s,pale,.86);
      }
      if(variant===1)ring(ctx,cx,cy-1,6+stage,s,pale,.38);
      if(variant===2){line(ctx,cx-5-stage,cy,cx+5+stage,cy,s,pale,.45)}
      core(ctx,cx,cy-1,s,glow,black);
      break;
    }
    case 'shard': {
      diamond(ctx,cx,cy,4+stage,6+stage*2,s,mid,.95,1);
      diamond(ctx,cx,cy,2+stage*.5,4+stage,s,body,.92,1);
      const shardCount=4+Math.floor(crystal/24)+variant;
      for(let i=0;i<shardCount;i++){
        const ang=(i/shardCount)*Math.PI*2+Math.sin(frame/28)*.08;
        const dist=7+stage+rng()*3+(variant===2&&i%2===0?2:0);
        shard(ctx,cx+Math.cos(ang)*dist,cy+Math.sin(ang)*dist,2+stage*.6,ang,s,pale,.84);
      }
      core(ctx,cx,cy,s,glow,black);
      break;
    }
    case 'orbital': {
      circle(ctx,cx,cy,4+stage,s,body,.93,.95);
      if(stage>=1)ellipse(ctx,cx,cy+2,2+stage*.3,5+stage,s,mid,.72,.88);
      core(ctx,cx,cy,s,glow,black);
      ring(ctx,cx,cy-1,6+stage+(variant===2?1:0),s,pale,.75);
      if(variant===1)ring(ctx,cx,cy-1,4+stage,s,glow,.34);
      orbitDots(ctx,cx,cy-1,6+stage,4+stage,frame/20,s,glow,.8);
      if(shell>45&&stage>=2)ring(ctx,cx,cy-1,8+Math.floor(shell/35),s,pale,.4);
      break;
    }
    case 'altar': {
      line(ctx,cx,cy-6-stage,cx,cy+7+stage,s,mid,.85);
      diamond(ctx,cx,cy+1,3+stage,5+stage,s,body,.95,1);
      if(stage>=1){
        line(ctx,cx,cy-1,cx-5-stage*.6,cy+3,s,mid,.75);
        line(ctx,cx,cy-1,cx+5+stage*.6,cy+3,s,mid,.75);
        line(ctx,cx-5-stage*.6,cy+3,cx-5-stage*.6,cy+6+stage,s,mid,.65);
        line(ctx,cx+5+stage*.6,cy+3,cx+5+stage*.6,cy+6+stage,s,mid,.65);
      }
      drawSwarmSatellites(3+stage+variant,8+stage+(variant===2?2:0),true);
      if(stage>=2)ring(ctx,cx,cy-8-stage,4,s,pale,.68);
      core(ctx,cx,cy+1,s,glow,black);core(ctx,cx,cy-7-stage,s,glow,black);
      break;
    }
    case 'swarm': {
      circle(ctx,cx,cy,3+stage,s,body,.9,.95);
      core(ctx,cx,cy,s,glow,black);
      const nodes=5+stage+Math.floor(frag/25)+variant*2;
      for(let i=0;i<nodes;i++){
        const ang=(i/nodes)*Math.PI*2+rng()*.45;const dist=5+stage*1.5+rng()*4;
        const sx=cx+Math.cos(ang)*dist*(variant===1?1.15:1), sy=cy+Math.sin(ang)*dist*(variant===2?.78:1);
        circle(ctx,sx,sy,1+(i%3===0),s,mid,.92,.94);core(ctx,sx,sy,s,glow,black);
        if(rng()>.45)line(ctx,cx,cy,sx,sy,s,mid,.22);
      }
      break;
    }
    case 'maw': {
      const topY=cy-6-stage-(variant===1?2:0), botY=cy+7+stage+(variant===2?2:0);
      line(ctx,cx-4-stage*.3,topY,cx-1,cy,s,mid,.9);
      line(ctx,cx+4+stage*.3,topY,cx+1,cy,s,mid,.9);
      line(ctx,cx-1,cy,cx-4-stage*.2,botY,s,mid,.9);
      line(ctx,cx+1,cy,cx+4+stage*.2,botY,s,mid,.9);
      for(let y=-4-stage;y<=4+stage;y++){
        const span=2+Math.floor((1-Math.abs(y)/(5+stage))*2);
        for(let x=-span;x<=span;x++)px(ctx,cx+x,cy+y,s,Math.abs(x)<1?body:mid,.92);
      }
      for(let i=0;i<3+stage;i++){px(ctx,cx-2+i,cy-(4+stage)+i,s,pale,.88);px(ctx,cx-2+i,cy+(4+stage)-i,s,pale,.88)}
      for(let i=0;i<2+Math.floor(tend/32);i++)tendril(ctx,cx-1+i*2,botY-1,3+stage,Math.PI/2,.5+i,s,mid,.8);
      core(ctx,cx,cy,s,glow,black);
      break;
    }
    case 'hourglass': {
      circle(ctx,cx-(variant===1?1:0),cy-5-stage,3+stage,s,body,.92,.95);
      circle(ctx,cx+(variant===2?1:0),cy+5+stage,3+stage,s,body,.92,.95);
      line(ctx,cx-1,cy-2,cx+1,cy+2,s,mid,.85);
      line(ctx,cx+1,cy-2,cx-1,cy+2,s,mid,.85);
      if(stage>=2){orbitDots(ctx,cx,cy-5-stage,5,4,frame/25,s,pale,.74);orbitDots(ctx,cx,cy+5+stage,5,4,-frame/25,s,pale,.74)}
      core(ctx,cx,cy-5-stage,s,glow,black);core(ctx,cx,cy+5+stage,s,glow,black);
      break;
    }
    case 'tendril':
    default: {
      line(ctx,cx,cy-6-stage,cx,cy+6+stage,s,mid,.84);
      circle(ctx,cx,cy-5-stage,2+Math.floor(stage/2),s,body,.95,.95);
      core(ctx,cx,cy-4-stage,s,glow,black);
      const branches=4+Math.floor(tend/20)+stage+variant;
      for(let i=0;i<branches;i++){
        const ang=(i/branches)*Math.PI*2;const dir=(Math.sin(ang)>0?Math.PI/2:-Math.PI/2)+(Math.cos(ang)*.65);
        tendril(ctx,cx,cy-1+Math.sin(ang)*2,4+stage,dir,ang+i,s,mid,.82);
        const tx=cx+Math.cos(ang)*(4+stage*.5), ty=cy+Math.sin(ang)*(5+stage*.5);
        circle(ctx,tx,ty,1,s,mid,.92,.96);core(ctx,tx,ty,s,glow,black);
      }
      break;
    }
  }

  if(q.type==='ECHO'&&stage>=2&&family!=='hourglass')core(ctx,cx+2,cy+1,s,glow,black);
  if(q.class==='unknown')orbitDots(ctx,cx,cy,10+stage,8,frame/18,s,'#ffffff',.55);
  ctx.restore();ctx.globalAlpha=1;
}

if(typeof document!=='undefined'&&!document.querySelector('style[data-nqx-shape-silhouette]')){
  const style=document.createElement('style');
  style.dataset.nqxShapeSilhouette='1';
  style.textContent=`
    .play .aberrant-play{max-width:50vw!important;max-height:50vw!important;min-width:20vw!important;min-height:20vw!important;filter:drop-shadow(0 0 24px rgba(180,210,255,.18))!important}
    .status-visual canvas{width:220px!important;height:220px!important;flex:0 0 220px}
    #enemy-canvas{width:min(72vw,320px)!important;height:min(72vw,320px)!important}
    .battle-fx-arena{grid-template-columns:1fr 46px 1fr!important;width:min(100%,560px)!important}
    .battle-fx-arena canvas{width:min(38vw,180px)!important;height:min(38vw,180px)!important}
    #archive-canvas{width:min(68vw,300px)!important;height:min(68vw,300px)!important}
    @media(max-width:390px){.status-visual canvas{width:190px!important;height:190px!important;flex-basis:190px}.battle-fx-arena canvas{width:36vw!important;height:36vw!important}}
  `;
  document.head.appendChild(style);
}
