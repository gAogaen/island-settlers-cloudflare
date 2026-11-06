const assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');
if(!globalThis.crypto)globalThis.crypto=webcrypto;
(async()=>{
 const {handleHannin}=await import('../src/hannin.mjs');
 for(let n=3;n<=8;n++){
  const state=new Map(),storage={get:async k=>state.get(k),put:async(k,v)=>state.set(k,structuredClone(v))};
  const call=async(route,body)=>{const request=new Request('https://room/hn/'+route,{method:body?'POST':'GET',...(body?{headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{})});const response=await handleHannin(storage,request);return {status:response.status,...await response.json()}};
  const users=[];
  for(let i=0;i<n;i++){const d=await call(i?'join':'create',{name:'Player'+i,code:'ABC123'});assert.equal(d.status,200);users.push(d);}
  assert.equal((await call('action',{token:users[1].token,type:'start'})).status,400);
  const started=await call('action',{token:users[0].token,type:'start'});assert.equal(started.status,200);
  assert.equal(started.game.phase,'playing');
  const all=state.get('hannin').players.flatMap(p=>p.hand).concat(state.get('hannin').discard);
  assert.equal(all.length,4*n);assert.equal(all.filter(c=>c.type==='culprit').length,1);
  assert.equal(all.filter(c=>c.type==='first').length,1);
  assert.equal(state.get('hannin').discard[0].type,'first');
  assert.equal(state.get('hannin').players.reduce((a,p)=>a+p.hand.length,0),4*n-1);
  const spectator=await call('state?spectate=1');assert.equal(spectator.status,200);assert.equal(spectator.game.me,null);
  for(const u of users){const response=await call('state?token='+u.token);assert.equal(response.status,200);assert.equal(response.game.me.id,u.game.me.id);assert.equal(JSON.stringify(spectator).includes(u.token),false);}
  const active=started.game.players[started.game.turn];const user=users.find(u=>u.game.me.id===active.id);
  const me=(await call('state?token='+user.token)).game.me;
  const selected=me.hand.find(c=>!['culprit','detective'].includes(c.type));
  if(selected){
   const other=started.game.players.find(p=>p.id!==active.id);
   const played=await call('action',{token:user.token,type:'play',cardId:selected.id,targetId:other.id,revision:started.game.revision});
   assert.equal(played.status,200,JSON.stringify(played));
   assert.equal((await call('action',{token:user.token,type:'play',cardId:selected.id,revision:started.game.revision})).status,400);
   if(played.game.pending?.needsAction){
    const spec=await call('state?spectate=1');assert.deepEqual(spec.game.pending.peek,[]);assert.deepEqual(spec.game.pending.options,[]);
    const pending=played.game.pending;
    const resolved=await call('action',{token:user.token,type:'resolve',cardId:pending.options[0],revision:played.game.revision});
    assert.equal(resolved.status,200,JSON.stringify(resolved));
   }
  }
 }
 // Third-edition regression: the drawn card is discarded and the dog moves to the target.
 {
  const state=new Map(),storage={get:async k=>state.get(k),put:async(k,v)=>state.set(k,structuredClone(v))};
  const call=async(route,body)=>{const request=new Request('https://room/hn/'+route,{method:body?'POST':'GET',...(body?{headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{})});const response=await handleHannin(storage,request);return {status:response.status,...await response.json()}};
  const users=[];
  for(let i=0;i<3;i++)users.push(await call(i?'join':'create',{name:'Dog'+i,code:'DOG123'}));
  await call('action',{token:users[0].token,type:'start'});
  const g=state.get('hannin'),actor=g.players[g.turn],target=g.players[(g.turn+1)%3];
  actor.hand[0]={id:'dog-test-card',type:'dog'};
  target.hand[0]={id:'dog-target-card',type:'citizen'};
  // The player holding the culprit must not be able to play an alibi.
  actor.hand[1]={id:'alibi-test-card',type:'alibi'};
  actor.hand[2]={id:'culprit-test-card',type:'culprit'};
  await storage.put('hannin',g);
  const token=users.find(u=>u.game.me.id===actor.id).token;
  const blocked=await call('action',{token,type:'play',cardId:'alibi-test-card'});
  assert.equal(blocked.status,400);
  const played=await call('action',{token,type:'play',cardId:'dog-test-card',targetId:target.id});
  assert.equal(played.status,200,JSON.stringify(played));
  const resolved=await call('action',{token,type:'resolve',cardId:'0'});
  assert.equal(resolved.status,200,JSON.stringify(resolved));
  const after=state.get('hannin');
  assert.ok(!after.players.find(p=>p.id===target.id).hand.some(c=>c.id==='dog-target-card'));
  assert.ok(after.discard.some(c=>c.id==='dog-target-card'));
  assert.ok(after.players.find(p=>p.id===target.id).hand.some(c=>c.id==='dog-test-card'));
  assert.ok(!after.discard.some(c=>c.id==='dog-test-card'));
  assert.equal(after.players.flatMap(p=>p.hand).length+after.discard.length,12);
 }
 console.log('Hannin: 3–8 player setup, hidden information, opening turn, actions OK');
})().catch(e=>{console.error(e);process.exitCode=1});