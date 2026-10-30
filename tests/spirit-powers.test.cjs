const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');const ctx={crypto:require('node:crypto').webcrypto,Request,Response,URL,structuredClone};vm.createContext(ctx);vm.runInContext(fs.readFileSync('src/worker.mjs','utf8').replace('export default {','const worker={').replace('export class GameRoom','class GameRoom')+';globalThis.S={siPlayer,siStart,siAction,siLegalTarget,siDrownInvader,siSyncInvaderDamage,siDraw,siInvader,siProgress};',ctx);const S=ctx.S;
function make(){const players=[S.siPlayer('Lightning'),S.siPlayer('River')];players[0].spirit='lightning';players[1].spirit='river';const g={players,hostId:players[0].id,phase:'lobby',revision:1,code:'ABCDEF',messages:[],log:[]};S.siStart(g);for(const l of g.lands){l.explorers=0;l.towns=0;l.cities=0;l.dahan=0;l.invaderDamage={explorers:[],towns:[],cities:[]};}g.lands.find(l=>l.board===players[1].id).cities=1;return g;}
function resolve(g,p,key,args={}){const c=p.hand.find(c=>c.program===key);assert(c,key);g.phase=c.speed;p.ready=false;c.ready=true;S.siAction(g,p,{type:'resolve',matchId:g.matchId,cardId:c.id,...args});assert(c.used);}
{
 const g=make(),p=g.players[0],l=g.lands.find(l=>l.presenceOwners.includes(p.id));l.towns=1;resolve(g,p,'shatter',{landId:l.id});assert.equal(l.towns,0);assert.equal(g.fear,2);const c=p.hand.find(c=>c.program==='shatter');l.presenceOwners=[p.id,g.players[1].id];l.presence=2;assert.equal(S.siLegalTarget(g,p,c).length,0);console.log('PASS Shatter: exact cost/range, own Sacred Site, explicit plus destruction Fear');
}
{
 const g=make(),p=g.players[0],l=g.lands.find(l=>l.presenceOwners.includes(p.id));l.explorers=2;l.towns=1;l.cities=1;resolve(g,p,'storm',{landId:l.id});assert.equal(l.explorers,0);assert.equal(l.towns,1);assert.equal(l.cities,1);assert.equal(l.invaderDamage.towns[0],1);assert.equal(l.invaderDamage.cities[0],1);console.log('PASS Raging Storm damages every Invader separately');
}
{
 const g=make(),p=g.players[1],l=g.lands.find(l=>l.presenceOwners.includes(p.id));l.coastal=true;l.towns=1;resolve(g,p,'flashFloods',{landId:l.id,damagePlan:[{type:'towns',index:0,amount:2}]});assert.equal(l.towns,0);assert.equal(g.fear,1);console.log('PASS Flash Floods coastal bonus and damage allocation');
}
{
 const g=make(),p=g.players[0],target=g.players[1],slow=target.hand.find(c=>c.speed==='slow');slow.ready=true;target.ready=true;resolve(g,p,'lightningBoon',{spiritId:target.id,fastCards:[slow.id]});assert.equal(slow.playSpeed,'fast');assert.equal(target.ready,false);console.log('PASS Lightning Boon accelerates an ally and reopens their finished Fast phase');
}
{
 const g=make(),p=g.players[1],target=g.players[0];target.hand.slice(0,3).forEach(c=>c.ready=true);const start=target.energy;resolve(g,p,'vigor',{spiritId:target.id});assert.equal(target.energy,start+3);console.log('PASS Boon of Vigor uses the target\'s played Power Card count');
}
{
 const g=make(),p=g.players[0],from=g.lands.find(l=>l.presenceOwners.includes(p.id)),to=g.lands.find(l=>from.neighbors.includes(l.id));from.dahan=2;to.towns=1;resolve(g,p,'harbingers',{landId:from.id,moves:[{from:from.id,to:to.id,type:'dahan',count:2}]});assert.equal(from.dahan,0);assert.equal(to.dahan,2);assert.equal(g.fear,1);console.log('PASS Harbingers moves two Dahan and generates Fear once');
}
{
 const g=make(),p=g.players[1],from=g.lands.find(l=>l.presenceOwners.includes(p.id)),to=g.lands.find(l=>from.neighbors.includes(l.id));from.explorers=2;from.towns=1;resolve(g,p,'washAway',{landId:from.id,moves:[{from:from.id,to:to.id,type:'explorers',count:2},{from:from.id,to:to.id,type:'towns',count:1}]});assert.equal(from.explorers+from.towns,0);assert.equal(to.explorers,2);assert.equal(to.towns,1);console.log('PASS Wash Away moves three mixed Invaders');
}
{
 const g=make(),p=g.players[1],l=g.lands.find(l=>l.presenceOwners.includes(p.id));l.dahan=2;const energy=p.energy;resolve(g,p,'bounty',{landId:l.id,moves:[]});assert.equal(l.dahan,3);assert.equal(p.energy,energy+1);console.log('PASS River\'s Bounty adds a Dahan and Energy even when gathering zero');
}
{
 const g=make(),ocean=g.players[1],l=g.lands[0];ocean.spirit='ocean';ocean.energy=0;l.explorers=2;l.towns=1;S.siDrownInvader(g,l,'explorers',ocean);assert.equal(ocean.energy,0);S.siDrownInvader(g,l,'towns',ocean);assert.equal(ocean.energy,1);assert.equal(ocean.drownedHealth,1);S.siDrownInvader(g,l,'explorers',ocean);assert.equal(ocean.energy,2);assert.equal(ocean.drownedHealth,0);console.log('PASS Ocean pools drowned Invader health and divides Energy by player count');
}

function earthGame(){const g=make(),p=g.players[0];p.spirit='earth';p.hand=S.siDraw(g,'earth');return{g,p,l:g.lands.find(l=>l.presenceOwners.filter(id=>id===p.id).length>=2)};}
{
 const {g,p,l}=earthGame();l.blight=2;const pool=g.blightPool;resolve(g,p,'healingLand',{landId:l.id});assert.equal(l.blight,1);assert.equal(g.blightPool,pool+1);assert.equal(l.defend,4);console.log('PASS Guard the Healing Land returns one Blight and grants Defend 4');
}
{
 const {g,p,l}=earthGame();l.explorers=1;l.towns=1;l.dahan=2;resolve(g,p,'stillness',{landId:l.id});const before=JSON.stringify([l.explorers,l.towns,l.cities,l.dahan,l.blight]);g.invaderSlots.ravage={terrains:[l.terrain]};g.invaderSlots.build={terrains:[l.terrain]};S.siInvader(g,'ravage');S.siInvader(g,'build');assert.equal(JSON.stringify([l.explorers,l.towns,l.cities,l.dahan,l.blight]),before);g.phase='cleanup';S.siProgress(g);assert.equal(l.skipAll,false);console.log('PASS Stillness skips Invader actions and counterattacks only for this turn');
}
{
 const {g,p,l}=earthGame();l.towns=1;l.cities=1;l.dahan=3;resolve(g,p,'rituals',{landId:l.id,damagePlan:[{type:'towns',index:0,amount:2},{type:'cities',index:0,amount:3}]});assert.equal(l.towns+l.cities,0);assert.equal(g.fear,5);console.log('PASS Rituals: three Dahan enable five damage and two explicit Fear');
}
{
 const {g,p,l}=earthGame(),from=g.lands.find(x=>l.neighbors.includes(x.id));from.explorers=2;from.dahan=2;l.dahan=0;resolve(g,p,'fruitful',{landId:l.id,moves:[{from:from.id,to:l.id,type:'explorers',count:2},{from:from.id,to:l.id,type:'dahan',count:2}]});assert.equal(l.explorers,2);assert.equal(l.dahan,2);assert.equal(from.dahan+from.explorers,0);console.log('PASS Fruitful Earth gathers up to two Explorers and two Dahan independently');
}

{
 const g=make(),p=g.players[0],l=g.lands.find(l=>l.presenceOwners.includes(p.id));l.towns=1;const c=p.hand.find(c=>c.program==='shatter');resolve(g,p,'shatter',{landId:l.id});g.phase='cleanup';S.siProgress(g);assert(p.discard.some(x=>x.id===c.id));assert(!p.hand.some(x=>x.id===c.id));assert.equal(c.used,false);assert.equal(c.ready,false);for(const actor of g.players){const opts=actor.spirit==='lightning'?0:0;S.siAction(g,actor,{type:'growth',matchId:g.matchId,growthIndex:opts,placements:[],powerId:actor.powerOffers[0].id});}assert.equal(g.phase,'play');p.energy=10;g.players[1].energy=10;S.siAction(g,p,{type:'play',matchId:g.matchId,cardIds:[c.id],fastCards:[c.id]});S.siAction(g,g.players[1],{type:'play',matchId:g.matchId,cardIds:[]});assert.equal(g.phase,'fast');assert.equal(c.playSpeed,'fast');console.log('PASS played cards discard, reclaim and become playable again next round');
}
