import { createPrintedDeck, ROCKET_PRINTED_DECK } from './rocket-printed-deck.mjs';
import { active, ability, attackDamage, receivedDamage, canDodge, handLimitExempt } from './rocket-effects.mjs';
// Server-authoritative online adaptation of the Rocket Team board game.
// Rules data is isolated in rocket-cards.mjs so the complete card set can be imported later.
import { ROCKET_EXPERT_POKEMON_CARDS, ROCKET_CARD_DATA_VERSION, ROCKET_CARD_IMAGE_ASSETS, ROCKET_PLAY_CARDS, ROCKET_POKEMON_CARDS, ROCKET_ROLE_CARDS, ROCKET_ROLE_LABELS } from './rocket-cards.mjs';

const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const uid=()=>crypto.randomUUID();
const cleanName=s=>String(s||'').trim().slice(0,16);
const rnd=n=>{const x=new Uint32Array(1);crypto.getRandomValues(x);return x[0]%n};
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]]}return a};
const log=(g,s)=>{g.log.push(s);g.log=g.log.slice(-50)};
const player=(g,id)=>g.players.find(p=>p.id===id);
const activePokemon=p=>p.team?.[p.activeIndex||0]||p.pokemon;
const aliveTeam=p=>(p.team||[]).filter(mon=>!mon.fainted&&mon.hp>0);
const roleLabels=ROCKET_ROLE_LABELS;
function printedToolEffect(name) {
 if (name==='プラスパワー／スピーダー'||name==='ディフェンダー／スピーダー') return {id:'marker',type:'marker'};
 if (name.startsWith('キズぐすり／')) return {id:'heal',type:'potion',amount:2};
 if (name==='ふしぎなアメ／きんのたま') return {id:'draw',type:'item',amount:2,targetMode:'any-trainer'};
}
const cardDef=id=>{
 const existing=ROCKET_PLAY_CARDS.find(card=>card.id===id);
 if(existing)return existing;
 const printed=ROCKET_PRINTED_DECK.find(card=>card.id===id);
 if(!printed)return;
 const effect=printedToolEffect(printed.name);
 return effect?{...printed,effect}:printed;
};
const cardAmount=(id,fallback=0)=>Number(cardDef(id)?.effect?.amount??fallback);

