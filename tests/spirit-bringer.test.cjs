const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');const ctx={crypto:require('node:crypto').webcrypto,Request,Response,URL,structuredClone};vm.createContext(ctx);vm.runInContext(fs.readFileSync('src/worker.mjs','utf8').replace('export default {','const worker={').replace('export class GameRoom','class GameRoom')+';globalThis.S={siPlayer,siStart,siAction,siPowerDamage,siPowerFear,siFear};',ctx);const S=ctx.S;
function make(){const players=[S.siPlayer('Bringer'),S.siPlayer('River')];players[0].spirit='bringer';players[1].spirit='river';const g={players,hostId:players[0].id,phase:'lobby',revision:1,code:'ABCDEF',messages:[],log:[]};S.siStart(g);for(const l of g.lands){l.explorers=0;l.towns=0;l.cities=0;l.dahan=0;l.invaderDamage={explorers:[],towns:[],cities:[]};}g.lands.find(l=>l.board===players[1].id).cities=1;const p=players[0],l=g.lands.find(l=>l.presenceOwners.includes(p.id)),neighbor=g.lands.find(n=>l.neighbors.includes(n.id));return{g,p,l,neighbor};}
function resolve(g,p,key,args={}){const c=p.hand.find(c=>c.program===key);assert(c,key);g.phase=c.speed;p.ready=false;c.ready=true;S.siAction(g,p,{type:'resolve',matchId:g.matchId,cardId:c.id,...args});assert(c.used);}
{
 const {g,p,l,neighbor}=make();l.towns=1;l.dahan=2;resolve(g,p,'predatory',{landId:l.id,damagePlan:[{type:'towns',index:0,amount:2}],dreamPushes:[{type:'towns',index:0,to:neighbor.id}],moves:[{from:l.id,to:neighbor.id,type:'dahan',count:2}]});assert.equal(g.fear,2);assert.equal(l.towns,0);assert.equal(neighbor.towns,1);assert.equal(neighbor.invaderDamage.towns[0],0);assert.equal(neighbor.dahan,2);console.log('PASS Predatory Nightmares replaces destruction with Fear and optional push, then moves Dahan');
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
