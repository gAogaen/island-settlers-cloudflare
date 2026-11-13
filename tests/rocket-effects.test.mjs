import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {handleRocket} from '../src/rocket.mjs';
import {ROCKET_EXPERT_POKEMON_CARDS as roster,ROCKET_CARD_IMAGE_ASSETS} from '../src/rocket-cards.mjs';
function mon(name,level=1){const f=roster.find(x=>x.levels.some(y=>y.name===name&&y.level===level));assert.ok(f,name);const s=f.levels.find(x=>x.level===level);return {...structuredClone(f),...structuredClone(s),maxHp:s.hp,hp:s.hp,fainted:false};}
let sequence=0;
const card=(type='attack',weather='sunny')=>({id:'c'+(++sequence),type,weather,name:type,cardId:type==='potion'?'placeholder-potion':type+'-'+weather});
function setup(a='ヒトカゲ',b='ゼニガメ',al=1,bl=1){
 const g={mode:'expert',code:'ABCDEF',phase:'playing',hostId:'a',turn:0,turnNumber:1,revision:1,deck:Array.from({length:30},()=>card('attack','sunny')),discard:[],log:[],players:[['a',a,al,'leader'],['b',b,bl,'challenger'],['c','ヒトデマン',1,'trainer'],['d','サンド',1,'rocket']].map(([id,name,l,role])=>({id,token:id,name:id,role,alive:true,hand:[card(),card('dodge'),card('potion')],team:[mon(name,l)],activeIndex:0}))};
 const store={value:g,async get(){return structuredClone(this.value)},async put(k,v){this.value=structuredClone(v)}};
 const act=async(id,action)=>{const r=await handleRocket(store,new Request('https://test/action',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token:id,...action})}));const body=await r.json();return{status:r.status,...body};};
 return {store,act,g};
}
const attack=(g,extra={})=>({type:'play',cardId:g.players[0].hand.find(c=>c.type==='attack').id,targetId:'b',...extra});
test('all 31 expert families have images at all three levels',()=>{assert.equal(roster.length, 31);for(const f of roster){assert.deepEqual(f.levels.map(x=>x.level),[1,2,3]);for(const s of f.levels){assert.ok(fs.existsSync(new URL('../public'+s.cardImage,import.meta.url)));if (f.id !== 'promo-dragonite') assert.equal(ROCKET_CARD_IMAGE_ASSETS.filter(x=>x.id===s.id).length,1);}}});
test('Blaze applies floor-half HP and burn after sunny check',async()=>{const {g,act,store}=setup();g.players[0].team[0].hp=1;await act('a',attack(g));assert.equal(store.value.pending.damage,3);await act('b',{type:'respond',choice:'take'});assert.equal(store.value.pending.type,'rescue');});
test('burn is fixed to one damage and guts bypasses burn',async()=>{for(const [name,expected]of [['ヒトカゲ',1],['ワンリキー',2]]){const {g,act,store}=setup(name);g.players[0].team[0].status='やけど';g.players[0].team[0].hp=1;await act('a',attack(g));assert.equal(store.value.pending.damage,expected);}});
test('Keen Eye reduces by one rather than fully dodging',async()=>{const {g,act,store}=setup('ピジョン','ゼニガメ',2);await act('a',attack(g));await act('b',{type:'respond',choice:'dodge',cardId:g.players[1].hand[1].id});assert.equal(store.value.players[1].team[0].hp,2);});
test('double kick has two independent dodge responses',async()=>{const {g,act,store}=setup('ニドラン♂');await act('a',attack(g));await act('b',{type:'respond',choice:'dodge',cardId:g.players[1].hand[1].id});assert.equal(store.value.pending.type,'attackResponse');await act('b',{type:'respond',choice:'take'});assert.equal(store.value.players[1].team[0].hp,2);assert.equal(store.value.pending,null);});
test('defender applies to both hits, is consumed, and ignores bonuses',async()=>{const {g,act,store}=setup('ニドラン♂');g.players[0].team[0].markers={plusPower:true};g.players[1].team[0].markers={defender:true};await act('a',attack(g));await act('b',{type:'respond',choice:'take'});await act('b',{type:'respond',choice:'take'});assert.equal(store.value.players[1].team[0].hp,1);assert.ok(!store.value.players[1].team[0].markers.defender);});
test('Oblivious prevents second hit during other player turn',async()=>{const {g,act,store}=setup('ニドラン♂','ヤドン');await act('a',attack(g));await act('b',{type:'respond',choice:'take'});await act('b',{type:'respond',choice:'take'});assert.equal(store.value.players[1].team[0].hp,2);});
test('drain heals only when damage is dealt',async()=>{for(const dodge of [false,true]){const {g,act,store}=setup('フシギダネ');g.players[0].team[0].hp=1;await act('a',attack(g));await act('b',{type:'respond',choice:dodge?'dodge':'take',cardId:g.players[1].hand[1].id});assert.equal(store.value.players[0].team[0].hp,dodge?1:2);}});
test('Levitate uses rain card, rejects sunny non-dodge',async()=>{const {g,act,store}=setup('ヒトカゲ','ゴース');g.players[1].hand[0].weather='rain';await act('a',attack(g));assert.equal((await act('c',{type:'respond',choice:'take'})).status,400);assert.equal((await act('b',{type:'respond',choice:'dodge',cardId:g.players[1].hand[0].id})).status,200);assert.equal(store.value.players[1].team[0].hp,3);});
test('Skill Link can attack again but ordinary pokemon cannot',async()=>{for(const name of ['シェルダー','ゼニガメ']){const {g,act,store}=setup(name);g.players[0].hand.push(card());await act('a',attack(g));await act('b',{type:'respond',choice:'dodge',cardId:g.players[1].hand[1].id});const result=await act('a',attack(store.value));assert.equal(result.status,name==='シェルダー'?200:400);}});
test('weather move consumes matching weather without attack usage',async()=>{const {g,act,store}=setup('ニャース');assert.equal((await act('a',{type:'move',moveIndex:0,cardId:g.players[0].hand[0].id})).status,200);assert.equal(store.value.players[0].team[0].markers.defender,true);assert.ok(!store.value.players[0].attackUsed);});
test('Disable removes two hidden cards until target next turn, without revealing them',async()=>{const {g,act,store}=setup('コダック','ゼニガメ',2);g.players[0].hand[0].weather='rain';const result=await act('a',{type:'move',moveIndex:1,cardId:g.players[0].hand[0].id,targetId:'b'});assert.equal(result.status,200);assert.equal(store.value.players[1].lockedCards.length,2);assert.ok(!JSON.stringify(result.game.players[1]).includes('lockedCards'));assert.equal(store.value.players[1].hand.length,1);store.value.turn=2;await act('c',{type:'end'});assert.equal(store.value.players[1].lockedCards.length,0);assert.equal(store.value.players[1].hand.length,5);});
test('Analyze rejects excessive/duplicate costs atomically and is once per turn',async()=>{const {g,act,store}=setup('コイル');const ids=g.players[0].hand.map(c=>c.id);assert.equal((await act('a',{type:'ability',cardIds:[ids[0],ids[0]]})).status,400);assert.equal(store.value.players[0].hand.length,3);assert.equal((await act('a',{type:'ability',cardIds:ids})).status,200);assert.equal((await act('a',{type:'ability',cardIds:[store.value.players[0].hand[0].id]})).status,400);});
test('Reckless validates HP cost, lethal cost draws nothing and opens rescue',async()=>{const {g,act,store}=setup('サイホーン');assert.equal((await act('a',{type:'ability',amount:4})).status,400);await act('a',{type:'ability',amount:3});assert.equal(store.value.players[0].hand.length,3);assert.equal(store.value.pending.type,'rescue');assert.equal(store.value.pending.actorId,'a');});
test('rock move restricts rescue to victim; victim can use potion',async()=>{const {g,act,store}=setup('サイホーン');g.players[1].team[0].hp=1;await act('a',attack(g));await act('b',{type:'respond',choice:'take'});assert.deepEqual(store.value.pending.queue,['b']);await act('b',{type:'respond',choice:'heal',cardId:g.players[1].hand[2].id});assert.equal(store.value.players[1].team[0].hp,3);});
test('Harvest runs after hand limit and does not immediately discard fifth card',async()=>{const {g,act,store}=setup('タマタマ');g.players[0].hand.push(card());await act('a',{type:'end',harvest:true});assert.equal(store.value.players[0].hand.length,5);});
test('Magikarp skips discard step',async()=>{const {g,act}=setup('コイキング');g.players[0].hand.push(card(),card());assert.equal((await act('a',{type:'end'})).status,200);});
test('Illuminate is optional and only owner can choose draw',async()=>{const {act,store}=setup();store.value.turn=3;await act('d',{type:'end'});assert.equal(store.value.pending.type,'drawChoice');assert.equal((await act('a',{type:'respond',choice:'yes'})).status,400);await act('c',{type:'respond',choice:'yes'});assert.equal(store.value.players[2].hand.length,6);});
test('Pay Day requires two gifts, conceals card ids from spectators',async()=>{const {g,act,store}=setup('ニャース','ゼニガメ',2);await act('a',attack(g));await act('b',{type:'respond',choice:'take'});assert.equal(store.value.pending.type,'gift');const ids=[...store.value.pending.cardIds];const response=await handleRocket(store,new Request('https://test/state?spectate=1'));assert.equal((await response.json()).game.pending.cardIds,undefined);assert.equal((await act('a',{type:'respond',choice:'give',cardId:ids[0],targetId:'c'})).status,400);for(const id of ids)assert.equal((await act('a',{type:'respond',choice:'give',cardId:id,targetId:'d'})).status,200);assert.equal(store.value.pending,null);assert.equal(store.value.players[3].hand.length,5);});
test('existing match without effect metadata remains playable',async()=>{const {g,act}=setup();delete g.players[0].team[0].abilityStatus;g.players[0].team[0].attacks=[{name:'legacy',damage:2}];assert.equal((await act('a',attack(g))).status,200);});