function deck(){
 const actions = createPrintedDeck(uid)
  .filter(card => card.kind === 'attack' || card.kind === 'dodge')
  .map(card => ({...card, type:card.kind, effectId:card.kind}));
 const remaining = ROCKET_PLAY_CARDS
  .filter(def => def.kind !== 'attack' && def.kind !== 'dodge' && !['potion','item'].includes(def.action))
  .flatMap(def => Array.from({length:def.copies},()=>({
   id:uid(),cardId:def.id,type:def.action||def.effect.id,kind:def.kind,
   name:def.name,effectId:def.effect.id,weather:def.weather||null,
  })));
 const heldEffects = {'たべのこし':'leftovers', 'おんみつマント':'covert-cloak', 'かえんだま':'flame-orb', 'おうじゃのしるし':'kings-rock', 'どくバリ':'poison-barb','ゴツゴツメット':'rocky-helmet','でんきだま':'light-ball','いのちのたま':'life-orb'};
 const held = createPrintedDeck(uid)
  .filter(card => Object.hasOwn(heldEffects, card.name))
  .map(card => ({...card, type:'held', effectId:heldEffects[card.name]}));
 const tools = createPrintedDeck(uid).flatMap(card => {
  const effect = printedToolEffect(card.name);
  return effect ? [{...card,type:effect.type,effectId:effect.id}] : [];
 });
 const events=createPrintedDeck(uid).filter(card=>card.kind==='event'&&(card.name==='バリヤードのトリック'||EVENTS.has(card.name)))
  .map(card=>({...card,type:card.name==='バリヤードのトリック'?'mime-trick':'printed-event',effectId:'event'}));
 return shuffle([...actions,...remaining,...held,...tools,...events]);
}
function makeRoles(n){return shuffle(['leader','trainer',...Array(n-3).fill('challenger'),'rocket']);}
function cloneMon(card,level,mode='basic'){
 const stage=card.levels?.find(x=>x.level===level);
 const hp=Number(mode==='expert'?(stage?.hp??card.redHp??card.hp):(stage?.basicHp??stage?.hp??card.greenHp??card.hp));
 return{...card,...stage,level,hp,maxHp:hp,fainted:false,name:stage?.name||card.name,
  cardImage:stage?.cardImage||card.cardImage,ability:stage?.ability??card.ability,abilityText:stage?.abilityText??card.abilityText,
  attacks:(stage?.attacks||card.attacks||[]).map(x=>({...x}))};
}
function winCheck(g){if(g.phase!=='playing')return;const alive=g.players.filter(p=>p.alive),leader=alive.find(p=>p.role==='leader'),hostiles=alive.filter(p=>['challenger','rocket'].includes(p.role));if(!leader){const allRocket=alive.length>0&&alive.every(p=>p.role==='rocket');finish(g,allRocket?'ロケット団員':'挑戦者',allRocket?'ジムリーダーが退場し、ロケット団の勝利！':'ジムリーダーが退場し、挑戦者側の勝利！');return}if(!hostiles.length)finish(g,'ジムリーダー・ジムトレーナー','挑戦者とロケット団員が全員退場し、ジム側の勝利！');}
function finish(g,winner,reason){g.phase='finished';g.winner=winner;g.reason=reason;g.pending=null;log(g,reason)}
function displayCard(card,level){const stage=card.levels?.find(x=>x.level===level);return{...card,...stage,level,greenHp:stage?.greenHp??(level===3?card.greenHp:null),redHp:stage?.redHp??(stage?.cardImage?stage.hp:card.redHp),cardImage:stage?.cardImage||card.cardImage,ability:stage?.ability??card.ability,abilityText:stage?.abilityText??card.abilityText,attacks:stage?.attacks||card.attacks};}
function view(g,p){const teamFor=x=>(x.team||[]).map((m,i)=>({name:m.name,type:m.type,level:m.level,hp:m.hp,maxHp:m.maxHp,active:i===(x.activeIndex||0),fainted:!!m.fainted,heldEffect:m.heldItem?.effectId,status:m.status||null,markers:m.markers||{},ability:m.ability,abilityText:m.abilityText,abilityStatus:m.abilityStatus,attacks:m.attacks||[],image:m.image||null,cardImage:m.cardImage||null,canLevelUp:!!m.levels?.some(stage=>stage.level===m.level+1)}));return{catalog:{version:ROCKET_CARD_DATA_VERSION,cardImages:ROCKET_CARD_IMAGE_ASSETS,playCards:ROCKET_PLAY_CARDS,pokemonCards:g.mode==='expert'?ROCKET_EXPERT_POKEMON_CARDS:ROCKET_POKEMON_CARDS,roleCards:ROCKET_ROLE_CARDS},code:g.code,mode:g.mode,phase:g.phase,hostId:g.hostId,revision:g.revision,turnId:g.players[g.turn]?.id,turnNumber:g.turnNumber||0,winner:g.winner||'',reason:g.reason||'',deckCount:g.deck.length,players:g.players.map(x=>{const mon=activePokemon(x);return{id:x.id,name:x.name,role:x.role==='leader'||!x.alive||p?.id===x.id?x.role:null,alive:x.alive,hp:mon?.hp??x.hp,maxHp:mon?.maxHp??x.maxHp,pokemon:mon?.name||'',type:mon?.type||'',level:mon?.level||3,cardImage:mon?.cardImage||null,team:teamFor(x),item:mon?.heldItem?.name||x.item||'',status:mon?.status||null,markers:mon?.markers||{},handCount:x.hand.length,attackUsed:x.attackUsed}}),me:p?{id:p.id,role:p.role,hand:p.hand.map(c=>({...c})),options:(p.options||[]).map(card=>displayCard(card,g.mode==='expert'?1:3)),team:teamFor(p),activeIndex:p.activeIndex||0}:null,pending:g.pending?publicPending(g.pending,p):null,notice:p?.secretInfo||null,log:[...g.log]};}
function nextIndex(g,from){for(let n=1;n<=g.players.length;n++){const i=(from-n+g.players.length)%g.players.length;if(g.players[i].alive)return i}return from;}
function draw(g,p,count=1,phase='effect'){
 if(phase==='draw'&&p.flinchTurn===g.turnNumber)count=Math.max(0,count-1);
 let extra=phase==='effect'&&count>0&&ability(g,p,'ものひろい')&&p.pickupTurn!==g.turnNumber;
 if(extra){p.pickupTurn=g.turnNumber;count++;log(g,p.name+'の「ものひろい」で追加1枚。');}
 for(let i=0;i<count;i++){const card=topCard(g);if(!card)break;p.hand.push(card);}
}
function nextTurn(g){winCheck(g);if(g.phase!=='playing')return;g.turn=nextIndex(g,g.turn);g.turnNumber=(g.turnNumber||0)+1;const p=g.players[g.turn];p.attackUsed=false;p.usedMoves=[];p.lockOnTargets=[];p.moveLock=null;p.abilityUses={};if(p.lockedCards?.length){p.hand.push(...p.lockedCards);p.lockedCards=[];log(g,p.name+'の除外された手札が戻りました。');}startDraw(g,p);}
function requireTurn(g,p){if(g.phase!=='playing'||g.pending||g.players[g.turn]?.id!==p.id)throw Error('あなたの番ではありません。')}
function knockout(g,{victimId,attackerId,pokemonIndex}){
 const target=player(g,victimId),attacker=player(g,attackerId);
 if(target){const mon=target.team?.[pokemonIndex??target.activeIndex??0];if(mon){mon.hp=0;mon.fainted=true;mon.markers={};if(mon.heldItem){g.discard.push(mon.heldItem);delete mon.heldItem;}}const next=target.team?.findIndex(m=>!m.fainted&&m.hp>0)??-1;if(next>=0){target.activeIndex=next;log(g,target.name+'は別のポケモンに交代しました。');}else{target.alive=false;g.discard.push(...target.hand);target.hand=[];if(target.lockedCards?.length){g.discard.push(...target.lockedCards);target.lockedCards=[];}log(g,target.name+'は退場しました。');}}
 if(attacker?.alive){draw(g,attacker,1);log(g,attacker.name+'は山札から1枚引きました。');}g.pending=null;winCheck(g);pumpEffects(g);
}
function attack(g,p,a){
 const source=activePokemon(p),move=source?.attacks?.[a.moveIndex??0];
 if(p.noMoveTurn===g.turnNumber)throw Error('この番はわざを使えません。');
 if(!move||move.trigger==='weather')throw Error('使う攻撃技を選んでください。');
 const ids=a.secondTargetId?[a.targetId,a.secondTargetId]:[a.targetId];
 const targets=ids.map(id=>player(g,id));
 if(ids.length>(move.maxTargets||1)||new Set(ids).size!==ids.length||targets.some(t=>!t?.alive||t.id===p.id))throw Error('攻撃する相手を選んでください。');
 const flexible=ability(g,p,'じゅうなん');
 if(['りゅうのいかり','りゅうせいぐん'].includes(move.name)&&source.heldItem?.effectId!=='quick-claw'&&!(g.mode==='expert'&&source.status!=='まひ'&&source.markers?.speeder)){
  const seats=g.players.filter(trainer=>trainer.alive);
  const seat=seats.indexOf(p);
  const neighbors=[seats[(seat+1)%seats.length],seats[(seat-1+seats.length)%seats.length]];
  if(targets.some(target=>!neighbors.includes(target)))throw Error('左右のバトルエリアから対象を選んでください。');
 }
 const repeat=ability(g,p,'スキルリンク')||move.effect?.id==='repeat-lock';
 if(p.moveLock&&p.moveLock!==move.name)throw Error('この番は'+p.moveLock+'だけ使用できます。');
 if(!repeat&&(flexible?p.usedMoves?.includes(move.name):p.attackUsed))throw Error('この番は使用済みです。');
 const card=p.hand.find(c=>c.id===a.cardId&&c.type==='attack');
 if(!card)throw Error('「くらえ！」カードを選んでください。');
 if(source.status==='まひ'&&!['sunny','partly-cloudy'].includes(card.weather))throw Error('まひ中は晴れ・晴れのち曇りの「くらえ！」だけ使えます。');
 const paid=['paid-bonus','paid-second-hit'].includes(move.effect?.id)&&a.costCardId;
 if(paid&&(paid===card.id||!p.hand.some(c=>c.id===paid)))throw Error('追加コストのカードを選んでください。');
 for(const target of targets){
  if(move.effect?.id==='remove-marker-after'){
   const keys=['plusPower','speeder'].filter(k=>activePokemon(target).markers?.[k]);
   if(keys.length>1&&!keys.includes(a.marker))throw Error('取り除く強化マーカーを選んでください。');
  }
 }
 if(move.effect?.id==='remove-marker-before'){
  for(const target of targets)removeMarker(activePokemon(target),a.marker,['plusPower','defender','speeder']);
 }
 trash(g,p,paid?[card.id,paid]:[card.id]);
 p.attackUsed=true;
 (p.usedMoves??=[]).push(move.name);
 if(move.effect?.id==='repeat-lock')p.moveLock=move.name;
 const hits=targets.map(target=>{
  const mon=activePokemon(target);
  const damage=attackDamage(g,p,move,{recoil:!!a.recoil,target:mon});
  return {type:'attackResponse',actorId:p.id,targetId:target.id,pokemonIndex:target.activeIndex||0,
   sourceIndex:p.activeIndex||0,damage:damage+(paid&&move.effect.id==='paid-bonus'&&(source.status!=='やけど'||ability(g,p,'こんじょう'))?1:0),
   move:move.name,effect:move.effect||{id:'none'},effectStatus:move.effectStatus,
   lifeOrb:a.lifeOrb===true,keen:ability(g,p,'するどいめ'),recoil:!!a.recoil,
   removeMarker:a.marker,defender:!!mon.markers?.defender,choices:['dodge','take']};
 });
 if(move.effect?.id!=='dragon-adjacent'&&source.status!=='まひ'&&source.markers?.plusPower)delete source.markers.plusPower;
 if(move.effect?.id==='double-hit'||(paid&&move.effect?.id==='paid-second-hit'))hits.push({...hits[0],secondHit:true});
 g.pending=hits.shift();
 g.effectQueue=hits;
 log(g,p.name+'が「'+move.name+'」を使いました。');
 if(ability(g,p,'じしんかじょう'))draw(g,p,1);
 if(move.effect?.id==='pending')log(g,'この技の追加効果は未対応です（カード画像を確認）。');
}
function resolve(g,p,a){
 const q=g.pending;if(!q)throw Error('対応する効果がありません。');
 if(q.type==='attackResponse'){
  if(q.targetId!==p.id)throw Error('この攻撃への対応対象ではありません。');
  if(q.effect?.id==='dragon-adjacent'&&a.choice!=='take')throw Error('このわざは回避できません。');
  if(!['dodge','take'].includes(a.choice))throw Error('対応方法を選択してください。');
  let damage=q.damage;
  if(a.choice==='dodge'){if(player(g,q.actorId)?.lockOnTargets?.includes(p.id))throw Error('ロックオンで回避できません。');const c=p.hand.find(x=>x.id===a.cardId);if(!canDodge(g,p,c))throw Error('回避に使用できるカードを選んでください。');trash(g,p,[c.id]);damage=q.keen?Math.max(0,damage-1):0;log(g,p.name+'は回避を試みました。');}
  if(damage>0&&q.lifeOrb){
   const owner=player(g,q.actorId),source=owner?.team?.[q.sourceIndex];
   if(source?.hp>0&&source.heldItem?.effectId==='life-orb'&&!ability(g,owner,'くいしんぼう')){
    if(source.status!=='やけど'||ability(g,owner,'こんじょう'))damage++;
    source.hp--;
    if(!source.hp)g.effectQueue.push({type:'selfKnockout',actorId:owner.id,pokemonIndex:q.sourceIndex});
   }
  }
  const mon=p.team[q.pokemonIndex];damage=receivedDamage(g,p,damage,{defender:q.defender});
  if(damage>0){mon.hp-=damage;mon.damagedTurn=g.turnNumber;if(mon.status!=='まひ'&&mon.markers?.defender)delete mon.markers.defender;log(g,p.name+'は'+damage+'ダメージ。');afterDamage(g,p,q,a);}
  g.pending=null;
  if(mon.hp<=0)beginRescue(g,p,q);else pumpEffects(g);
 }else if(q.type==='rescue'){
  if(q.actorId!==p.id)throw Error('あなたの救助の順番ではありません。');
  if(a.choice==='heal'){
   const c=p.hand.find(x=>x.id===a.cardId),victim=player(g,q.victimId),mon=victim?.team?.[q.pokemonIndex];
   if(!c||c.type!=='potion'||!mon)throw Error('キズぐすりを選んでください。');
   trash(g,p,[c.id]);mon.hp=Math.min(mon.maxHp,cardAmount(c.cardId,3));mon.fainted=false;victim.alive=true;g.pending=null;log(g,p.name+'が'+victim.name+'を救助しました。');pumpEffects(g);
  }else if(a.choice==='pass'){q.queue.shift();if(q.queue.length)q.actorId=q.queue[0];else knockout(g,q);}else throw Error('対応方法を選んでください。');
 }else{
  if(q.actorId!==p.id)throw Error('あなたの選択ではありません。');
  if(q.type==='printedEvent')resolvePrintedEvent(g,p,q,a);
  else if(q.type==='drawChoice'){if(!['yes','no'].includes(a.choice))throw Error('選択してください。');g.pending=null;draw(g,p,a.choice==='yes'?3:2,'draw');}
  else if(q.type==='cycle'){if(a.choice==='yes'){trash(g,p,[a.cardId]);draw(g,p,1);}else if(a.choice!=='no')throw Error('選択してください。');g.pending=null;pumpEffects(g);}
  else if(q.type==='gift'){
   const target=player(g,a.targetId);if(!target?.alive||target.id===p.id)throw Error('他のトレーナーを選んでください。');
   const id=a.cardId;if(!q.cardIds.includes(id))throw Error('引いたカードを選んでください。');const c=p.hand.find(x=>x.id===id);if(!c)throw Error('そのカードはありません。');p.hand=p.hand.filter(x=>x.id!==id);target.hand.push(c);q.cardIds=q.cardIds.filter(x=>x!==id);if(!q.cardIds.length){g.pending=null;pumpEffects(g);}
  }else throw Error('未対応の選択です。');
 }
 winCheck(g);
}
function levelUp(p){const mon=activePokemon(p);if(!mon||mon.level>=3)return false;const next=mon.level+1,stage=mon.levels?.find(x=>x.level===next);if(!stage)return false;const oldMax=mon.maxHp;mon.level=next;mon.name=stage.name||mon.name;mon.species=stage.name||mon.species;mon.cardImage=stage.cardImage||mon.cardImage;mon.ability=stage.ability??mon.ability;mon.abilityText=stage.abilityText??mon.abilityText;mon.abilityStatus=stage.abilityStatus;mon.maxHp=Number(stage.hp??oldMax);mon.hp=Math.min(mon.maxHp,mon.hp+Math.max(0,mon.maxHp-oldMax));mon.attacks=(stage.attacks||mon.attacks).map(x=>({...x}));return true;}
function apply(g,p,a){if(a.revision!=null&&a.revision!==g.revision)throw Error('画面が更新されました。もう一度操作してください。');
 if(a.type==='start'){if(p.id!==g.hostId||g.phase!=='lobby')throw Error('ホストのみ開始できます。');if(g.players.length<4||g.players.length>6)throw Error('4〜6人で開始してください。');const roles=makeRoles(g.players.length);g.players.forEach(x=>{x.role=roles.shift();x.options=shuffle(g.mode==='expert'?ROCKET_EXPERT_POKEMON_CARDS:ROCKET_POKEMON_CARDS).slice(0,g.mode==='expert'?4:2);x.team=[];x.activeIndex=0;x.pokemon=null;x.hand=[];x.hp=0;x.alive=true});g.phase='setup';g.deck=deck();g.revision++;log(g,'役割とポケモン候補を配りました。役割はジムリーダー以外、秘密です。');return}
 if(a.type==='choose'){if(g.phase!=='setup')throw Error('ポケモン選択中ではありません。');const required=g.mode==='expert'?2:1,indices=Array.isArray(a.indices)?a.indices.map(Number):[Number(a.index)];if(indices.length!==required||new Set(indices).size!==required||indices.some(i=>!p.options?.[i]))throw Error(required===2?'ポケモンを2匹選んでください。':'ポケモンを選んでください。');p.team=indices.map(i=>cloneMon(p.options[i],g.mode==='expert'?1:3,g.mode));p.activeIndex=0;p.options=[];p.pokemon=activePokemon(p);p.hp=p.pokemon.hp;p.maxHp=p.pokemon.maxHp;if(g.players.every(x=>x.team?.length)){g.phase='playing';g.turn=g.players.findIndex(x=>x.role==='leader');g.players.forEach(x=>{x.hand=[];draw(g,x,4)});g.turnNumber=1;startDraw(g,g.players[g.turn]);log(g,'全員の相棒が決まりました。ジムリーダーの番から開始！')}g.revision++;return}
 if(a.type==='ability'){requireTurn(g,p);useAbility(g,p,a);g.revision++;return}
 if(a.type==='held-effect'){
  requireTurn(g,p);
  const mon=activePokemon(p),target=player(g,a.targetId);
  if(mon.heldItem?.effectId!=='light-ball'||ability(g,p,'くいしんぼう')||!target?.alive)throw Error('でんきだまを使える状態と対象を確認してください。');
  g.discard.push(mon.heldItem);
  delete mon.heldItem;
  applySpecialStatus(g,target,activePokemon(target),'まひ');
  g.revision++;
  return;
 }
 if(a.type==='move'){requireTurn(g,p);useWeatherMove(g,p,a);g.revision++;return}
 if(a.type==='respond'){resolve(g,p,a);g.revision++;return}if(a.type==='ack'){p.secretInfo=null;g.revision++;return}
 if(a.type==='play'){requireTurn(g,p);const c=p.hand.find(x=>x.id===a.cardId);if(!c)throw Error('そのカードは手札にありません。');if(c.type==='printed-event')playPrintedEvent(g,p,c,a);else if(c.type==='mime-trick'){
 const target=player(g,a.targetId);
 if(!target?.alive||target===p||!target.hand.length||ability(g,target,'はやおき'))throw Error('手札を引ける相手を選んでください。');
 trash(g,p,[c.id]);
 p.hand.push(...target.hand.splice(rnd(target.hand.length),1));
 log(g,p.name+'はバリヤードのトリックで手札を1枚引きました。');
 }else if(c.name==='キズぐすり／げんきのかけら'&&a.toolChoice==='revive'){
 const target=player(g,a.targetId),index=Number(a.pokemonIndex);
 const mon=target?.team?.[index];
 if(g.mode!=='expert'||!target?.alive||index===target.activeIndex||!mon?.fainted)throw Error('ひんしのベンチポケモンを選んでください。');
 mon.hp=Math.min(2,mon.maxHp);
 mon.fainted=false;
 delete mon.status;
 trash(g,p,[c.id]);
 log(g,p.name+'がげんきのかけらを使いました。');
 }else if(c.type==='held')equipHeld(p,c);else if(c.type==='attack')attack(g,p,a);else if(c.type==='marker'||(c.name==='キズぐすり／なんでもなおし'&&a.toolChoice==='cure'))applyPrintedTool(g,p,c,a);else if(c.type==='potion'){const t=a.targetId?player(g,a.targetId):p;if(!t?.alive)throw Error('回復するトレーナーを選んでください。');const mon=activePokemon(t);if(mon.hp>=mon.maxHp)throw Error('HPが満タンです。');p.hand=p.hand.filter(x=>x.id!==c.id);g.discard.push(c);mon.hp=Math.min(mon.maxHp,mon.hp+cardAmount(c.cardId,3));log(g,p.name+'が'+t.name+'に'+c.name+'を使いました。')}else if(c.type==='item'&&c.name==='ふしぎなアメ／きんのたま'&&a.toolChoice==='candy'){
 const target=player(g,a.targetId);
 if(g.mode!=='expert'||!target?.alive||!levelUp(target))throw Error('レベルアップできるバトルポケモンを選んでください。');
 trash(g,p,[c.id]);
 log(g,p.name+'が「ふしぎなアメ」を使い、'+target.name+'のポケモンがレベルアップしました。');
 }else if(c.type==='item'){const t=cardDef(c.cardId)?.effect?.targetMode==='any-trainer'&&a.targetId?player(g,a.targetId):p;if(!t?.alive)throw Error('カードを引くトレーナーを選んでください。');p.hand=p.hand.filter(x=>x.id!==c.id);g.discard.push(c);draw(g,t,cardAmount(c.cardId,1));log(g,p.name+'が'+c.name+'を使いました。')}else if(c.type==='scout'){const t=player(g,a.targetId);if(!t?.alive||t.id===p.id)throw Error('調べる相手を選んでください。');p.hand=p.hand.filter(x=>x.id!==c.id);g.discard.push(c);p.secretInfo={name:t.name,role:roleLabels[t.role]};log(g,p.name+'が相手の様子を探っています。')}else if(c.type==='boost'){p.hand=p.hand.filter(x=>x.id!==c.id);g.discard.push(c);const mon=activePokemon(p);mon.hp=Math.min(mon.maxHp,mon.hp+cardAmount(c.cardId,1));log(g,p.name+'は'+c.name+'を使いました。')}else if(c.type==='dodge')throw Error('「よけて！」は攻撃を受けたときに使います。');g.revision++;return}
 if(a.type==='switch'){requireTurn(g,p);if(p.noSwitchTurn===g.turnNumber)throw Error('ねむりでこの番は交代できません。');if(g.mode!=='expert'||!Number.isInteger(a.index)||!p.team?.[a.index]||a.index===p.activeIndex||p.team[a.index].fainted)throw Error('交代できるポケモンを選んでください。');const previous=activePokemon(p);previous.markers={};p.activeIndex=a.index;p.pokemon=activePokemon(p);log(g,p.name+'はバトルポケモンを交代しました。');g.revision++;return}
 if(a.type==='end'){requireTurn(g,p);if(p.hand.length>4&&!handLimitExempt(g,p))throw Error('手札が5枚以上です。残すカードを4枚選んでください。');if(a.levelUp&&g.mode==='expert'){if(!levelUp(p))throw Error('バトルポケモンはレベルアップできません。');log(g,p.name+'のバトルポケモンがLv.'+activePokemon(p).level+'にレベルアップ！')}endEffects(g,p,a);log(g,p.name+'の番が終了しました。');nextTurn(g);g.revision++;return}
 if(a.type==='discard'){requireTurn(g,p);const ids=Array.isArray(a.cardIds)?a.cardIds:[];if(p.hand.length-ids.length!==4||new Set(ids).size!==ids.length||ids.some(id=>!p.hand.some(c=>c.id===id)))throw Error('手札が4枚になるよう、捨てるカードを選んでください。');for(const id of ids){const i=p.hand.findIndex(c=>c.id===id);g.discard.push(p.hand.splice(i,1)[0])}if(a.levelUp&&g.mode==='expert')levelUp(p);endEffects(g,p,a);log(g,p.name+'は手札を4枚に整えました。');nextTurn(g);g.revision++;return}
 if(a.type==='rematch'){if(p.id!==g.hostId||g.phase!=='finished')throw Error('再戦できません。');g.phase='lobby';g.pending=null;g.winner='';g.reason='';g.players.forEach(x=>{delete x.role;delete x.pokemon;delete x.options;delete x.team;delete x.activeIndex;x.hand=[];x.hp=0;x.maxHp=0;x.alive=true});g.revision++;log(g,'再戦の準備ができました。');return}throw Error('未対応の操作です。')}
