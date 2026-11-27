export const C=Object.freeze({fast:650,slow:950,perfect:45,hit:110,late:150,balls:6,rounds:2,bad:1,windup:800,feedback:1050});
export const nameOf={fast:'快直球',slow:'慢变速球',inside:'内角',outside:'外角',bad:'偏出'};
export const zone={x:214,y:362,w:102,h:105}, plate={y:493}, start={x:212,y:208};
export function rng(seed){return ()=>{seed=(seed+0x6D2B79F5)|0;let t=Math.imul(seed^(seed>>>15),1|seed);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296}}
export function makePitch(id,speed,aim,side){
 const x=aim==='bad'?(side==='inside'?136:299):aim==='inside'?183:245;
 return Object.freeze({id,speed,aim,side,x,y:aim==='inside'?405:414,flight:C[speed]});
}
export function position(p,t){
 const u=Math.max(0,t), q=Math.min(1,u), s=q**1.52;
 return {x:start.x+(p.x-start.x)*s,cY:start.y+(p.y-start.y)*s+Math.max(0,u-1)*70,r:3+q*8};
}
export function score(bad,d){
 if(d===null)return bad?{points:1,label:'放过坏球',kind:'take'}:{points:0,label:'放过好球',kind:'miss'};
 if(bad)return {points:0,label:'误打坏球',kind:'miss'};
 const a=Math.abs(d);
 return a<=C.perfect?{points:2,label:'甜区',kind:'perfect'}:a<=C.hit?{points:1,label:'普通命中',kind:'hit'}:{points:0,label:d<0?'挥早':'挥晚',kind:'miss'};
}
// AI sees quantized path samples, not the pitch classification or its arrival time.
export function aiSwing(sample,history,random){
 const prior=history.length?history.reduce((a,b)=>a+b,0)/history.length:800;
 const frames=[340,420,500,550].map(t=>[t,sample(t)]);
 const [t,b]=frames.at(-1),[t0,a]=frames[1];
 const noisyR=b.r+(random()-.5)*.5;
 const observed=frames.map(([ms,pt])=>8*ms/Math.max(1,pt.r-3));
 const estimate=.7*(8*t/Math.max(1,noisyR-3))+.3*(observed.reduce((a,b)=>a+b,0)/observed.length);
 const remainX=b.x+(b.x-a.x)/(t-t0)*Math.max(0,estimate-t)*.95;
 const risk=Math.abs(remainX-zone.x)+(random()-.5)*23;
 const take=risk>57?random()<.72:random()<.035;
 const at=Math.max(565,Math.round(.86*estimate+.14*prior+(random()-.5)*190));
 return {at:take?null:at,observed:Math.max(580,Math.min(1030,estimate))};
}
export class Match{
 constructor({practice=false,rounds=C.rounds,seed=1}={}){
  Object.assign(this,{practice,rounds,random:rng(seed),aiRandom:rng(seed^0x38995671),group:0,n:0,id:0,scores:[0,0],records:[],history:[],open:null});this.resetGroup();
  const badFirst=this.random()<.5,fastFirst=this.random()<.5;
  this.practiceList=[['fast','inside'],['fast','outside'],['slow','inside'],['slow','outside'],[fastFirst?'fast':'slow',badFirst?'bad':'inside'],[fastFirst?'slow':'fast',badFirst?'outside':'bad']];
 }
 resetGroup(){this.left=C.bad;this.last=null;this.badSlot=this.random()<.77?Math.floor(this.random()*C.balls):-1;this.n=0}
 get hitting(){return this.practice||this.group%2===0}
 get done(){return this.n===C.balls&&(this.practice||this.group===this.rounds*2-1)}
 nextGroup(){if(this.n!==C.balls||this.done)return false;this.group++;this.resetGroup();return true}
 pitch(speed,aim){
  if(this.open||this.n>=C.balls)return null;
  if(this.practice)[speed,aim]=this.practiceList[this.n];
  else if(this.hitting){speed=this.random()<.50?'fast':'slow';aim=this.n===this.badSlot?'bad':this.random()<.5?'inside':'outside'}
  if(!['fast','slow'].includes(speed)||!['inside','outside','bad'].includes(aim)||aim==='bad'&&!this.left)return null;
  const side=aim==='bad'?(this.last??(this.random()<.5?'inside':'outside')):aim;
  if(aim==='bad')this.left--;else this.last=aim;
  return this.open=makePitch(++this.id,speed,aim,side);
 }
 settle(id,d){
  const p=this.open;if(!p||p.id!==id)return null;
  const batter=this.hitting?0:1, result={...score(p.aim==='bad',d),p,d,batter,group:this.group,n:++this.n};
  this.open=null;this.scores[batter]+=result.points;this.records.push(result);return result;
 }
}
