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
  const selected=me.hand.find(c=>!['culprit','detective','alibi','information','trade','witness','dog'].includes(c.type));
  if(selected){
   const other=started.game.players.find(p=>p.id!==active.id);
   const played=await call('action',{token:user.token,type:'play',cardId:selected.id,targetId:other.id,revision:started.game.revision});
   assert.equal(played.status,200,JSON.stringify(played));
   assert.equal((await call('action',{token:user.token,type:'play',cardId:selected.id,revision:started.game.revision})).status,400);
   if(played.game.pending?.needsAction){
    const spec=await call('state?spectate=1');assert.deepEqual(spec.game.pending.peek,[]);assert.deepEqual(spec.game.pending.options,[]);
    const pending=played.game.pending;
    if(pending.type==='peek'){
     const resolved=await call('action',{token:user.token,type:'resolve',revision:played.game.revision});
     assert.equal(resolved.status,200,JSON.stringify(resolved));
    }
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
 // UI regression: private boy reveal must render a player's name, not an undefined card label.
 {
  const fs=require('node:fs');
  const ui=fs.readFileSync(require('node:path').join(__dirname,'../public/hannin.js'),'utf8');
  assert.match(ui,/names\[x\]\|\|x/);
 }
 // Additional server-authoritative effect and authorization regressions.
 {
  const state=new Map(),storage={get:async k=>state.get(k),put:async(k,v)=>state.set(k,structuredClone(v))};
  const call=async(route,body)=>{const request=new Request('https://room/hn/'+route,{method:body?'POST':'GET',...(body?{headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{})});const response=await handleHannin(storage,request);return {status:response.status,...await response.json()}};
  const users=[];
  for(let i=0;i<4;i++)users.push(await call(i?'join':'create',{name:'Check'+i,code:'SEC123'}));
  await call('action',{token:users[0].token,type:'start'});
  let g=state.get('hannin'),actor=g.players[g.turn],target=g.players[(g.turn+1)%4];
  const actorToken=users.find(u=>u.game.me.id===actor.id).token;
  const targetToken=users.find(u=>u.game.me.id===target.id).token;
  assert.equal((await call('state?token=invalid')).status,403);
  assert.equal((await call('action',{token:targetToken,type:'play',cardId:target.hand[0].id})).status,400);
  actor.hand=[{id:'witness-a',type:'witness'},{id:'citizen-a',type:'citizen'}];
  target.hand=[{id:'secret-b',type:'alibi'},{id:'secret-c',type:'culprit'}];
  await storage.put('hannin',g);
  const played=await call('action',{token:actorToken,type:'play',cardId:'witness-a',targetId:target.id,revision:g.revision});
  assert.equal(played.status,200,JSON.stringify(played));
  assert.deepEqual(played.game.pending.peek,['alibi','culprit']);
  const spec=await call('state?spectate=1');
  assert.deepEqual(spec.game.pending.peek,[]);
  assert.deepEqual(spec.game.pending.options,[]);
  assert.equal(spec.game.me,null);
  assert.equal((await call('action',{token:targetToken,type:'resolve'})).status,400);
  assert.equal((await call('action',{token:actorToken,type:'resolve',revision:g.revision})).status,400);
  const resolved=await call('action',{token:actorToken,type:'resolve',revision:played.game.revision});
  assert.equal(resolved.status,200,JSON.stringify(resolved));
  assert.equal(state.get('hannin').pending,null);
 }
 // Trade regression: both participants choose privately; cards exchange without loss.
 {
  const state=new Map(),storage={get:async k=>state.get(k),put:async(k,v)=>state.set(k,structuredClone(v))};
  const call=async(route,body)=>{const request=new Request('https://room/hn/'+route,{method:body?'POST':'GET',...(body?{headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{})});const response=await handleHannin(storage,request);return {status:response.status,...await response.json()}};
  const users=[];
  for(let i=0;i<3;i++)users.push(await call(i?'join':'create',{name:'Trade'+i,code:'TRD123'}));
  await call('action',{token:users[0].token,type:'start'});
  let g=state.get('hannin'),actor=g.players[g.turn],target=g.players[(g.turn+1)%3];
  const tokenFor=p=>users.find(u=>u.game.me.id===p.id).token;
  const actorToken=tokenFor(actor),targetToken=tokenFor(target);
  actor.hand=[{id:'trade-action',type:'trade'},{id:'trade-mine',type:'citizen'}];
  target.hand=[{id:'trade-theirs',type:'alibi'}];
  await storage.put('hannin',g);
  const played=await call('action',{token:actorToken,type:'play',cardId:'trade-action',targetId:target.id});
  assert.equal(played.status,200,JSON.stringify(played));
  assert.equal(played.game.pending.actor,actor.id);
  const chosen=await call('action',{token:actorToken,type:'resolve',cardId:'trade-mine'});
  assert.equal(chosen.status,200,JSON.stringify(chosen));
  assert.equal(chosen.game.pending.actor,target.id);
  assert.deepEqual((await call('state?spectate=1')).game.pending.options,[]);
  assert.equal((await call('action',{token:actorToken,type:'resolve',cardId:'trade-theirs'})).status,400);
  const completed=await call('action',{token:targetToken,type:'resolve',cardId:'trade-theirs'});
  assert.equal(completed.status,200,JSON.stringify(completed));
  g=state.get('hannin');
  assert.ok(g.players.find(p=>p.id===actor.id).hand.some(c=>c.id==='trade-theirs'));
  assert.ok(g.players.find(p=>p.id===target.id).hand.some(c=>c.id==='trade-mine'));
  assert.equal(g.pending,null);
 }
 // Win conditions and first-round detective restriction.
 {
  const state=new Map(),storage={get:async k=>state.get(k),put:async(k,v)=>state.set(k,structuredClone(v))};
  const call=async(route,body)=>{const request=new Request('https://room/hn/'+route,{method:body?'POST':'GET',...(body?{headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{})});const response=await handleHannin(storage,request);return {status:response.status,...await response.json()}};
  const users=[];
  for(let i=0;i<3;i++)users.push(await call(i?'join':'create',{name:'Win'+i,code:'WIN123'}));
  await call('action',{token:users[0].token,type:'start'});
  let g=state.get('hannin'),actor=g.players[g.turn],target=g.players[(g.turn+1)%3];
  const token=users.find(u=>u.game.me.id===actor.id).token;
  actor.hand=[{id:'detective-test',type:'detective'},{id:'other-test',type:'citizen'}];
  target.hand=[{id:'culprit-test',type:'culprit'}];
  await storage.put('hannin',g);
  assert.equal((await call('action',{token,type:'play',cardId:'detective-test',targetId:target.id})).status,400);
  g.rounds=1;await storage.put('hannin',g);
  const found=await call('action',{token,type:'play',cardId:'detective-test',targetId:target.id});
  assert.equal(found.status,200,JSON.stringify(found));
  assert.equal(found.game.phase,'finished');
  assert.match(found.game.winner,/探偵/);
  assert.equal((await call('action',{token,type:'play',cardId:'other-test'})).status,400);
  const rematch=await call('action',{token:users[0].token,type:'rematch'});
  assert.equal(rematch.status,200,JSON.stringify(rematch));
  assert.equal(rematch.game.phase,'lobby');
  assert.ok(state.get('hannin').players.every(p=>p.hand.length===0));
  await call('action',{token:users[0].token,type:'start'});
  g=state.get('hannin');actor=g.players[g.turn];const culpritToken=users.find(u=>u.game.me.id===actor.id).token;
  actor.hand=[{id:'last-culprit',type:'culprit'},{id:'extra',type:'citizen'}];
  await storage.put('hannin',g);
  assert.equal((await call('action',{token:culpritToken,type:'play',cardId:'last-culprit'})).status,400);
  g=state.get('hannin');g.players[g.turn].hand=[{id:'last-culprit',type:'culprit'}];await storage.put('hannin',g);
  const escaped=await call('action',{token:culpritToken,type:'play',cardId:'last-culprit'});
  assert.equal(escaped.status,200,JSON.stringify(escaped));
  assert.equal(escaped.game.phase,'finished');
  assert.match(escaped.game.winner,/犯人/);
 }
 // Full hidden-card rotations, exhausted detective pool, and accomplice ending.
 {
  const state=new Map(),storage={get:async k=>state.get(k),put:async(k,v)=>state.set(k,structuredClone(v))};
  const call=async(route,body)=>{const request=new Request('https://room/hn/'+route,{method:body?'POST':'GET',...(body?{headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{})});const response=await handleHannin(storage,request);return {status:response.status,...await response.json()}};
  const users=[];for(let i=0;i<3;i++)users.push(await call(i?'join':'create',{name:'Move'+i,code:'MOV123'}));await call('action',{token:users[0].token,type:'start'});
  let g=state.get('hannin');const tokenFor=p=>users.find(u=>u.game.me.id===p.id).token;
  g.players[0].hand=[{id:'rumor-test',type:'rumor'},{id:'rumor-a',type:'citizen'}];g.players[1].hand=[{id:'rumor-b',type:'citizen'}];g.players[2].hand=[{id:'rumor-c',type:'citizen'}];g.turn=0;g.rounds=1;g.pending=null;g.revision++;
  await storage.put('hannin',g);const rumored=await call('action',{token:tokenFor(g.players[0]),type:'play',cardId:'rumor-test',revision:g.revision});assert.equal(rumored.status,200,JSON.stringify(rumored));
  g=state.get('hannin');assert.deepEqual(g.players.map(p=>p.hand.map(c=>c.id)),[['rumor-c'],['rumor-a'],['rumor-b']]);
  g.players[0].hand=[{id:'info-test',type:'information'},{id:'info-a',type:'citizen'}];g.players[1].hand=[{id:'info-b',type:'citizen'}];g.players[2].hand=[{id:'info-c',type:'citizen'}];g.turn=0;g.pending=null;g.revision++;
  await storage.put('hannin',g);const information=await call('action',{token:tokenFor(g.players[0]),type:'play',cardId:'info-test',revision:g.revision});assert.equal(information.status,200,JSON.stringify(information));
  for(const [i,id] of ['info-a','info-b','info-c'].entries()){const current=state.get('hannin');const pendingActor=current.players.find(p=>p.id===current.pending.actor);const result=await call('action',{token:tokenFor(pendingActor),type:'resolve',cardId:id,revision:current.revision});assert.equal(result.status,200,JSON.stringify(result));}
  g=state.get('hannin');assert.deepEqual(g.players.map(p=>p.hand.map(c=>c.id)),[['info-c'],['info-a'],['info-b']]);
  g.players[0].hand=[{id:'plot-test',type:'plot'}];g.players[0].plotUsed=false;g.players[1].hand=[{id:'last-culprit-plot',type:'culprit'}];g.players[2].hand=[{id:'remaining-detective',type:'detective'}];g.turn=0;g.rounds=1;g.pending=null;g.revision++;
  await storage.put('hannin',g);const plot=await call('action',{token:tokenFor(g.players[0]),type:'play',cardId:'plot-test',revision:g.revision});assert.equal(plot.status,200,JSON.stringify(plot));
  g=state.get('hannin');g.players[0].hand=[];g.players[1].hand=[{id:'last-culprit-plot',type:'culprit'}];g.players[2].hand=[];g.turn=1;g.players[0].plotUsed=true;g.revision++;
  await storage.put('hannin',g);const escape=await call('action',{token:tokenFor(g.players[1]),type:'play',cardId:'last-culprit-plot',revision:g.revision});assert.equal(escape.status,200,JSON.stringify(escape));assert.match(escape.game.winner,/Move0.*たくらみ/);
  g=state.get('hannin');g.players[0].hand=[{id:'last-detective',type:'detective'},{id:'safe',type:'citizen'}];g.players[1].hand=[{id:'hidden-culprit',type:'culprit'}];g.players[2].hand=[{id:'other',type:'citizen'}];g.players[0].plotUsed=false;g.phase='playing';g.winner=null;g.reason='';g.turn=0;g.rounds=1;g.pending=null;g.revision++;
  await storage.put('hannin',g);const miss=await call('action',{token:tokenFor(g.players[0]),type:'play',cardId:'last-detective',targetId:g.players[2].id,revision:g.revision});assert.equal(miss.status,200,JSON.stringify(miss));assert.equal(miss.game.phase,'finished');assert.match(miss.game.winner,/Move1.*犯人/);
 }
 console.log('Hannin: 3–8 players, secrecy, witness, dog, trade, detective and culprit wins OK');
})().catch(e=>{console.error(e);process.exitCode=1});