export async function handleRocket(storage,request){try{const url=new URL(request.url),route=url.pathname.split('/').pop(),a=request.method==='POST'?await request.json():{};let g=await storage.get('rocket');if(route==='create'){if(g)return json({error:'この部屋は使用中です。'},409);const n=cleanName(a.name);if(!n)throw Error('名前を入力してください。');const p={id:uid(),token:uid(),name:n,hand:[],alive:true};g={code:a.code,mode:a.mode==='expert'?'expert':'basic',hostId:p.id,players:[p],phase:'lobby',turn:0,revision:1,deck:[],discard:[],log:['部屋を作成しました。']};await storage.put('rocket',g);return json({game:view(g,p),token:p.token})}if(!g)return json({error:'部屋がありません。'},404);if(route==='join'){if(g.phase!=='lobby'||g.players.length>=6)throw Error('参加できません。');const n=cleanName(a.name);if(!n||g.players.some(x=>x.name===n))throw Error('別の名前を入力してください。');const p={id:uid(),token:uid(),name:n,hand:[],alive:true};g.players.push(p);g.revision++;await storage.put('rocket',g);return json({game:view(g,p),token:p.token})}if(route==='state'&&url.searchParams.get('spectate')==='1')return json({game:view(g,null)});const token=route==='state'?url.searchParams.get('token'):a.token,p=g.players.find(x=>x.token===token);if(!p)return json({error:'参加情報を確認できません。'},403);if(route==='state')return json({game:view(g,p)});if(route!=='action')return json({error:'操作がありません。'},404);apply(g,p,a);await storage.put('rocket',g);return json({game:view(g,p)})}catch(e){return json({error:e.message||'操作に失敗しました。'},400)}}

