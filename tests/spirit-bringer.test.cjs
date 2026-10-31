const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');const ctx={crypto:require('node:crypto').webcrypto,Request,Response,URL,structuredClone};vm.createContext(ctx);vm.runInContext(fs.readFileSync('src/worker.mjs','utf8').replace('export default {','const worker={').replace('export class GameRoom','class GameRoom')+';globalThis.S={siPlayer,siStart,siAction,siPowerDamage,siPowerFear,siFear,SI_SHARED_POWERS,siSharedCard};',ctx);const S=ctx.S;
function make(){const players=[S.siPlayer('Bringer'),S.siPlayer('River')];players[0].spirit='bringer';players[1].spirit='river';const g={players,hostId:players[0].id,phase:'lobby',revision:1,code:'ABCDEF',messages:[],log:[]};S.siStart(g);for(const l of g.lands){l.explorers=0;l.towns=0;l.cities=0;l.dahan=0;l.invaderDamage={explorers:[],towns:[],cities:[]};}g.lands.find(l=>l.board===players[1].id).cities=1;const p=players[0],l=g.lands.find(l=>l.presenceOwners.includes(p.id)),neighbor=g.lands.find(n=>l.neighbors.includes(n.id));return{g,p,l,neighbor};}
function resolve(g,p,key,args={}){const c=p.hand.find(c=>c.program===key);assert(c,key);g.phase=c.speed;p.ready=false;c.ready=true;S.siAction(g,p,{type:'resolve',matchId:g.matchId,cardId:c.id,...args});assert(c.used);}
{
 const {g,p,l,neighbor}=make();l.towns=1;l.dahan=2;resolve(g,p,'predatory',{landId:l.id,damagePlan:[{type:'towns',index:0,amount:2}],dreamPushes:[{type:'towns',index:0,to:neighbor.id}],moves:[{from:l.id,to:neighbor.id,type:'dahan',count:2}]});assert.equal(g.fear,2);assert.equal(l.towns,0);assert.equal(neighbor.towns,1);assert.equal(neighbor.invaderDamage.towns[0],0);assert.equal(neighbor.dahan,2);console.log('PASS Predatory Nightmares replaces destruction with Fear and mandatory push, then moves Dahan');
}
{
 const {g,p,l}=make();l.cities=1;l.invaderDamage.cities=[0];S.siPowerDamage(g,p,l,2,[{type:'cities',index:0,amount:2}]);assert.equal(l.invaderDamage.cities[0],0);assert.equal(g.fear,0);l.invaderDamage.cities=[1];S.siPowerDamage(g,p,l,2,[{type:'cities',index:0,amount:2}]);assert.equal(l.invaderDamage.cities[0],1);assert.equal(l.cities,1);assert.equal(g.fear,5);console.log('PASS Bringer damage never persists, but existing damage can enable City destruction-equivalent Fear');
}
{
 const {g,p,l}=make();l.explorers=1;resolve(g,p,'dread',{landId:l.id});assert.equal(l.defend,1);S.siPowerFear(g,l,3);assert.equal(l.defend,4);S.siFear(g,1);assert.equal(l.defend,4);console.log('PASS Dread defense counts Fear from Powers, including its own Fear, but excludes other sources');
}
{
 const {g,p,l,neighbor}=make();l.towns=1;l.dahan=4;resolve(g,p,'dreams',{landId:l.id,mode:'fear'});assert.equal(g.fear,3);const x=make();x.neighbor.dahan=2;resolve(x.g,x.p,'dreams',{landId:x.l.id,mode:'gather',moves:[{from:x.neighbor.id,to:x.l.id,type:'dahan',count:2}]});assert.equal(x.l.dahan,2);assert.equal(x.g.fear,0);console.log('PASS Dreams of the Dahan supports gathering and capped building-dependent Fear');
}
{
 const {g,p,l}=make();l.explorers=1;resolve(g,p,'midnight',{landId:l.id});assert.equal(g.fear,2);assert.equal(p.hand.find(c=>c.program==='midnight').rulesIncomplete,undefined);console.log('PASS Midnight Fear branch is correct; Major gain is covered by shared-power tests');
}

{
 const {g,p,l,neighbor}=make();l.towns=1;resolve(g,p,'predatory',{landId:l.id,damagePlan:[{type:'towns',index:0,amount:2}]});assert.equal(l.towns,0);assert.equal(neighbor.towns,1);assert.equal(g.fear,2);assert(neighbor.invaderIds.towns[0]);assert.equal(neighbor.invaderDamage.towns[0],0);console.log('PASS dreamed Town destruction always pushes and preserves the physical Invader identity');
}
{
 const {g,p,l}=make();l.cities=2;l.invaderDamage.cities=[0,0];g.fearPerCard=g.fearPool=100;p.elementGifts={炎:4};const c=S.siSharedCard(S.SI_SHARED_POWERS[38]);p.hand.push(c);c.ready=true;g.phase='slow';p.ready=false;S.siAction(g,p,{type:'resolve',matchId:g.matchId,cardId:c.id,landId:l.id,damagePlan:[{type:'cities',index:0,amount:3},{type:'cities',index:1,amount:2}],extraDamagePlans:{[l.id]:[{type:'cities',index:0,amount:3},{type:'cities',index:1,amount:1}]}});assert.equal(l.cities,2);assert.equal(l.invaderDamage.cities[0],0);assert.equal(g.fear,15);assert(!g.powerContext);console.log('PASS one Power cannot generate dreamed-destruction Fear twice for the same City across separate damage instructions');
}

{
 const x=make(),{g,p}=x,ocean=g.players[1];ocean.spirit='ocean';S.siStart(g);for(const l of g.lands){l.explorers=l.towns=l.cities=l.dahan=l.blight=0;l.invaderDamage={explorers:[],towns:[],cities:[]};}g.lands.find(l=>l.board===ocean.id).cities=1;const coast=g.lands.find(l=>l.board===p.id&&l.coastal),sea=g.oceans.find(l=>l.board===p.id);coast.presenceOwners.push(p.id,p.id,ocean.id);coast.presence=coast.presenceOwners.length;coast.towns=1;coast.dreadApparitions=1;coast.vengeance=[{id:'coast-trigger',playerId:p.id,adjacent:false}];sea.vengeance=[{id:'sea-trigger',playerId:p.id,adjacent:false}];g.fearPerCard=g.fearPool=100;resolve(g,p,'predatory',{landId:coast.id,damagePlan:[{type:'towns',index:0,amount:2}],dreamPushes:[{type:'towns',index:0,to:sea.id}]});assert.equal(g.fear,3);assert.equal(coast.defend,2);assert.equal(coast.towns+sea.towns,0);assert.equal(ocean.energy,1);assert.equal(g.vengeanceChoices.length,1);assert.equal(g.vengeanceChoices[0].targetIds[0],sea.id);assert.equal(g.vengeanceChoices[0].amount,1);console.log('PASS Bringer pushes into the actual Ocean: real destruction/Fear/Energy and Vengeance occur in the sea, while Dread counts only dream Fear');
}
