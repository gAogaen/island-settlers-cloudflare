const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');const ctx={crypto:require('node:crypto').webcrypto,Request,Response,URL,structuredClone};vm.createContext(ctx);vm.runInContext(fs.readFileSync('src/worker.mjs','utf8').replace('export default {','const worker={').replace('export class GameRoom','class GameRoom')+';globalThis.S={siPlayer,siStart,siStartGreen,siApplyFearChoice,siFearTargets,siFearDefend,siInvader,SI_FEAR_CARDS,siSyncInvaderDamage};',ctx);const S=ctx.S;
function make(key,level=1,n=2){const players=Array.from({length:n},(_,i)=>S.siPlayer('P'+i));players.forEach((p,i)=>p.spirit=i?'bringer':'lightning');const g={players,hostId:players[0].id,phase:'lobby',revision:1,code:'ABCDEF',messages:[],log:[]};S.siStart(g);g.terror=level;g.fearPerCard=1000;g.fearPool=1000;g.fear=0;g.invaderSlots={};for(const l of g.lands){l.explorers=2;l.towns=1;l.cities=1;l.dahan=2;l.invaderDamage={explorers:[0,0],towns:[0],cities:[0]};}g.pendingFear=[structuredClone(S.SI_FEAR_CARDS.find(c=>c.key===key))];return g;}
function plan(l,amount){let left=amount;const out=[];for(const [t,hp] of [['explorers',1],['towns',2],['cities',3]])for(let i=0;i<l[t];i++){const n=Math.min(left,hp-(l.invaderDamage[t][i]||0));left-=n;out.push({type:t,index:i,amount:n});}return out;}
assert.equal(S.SI_FEAR_CARDS.length,15);
for(const card of S.SI_FEAR_CARDS)for(let level=1;level<=3;level++){const g=make(card.key,level);S.siStartGreen(g);let steps=0;while(g.phase==='fear'){const a=g.activeFear,t=a.tasks[a.index],p=g.players.find(p=>p.id===t.playerId),s=t.spec,l=S.siFearTargets(g)[0];assert(l);if(s.optional)S.siApplyFearChoice(g,p,{skip:true});else{const args={landId:l.id,unitType:s.types?.find(t=>l[t]>0),remove:{},moves:[]};if(['raid','enheartened'].includes(s.kind)){const amount=s.kind==='raid'?(level===1?1:l.dahan*(level===3?2:1)):(level===2?(l.dahan?1:0):l.dahan);args.damagePlan=plan(l,amount);}S.siApplyFearChoice(g,p,args);}assert(++steps<=20);}assert(['slow','finished'].includes(g.phase),card.key+' '+level+' ended '+g.phase);}
console.log('PASS all 15 base Fear cards at all 3 Terror levels complete their resolution queues');
{
 const g=make('guard',2);S.siStartGreen(g);const l=g.lands[0];assert.equal(S.siFearDefend(g,l),3);l.dahan=4;assert.equal(S.siFearDefend(g,l),5);console.log('PASS Dahan defense checks live Dahan count');
}
{
 const g=make('emigration',1),l=g.lands.find(l=>l.coastal);S.siStartGreen(g);const p=g.players[0];assert.throws(()=>S.siApplyFearChoice(g,g.players[1],{landId:l.id,unitType:'explorers'}));const before=g.fear;S.siApplyFearChoice(g,p,{landId:l.id,unitType:'explorers'});assert.equal(l.explorers,1);assert.equal(g.fear,before);console.log('PASS each-player turn validation and removal without generated Fear');
}
{
 const g=make('raid',3);S.siStartGreen(g);const l=S.siFearTargets(g)[0],p=g.players[0];assert.throws(()=>S.siApplyFearChoice(g,p,{landId:l.id,damagePlan:[]}));S.siApplyFearChoice(g,p,{landId:l.id,damagePlan:plan(l,4)});assert(!S.siFearTargets(g).some(x=>x.id===l.id));assert(g.fear>=1);console.log('PASS damage allocation, destruction Fear and distinct-land restriction');
}
{
 const g=make('overseas',2),l=g.lands.find(l=>l.coastal);S.siStartGreen(g);g.invaderSlots.build={terrains:[l.terrain]};l.explorers=0;l.towns=1;l.cities=1;S.siInvader(g,'build');assert.equal(l.towns,2);assert.equal(l.cities,1);S.siInvader(g,'build');assert.equal(l.cities,1);console.log('PASS equal Town/City counts build a Town; fear suppresses only City builds');
}