function publicPending(q,p){const out={...q};if(q.actorId!==p?.id){delete out.cardIds;}return out;}
function topCard(g){if(!g.deck.length&&g.discard.length){g.deck=shuffle(g.discard);g.discard=[];}return g.deck.pop()||null;}
function trash(g,p,ids){if(!Array.isArray(ids)||new Set(ids).size!==ids.length||ids.some(id=>!p.hand.some(c=>c.id===id)))throw Error('手札のカードを選んでください。');for(const id of ids){const i=p.hand.findIndex(c=>c.id===id);g.discard.push(p.hand.splice(i,1)[0]);}}
function removeMarker(mon,key,allowed){const present=allowed.filter(k=>mon.markers?.[k]);if(!present.length)return;if(!present.includes(key)){if(present.length===1)key=present[0];else throw Error('取り除く強化マーカーを選んでください。');}delete mon.markers[key];}
function startDraw(g,p){
 const mon=activePokemon(p);
 const status=mon?.status;
 if(['こんらん','ねむり','ひるみ'].includes(status))delete mon.status;
 if(status==='こんらん'||status==='ねむり')p.noMoveTurn=g.turnNumber;
 if(status==='ねむり')p.noSwitchTurn=g.turnNumber;
 if(status==='ひるみ')p.flinchTurn=g.turnNumber;
 if(status==='こんらん'||status==='どく'){
  mon.hp=Math.max(0,mon.hp-1);
  log(g,p.name+'は'+status+'で1ダメージを受けました。');
  if(!mon.hp){
   (g.effectQueue??=[]).unshift({type:'resumeDraw',actorId:p.id});
   beginRescue(g,p,{pokemonIndex:p.activeIndex||0,actorId:null});
   return;
  }
 }
 drawStep(g,p);
}
function drawStep(g,p){if(ability(g,p,'はっこう')){g.pending={type:'drawChoice',actorId:p.id,targetId:p.id};return;}draw(g,p,2,'draw');log(g,p.name+'がドローステップでカードを引きました。');}
function endEffects(g,p,a){const mon=activePokemon(p);if(a.rainDish&&ability(g,p,'あめうけざら')&&checkWeather(g,['rain','thunderstorm'])){
 mon.hp=Math.min(mon.maxHp,mon.hp+1);
 delete mon.status;
 }
 if(a.harvest&&ability(g,p,'しゅうかく'))draw(g,p,1);if(mon.heldItem&&(ability(g,p,'くいしんぼう')||mon.heldItem.effectId==='leftovers'))mon.hp=Math.min(mon.maxHp,mon.hp+1);}
