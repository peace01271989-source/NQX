import { seeded } from './rng.js';

function px(ctx,x,y,s,c,a=1){ctx.globalAlpha=a;ctx.fillStyle=c;ctx.fillRect(Math.round(x)*s,Math.round(y)*s,s,s)}
function hsl(h,s,l,a=1){return `hsla(${h} ${s}% ${l}% / ${a})`}
export function drawAberrant(canvas,q,{mode='normal',frame=0,size=320}={}){
  if(!canvas||!q)return;
  const dpr=Math.min(2,globalThis.devicePixelRatio||1);
  const cssSize=Math.max(1,Math.round(size));
  const pixelW=Math.max(1,Math.round(cssSize*dpr));
  if(canvas.width!==pixelW||canvas.height!==pixelW){
    canvas.width=pixelW;canvas.height=pixelW;
  }
  if(canvas.style.width!==`${cssSize}px`)canvas.style.width=`${cssSize}px`;
  if(canvas.style.height!==`${cssSize}px`)canvas.style.height=`${cssSize}px`;
  const ctx=canvas.getContext('2d');
  if(!ctx)return;
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,cssSize,cssSize);ctx.imageSmoothingEnabled=false;
  const logical=32,s=Math.max(1,Math.floor(cssSize/logical));const ox=(cssSize-logical*s)/2/s,oy=ox;ctx.save();ctx.translate(ox*s,oy*s);
  const rng=seeded(`${q.visualSeed}|${q.type}|${q.growth>=75?3:q.growth>=40?2:q.growth>=15?1:0}`);const coreH=q.visual?.coreHue??220, glowH=q.visual?.glowHue??260;
  let phase=mode==='play'?Math.sin(frame/18)*.8:0;let cx=16+(q.visual?.asymmetry??1)*(q.morphology?.asymmetry??30)/99*2,cy=16+phase;
  const stage=q.growth<15?0:q.growth<40?1:q.growth<75?2:3;let radius=stage===0?4:stage===1?5:stage===2?6:7;
  if(q.type==='DRIFT')radius-=1;if(q.type==='REMNANT')radius+=1;
  const black=q.class==='unknown', white=q.class==='dominion';
  const body=black?'#05060a':white?'#eceff4':hsl(coreH,45,32);const mid=black?'#10131c':white?'#cfd5df':hsl(coreH,55,43);const glow=white?'#ffffff':hsl(glowH,88,72);
  const fragCount=Math.floor((q.morphology?.fragments??0)/18)+stage;
  for(let i=0;i<fragCount;i++){const a=rng()*Math.PI*2,r=radius+3+rng()*5;px(ctx,cx+Math.cos(a)*r,cy+Math.sin(a)*r,s,glow,black?.75:.35)}
  const tend=Math.floor((q.morphology?.tendrils??0)/18)+stage;
  for(let i=0;i<tend;i++){const a=(i/tend)*Math.PI*2+rng()*.7;const len=2+stage+rng()*4;for(let j=1;j<=len;j++){const bend=Math.sin(j*.8+i)*.7;px(ctx,cx+Math.cos(a)*(radius+j)+bend,cy+Math.sin(a)*(radius+j),s,mid,.85)}}
  for(let y=-radius-1;y<=radius+1;y++)for(let x=-radius-1;x<=radius+1;x++){
    const asym=(q.morphology?.asymmetry??0)/99*(q.visual?.asymmetry??1)*.18;const dx=x*(1+asym*Math.sign(y||1));const d=(dx*dx)/(radius*radius)+(y*y)/((radius*.84)**2);
    const n=(rng()-.5)*.18;if(d+n<1)px(ctx,cx+x,cy+y,s,d<.58?mid:body,1);
  }
  const shell=q.morphology?.shell??0;if(shell>35&&stage>=2){for(let i=0;i<3+Math.floor(shell/25);i++){const a=rng()*Math.PI*2;px(ctx,cx+Math.cos(a)*(radius-1),cy+Math.sin(a)*(radius-1),s,white?'#fff':hsl(coreH,30,58),.9)}}
  const crystal=q.morphology?.crystal??0;if(crystal>35&&stage>=2){for(let i=0;i<2+Math.floor(crystal/30);i++){const a=rng()*Math.PI*2;for(let j=0;j<2;j++)px(ctx,cx+Math.cos(a)*(radius+j),cy+Math.sin(a)*(radius+j),s,glow,.9)}}
  const cores=q.type==='ECHO'&&stage>=2?2:1;for(let i=0;i<cores;i++){const off=i?2:0;px(ctx,cx+off,cy,s,black?'#050507':glow,1);px(ctx,cx+off,cy-1,s,glow,.8)}
  if(q.class==='unknown'){ctx.globalAlpha=.7;for(let i=0;i<10;i++){const a=rng()*Math.PI*2,r=radius+2+rng()*7;px(ctx,cx+Math.cos(a)*r,cy+Math.sin(a)*r,s,'#ffffff',.65)}}
  ctx.restore();ctx.globalAlpha=1;
}
