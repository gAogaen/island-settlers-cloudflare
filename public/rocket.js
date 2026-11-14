'use strict';
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ROLE={leader:'ジムリーダー',trainer:'ジムトレーナー',challenger:'挑戦者',rocket:'ロケット団員'};
const MARKERS={plusPower:'プラスパワー',defender:'ディフェンダー',speeder:'スピーダー'};
function boardMarkers(player,expert){
 const active=Object.entries(MARKERS).filter(([key])=>player.markers?.[key]&&(key!=='speeder'||expert));
 if(!active.length)return '';
 const disabled=player.status==='まひ';
 return '<div class="board-markers" aria-label="強化マーカー">'+active.map(([key,label])=>'<span class="board-marker '+key+(disabled?' suppressed':'')+'">'+label+(disabled?'（無効）':'')+'</span>').join('')+'</div>';
}
const CARD={attack:['くらえ！','相手に攻撃する。'],dodge:['よけて！','攻撃を回避する。'],potion:['キズぐすり','選んだトレーナーのHPを回復。'],item:['どうぐ','カードを引く。'],scout:['さぐる','選んだ相手の役割を自分だけ確認。'],boost:['きあい','自分のHPを回復。']};
const cardDefinition=c=>game?.catalog?.playCards?.find(x=>x.id===c.cardId)||game?.catalog?.playCards?.find(x=>x.name===c.name&&(!c.weather||x.weather===c.weather))||game?.catalog?.playCards?.find(x=>x.action===c.type)||game?.catalog?.cardImages?.find(x=>x.id===c.cardId);
const cardText=c=>cardDefinition(c)?.text||CARD[c.type]?.[1]||'効果情報未登録';
const safeImage=s=>typeof s==='string'&&(/^\/assets\//.test(s)||/^https:\/\//.test(s))?s:'';
const handImage=c=>safeImage(c.image)||safeImage(cardDefinition(c)?.image)||'/assets/rocket/cards/hand-back.svg';
const cardSymbol=c=>({attack:'⚡',dodge:'↗',potion:'✚',item:'◇',scout:'⌕',boost:'✦'})[c.type]||'◆';
let game,code,token,watch=false,chosen=null,setupSelected=[],discarding=false,discardSet=new Set(),interval,busy=false;
function pokemonChoiceMarkup(x,i,expert,selected){const cardImage=safeImage(x.cardImage)||registeredPokemonImage(x.name,x.level),art=safeImage(x.image)||'/assets/rocket/pokemon-token.svg',level=x.level||(expert?1:3),hpBasic=x.greenHp==null?'未登録':x.greenHp,hpExpert=x.redHp==null?'未登録':x.redHp,attacks=(x.attacks||[]).map(a=>'<div class="choice-move"><b>'+esc(a.name||'技')+(a.damage!=null?' · '+esc(a.damage)+'ダメージ':'')+'</b><small>'+esc(a.text||a.effectText||'効果情報未登録')+'</small></div>').join('')||'<small>技情報未登録</small>',ability=x.ability?'<b>'+esc(x.ability)+'</b><small>'+esc(x.abilityText||'効果情報未登録')+'</small>':'<small>特性情報未登録</small>',provisionalNote=registeredPokemonImage(x.name,x.level)&&!x.cardImage?'<small class="choice-provisional">登録済みの参考カード画像です。画像内のレベルを確認してください。</small>':x.cardImage?'<small class="choice-provisional">表示中：Lv.'+esc(level)+'カード'+(x.levels?.length?'':'。玄人ルールの成長データは未登録です')+'</small>':x.provisional?'<small class="choice-provisional">カード情報を確認中です</small>':'';return '<div class="pokemon-option-wrap"><button class="pokemon-choice '+(selected?'selected ':'')+(cardImage?'has-card-scan':'')+'" data-pokemon="'+i+'"><img class="pokemon-token '+(cardImage?'pokemon-card-scan':'')+'" src="'+esc(cardImage||art)+'" alt="'+esc(x.name)+'のカード画像" onerror="this.onerror=null;this.src=\'/assets/rocket/pokemon-token.svg\'"><span class="choice-copy"><strong>'+esc(x.name)+' <small>Lv.'+esc(level)+'</small></strong><span class="choice-kind">'+esc(x.cardType||'型未登録')+' · '+esc(x.type||'タイプ未登録')+'タイプ</span><span class="choice-hp"><span class="'+(!expert?'current':'')+'">基本・緑♥ <b>'+esc(hpBasic)+'</b></span><span class="'+(expert?'current':'')+'">玄人・赤♥ <b>'+esc(hpExpert)+'</b></span></span><span class="choice-section"><b>特性</b>'+ability+'</span><span class="choice-section"><b>技</b>'+attacks+'</span>'+provisionalNote+'</span></button>'+(cardImage?'<button class="card-preview-trigger" type="button" data-card-preview="'+esc(cardImage)+'" data-card-name="'+esc(x.name)+'">カードを拡大して見る</button>':'')+'</div>'}
function registeredPokemonImage(name,level){const cards=(game?.catalog?.cardImages||[]).filter(c=>c.category==='pokemon'&&c.name===name);return safeImage((cards.find(c=>c.level===level)||cards[0])?.image)}
function boardHeldItem(player){
 if(!player.item)return '';
 const image=safeImage(game.catalog?.cardImages?.find(card=>card.id===player.itemCardId)?.image)
  ||safeImage(game.catalog?.cardImages?.find(card=>card.category==='play'&&card.name===player.item)?.image);
 const label='もちもの：'+player.item;
 return image
  ?'<button type="button" class="board-held-item" data-board-preview="'+esc(image)+'" data-title="'+esc(label)+'">'+esc(label)+'</button>'
  :'<small class="board-held-item">'+esc(label)+'</small>';
}
function boardCards(p,definition,scan){
 const roleImage=p.role?safeImage(game.catalog?.roleCards?.find(r=>r.role===p.role)?.image):'';
 const role=roleImage?'<button class="board-card" data-board-preview="'+esc(roleImage)+'" data-title="'+esc(ROLE[p.role])+'"><img src="'+esc(roleImage)+'" alt="'+esc(ROLE[p.role])+'の役割カード"></button>':'';
 const art=safeImage(definition?.image);
 const reference=(game.catalog?.cardImages||[]).find(c=>c.image===scan&&c.name===p.pokemon);const referenceNote=reference&&reference.level!==p.level?'<small class="scan-reference">画像：Lv.'+esc(reference.level)+'参考</small>':'';
 const pokemon=scan?'<button class="board-card" data-board-preview="'+esc(scan)+'" data-title="'+esc(p.pokemon)+'"><img src="'+esc(scan)+'" alt="'+esc(p.pokemon)+'のカード"></button>':'<div class="board-card pokemon-placeholder">'+(art?'<img src="'+esc(art)+'" alt="'+esc(p.pokemon)+'">':'<span>？</span>')+'<b>'+esc(p.pokemon||'相棒未選択')+'</b><small>'+(p.pokemon?'カード画像未登録':'選択待ち')+'</small></div>';
 return '<div class="board-cards">'+role+pokemon+'</div>'+referenceNote;
}
function toast(s){$('toast').textContent=s;$('toast').classList.add('show');setTimeout(()=>$('toast').classList.remove('show'),2800)}
async function api(path,body){const r=await fetch('/api/rocket'+path,{method:body?'POST':'GET',headers:{'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const d=await r.json();if(!r.ok)throw Error(d.error||'通信エラー');return d}
function enter(d,t,s=false){game=d.game;code=game.code;token=t;watch=s;chosen=null;setupSelected=[];if(t)localStorage.setItem('rocket-token-'+code,t);localStorage.setItem('rocket-last-room',code);$('entry').hidden=true;$('room').hidden=false;history.replaceState({},'','/rocket.html?room='+code+(s?'&spectate=1':''));clearInterval(interval);interval=setInterval(refresh,2200);render();if(!watch&&!localStorage.getItem('rocket-rules-seen'))$('rulesDialog').showModal()}
async function refresh(){if(!code||busy)return;try{const d=await api('/'+code+'?'+(watch?'spectate=1':'token='+encodeURIComponent(token)));if(d.game.revision!==game.revision){game=d.game;chosen=null;setupSelected=[];render()}}catch{$('status').textContent='再接続中…'}}
async function action(type,extra={}){
 if (!$('playSteps').hidden && (type === 'ability' || type === 'move')) renderPlaySteps(type === 'ability' ? '特性' : 'わざ', true);if(busy||watch)return;busy=true;try{const d=await api('/'+code+'/action',{token,type,revision:game.revision,...extra});game=d.game;chosen=null;discardSet.clear();discarding=false;setupSelected=[];render()}catch(e){toast(e.message)}finally{busy=false}}
const turnSteps = ['準備','ドロー','プレイ','トラッシュ','エンド'];
const playSteps = ['イベント','もちもの','どうぐ','わざ','特性'];
function currentPlayAction() {
 const pending = game.pending?.type;
 if (['attackResponse','rescue','cycle','gift','futureSight'].includes(pending)) return 'わざ';
 const card = game.me?.hand.find(card => card.id === chosen);
 if (!card) return null;
 const kind = card.kind || cardDefinition(card)?.kind;
 if (kind === 'event') return 'イベント';
 if (kind === 'held' || kind === 'equipment') return 'もちもの';
 if (card.type === 'attack' || card.type === 'dodge') return 'わざ';
 if (kind === 'tool') return 'どうぐ';
 return null;
}
function renderPlaySteps(active, visible) {
 const list = $('playSteps');
 list.hidden = !visible;
 if (!visible) return;
 list.replaceChildren(...playSteps.map(name => {
   const step = document.createElement('li');
   step.textContent = name;
   if (name === active) step.setAttribute('aria-current','step');
   return step;
 }));
}
function renderTurnSteps() {
 const list = $('turnSteps');
 list.hidden = game.phase !== 'playing';
 if (list.hidden) { renderPlaySteps(null, false); return; }
 const current = ['drawChoice','download','vitalSpirit'].includes(game.pending?.type) ? 1
   : discarding && !game.pending && game.turnId === game.me?.id ? 3 : 2;
 renderPlaySteps(currentPlayAction(), current === 2);
 list.replaceChildren(...turnSteps.map((name, index) => {
   const step = document.createElement('li');
   step.textContent = name;
   if (index === current) step.setAttribute('aria-current','step');
   return step;
 }));
}
function decisionOwnerId(pending){
 return pending?.type==='attackResponse'?pending.targetId:pending?.actorId;
}
function render(){if(!game)return;renderTurnSteps();const me=game.me,turn=game.players.find(p=>p.id===game.turnId),pendingPlayer=game.pending&&game.players.find(p=>p.id===decisionOwnerId(game.pending)),expert=game.mode==='expert';$('roomCode').textContent=game.code;
 $('status').textContent=(expert?'玄人ルール · ':'基本ルール · ')+(game.phase==='lobby'?'参加待ち：'+game.players.length+'人（開始には4人必要）':game.phase==='setup'?'相棒ポケモンを選んでいます':game.phase==='finished'?'ゲーム終了：'+game.winner:game.pending?'対応待ち：'+(pendingPlayer?.name||''):turn?.id===me?.id?'あなたの番です':'手番：'+(turn?.name||''));
 const tableCards=$('tableCards');
 if(tableCards){
  const cards=game.tableCards||[];
  tableCards.hidden=!cards.length||(!game.pending&&Date.now()>=game.tableCardsUntil);
  if(!tableCards.hidden)tableCards.innerHTML='<h2>使用されたカード</h2><div class="hand">'+cards.map((card,index)=>'<button class="table-card-preview" type="button" data-table-card="'+index+'" aria-label="'+esc(card.name)+'を拡大"><img src="'+esc(handImage(card))+'" alt=""><span>'+esc(card.playerName)+' · '+esc(card.move||card.name)+(card.targets?.length?' → '+esc(card.targets.join('、')):'')+'</span></button>').join('')+'</div>';
 }
 $('arenaInfo').textContent=game.phase==='lobby'?'トレーナーを待っています':game.phase==='setup'?'相棒を選ぼう':game.phase==='finished'?game.winner+'の勝利':game.pending?(game.pending.type==='rescue'?'救助（キズぐすり）：':game.pending.type==='attackResponse'?'攻撃への対応：':'効果への対応：')+(pendingPlayer?.name||'確認中'):(turn?.name||'')+' の番';$('deckCount').textContent='山札 '+game.deckCount+' 枚';
 const seatPlayers=[...game.players],seatCount=seatPlayers.length,mySeat=seatPlayers.findIndex(p=>p.id===me?.id),bottomSeat=Math.floor(seatCount/2),mobileSeats=matchMedia('(max-width:700px)').matches;if(mySeat>=0){const offset=(mySeat-bottomSeat+seatCount)%seatCount;seatPlayers.push(...seatPlayers.splice(0,offset))}const seatRadiusX=seatCount<=4?38:40,seatRadiusY=mobileSeats?33:40,mobileSix=[[50,17],[98,37],[98,63],[50,83],[2,63],[2,37]];
 $('players').dataset.count=String(seatCount);
 $('players').innerHTML=seatPlayers.map((p,i)=>{const angle=Math.PI/2-(2*Math.PI*bottomSeat/Math.max(seatCount,1))+2*Math.PI*i/Math.max(seatCount,1),mobilePoint=mobileSeats&&seatCount===6?mobileSix[i]:null,x=mobilePoint?.[0]??50+seatRadiusX*Math.cos(angle),y=mobilePoint?.[1]??50+seatRadiusY*Math.sin(angle),pokemonCard=game.catalog?.pokemonCards?.find(c=>c.name===p.pokemon||c.levels?.some(stage=>stage.name===p.pokemon)),pokemonCardImage=registeredPokemonImage(p.pokemon,p.level)||safeImage(p.cardImage)||safeImage(pokemonCard?.levels?.find(stage=>stage.level===p.level)?.cardImage)||safeImage(pokemonCard?.cardImage),pokemonImage=pokemonCardImage||safeImage(pokemonCard?.image);return '<article class="trainer '+(p.id===game.turnId&&game.phase==='playing'?'active ':'')+(p.alive?'':' out')+(x<20?' seat-left':x>80?' seat-right':'')+'" style="--seat-x:'+x.toFixed(2)+'%;--seat-y:'+y.toFixed(2)+'%">'+boardCards(p,pokemonCard,pokemonCardImage)+'<div class="trainer-copy">'+(game.phase==='playing'&&p.id===game.turnId?'<span class="turn-badge">'+(p.id===me?.id?'あなたの番':'行動中')+'</span>':'')+'<b>'+esc(p.name)+(p.id===me?.id?'（あなた）':'')+'</b><small>'+(p.role==='leader'?'ジムリーダー':p.role?ROLE[p.role]:'トレーナー')+(p.alive?'':' · 退場')+'</small><small>'+esc(p.pokemon||'相棒未選択')+(expert&&p.level?' · Lv.'+p.level:'')+'</small>'+(expert&&p.team?.length>1?'<small>チーム '+p.team.filter(m=>!m.fainted).length+'/'+p.team.length+'匹</small>':'')+(p.status?'<strong class="status-marker">'+esc(p.status)+'</strong>':'')+(pendingPlayer?.id===p.id?'<span class="response-badge">'+(game.pending.type==='rescue'?'救助の判断中':'対応中')+'</span>':'')+boardHeldItem(p)+boardMarkers(p,expert)+'<div class="hp" aria-label="HP '+p.hp+' / '+p.maxHp+(p.hpBonus?'（ジムリーダー補正 +'+p.hpBonus+'）':'')+'">'+Array.from({length:p.maxHp||0},(_,n)=>'<i class="'+(n<p.hp?'on':'')+(n>=p.maxHp-(p.hpBonus||0)?' hp-bonus':'')+'"></i>').join('')+'</div><small>手札 '+p.handCount+' 枚</small></div></article>'}).join('');
 $('players').querySelectorAll('[data-board-preview]').forEach(b=>b.onclick=()=>{$('cardPreviewImage').src=b.dataset.boardPreview;$('cardPreviewImage').alt=b.dataset.title;$('cardPreviewTitle').textContent=b.dataset.title;$('cardPreviewDialog').showModal()});
 $('identity').innerHTML=me?(me.role?'<div class="role-card-display"><img src="'+esc(safeImage(game.catalog?.roleCards?.find(r=>r.role===me.role)?.image)||('/assets/rocket/role-'+me.role+'.svg'))+'" alt="'+esc(ROLE[me.role])+'のカード画像"><div><b>あなたの役割：'+esc(ROLE[me.role])+'</b>'+(me.role==='leader'?'<small>役割公開中</small>':'<small>他の人には非公開</small>')+'</div></div>':'<b>開始前</b><small>役割はゲーム開始時に配られます</small>')+(game.notice?'<p class="notice">'+esc(game.notice.name)+'の役割は「'+esc(game.notice.role)+'」です。 <button id="ack">閉じる</button></p>':''):'<small>観戦中。手札と非公開の役割は表示されません。</small>';
 if($('ack'))$('ack').onclick=()=>action('ack');
 const setup=$('setup'),need=expert?2:1;setup.innerHTML=game.phase==='setup'&&me?.options?.length?'<p>'+(expert?'候補4匹から2匹を選んでください。赤いハートの体力を使います。':'候補2匹から1匹を選んでください。緑のハートの体力を使います。')+'</p>'+me.options.map((x,i)=>pokemonChoiceMarkup(x,i,expert,setupSelected.includes(i))).join('')+(expert?'<button id="confirmPokemon" class="primary" '+(setupSelected.length!==need?'disabled':'')+'>この2匹で決定</button>':''):'';
 setup.querySelectorAll('[data-pokemon]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.pokemon);if(expert){setupSelected=setupSelected.includes(i)?setupSelected.filter(x=>x!==i):setupSelected.length<2?[...setupSelected,i]:[...setupSelected.slice(1),i];render()}else action('choose',{index:i})});setup.querySelectorAll('[data-card-preview]').forEach(b=>b.onclick=()=>{const dialog=$('cardPreviewDialog'),image=$('cardPreviewImage');image.src=b.dataset.cardPreview;image.alt=b.dataset.cardName+'のカード全体';$('cardPreviewTitle').textContent=b.dataset.cardName+'のカード';dialog.showModal()});if($('confirmPokemon'))$('confirmPokemon').onclick=()=>action('choose',{indices:setupSelected});
 const myTurn=game.phase==='playing'&&!game.pending&&turn?.id===me?.id,selected=me?.hand.find(c=>c.id===chosen),alive=game.players.filter(p=>p.alive);let controls='';if(game.phase==='lobby'&&me?.id===game.hostId)controls='<button id="start" class="primary" '+(game.players.length<4?'disabled':'')+'>ゲーム開始</button>';else if(game.phase==='lobby')controls='<p>ホストが4人以上で開始するまでお待ちください。</p>';if(myTurn){if(discarding){const n=Math.max(0,(me?.hand.length||0)-4);controls='<p>手札を4枚以下にします。捨てるカードを'+n+'枚選択してください。</p><button id="discard" class="primary" '+(discardSet.size!==n?'disabled':'')+'>選んだカードを捨てる</button><button id="cancelDiscard">戻る</button>'}else if(selected){const targetMode=(['カモネギのいたずら','プリンのライブ','ライバルからの挑戦'].includes(selected.name)?(selected.name==='ライバルからの挑戦'?'opponent':'any-trainer'):null)||cardDefinition(selected)?.targetMode||(['attack','scout','mime-trick'].includes(selected.type)?'opponent':(['potion','marker'].includes(selected.type)||selected.name==='ふしぎなアメ／きんのたま')?'any-trainer':'self'),needsTarget=['opponent','any-trainer','specific-trainer'].includes(targetMode),targets=alive.filter(p=>targetMode==='any-trainer'||targetMode==='specific-trainer'||p.id!==me.id);controls=(selected.name==='カモネギのいたずら'?'<label>使う効果<select id="eventChoice"><option value="hand">手札を捨てる</option><option value="held">もちものを外す</option><option value="plusPower">プラスパワーを外す</option><option value="defender">ディフェンダーを外す</option>'+(expert?'<option value="speeder">スピーダーを外す</option>':'')+'</select></label>':'')+(expert&&selected.name==='キズぐすり／げんきのかけら'?'<label>使う効果<select id="toolChoice"><option value="heal">キズぐすり</option><option value="revive">げんきのかけら</option></select></label><label>ベンチ位置<select id="reviveIndex"><option value="0">1匹目</option><option value="1">2匹目</option></select></label>':selected.name==='キズぐすり／なんでもなおし'?'<label>使う効果<select id="toolChoice"><option value="heal">キズぐすり</option><option value="cure">なんでもなおし</option></select></label>':expert&&selected.type==='marker'?'<label>使う効果<select id="toolChoice"><option value="marker">'+esc(selected.name.split('／')[0])+'</option><option value="speeder">スピーダー</option></select></label>':expert&&selected.name==='ふしぎなアメ／きんのたま'?'<label>使う効果<select id="toolChoice"><option value="draw">きんのたま</option><option value="candy">ふしぎなアメ</option></select></label>':'')+(needsTarget?'<label>対象<select id="target"><option value="">選択してください</option>'+targets.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+(p.id===me.id?'（あなた）':'')+'</option>').join('')+'</select></label>':'')+'<button id="play" class="primary">「'+esc(selected.name)+'」'+(selected.type==='held'&&me.team?.[me.activeIndex||0]?.heldEffect?'に交換する':'を使う')+'</button><button id="clear">選択解除</button>'}else{const active=me.team?.[me.activeIndex||0];controls='<button id="end" class="primary">番を終了する</button>'+(expert&&active?.canLevelUp?'<button id="levelEnd">Lvアップして番を終了</button>':'')+(me?.hand.length>4?'<button id="startDiscard">手札を4枚に整える</button>':'')}}
 if(myTurn&&expert&&me?.team?.length>1){$('team').innerHTML='<b>あなたのポケモン</b>'+me.team.map((m,i)=>'<button class="team-pokemon '+(m.active?'active':'')+'" data-switch="'+i+'" '+(m.active||m.fainted?'disabled':'')+'><strong>'+esc(m.name)+(m.active?' · バトル':' · ベンチ')+'</strong><small>Lv.'+m.level+' · HP '+m.hp+'/'+m.maxHp+(m.fainted?' · ひんし':'')+'</small></button>').join('')}else{$('team').innerHTML=me?.team?.length>1?'<b>あなたのポケモン</b>'+me.team.map(m=>'<div class="team-pokemon '+(m.active?'active':'')+'"><strong>'+esc(m.name)+(m.active?' · バトル':' · ベンチ')+'</strong><small>Lv.'+m.level+' · HP '+m.hp+'/'+m.maxHp+(m.fainted?' · ひんし':'')+'</small></div>').join(''):''}
 if(myTurn&&expert&&me?.team?.length>1)document.querySelectorAll('[data-switch]').forEach(b=>b.onclick=()=>action('switch',{index:Number(b.dataset.switch)}));
 if(game.pending?.type==='attackResponse'&&game.pending.targetId===me?.id){const dodge=me.hand.filter(c=>c.type==='dodge');controls='<p><b>'+esc(game.players.find(p=>p.id===game.pending.actorId)?.name||'相手')+'の攻撃！</b> ダメージ '+game.pending.damage+'</p>'+(dodge.map(c=>'<button data-dodge="'+esc(c.id)+'" class="primary">'+esc(c.name)+'で回避</button>').join('')||'<p>「よけて！」カードがありません。</p>')+'<button id="take">攻撃を受ける</button>'}else if(game.pending?.type==='rescue'&&game.pending.actorId===me?.id){const potions=me.hand.filter(c=>c.type==='potion'||(me.team?.find(m=>m.active)?.ability==='いやしのこころ'&&['sunny','partly-cloudy'].includes(c.weather))),victim=game.players.find(p=>p.id===game.pending.victimId);controls='<p><b>'+esc(victim?.name||'トレーナー')+'がひんし！</b> キズぐすりで退場を防げます。</p>'+(potions.map(c=>'<button data-rescue="'+esc(c.id)+'" class="primary">'+esc(c.name)+'を使う</button>').join('')||'<p>キズぐすりがありません。</p>')+'<button id="passRescue">使わずに見送る</button>'}else if(game.pending&&game.pending.actorId!==me?.id)controls='<p>攻撃への対応を待っています。</p>';
 if(game.phase==='finished'&&me?.id===game.hostId)controls='<button id="rematch" class="primary">もう一度遊ぶ</button><button id="rematchShuffle">席順をシャッフルして再戦</button>';$('controls').innerHTML=controls;
 if($('start'))$('start').onclick=()=>action('start');if($('play'))$('play').onclick=()=>action('play',{cardId:chosen,toolChoice:$('toolChoice')?.value,targetId:$('target')?.value||''});if($('clear'))$('clear').onclick=()=>{chosen=null;render()};if($('end'))$('end').onclick=()=>action('end');if($('levelEnd'))$('levelEnd').onclick=()=>action('end',{levelUp:true});if($('startDiscard'))$('startDiscard').onclick=()=>{discarding=true;discardSet.clear();render()};if($('discard'))$('discard').onclick=()=>action('discard',{cardIds:[...discardSet]});if($('cancelDiscard'))$('cancelDiscard').onclick=()=>{discarding=false;discardSet.clear();render()};if($('take')){
 $('take').onclick=()=>action('respond',{choice:'take'});
 const mon=me?.team?.find(m=>m.active);
 if(['せいでんき','どくのトゲ','ふしぎなうろこ'].includes(mon?.ability)&&mon.abilityStatus==='implemented'&&(mon.ability!=='ふしぎなうろこ'||(mon.status&&game.pending.damage>=2))){
  const button=document.createElement('button');
  button.textContent='攻撃を受けて「'+mon.ability+'」を使う';
  button.onclick=()=>action('respond',{choice:'take',reactiveAbility:true});
  $('controls').append(button);
 }
 }if($('passRescue'))$('passRescue').onclick=()=>action('respond',{choice:'pass'});document.querySelectorAll('[data-rescue]').forEach(b=>b.onclick=()=>action('respond',{choice:'heal',cardId:b.dataset.rescue}));document.querySelectorAll('[data-dodge]').forEach(b=>b.onclick=()=>action('respond',{choice:'dodge',cardId:b.dataset.dodge}));if($('rematchShuffle'))$('rematchShuffle').onclick=()=>action('rematch',{shuffleSeats:true});if($('rematch'))$('rematch').onclick=()=>action('rematch');
 const handMarkup=(me?.hand||[]).map(c=>'<button class="play-card '+(handImage(c)?'has-hand-scan ':'')+esc(c.type)+'" data-card="'+esc(c.id)+'"><small>'+(cardDefinition(c)?.provisional?'仮カード':'プレイカード')+'</small><span class="card-art">'+(handImage(c)?'<img src="'+esc(handImage(c))+'" alt="'+esc(cardDefinition(c)?.imageAlt||c.name)+'" onerror="this.hidden=true">':'<i aria-hidden="true">'+esc(cardSymbol(c))+'</i>')+'</span><b>'+esc(c.name)+'</b><span>'+esc(cardText(c))+'</span></button>').join('')||'<p>'+(watch?'手札は非公開です':'手札はありません')+'</p>';
 const hand = $('hand');
 if (handMarkup !== renderedHand) {
   hand.innerHTML = handMarkup;
   renderedHand = handMarkup;
 }
 hand.querySelectorAll('[data-card]').forEach(button => {
   button.classList.toggle('selected', chosen === button.dataset.card);
   button.classList.toggle('discard-selected', discardSet.has(button.dataset.card));
 });
 $('selection').textContent=discarding?'選択中：'+discardSet.size+'枚':chosen?'選択中：'+(selected?.name||''):'';$('log').innerHTML=game.log.slice().reverse().map(s=>'<p>'+esc(s)+'</p>').join('');$('winner').hidden=game.phase!=='finished';$('winner').textContent=game.reason||'';renderEffectControls();renderDecisionDialog();renderAbilityNotice()}
let noticeRoom=null,seenAbilityNotice=0;
function renderAbilityNotice(){
 const dialog=$('abilityNoticeDialog');
 if(!dialog)return;
 const notices=game?.abilityNotices||[];
 if(!game||noticeRoom!==game.code){
  noticeRoom=game?.code;
  seenAbilityNotice=notices.at(-1)?.id||0;
  if(dialog.open)dialog.close();
  return;
 }
 if(dialog.open||$('decisionDialog')?.open)return;
 const notice=notices.find(entry=>entry.id>seenAbilityNotice);
 if(!notice)return;
 seenAbilityNotice=notice.id;
 $('abilityNoticeTitle').textContent='特性「'+notice.name+'」';
 $('abilityNoticePlayer').textContent=notice.player+'の'+notice.pokemon;
 const image=$('abilityNoticeImage');
 const url=safeImage(notice.image)||registeredPokemonImage(notice.pokemon);
 image.hidden=!url;
 if(url)image.src=url;else image.removeAttribute('src');
 image.alt=notice.pokemon+'のカード';
 dialog.showModal();
}
$('abilityNoticeDialog')?.addEventListener('close',renderAbilityNotice);
function renderDecisionDialog(){
 const dialog=$('decisionDialog');
 if(!dialog)return;
 const pending=game?.pending;
 const owner=decisionOwnerId(pending);
 const controls=$('controls');
 if(game?.me&&owner===game.me.id&&controls.childElementCount){
  const card=pending.ability||pending.eventName||pending.move||game.tableCards?.[0]?.name;
  $('decisionTitle').textContent=card?'あなたの選択 · '+card:'あなたの選択';
  if(controls.parentElement!==$('decisionControls'))$('decisionControls').append(controls);
  if(!dialog.open)dialog.showModal();
 }else{
  if(dialog.open)dialog.close();
  if(controls.parentElement!==$('controlsHome'))$('controlsHome').append(controls);
 }
}
$('decisionDialog')?.addEventListener('cancel',event=>event.preventDefault());
async function join(s=false){try{const c=$('code').value.trim().toUpperCase();if(!/^[A-Z0-9]{6}$/.test(c))throw Error('6文字の部屋コードを入力してください。');if(s){enter(await api('/'+c+'?spectate=1'),null,true);return}const saved=localStorage.getItem('rocket-token-'+c);if(saved){try{enter(await api('/'+c+'?token='+encodeURIComponent(saved)),saved);return}catch{}}const name=$('name').value.trim();if(!name)throw Error('名前を入力してください。');const d=await api('/'+c+'/join',{name});enter(d,d.token)}catch(e){toast(e.message)}}
$('create').onclick=async()=>{try{const name=$('name').value.trim();if(!name)throw Error('名前を入力してください。');localStorage.setItem('island-last-name',name);const d=await api('',{name,mode:$('gameMode').value});enter(d,d.token)}catch(e){toast(e.message)}};$('join').onclick=()=>join();$('watch').onclick=()=>join(true);$('copy').onclick=async()=>{try{await navigator.clipboard.writeText(location.origin+'/rocket.html?room='+code);toast('招待URLをコピーしました')}catch{toast('部屋コード：'+code)}};$('leave').onclick=()=>{clearInterval(interval);game=null;code=null;token=null;renderDecisionDialog();$('room').hidden=true;$('entry').hidden=false;history.replaceState({},'','/rocket.html')};$('rules').onclick=()=>$('rulesDialog').showModal();$('rulesClose').onclick=()=>{$('rulesDialog').close();localStorage.setItem('rocket-rules-seen','1')};$('name').value=localStorage.getItem('island-last-name')||'';const params=new URLSearchParams(location.search),room=params.get('room');if(room){$('code').value=room.toUpperCase();if(params.get('spectate')==='1')join(true);else if(localStorage.getItem('rocket-token-'+room.toUpperCase()))join()}

// Dismiss only clicks that both start and finish outside the dialog bounds.
document.querySelectorAll('dialog').forEach(dialog=>{
 const outside=e=>{const r=dialog.getBoundingClientRect();return e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom};
 let backdropPress=false;
 dialog.addEventListener('pointerdown',e=>{backdropPress=e.target===dialog&&outside(e)});
 dialog.addEventListener('pointercancel',()=>{backdropPress=false});
 dialog.addEventListener('click',e=>{if(backdropPress&&e.target===dialog&&outside(e))dialog.close();backdropPress=false});
 dialog.addEventListener('close',()=>{backdropPress=false});
});
$('rulesDialog').addEventListener('close',()=>localStorage.setItem('rocket-rules-seen','1'));

// Keep hand buttons mounted across selection and polling so a double click
// reaches the same card button after the first click.
let renderedHand;
const hand = $('hand');
function clickedHandCard(event) {
 const button = event.target.closest('button[data-card]');
 return button && game?.me?.hand?.find(card => card.id === button.dataset.card);
}
hand.addEventListener('click', event => {
 const card = clickedHandCard(event);
 if (!card) return;
 if (discarding) {
   if (discardSet.has(card.id)) discardSet.delete(card.id);
   else discardSet.add(card.id);
 } else {
   chosen = card.id;
 }
 render();
});
$('tableCards')?.addEventListener('click',event=>{
 const button=event.target.closest('[data-table-card]');
 const card=button&&game?.tableCards?.[Number(button.dataset.tableCard)];
 if(card)showPlayCardPreview(card);
});
function previewHandCard(event) {
 const card = clickedHandCard(event);
 if (!card) return;
 event.preventDefault();
 showPlayCardPreview(card);
}
function showPlayCardPreview(card){
 const dialog = $('cardPreviewDialog');
 const image = $('cardPreviewImage');
 image.src = handImage(card);
 image.alt = card.name + 'のカード画像';
 $('cardPreviewTitle').textContent = card.name + (safeImage(cardDefinition(card)?.image) ? '' : '（カード裏面）');
 if (!dialog.open) dialog.showModal();
}
hand.addEventListener('contextmenu', previewHandCard);
hand.addEventListener('dblclick', previewHandCard);