function beginRescue(g,p,q){const from=g.players.findIndex(x=>x.id===p.id),queue=[];for(let i=0;i<g.players.length;i++){const candidate=g.players[(from-i+g.players.length)%g.players.length];if(candidate.alive&&(q.effect?.id!=='self-rescue-only'||candidate.id===p.id))queue.push(candidate.id);}g.pending={type:'rescue',actorId:queue[0],queue,victimId:p.id,pokemonIndex:q.pokemonIndex,attackerId:q.actorId};if(!queue.length)knockout(g,g.pending);}
function pumpEffects(g){if(g.pending||g.phase!=='playing')return;while(g.effectQueue?.length){const q=g.effectQueue.shift(),p=player(g,q.actorId);if(q.type==='resumeDraw'){if(p?.alive)drawStep(g,p);else nextTurn(g);return;}if(!p?.alive)continue;if(q.type==='attackResponse'){const t=player(g,q.targetId);if(!t?.alive||t.team[q.pokemonIndex]?.fainted)continue;}if(q.type==='selfKnockout'){beginRescue(g,p,{pokemonIndex:q.pokemonIndex,actorId:null});return;}if(q.type==='cycle'&&!p.hand.length)continue;if(q.type==='gift'&&!g.players.some(t=>t.alive&&t.id!==p.id))continue;g.pending=q;return;}}
function afterDamage(g,target,q,action){
 const p=player(g,q.actorId),source=p?.team?.[q.sourceIndex],mon=target.team[q.pokemonIndex],id=q.effect?.id;if(!source)return;
 if(id==='drain'){
  source.hp=Math.min(source.maxHp,source.hp+1);
  if(q.effect.draw)draw(g,p,q.effect.draw);
 }
 if(id==='steal-random'&&target.hand.length)p.hand.push(...target.hand.splice(rnd(target.hand.length),1));
 if(id==='weather-draw'){
  const card=topCard(g);
  if(card){
   log(g,'おてんきチェック：'+(card.weather||'天気未登録'));
   if(q.effect.weather.includes(card.weather))p.hand.push(card);
   else g.discard.push(card);
  }
 }
 if(id==='discard-random'&&target.hand.length)trash(g,target,[target.hand[rnd(target.hand.length)].id]);
 if(id==='remove-marker-after')removeMarker(mon,q.removeMarker,['plusPower','speeder']);
 if(id==='cycle-after-hit')g.effectQueue.push({type:'cycle',actorId:p.id,targetId:p.id});
 if(id==='gift-two'){const before=new Set(p.hand.map(c=>c.id));draw(g,p,2);const cards=p.hand.filter(c=>!before.has(c.id)).slice(0,2);if(cards.length)g.effectQueue.push({type:'gift',actorId:p.id,targetId:p.id,cardIds:cards.map(c=>c.id)});}
 if(id==='optional-recoil'&&q.recoil){source.hp--;if(source.hp<=0){g.effectQueue.push({type:'selfKnockout',actorId:p.id,targetId:p.id,pokemonIndex:q.sourceIndex});}}
 if(id==='weather-discard'&&checkWeather(g,q.effect.weather)&&target.hand.length){
  trash(g,target,[target.hand[rnd(target.hand.length)].id]);
 }
 if(mon.hp<=0)return;
 if(action.reactiveAbility){
  const status=ability(g,target,'せいでんき')?'まひ':ability(g,target,'どくのトゲ')?'どく':null;
  if(status)applyWeatherStatus(g,p,source,{weather:['partly-cloudy','rain','thunderstorm'],status},{fromMove:false});
 }
 if(id!=='ignore-held'&&mon.heldItem?.effectId==='rocky-helmet'&&!ability(g,target,'くいしんぼう')&&source.hp>0){
  source.hp--;
  log(g,p.name+'はゴツゴツメットで1ダメージを受けました。');
  if(source.hp===0)g.effectQueue.push({type:'selfKnockout',actorId:p.id,targetId:p.id,pokemonIndex:q.sourceIndex});
 }
 if(id!=='ignore-held'&&mon.heldItem?.effectId==='poison-barb'&&!ability(g,target,'くいしんぼう')){
  applySpecialStatus(g,p,source,'どく');
 }
 if(source.heldItem?.effectId==='kings-rock'&&!ability(g,p,'くいしんぼう')){
  applySpecialStatus(g,target,mon,'ひるみ');
 }
 if(id==='apply-status') applyMoveStatus(g,target,mon,q.effect.status);
 if(id==='weather-status') applyWeatherStatus(g,target,mon,q.effect);
 if(source.heldItem?.effectId==='flame-orb'&&!ability(g,p,'くいしんぼう')){
  applyWeatherStatus(g,target,mon,{weather:['sunny','partly-cloudy'],status:'やけど'},{fromMove:false});
 }
}
function useAbility(g,p,a){const mon=activePokemon(p),name=mon.ability;if(!ability(g,p,name)||!['アナライズ','すてみ'].includes(name))throw Error('この特性の操作は未対応です。');p.abilityUses||={};if(p.abilityUses[name]===g.turnNumber)throw Error('この番は使用済みです。');
 if(name==='アナライズ'){const ids=a.cardIds||[];if(!ids.length||ids.length>mon.hp)throw Error('残りHP以下の枚数を選んでください。');trash(g,p,ids);draw(g,p,ids.length);}
 else {const n=Number(a.amount);if(!Number.isInteger(n)||n<1||n>mon.hp)throw Error('減らすHPを選んでください。');mon.hp-=n;if(mon.hp>0)draw(g,p,n);else beginRescue(g,p,{pokemonIndex:p.activeIndex||0,actorId:null});}
 p.abilityUses[name]=g.turnNumber;log(g,p.name+'は「'+name+'」を使いました。');
}
function checkWeather(g,allowed){
 const card=topCard(g);
 if(!card)return null;
 g.discard.push(card);
 log(g,'おてんきチェック：'+(card.weather||'天気未登録'));
 return allowed.includes(card.weather)?card.weather:null;
}
function applyWeatherStatus(g,target,mon,effect,{fromMove=true}={}){
 const weather=checkWeather(g,effect.weather);
 if(!weather||mon.status)return;
 const status=effect.statusByWeather?.[weather]??effect.status;
 if(fromMove)applyMoveStatus(g,target,mon,status);
 else applySpecialStatus(g,target,mon,status);
}
function applyMoveStatus(g,target,mon,status){
 if(mon.status)return;
 if(mon.heldItem?.effectId==='covert-cloak'&&!ability(g,target,'くいしんぼう')){
  log(g,target.name+'はおんみつマントで特殊状態を防ぎました。');
  return;
 }
 applySpecialStatus(g,target,mon,status);
}
function applySpecialStatus(g,target,mon,status){
 if(mon.status||mon.hp<=0||(status==='まひ'&&ability(g,target,'じゅうなん')))return;
 mon.status=status;
 log(g,target.name+'のポケモンは'+status+'になりました。');
}
function useWeatherMove(g,p,a){if(p.noMoveTurn===g.turnNumber)throw Error('この番はわざを使えません。');const mon=activePokemon(p),move=mon.attacks?.[a.moveIndex],card=p.hand.find(c=>c.id===a.cardId);if(!move||move.trigger!=='weather'||!move.costWeather?.includes(card?.weather))throw Error('技に対応する天気のカードを選んでください。');if(p.moveLock&&p.moveLock!==move.name)throw Error('この番は'+p.moveLock+'だけ使用できます。');const id=move.effect?.id,target=player(g,a.targetId);
 if(id==='defender'&&mon.markers?.defender)throw Error('ディフェンダーはすでにあります。');
 if(['discard-random','lock-two','weather-status','lock-on'].includes(id)&&!target?.alive)throw Error('対象を選んでください。');
 const targets=id==='heal-many'?(a.targetIds||[]).map(id=>player(g,id)):[];if(id==='heal-many'&&(!targets.length||targets.some(t=>!t?.alive)||new Set(a.targetIds).size!==targets.length))throw Error('回復するバトルポケモンを選んでください。');
 if(!['defender','discard-random','lock-two','heal-many','weather-status','lock-on'].includes(id))throw Error('この技の効果は未対応です。');
 trash(g,p,[card.id]);
 if(id==='defender'){mon.markers||={};mon.markers.defender=true;}
 if(id==='discard-random'&&target.hand.length)trash(g,target,[target.hand[rnd(target.hand.length)].id]);
 if(id==='lock-two'){target.lockedCards||=[];for(let i=0;i<2&&target.hand.length;i++)target.lockedCards.push(target.hand.splice(rnd(target.hand.length),1)[0]);}
 if(id==='weather-status')applyWeatherStatus(g,target,activePokemon(target),move.effect);
 if(id==='lock-on')(p.lockOnTargets??=[]).push(target.id);
 if(id==='heal-many')for(const t of targets){const m=activePokemon(t);m.hp=Math.min(m.maxHp,m.hp+1);}
 log(g,p.name+'は「'+move.name+'」を使いました。');
}

