const vm=require('vm'),assert=require('node:assert/strict');
const ctx={crypto:require('crypto').webcrypto,Request,Response,URL,structuredClone};vm.createContext(ctx);
vm.runInContext(require('./worker-source.cjs')(ctx)+';globalThis.CY={worker,GameRoom,CY_VALUES,cyCard,cyPlayer,cyStart,cyRound,cyAction,cyCalculate,cyView,cyNext};',ctx);
const E=ctx.CY,V=E.CY_VALUES,ids=value=>V.map((v,i)=>v===value?i:-1).filter(i=>i>=0);
function game(n=4){const ps=Array.from({length:n},(_,i)=>E.cyPlayer('P'+(i+1))),g={code:'ABC123',hostId:ps[0].id,players:ps,phase:'lobby',revision:1,startingLife:3,log:[]};E.cyStart(g);return g;}
function action(g,p,type,args={}){E.cyAction(g,p,{revision:g.revision,matchId:g.matchId,roundId:g.roundId,type,...args});g.revision++;}
function current(g){return g.players.find(p=>p.id===g.turnId);}
function arrange(values,draws=[]){const g=game(values.length);let used=[];g.players.forEach((p,i)=>{const id=ids(values[i]).find(x=>!used.includes(x));assert.notEqual(id,undefined);p.card=id;used.push(id);});const chosen=draws.map(v=>{const id=ids(v).find(x=>!used.includes(x));assert.notEqual(id,undefined);used.push(id);return id;});g.deck=V.map((_,i)=>i).filter(i=>!used.includes(i));g.deck.push(...chosen.reverse());g.discard=[];return g;}
function conservation(g){const all=[...g.deck,...g.discard,...g.players.map(p=>p.card).filter(c=>c!==null),...(g.revealDraws||[])];assert.equal(all.length,36);assert.equal(new Set(all).size,36);}
assert.equal(V.length,36);assert.equal(ids(1).length,4);assert.equal(ids(20).length,1);
for(const [values,draw,total,removed,multiplier] of [
 [[15,15,'fox'],[],15,15,1],[[20,15,'fox','double',-10],[],10,20,2],[[-5,-10,'fox'],[],-15,0,1],
 [['cave',15,15],['fox'],15,15,1],[['cave',20,5],['double'],50,0,2],[['cave',20,5],[-10],15,0,1],
 [['night',20],[],20,0,1],[['cave',20],['night'],20,0,1]
]){const g=arrange(values,draw),r=E.cyCalculate(g);assert.equal(r.total,total);assert.equal(r.removed,removed);assert.equal(r.multiplier,multiplier);if(values.includes('night')||draw.includes('night'))assert(r.reshuffle);}
console.log('PASS official 36-card deck, tied maximum removes one, negatives, doubling and cave-drawn special cards');
{
 const g=arrange([1,2,3]),p=current(g);assert.throws(()=>action(g,p,'challenge'));for(const value of [0,-1,1.1,Infinity,'5',Number.MAX_SAFE_INTEGER+1])assert.throws(()=>action(g,p,'bid',{value}));
 action(g,p,'bid',{value:6});const caller=current(g);assert.throws(()=>action(g,caller,'bid',{value:6}));action(g,caller,'challenge');assert.equal(g.result.success,false);assert.equal(g.result.loserId,caller.id);assert.equal(caller.life,2);assert.equal(g.result.nextStarterId,caller.id);conservation(g);
 const rev=g.revision;for(const q of g.players){E.cyAction(g,q,{type:'ready',revision:rev,matchId:g.matchId,roundId:g.roundId});g.revision++;}assert.equal(g.phase,'bidding');assert.equal(g.turnId,caller.id);conservation(g);
}
{
 const g=arrange([1,2,3,4]),p=current(g);p.life=1;const seats=g.players.map(p=>p.id);action(g,p,'bid',{value:11});const challenger=current(g);action(g,challenger,'challenge');assert.equal(p.life,0);assert.equal(g.result.nextStarterId,challenger.id);assert.equal(g.phase,'reveal');
 const host=g.players.find(p=>p.id===g.hostId);action(g,host,'next',{force:true});assert.deepEqual(g.players.map(p=>p.id),seats);assert.equal(g.turnId,challenger.id);assert(!g.players.filter(p=>p.life>0).some(q=>E.cyNext(g,q.id)===p.id));assert.equal(p.card,null);conservation(g);
 const oldRound=g.roundId;action(g,current(g),'bid',{value:100});action(g,current(g),'challenge');action(g,host,'next',{force:true});assert.throws(()=>E.cyAction(g,current(g),{type:'bid',value:200,revision:g.revision,matchId:g.matchId,roundId:oldRound}));
}
{
 const g=arrange(['night',1,2]);action(g,current(g),'bid',{value:20});action(g,current(g),'challenge');action(g,g.players.find(p=>p.id===g.hostId),'next',{force:true});assert.equal(g.deck.length,33);assert.equal(g.discard.length,0);conservation(g);
 const h=arrange(['cave',1],['night']);action(h,current(h),'bid',{value:2});action(h,current(h),'challenge');conservation(h);action(h,h.players[0],'next',{force:true});assert.equal(h.deck.length,34);assert.equal(h.discard.length,0);conservation(h);
 const k=arrange(['cave',1]);k.discard=k.deck;k.deck=[];action(k,current(k),'bid',{value:100});action(k,current(k),'challenge');conservation(k);assert.equal(k.result.drawn.length,1);
}
console.log('PASS equal bid loses challenger, loser/winner starts next round, fixed seats skip eliminated, ready races and reshuffles');
{
 const g=arrange([20,1,2]),p=g.players[0],v=E.cyView(g,p);assert.equal(v.players[0].card,null);assert(v.players[1].card);assert.equal(v.me.hand,undefined);assert.equal(v.deck,undefined);assert.equal(v.players[0].token,undefined);assert.equal(v.result,null);assert.equal(v.total,undefined);
 const s=E.cyView(g);assert(s.players.every(p=>p.card===null));assert.equal(s.me,null);
 assert.throws(()=>action(g,g.players.find(p=>p.id!==g.turnId),'bid',{value:1}));assert.throws(()=>E.cyAction(g,current(g),{type:'bid',value:1,revision:g.revision-1,matchId:g.matchId,roundId:g.roundId}));
}
console.log('PASS own-card and spectator privacy, authorization and stale bid rejection');
for(let n=2;n<=10;n++)for(let trial=0;trial<8;trial++){
 const g=game(n);let steps=0;
 while(g.phase!=='finished'&&steps++<2500){conservation(g);
  if(g.phase==='bidding'){const p=current(g);if(g.bid===null||Math.random()<.6)action(g,p,'bid',{value:(g.bid||0)+1+Math.floor(Math.random()*15)});else action(g,p,'challenge');}
  else if(g.phase==='reveal'){for(const p of g.players.filter(p=>p.life>0)){if(g.phase==='reveal')action(g,p,'ready');}}
  else assert.fail(g.phase);
 }
 assert.equal(g.phase,'finished');assert.equal(g.players.filter(p=>p.life>0).length,1);conservation(g);assert(g.winner);const seats=g.players.map(p=>p.id);action(g,g.players.find(p=>p.id===g.hostId),'start');assert.deepEqual(g.players.map(p=>p.id),seats);assert(g.players.every(p=>p.life===3));conservation(g);
}
console.log('PASS 72 full matches with 2–10 players, 36-card conservation at every step, elimination, victory and rematch');
(async()=>{
 const rooms=new Map(),saved=new Map(),env={ROOMS:{idFromName:x=>x,get:id=>{if(!rooms.has(id)){const m=new Map();saved.set(id,m);rooms.set(id,new E.GameRoom({storage:{get:async k=>structuredClone(m.get(k)),put:async(k,v)=>m.set(k,structuredClone(v))},blockConcurrencyWhile:f=>f()}));}return{fetch:(u,o)=>rooms.get(id).fetch(new Request(u,o))};}}};
 async function call(path,data){const r=await E.worker.fetch(new Request('https://test/api/coyote'+path,data?{method:'POST',body:JSON.stringify(data)}:{}),env);return {status:r.status,...await r.json()};}
 const a=await call('',{name:'A'}),code=a.game.code;assert.equal(a.status,200);const b=await call('/'+code+'/join',{name:'B'});assert.equal((await call('/'+code+'/join',{name:'A'})).status,400);assert.equal((await call('/'+code+'/join',{name:'A',token:a.token})).game.me.id,a.game.me.id);
 for(let i=2;i<10;i++)assert.equal((await call('/'+code+'/join',{name:'P'+i})).status,200);assert.equal((await call('/'+code+'/join',{name:'FULL'})).status,400);
 let g=(await call('/'+code+'?token='+a.token)).game;assert.equal((await call('/'+code+'/action',{token:b.token,type:'start',revision:g.revision})).status,400);
 g=(await call('/'+code+'/action',{token:a.token,type:'start',revision:g.revision})).game;
 assert.equal((await call('/'+code+'/join',{name:'Late'})).status,400);assert.equal((await call('/'+code+'?spectate=1')).game.players.every(p=>p.card===null),true);assert.equal((await call('/'+code+'?token=forged')).status,400);
 const key='coyote:'+code,previous=JSON.stringify(saved.get(key).get('coyote'));assert.equal((await call('/'+code+'/action',{token:a.token,type:'bid',value:0,revision:g.revision,matchId:g.matchId,roundId:g.roundId})).status,400);assert.equal(JSON.stringify(saved.get(key).get('coyote')),previous);
 assert.equal((await call('/'+code+'/action',{token:'forged',type:'start',revision:g.revision})).status,400);
 console.log('PASS real API create/join/rejoin, ten-seat cap, host-only start, spectator filtering and failed-action atomicity');
})().catch(e=>{console.error(e);process.exitCode=1;});
