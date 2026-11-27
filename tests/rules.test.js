import {test} from 'node:test';
import assert from 'node:assert/strict';
import {C,score,Match,aiSwing,position,zone} from '../rules.js';
test('score boundaries, both sides, good take and bad swing/take',()=>{
 for(const [ms,pts] of [[0,2],[45,2],[46,1],[110,1],[111,0]])
  for(const d of [-ms,ms])assert.equal(score(false,d).points,pts);
 assert.equal(score(false,-111).label,'挥早');assert.equal(score(false,111).label,'挥晚');
 assert.equal(score(false,null).points,0);assert.equal(score(true,null).points,1);assert.equal(score(true,0).points,0);
});
test('practice: 2 fast, 2 slow, mixed 1 bad; fixed geometry and duplicate guard',()=>{
 for(let seed=0;seed<16;seed++){const m=new Match({practice:true,seed});let pitches=[];
 for(let i=0;i<6;i++){const p=m.pitch();pitches.push(p);assert.equal(m.pitch(),null);assert.equal(m.settle(p.id+1,0),null);assert.equal(m.settle(p.id,0).points,p.aim==='bad'?0:2);assert.equal(m.settle(p.id,0),null);assert.equal(Math.abs(position(p,1).x-zone.x)>zone.w/2,p.aim==='bad')}
 assert.deepEqual(pitches.slice(0,4).map(p=>p.speed),['fast','fast','slow','slow']);
 assert.equal(new Set(pitches.slice(-2).map(p=>p.speed)).size,2);assert.equal(pitches.filter(p=>p.aim==='bad').length,1);assert.equal(m.scores[0],10);assert(m.done)}
});
test('12/24 pitch match, alternating scorer, fresh quota, bad on previous side, draw and reset',()=>{
 for(const rounds of [1,2]){const m=new Match({rounds,seed:13});
 for(let g=0;g<rounds*2;g++){assert.equal(m.hitting,g%2===0);assert.equal(m.left,1);
 for(let i=0;i<6;i++){if(!m.hitting&&i===2)assert.equal(m.pitch('slow','bad'),null);
 const p=m.pitch('fast',i===1?'bad':'outside');
 if(!m.hitting&&i===1){assert.equal(p.side,'outside');assert.equal(m.left,0)}
 assert.equal(m.settle(p.id,p.aim==='bad'?0:125).group,g)}
 if(g<rounds*2-1)assert(m.nextGroup());else assert(m.done)}
 assert.equal(m.records.length,rounds*12);assert.deepEqual(m.scores,[0,0]);
 const again=new Match({rounds});assert.deepEqual(again.scores,[0,0]);assert.equal(again.left,1);assert.equal(again.pitch().id,1)}
});
test('same seed + placement reproduces AI; fast/slow timing windows do not overlap',()=>{
 assert(C.fast+C.hit<C.slow-C.hit);
 for(const ms of [C.fast,C.slow])assert(score(false,ms-C.fast).points!==score(false,ms-C.slow).points);
 const a=new Match({seed:11}),b=new Match({seed:11});for(let i=0;i<6;i++){const p=a.pitch(),q=b.pitch();assert.deepEqual(p,q);a.settle(p.id,0);b.settle(q.id,0)}
});
test('matched-seed AI strategy comparison',()=>{
 const variants={fast:['fast'],slow:['slow'],mixed:['fast','fast','slow']};
 for(const [name,seq] of Object.entries(variants)){
  let sum=0,n=0;
  for(let seed=1;seed<=128;seed++){
   const m=new Match({seed});
   for(let g=0;g<4;g++){for(let i=0;i<6;i++){
    const p=m.pitch(seq[i%seq.length],i===4?'bad':i%2===0?'inside':'outside');let d=null;
    if(!m.hitting){
     const a=aiSwing(t=>{const v=position(p,t/p.flight);return {x:Math.round(v.x),r:Math.round(v.r*10)/10}},m.history,m.aiRandom);
     m.history=[...m.history,a.observed].slice(-2);if(a.at!==null&&a.at<=p.flight+C.late)d=a.at-p.flight;
    }
    const res=m.settle(p.id,d);if(res.batter){sum+=res.points;n++}
   }m.nextGroup()}
  }
  console.log(name,sum,n,(sum/n).toFixed(3));assert(sum>0&&sum<2*n);
 }
});