function equipHeld(p,card){
 const mon=activePokemon(p);
 if(mon.heldItem)throw Error('すでにもちものを持っています。');
 mon.heldItem=card;
 p.hand=p.hand.filter(candidate=>candidate.id!==card.id);
}

function applyPrintedTool(g,actor,card,action){
 const target=player(g,action.targetId);
 if(!target?.alive)throw Error('対象を選んでください。');
 const mon=activePokemon(target);
 if(card.name==='キズぐすり／なんでもなおし'&&action.toolChoice==='cure'){
  if(!['やけど','どく','まひ'].includes(mon.status))throw Error('このタイミングで回復できる特殊状態がありません。');
  delete mon.status;
  log(g,target.name+'の特殊状態が回復しました。');
 }else{
  const marker=action.toolChoice==='speeder'?'speeder':card.name.startsWith('プラスパワー')?'plusPower':'defender';
  if(marker==='speeder'&&g.mode!=='expert')throw Error('スピーダーは玄人ルール専用です。');
  mon.markers??={};
  if(mon.markers[marker])throw Error('同じマーカーはすでに置かれています。');
  mon.markers[marker]=true;
  log(g,target.name+'のポケモンに強化マーカーを置きました。');
 }
 trash(g,actor,[card.id]);
}


const EVENTS=new Set([
 'カモネギのいたずら','プリンのライブ','ファイヤーからの試練',
 'ミュウツーのプレッシャー','ミュウの祝福','サンダーのペナルティ','きのみ大豊作',
]);

