const assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');
if(!globalThis.crypto)globalThis.crypto=webcrypto;
(async()=>{
 const {handleHannin}=await import('../src/hannin.mjs');
 const store=new Map(),storage={get:async k=>store.get(k),put:async(k,v)=>store.set(k,structuredClone(v))};
 const req=(route,body)=>new Request('https://room/hn/'+route,{method:body?'POST':'GET',...(body?{headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{})});
 const call=async(route,body)=>{const res=await handleHannin(storage,req(route,body));return {status:res.status,...await res.json()}};
 const a=await call('create',{code:'ABC123',name:'Alice'});assert.equal(a.status,200);assert.equal(a.game.phase,'lobby');
 const b=await call('join',{name:'Bob'}),c=await call('join',{name:'Carol'});assert.equal(b.status,200);assert.equal(c.status,200);
 const bad=await call('action',{token:b.token,type:'start'});assert.equal(bad.status,400);
 const started=await call('action',{token:a.token,type:'start'});assert.equal(started.status,200);assert.equal(started.game.players.length,3);
 assert.equal(started.game.me.hand.length,4);
 const spectator=await call('state?spectate=1');assert.equal(spectator.game.me,null);assert.equal(JSON.stringify(spectator.game).includes(a.token),false);assert.equal(JSON.stringify(spectator.game).includes(started.game.me.hand[0].id),false);
 const other=await call('state?token='+b.token);assert.equal(other.game.me.hand.length,4);
 const card=started.game.me.hand.find(x=>x.type!=='culprit')||started.game.me.hand[0];
 const play=await call('action',{token:a.token,type:'play',cardId:card.id,targetId:b.game.me.id,revision:started.game.revision});
 assert.equal(play.status,200,JSON.stringify(play));
 const stale=await call('action',{token:a.token,type:'play',cardId:card.id,revision:started.game.revision});assert.equal(stale.status,400);
 if(play.game.pending){const pending=play.game.pending;assert.equal(pending.needsAction,true);const spectatorPending=await call('state?spectate=1');assert.equal(spectatorPending.game.pending.peek.length,0);assert.equal(spectatorPending.game.pending.options.length,0);const resolved=await call('action',{token:a.token,type:'resolve',cardId:pending.options[0],revision:play.game.revision});assert.equal(resolved.status,200,JSON.stringify(resolved));}
 console.log('hannin room, authorization, spectator privacy and turn actions OK');
})().catch(e=>{console.error(e);process.exitCode=1});