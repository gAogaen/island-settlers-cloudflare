const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');const ctx={crypto:require('node:crypto').webcrypto,Request,Response,URL,structuredClone};vm.createContext(ctx);vm.runInContext(fs.readFileSync('src/worker.mjs','utf8').replace('export default {','const worker={').replace('export class GameRoom','class GameRoom')+';globalThis.S={siPlayer,siStart,siAction,siInvader,siProgress,siSyncInvaderDamage};',ctx);const S=ctx.S;
function make(spirit){const players=[S.siPlayer('A'),S.siPlayer('B')];players[0].spirit=spirit;players[1].spirit='river';const g={players,hostId:players[0].id,phase:'lobby',revision:1,code:'ABCDEF',messages:[],log:[]};S.siStart(g);for(const l of g.lands){l.explorers=0;l.towns=0;l.cities=0;l.dahan=0;l.blight=0;l.invaderDamage={explorers:[],towns:[],cities:[]};}g.lands.find(l=>l.board===players[1].id).cities=1;g.blightPool=50;const p=players[0],l=g.lands.find(l=>l.presenceOwners.includes(p.id));return{g,p,l,neighbor:g.lands.find(n=>l.neighbors.includes(n.id))};}
function resolve(g,p,key,args={}){const c=p.hand.find(c=>c.program===key);assert(c,key);g.phase=c.speed;p.ready=false;c.ready=true;S.siAction(g,p,{type:'resolve',matchId:g.matchId,cardId:c.id,...args});assert(c.used);}
{
 const {g,p,l}=make('shadows');l.towns=1;l.cities=1;l.dahan=2;resolve(g,p,'concealing',{landId:l.id});g.invaderSlots.ravage={terrains:[l.terrain]};S.siInvader(g,'ravage');S.siAction(g,p,{type:'counterattack',matchId:g.matchId,damagePlan:[{type:'towns',index:0,amount:2},{type:'cities',index:0,amount:2}]});assert.equal(l.dahan,2);assert.equal(l.blight,1);assert.equal(g.fear>=1,true);g.phase='cleanup';S.siProgress(g);assert.equal(l.dahanRavageImmune,false);console.log('PASS Concealing Shadows protects Dahan without stopping land damage');
}
{
 const {g,p,l,neighbor}=make('shadows');l.explorers=1;l.towns=1;neighbor.dahan=4;resolve(g,p,'favors',{landId:l.id,moves:[{from:neighbor.id,to:l.id,type:'dahan',count:4}]});assert.equal(l.dahan,4);assert.equal(g.fear,3);console.log('PASS Favors Called Due checks Dahan against all Invaders after gathering');
}
{
 const {g,p}=make('shadows'),target=g.players[1],l=g.lands.find(l=>l.presenceOwners.includes(target.id)),to=g.lands.find(n=>l.neighbors.includes(n.id));l.explorers=2;l.towns=2;resolve(g,p,'mantle',{spiritId:target.id,landId:l.id,moves:[{from:l.id,to:to.id,type:'explorers',count:1},{from:l.id,to:to.id,type:'towns',count:1}]});assert.equal(l.explorers,1);assert.equal(l.towns,1);assert.equal(g.fear,2);console.log('PASS Mantle of Dread targets an ally\'s Presence and moves one Explorer plus one Town');
}
{
 const {g,p,l}=make('shadows');l.cities=1;resolve(g,p,'crops',{landId:l.id,unitType:'cities'});assert.equal(l.cities,0);assert.equal(l.towns,1);assert.equal(g.fear,2);console.log('PASS Crops Wither downgrades a building without destruction Fear');
}
{
 const {g,p,l}=make('green');l.explorers=1;resolve(g,p,'overgrow',{landId:l.id,mode:'fear'});assert.equal(g.fear,3);
 const t=make('green'),supply=t.p.presence,track=t.p.energyTrack;resolve(t.g,t.p,'overgrow',{landId:t.neighbor.id,mode:'presence',presenceFrom:t.l.id});assert.equal(t.p.presence,supply);assert.equal(t.p.energyTrack,track);assert(t.neighbor.presenceOwners.includes(t.p.id));console.log('PASS Overgrow chooses Fear or adds/repositions Presence');
}
{
 const {g,p}=make('green'),target=g.players[1],l=g.lands.find(l=>l.presenceOwners.includes(target.id)),count=l.presence,supply=target.presence;resolve(g,p,'proliferation',{spiritId:target.id,landId:l.id,track:'plays'});assert.equal(l.presence,count+1);assert.equal(target.presence,supply-1);assert.equal(target.playTrack,1);console.log('PASS Proliferation adds an ally\'s Presence from their selected track');
}
{
 const {g,p,l,neighbor}=make('green');l.dahan=3;resolve(g,p,'fields',{landId:l.id,mode:'dahan',moves:[{from:l.id,to:neighbor.id,type:'dahan',count:3}]});assert.equal(neighbor.dahan,3);assert.equal(l.dahan,0);console.log('PASS Fields Choked with Growth supports its Dahan branch');
}
{
 const {g,p,l}=make('green');l.presenceOwners=[p.id,p.id];l.presence=2;l.terrain='山';l.towns=2;l.cities=1;l.invaderDamage={explorers:[],towns:[1,0],cities:[0]};resolve(g,p,'stem',{landId:l.id});assert.equal(l.towns,1);assert.equal(l.invaderDamage.towns[0],1);assert.equal(l.invaderDamage.cities[0],1);assert.equal(g.fear,1);console.log('PASS Stem damages each building separately in Mountains/Sands');
}
{
 const {g,p,l}=make('thunderspeaker');l.presenceOwners=[p.id,p.id];l.presence=2;l.dahan=2;l.towns=2;resolve(g,p,'manifestation',{landId:l.id,damagePlan:[{type:'towns',index:0,amount:2},{type:'towns',index:1,amount:2}]});assert.equal(l.towns,0);assert.equal(g.fear,3);console.log('PASS Manifestation multiplies Dahan by the caster\'s Presence');
}
{
 const {g,p,l}=make('thunderspeaker');l.dahan=2;l.towns=2;l.cities=1;resolve(g,p,'warning',{landId:l.id});g.invaderSlots.ravage={terrains:[l.terrain]};S.siInvader(g,'ravage');S.siAction(g,p,{type:'counterattack',matchId:g.matchId,damagePlan:[{type:'towns',index:0,amount:2},{type:'towns',index:1,amount:2}]});assert.equal(l.dahan,0);assert.equal(l.towns,0);assert.equal(l.cities,1);console.log('PASS Words of Warning allows simultaneous counterdamage from Dahan killed in Ravage');
}
{
 const {g,p,l,neighbor}=make('thunderspeaker');l.explorers=3;l.dahan=1;neighbor.dahan=1;resolve(g,p,'ambush',{landId:l.id,moves:[{from:neighbor.id,to:l.id,type:'dahan',count:1}]});assert.equal(l.explorers,1);assert.equal(l.dahan,2);console.log('PASS Sudden Ambush gathers before counting Dahan for Explorer destruction');
}
{
 const {g,p,l,neighbor}=make('thunderspeaker');l.dahan=4;l.presenceOwners=[p.id,p.id];l.presence=2;resolve(g,p,'voice',{landId:l.id,mode:'push',moves:[{from:l.id,to:neighbor.id,type:'dahan',count:4,presenceCount:2}]});assert.equal(l.dahan,0);assert.equal(neighbor.dahan,4);assert.equal(l.presence,0);assert.equal(neighbor.presenceOwners.filter(id=>id===p.id).length,2);const x=make('thunderspeaker');x.l.explorers=1;resolve(x.g,x.p,'voice',{landId:x.l.id,mode:'fear'});assert.equal(x.g.fear,2);console.log('PASS Voice of Thunder supports both modes and moving Presence with Dahan');
}
