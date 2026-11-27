import {C,Match,position,nameOf,aiSwing} from './rules.js';
import {field} from './field.js';
const $=id=>document.getElementById(id), draw=field($('field'));
const buttons=[...document.querySelectorAll('[data-speed],[data-aim]')];
const q=new URLSearchParams(location.search);
const rounds=q.get('rounds')==='1'?1:C.rounds;
const seed=()=>q.has('seed')?(Number(q.get('seed'))|0):crypto.getRandomValues(new Uint32Array(1))[0];
let m=null,phase='home',speed='fast',aim='inside',p=null,release=0,swingTime=null,d=null,result=null,resultAt=0,ai=null,hiddenAt=null,next=0;
let audio=null,muted=false;
try{muted=localStorage.getItem('diamond.sound')==='off'}catch{}
function soundToggle(){ $('sound').textContent='音效 '+(muted?'关':'开');$('sound').setAttribute('aria-pressed',String(!muted)) }
soundToggle();
const unlock=()=>{if(muted)return;try{audio??=new AudioContext();if(audio.state==='suspended')audio.resume().catch(()=>{})}catch{}};
$('sound').onclick=()=>{muted=!muted;try{localStorage.setItem('diamond.sound',muted?'off':'on')}catch{}soundToggle();unlock();tone('hit')};
function tone(kind){
 if(!audio||muted||audio.state!=='running')return;
 const at=audio.currentTime, voices=kind==='perfect'?[[460,0],[810,.06],[1140,.12]]:kind==='hit'?[[260,0],[525,.045]]:kind==='take'?[[420,0]]:[[126,0]];
 for(const [hz,off] of voices){const o=audio.createOscillator(),g=audio.createGain();o.type=kind==='miss'?'triangle':'sine';o.frequency.setValueAtTime(hz,at+off);o.frequency.exponentialRampToValueAtTime(hz*.71,at+off+.16);g.gain.setValueAtTime(.0001,at+off);g.gain.exponentialRampToValueAtTime(.13,at+off+.012);g.gain.exponentialRampToValueAtTime(.0001,at+off+.2);o.connect(g).connect(audio.destination);o.start(at+off);o.stop(at+off+.205)}
}
function status(a,b){$('status').textContent=a;$('detail').textContent=b}
function cover(show,{k='',h='',accent='',b='',a='',sub='',extra='',run=null,runSub=null,runExtra=null}={}){
 $('cover').hidden=!show;if(!show)return;
 $('kicker').textContent=k;$('headline').replaceChildren(document.createTextNode(h));
 if(accent){const el=document.createElement('span');el.textContent=accent;$('headline').append(el)}
 $('blurb').textContent=b;
 for(const [id,label,fn] of [['mainAction',a,run],['subAction',sub,runSub],['extraAction',extra,runExtra]]){
  $(id).hidden=!label;$(id).textContent=label;$(id).onclick=fn;
 }
}
function renderUI(){
 const playing=phase==='ready'||phase==='pitch'||phase==='feedback',hitting=!!m?.hitting;
 $('home').hidden=phase==='home';
 $('batControls').hidden=!(playing&&hitting);
 $('pitchControls').hidden=!(playing&&!hitting);
 $('swing').disabled=!(phase==='pitch'&&performance.now()>=release&&swingTime===null&&!document.hidden);
 $('throw').disabled=phase!=='ready';
 for(const b of buttons){const v=b.dataset.speed??b.dataset.aim;b.setAttribute('aria-pressed',String(v===(b.dataset.speed?speed:aim)));b.disabled=phase!=='ready'||v==='bad'&&!m?.left}
 $('you').textContent=m?.scores[0]??0;$('cpu').textContent=m?.scores[1]??0;
 $('round').textContent=m?m.practice?'训练 · 6 球':`第 ${Math.floor(m.group/2)+1} / ${m.rounds} 轮`:'投打训练场';
 $('role').textContent=phase==='home'?'棒球投打':phase==='end'?'比赛结束':phase==='side'?'换边':hitting?'你来击球':'你来投球';
 const i=m?Math.min(C.balls,m.n+(phase==='feedback'||phase==='end'||phase==='side'?0:1)):0;
 $('badge').textContent=m?`第 ${i} / ${C.balls} 球`:'夜场 / 01';
 $('balls').replaceChildren(...Array.from({length:C.balls},(_,n)=>{const e=document.createElement('i');e.className='pip '+(n<(m?.n??0)?'used':m&&n===m.n?'current':'');return e}));
}
function cleanBall(){p=null;result=null;d=null;ai=null;swingTime=null;release=0}
function home(){
 m=null;phase='home';cleanBall();cover(true,{k:'THE NIGHT GAME',h:'棒球',accent:'投打',b:'盯住本垒，在球抵达时挥棒。偏出好球区的球，放过也能得分。',a:'6 球练习',sub:'对战 AI',run:()=>begin(true),runSub:()=>begin(false)});
 status('眼睛跟球，出棒只需一下。',`练习 6 球 · 对局双方各打 ${rounds*C.balls} 球`);renderUI();
}
function begin(practice){
 unlock();m=new Match({practice,rounds,seed:seed()});speed='fast';aim='inside';ready(performance.now());
}
function ready(now){
 cleanBall();phase='ready';cover(false);
 if(m.hitting){
  const training=m.practice?(m.n<2?'练习：快直球':m.n<4?'练习：慢变速球':'练习：混合球，球后揭晓'):'AI 准备投球';
  status(training,'球到方框的一刻挥棒。偏离方框就放过。');
  next=now+550;
 }else status('选择球种和落点',`本组坏球额度：${m.left} / ${C.bad}。可以先用内、外角铺垫。`);
 renderUI();
}
function fire(now){
 p=m.pitch(speed,aim);if(!p)return;
 if(aim==='bad'&&!m.hitting)aim='inside';
 phase='pitch';release=now+C.windup;
 ai=m.hitting?null:aiSwing(t=>{const v=position(p,t/p.flight);return {x:Math.round(v.x),r:Math.round(v.r*10)/10}},m.history,m.aiRandom);
 status(m.hitting?'投手准备…':'出手准备…',m.hitting?'等球离手。':'球路已锁定。');
 renderUI();
}
function attempt(e){
 if(!m?.hitting||phase!=='pitch'||document.hidden||swingTime!==null)return;
 const now=performance.now(), t=e.timeStamp>=0&&e.timeStamp<=now?e.timeStamp:now;
 if(t<release||t>release+p.flight+C.late)return;
 swingTime=t;d=t-release-p.flight;
 $('swing').disabled=true;
}
function finish(now){
 result=m.settle(p.id,d);if(!result)return;
 if(ai){m.history.push(ai.observed);m.history=m.history.slice(-2)}
 resultAt=now;phase='feedback';
 const who=m.hitting?'你':'AI',delta=result.d===null?'':` · ${result.d<0?'早':result.d>0?'晚':'时机'} ${Math.round(Math.abs(result.d))} ms`;
 status(`${who}：${result.label}${result.points?' +'+result.points:''}`,`${nameOf[p.speed]} · ${p.aim==='bad'?'坏球':nameOf[p.aim]+'好球'}${delta}`);
 tone(result.kind);renderUI();
}
function endGroup(now){
 cleanBall();
 if(m.done){
  phase='end';const [u,a]=m.scores;
  cover(true,{k:m.practice?'TRAINING COMPLETE':'FINAL SCORE',h:m.practice?'练习':u===a?'握手':u>a?'你赢':'AI',accent:m.practice?'完成':u===a?'言和':u>a?'了':'获胜',b:m.practice?`6 球得了 ${u} 分。混合段一颗坏球，放过它也能得分。`:`比分 ${u} : ${a} · 双方各打了 ${m.rounds*C.balls} 球。`,a:m.practice?'再练一次':'再来一局',sub:m.practice?'对战 AI':'返回首页',extra:m.practice?'返回首页':'',run:()=>begin(m.practice),runSub:()=>m.practice?begin(false):home(),runExtra:home});
  status('本场结束',m.practice?'下一次试着只看球路，不猜球种。':'快慢交替不一定最好，试试把变速球藏在两颗快球后。');
 }else{
  phase='side';const wasHit=m.hitting;cover(true,{k:'CHANGE SIDES',h:'换',accent:'边',b:wasHit?'这一组你来投球。选快慢和落点，看看 AI 会不会上当。':'这一组你来击球。等球到板，偏出就放过。',a:'继续',run:()=>{if(phase!=='side'||!m.nextGroup())return;speed='fast';aim='inside';ready(performance.now())}});
  status('6 球结束',wasHit?'下一组：你投，AI 打。':'下一组：AI 投，你打。');
 }
 renderUI();
}
for(const b of buttons)b.onclick=()=>{if(phase!=='ready'||m.hitting||b.disabled)return;if(b.dataset.speed)speed=b.dataset.speed;else aim=b.dataset.aim;renderUI()};
$('throw').onclick=()=>{if(phase==='ready'&&!m.hitting){unlock();fire(performance.now())}};
$('home').onclick=home;
$('swing').addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();attempt(e)});
$('swing').addEventListener('click',e=>{if(e.detail===0)attempt(e)});
window.addEventListener('keydown',e=>{if(e.code!=='Space'||!m?.hitting||e.altKey||e.ctrlKey||e.metaKey||e.shiftKey||phase!=='pitch')return;e.preventDefault();if(!e.repeat)attempt(e)});
document.addEventListener('visibilitychange',()=>{
 const now=performance.now();
 if(document.hidden){hiddenAt=now;return}
 if(hiddenAt!==null){const gap=now-hiddenAt;hiddenAt=null;if(phase==='pitch'){release=now+C.windup;swingTime=null;d=null;status('重新播放这一球','球种、落点和比分保持不变。');renderUI()}else if(phase==='feedback')resultAt+=gap;else if(phase==='ready')next+=gap}
});
function frame(now){
 if(!document.hidden){
  if(phase==='ready'&&m.hitting&&now>=next)fire(now);
  if(phase==='pitch'){
   const t=now-release;
   if(t>=0&&t<=34){if(m.hitting&&swingTime===null)$('swing').disabled=false;status(m.hitting?'球已离手':'观察 AI 的选择',m.hitting?'到本垒挥棒，偏出就不打。':'AI 正在判断球路。')}
   if(m.hitting&&swingTime===null&&t>=0&&t<=p.flight+C.late)$('swing').disabled=false;
   if(ai&&ai.at!==null&&t>=ai.at&&ai.at<=p.flight+C.late&&swingTime===null){swingTime=release+ai.at;d=ai.at-p.flight}
   if(t>=p.flight&&(swingTime!==null||t>=p.flight+C.late))finish(now);
  }else if(phase==='feedback'&&now-resultAt>=C.feedback) m.n===C.balls?endGroup(now):ready(now);
  draw({p,release,swingTime,result,resultAt},now);
 }
 requestAnimationFrame(frame);
}
home();requestAnimationFrame(frame);