test('Covert Cloak blocks burn without preventing move damage',async()=>{
 const {g,act,store}=setup();
 g.players[1].team[0].heldItem={effectId:'covert-cloak',name:'おんみつマント'};
 assert.equal((await act('a',attack(g))).status,200);
 assert.equal((await act('b',{type:'respond',choice:'take'})).status,200);
 const target=store.value.players[1].team[0];
 assert.equal(target.hp,2);
 assert.equal(target.status??null,null);
 assert.ok(store.value.log.some(line=>line.includes('おんみつマントで特殊状態を防ぎました')));
});

test('Flame Orb burns after a hit on partly cloudy weather, even through Covert Cloak',async()=>{
 const {g,act,store}=setup('フシギダネ');
 g.deck.at(-1).weather='partly-cloudy';
 g.players[0].team[0].heldItem={effectId:'flame-orb'};
 g.players[1].team[0].heldItem={effectId:'covert-cloak'};
 assert.equal((await act('a',attack(g))).status,200);
 assert.equal((await act('b',{type:'respond',choice:'take'})).status,200);
 assert.equal(store.value.players[1].team[0].status,'やけど');
});

test('Future Sight privately reorders the top three before the defender responds', async () => {
 const {g, store, act} = setup('ヤドラン', 'ゼニガメ', 3);
 const top = g.deck.slice(-3).reverse();
 const attack = await act('a', {type:'play', cardId:g.players[0].hand[0].id, targetId:'b'});
 assert.equal(attack.status, 200);
 assert.equal(attack.game.pending.type, 'futureSight');
 assert.deepEqual(attack.game.pending.cards.map(card => card.id), top.map(card => card.id));
 const state = await handleRocket(store, new Request('https://test/state?token=b'));
 assert.equal((await state.json()).game.pending.cards, undefined);
 const reordered = [top[2], top[0], top[1]].map(card => card.id);
 const response = await act('a', {type:'respond', cardIds:reordered});
 assert.equal(response.game.pending.type, 'attackResponse');
 assert.deepEqual(store.value.deck.slice(-3).reverse().map(card => card.id), reordered);
});