function playPrintedEvent(g,actor,card,action){
 const target=player(g,action.targetId);
 const mon=target&&activePokemon(target);
 if(card.name==='カモネギのいたずら'){
  if(!target?.alive)throw Error('対象を選んでください。');
  const choice=action.eventChoice||'hand';
  if(choice==='held'){
   if(!mon.heldItem)throw Error('対象はもちものを持っていません。');
   g.discard.push(mon.heldItem);
   delete mon.heldItem;
  }else if(choice==='hand'){
   if(!target.hand.length)throw Error('対象に手札がありません。');
   trash(g,target,[target.hand[rnd(target.hand.length)].id]);
  }else{
   if(!['plusPower','defender','speeder'].includes(choice)||!mon.markers?.[choice]||(choice==='speeder'&&g.mode!=='expert'))throw Error('取り除けるマーカーを選んでください。');
   delete mon.markers[choice];
  }
 }else if(card.name==='プリンのライブ'){
  if(!target?.alive||ability(g,target,'はやおき'))throw Error('対象にできるポケモンを選んでください。');
  if(checkWeather(g,['sunny','partly-cloudy','rain']))applySpecialStatus(g,target,mon,'ねむり');
 }else{
  const order=Array.from({length:g.players.length},(_,i)=>g.players[(g.turn-i+g.players.length)%g.players.length]).filter(p=>p.alive);
  const others=[...order.slice(1),actor];
  const participants=['ファイヤーからの試練','ミュウツーのプレッシャー'].includes(card.name)?others.filter(p=>p!==actor):card.name==='サンダーのペナルティ'?others:order;
  const pool=card.name==='きのみ大豊作'?participants.map(()=>topCard(g)).filter(Boolean):null;
  g.effectQueue=participants.map(p=>({type:'printedEvent',actorId:p.id,targetId:p.id,eventName:card.name,...(pool?{pool}:{})}));
 }
 trash(g,actor,[card.id]);
 log(g,actor.name+'が「'+card.name+'」を使いました。');
 pumpEffects(g);
}

