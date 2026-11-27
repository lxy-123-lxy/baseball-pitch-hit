import {zone,plate,start,position} from './rules.js';
const W=428,H=525;
export function field(canvas){
 const g=canvas.getContext('2d',{alpha:false}), bg=document.createElement('canvas');bg.width=W;bg.height=H;
 const b=bg.getContext('2d');
 function ellipse(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill()}
 function poly(c,pts,color){c.fillStyle=color;c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill()}
 function line(c,x,y,xe,ye,color,w=1){c.strokeStyle=color;c.lineWidth=w;c.beginPath();c.moveTo(x,y);c.lineTo(xe,ye);c.stroke()}
 const sky=b.createLinearGradient(0,0,0,200);sky.addColorStop(0,'#132b2d');sky.addColorStop(1,'#527b69');b.fillStyle=sky;b.fillRect(0,0,W,H);
 ellipse(b,341,76,27,27,'#c0d2ad');ellipse(b,350,70,27,27,'#284b46');
 for(let i=0;i<33;i++){const x=(i*71+8)%420,y=(i*49+28)%100;b.fillStyle=i%4===0?'#b7d09466':'#b7d0942b';b.fillRect(x,y,2,2)}
 for(const x of [48,380]){line(b,x,116,x,62,'#729b85',3);for(let j=0;j<2;j++)for(let i=0;i<3;i++){ellipse(b,x+(i-1)*8,59+j*6,3,2,'#d8ecbd')}}
 for(let i=0;i<28;i++){const y=117+9*Math.cos((i-13)*.19),x=i*16;poly(b,[[x,y],[x+15,y+2],[x+17,164],[x-5,164]],i%2?'#213c3a':'#294c45');for(let j=0;j<3;j++)ellipse(b,x+5+j*3,y+8+(j*8+i)%19,1,1,'#c6d8b96c')}
 b.fillStyle='#244b3b';b.fillRect(0,153,W,H-153);for(let i=-4;i<5;i++)poly(b,[[214+i*24,153],[228+i*24,153],[290+i*105,H],[219+i*105,H]],'#2c5744');
 poly(b,[[214,161],[373,264],[214,500],[55,264]],'#926e43');poly(b,[[214,178],[327,265],[214,429],[101,265]],'#325e48');
 ellipse(b,214,235,33,11,'#ae8752');ellipse(b,214,501,100,30,'#a2784d');
 for(const [x,y] of [[214,161],[373,264],[55,264]])poly(b,[[x,y-3],[x+6,y],[x,y+3],[x-6,y]],'#e3d3af');
 line(b,214,493,0,222,'#ece3bf99',2);line(b,214,493,428,222,'#ece3bf99',2);
 poly(b,[[193,484],[235,484],[235,494],[214,506],[193,494]],'#f6edcf');
 b.strokeStyle='#eddbac99';b.lineWidth=2;b.strokeRect(142,471,40,41);b.strokeRect(246,471,40,41);
 for(let i=0;i<140;i++){const x=(i*79)%420,y=154+(i*147)%369;b.fillStyle='#d8deaa27';b.fillRect(x,y,1.4,1.2)}
 let dpr=1;
 const resize=()=>{dpr=Math.min(3,Math.max(1,devicePixelRatio||1));canvas.width=Math.round(canvas.clientWidth*dpr)||W;canvas.height=Math.round(canvas.clientHeight*dpr)||H};
 new ResizeObserver(resize).observe(canvas);resize();
 function player(x,y,scale,blue,hit=0){
  g.save();g.translate(x,y);g.scale(scale,scale);
  ellipse(g,0,0,24,6,'#152e2490');line(g,-3,-19,-12,-3,'#e3e2c3',7);line(g,7,-18,13,-3,'#c7d4b8',7);
  poly(g,[[-13,-39],[14,-40],[13,-15],[-10,-15]],blue?'#6ba7ad':'#d5eb95');
  ellipse(g,1,-48,9,9,'#d1a17f');ellipse(g,0,-53,11,5,blue?'#366d79':'#466d43');line(g,4,-51,14,-51,blue?'#366d79':'#466d43',4);
  if(blue){line(g,8,-34,17+hit*8,-30+hit*8,'#d5ab80',5);ellipse(g,18+hit*8,-31+hit*8,5,5,'#ae8754')}
  else{line(g,8,-35,17,-32,'#d5ab80',6);line(g,17,-32,7+hit*41,-64+hit*30,'#e0bd88',5)}
  g.restore();
 }
 return function draw(state,now){
  g.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);g.drawImage(bg,0,0);
  const p=state.p, elapsed=p?now-state.release:0, u=p?elapsed/p.flight:0, bat=state.swingTime===null?0:Math.max(0,1-Math.max(0,now-state.swingTime)/270);
  player(201,235,.63,true,p&&elapsed>=-200&&elapsed<250?Math.max(0,1-Math.abs(elapsed)/250):0);player(110,501,1.48,false,bat);
  g.fillStyle='#101c214a';g.fillRect(zone.x-zone.w/2,zone.y,zone.w,zone.h);
  g.strokeStyle='#ccecc9';g.lineWidth=1.8;g.strokeRect(zone.x-zone.w/2,zone.y,zone.w,zone.h);
  for(let n=1;n<3;n++){line(g,zone.x-zone.w/2+n*34,zone.y,zone.x-zone.w/2+n*34,zone.y+zone.h,'#e8f7e753');line(g,zone.x-zone.w/2,zone.y+n*35,zone.x+zone.w/2,zone.y+n*35,'#e8f7e753')}
  const r=state.result;
  if(p&&(elapsed<0||u<1.25)&&(!r||!r.points||r.kind==='take')){
   const q=position(p,u);
   if(elapsed>=0){for(let n=5;n>0;n--){const tail=position(p,u-n*.018);ellipse(g,tail.x,tail.cY,tail.r*.7,tail.r*.7,'rgba(224,244,180,'+(.035*(6-n))+')')}}
   ellipse(g,q.x,q.cY,q.r,q.r,'#fff0ce');
   if(q.r>5){line(g,q.x-2,q.cY-q.r*.6,q.x+3,q.cY+q.r*.55,'#c16c57',1.2);line(g,q.x+1,q.cY-q.r*.6,q.x+6,q.cY+q.r*.4,'#c16c57',1.1)}
  }
  if(r&&(r.kind==='perfect'||r.kind==='hit')){
   const t=Math.max(0,(now-state.resultAt)/950), gold=r.kind==='perfect', color=gold?'#effb85':'#e9f9e7';
   if(t<1){const x=p.x+(gold?90:44)*t,y=p.y-420*t+100*t*t;line(g,p.x,p.y,x,y,gold?'#f7ec7866':'#c4f3da66',gold?5:3);ellipse(g,x,y,Math.max(2,10-8*t),Math.max(2,10-8*t),color)}
  }
 }
}