test('Dragon Rage ignores Speeder and Plus Power, and Quick Claw extends its range', async () => {
 const {g, act, store}=setup('ハクリュー','ゼニガメ',2);
 const dragon=g.players[0].team[0];
 dragon.markers={speeder:true,plusPower:true};
 assert.equal((await act('a',{...attack(g),targetId:'c'})).status,400);
 dragon.heldItem={effectId:'quick-claw'};
 assert.equal((await act('a',{...attack(g),targetId:'c'})).status,200);
 assert.equal(store.value.pending.damage,2);
 assert.equal(store.value.players[0].team[0].markers.plusPower,true);
 assert.equal((await act('c',{type:'respond',choice:'dodge',cardId:g.players[2].hand[1].id})).status,400);
});

test('Dragonite reduces damage at full health and Dragonair can opt in while affected', async () => {
 for(const [name,level] of [['カイリュー',3],['ハクリュー',2]]){
  const {g,act,store}=setup('ヒトカゲ',name,1,level);
  const defender=g.players[1].team[0];
  if(level===2)defender.status='どく';
  g.players[0].team[0].attacks=[{name:'test',damage:2}];
  await act('a',attack(g));
  assert.equal((await act('b',{type:'respond',choice:'take',reactiveAbility:level===2})).status,200);
  assert.equal(store.value.players[1].team[0].hp,defender.hp-1);
 }
});