function resolvePrintedEvent(g,p,q,action){
 const mon=activePokemon(p);
 let damage=0;
 if(q.eventName==='きのみ大豊作'){
  const index=q.pool.findIndex(card=>card.id===action.cardId);
  if(index<0&&q.pool.length)throw Error('公開されたカードを選んでください。');
  if(index>=0){
   p.hand.push(...q.pool.splice(index,1));
   for(const next of g.effectQueue)next.pool=q.pool;
  }
 }else if(q.eventName==='ミュウの祝福'){
  if(action.choice==='level'){
   if(g.mode!=='expert'||!levelUp(p))throw Error('レベルアップできません。');
  }else if(action.choice==='heal')mon.hp=Math.min(mon.maxHp,mon.hp+2);
  else throw Error('回復かレベルアップを選んでください。');
 }else if(q.eventName==='サンダーのペナルティ'){
  if(action.choice!=='weather')throw Error('おてんきチェックをしてください。');
  if(checkWeather(g,['thunderstorm']))damage=mon.level;
 }else{
  const type=q.eventName==='ファイヤーからの試練'?'attack':'dodge';
  const card=p.hand.find(card=>card.type===type&&card.id===action.cardId);
  if(card)trash(g,p,[card.id]);
  else if(action.choice==='take'&&!p.hand.some(card=>card.type===type))damage=2;
  else throw Error('対応するカードを1枚選んでください。');
 }
 g.pending=null;
 if(damage>0){
  mon.hp-=damage;
  log(g,p.name+'はイベントで'+damage+'ダメージを受けました。');
  if(mon.hp<=0){
   beginRescue(g,p,{pokemonIndex:p.activeIndex||0,actorId:null});
   return;
  }
 }
 pumpEffects(g);
}
