// Additional move/ability controls use the same authenticated action endpoint.
function renderEffectControls(){
 const me=game?.me;if(!me)return;const mon=me.team?.[me.activeIndex||0];
 const controls=$('controls'),q=game.pending,ownTurn=game.phase==='playing'&&!q&&game.turnId===me.id;
 const options=(players=game.players.filter(p=>p.alive))=>players.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+'</option>').join('');
 const cards=(ids=null)=>(me.hand||[]).filter(c=>!ids||ids.includes(c.id)).map(c=>'<option value="'+esc(c.id)+'">'+esc(c.name)+' · '+esc(c.weather||'天気なし')+'</option>').join('');
 if(q?.actorId===me.id&&['poisonTouch','poisonDamage'].includes(q.type)){
  controls.innerHTML='<p>どくしゅ：'+(q.type==='poisonTouch'?'特殊状態をどくに変更しますか？':'どくのダメージを2にしますか？')+'</p><button id="poisonUse">使う</button><button id="poisonSkip">使わない</button>';
  $('poisonUse').onclick=()=>action('respond',{choice:'yes'});
  $('poisonSkip').onclick=()=>action('respond',{choice:'no'});
 }
 if(q?.actorId===me.id&&q.type==='neutralizingGas'){
  controls.innerHTML='<p>かがくへんかガス：手札を1枚捨てて、この番だけ対象の特性を無効にします。</p><select id="gasCard">'+cards()+'</select><select id="gasTarget">'+options()+'</select><button id="gasUse">使う</button><button id="gasSkip">使わない</button>';
  $('gasUse').onclick=()=>action('respond',{choice:'yes',cardId:$('gasCard').value,targetId:$('gasTarget').value});
  $('gasSkip').onclick=()=>action('respond',{choice:'no'});
 }
 if(q?.type==='attackResponse'&&q.targetId===me.id&&q.pressure&&!q.secondHit){
  const field=document.createElement('div');
  field.innerHTML='<label>プレッシャーで捨てる手札<select id="pressureDiscard">'+cards()+'</select></label><button id="pressureUse">プレッシャーを使う</button>';
  controls.append(field);
  $('pressureUse').onclick=()=>action('respond',{choice:'pressure',cardId:$('pressureDiscard').value});
 }
 if(q?.actorId===me.id&&q.type==='pressurePayment'){
  controls.innerHTML='<p>プレッシャー：手札を追加で1枚捨てると、この対象への攻撃を続けられます。</p><select id="pressureCost">'+cards()+'</select><button id="pressurePay" '+(me.hand.length?'':'disabled')+'>捨てる</button><button id="pressureCancel">攻撃を無効にする</button>';
  $('pressurePay').onclick=()=>action('respond',{choice:'yes',cardId:$('pressureCost').value});
  $('pressureCancel').onclick=()=>action('respond',{choice:'no'});
 }
 if(q?.actorId===me.id&&['vitalSpirit','cursedBody'].includes(q.type)){
  const vital=q.type==='vitalSpirit';
  if(q.cards){
   controls.innerHTML='<p>やるき：引くカードを'+q.drawCount+'枚選んでください。</p>'+q.cards.map(card=>'<label><input type="checkbox" data-vital-card value="'+esc(card.id)+'">'+esc(card.name)+' · '+esc(card.weather||'天気なし')+'</label>').join('')+'<button id="vitalPick">引く</button>';
   $('vitalPick').onclick=()=>action('respond',{cardIds:Array.from(controls.querySelectorAll('[data-vital-card]:checked'),input=>input.value)});
  }else{
   controls.innerHTML='<p>'+(vital?'やるき：山札の上3枚を確認しますか？':'のろわれボディ：相手の手札をウラのまま1枚引きますか？')+'</p><button id="abilityYes">使う</button><button id="abilityNo">使わない</button>';
   $('abilityYes').onclick=()=>action('respond',{choice:'yes'});
   $('abilityNo').onclick=()=>action('respond',{choice:'no'});
  }
 }
 if(q?.actorId===me.id&&q.type==='futureSight'){
  controls.innerHTML='<p>みらいよち：山札の上から順にカードを指定してください。</p>'+q.cards.map((_,index)=>'<label>'+String(index+1)+'枚目<select data-future-rank>'+q.cards.map((card,position)=>'<option value="'+esc(card.id)+'" '+(position===index?'selected':'')+'>'+esc(card.name)+' · '+esc(card.weather||'天気なし')+'</option>').join('')+'</select></label>').join('')+'<button id="futureConfirm">山札に戻す</button>';
  $('futureConfirm').onclick=()=>action('respond',{cardIds:Array.from(controls.querySelectorAll('[data-future-rank]'),select=>select.value)});
 }
 if(q?.actorId===me.id&&q.type==='battleArmor'){
  controls.innerHTML='<p>カブトアーマー：手札を1枚捨ててディフェンダーを置きますか？</p><select id="armorCard">'+cards()+'</select><button id="armorUse">使う</button><button id="armorSkip">使わない</button>';
  $('armorUse').onclick=()=>action('respond',{choice:'yes',cardId:$('armorCard').value});
  $('armorSkip').onclick=()=>action('respond',{choice:'no'});
 }
 if(q?.actorId===me.id&&['download','competitive'].includes(q.type)){
  const download=q.type==='download';
  controls.innerHTML=download
   ?'<p>ダウンロード：手札を引く相手を2人まで選びます。</p><select id="downloadTargets" multiple>'+options(game.players.filter(p=>p.alive&&p.id!==me.id&&p.handCount>0))+'</select>'
   :'<p>まけんき：山札から2枚引きますか？</p>';
  for(const choice of ['yes','no']){
   const button=document.createElement('button');
   button.textContent=choice==='yes'?'特性を使う':download?'山札から引く':'使わない';
   button.onclick=()=>action('respond',{choice,targetIds:Array.from($('downloadTargets')?.selectedOptions||[],option=>option.value)});
   controls.append(button);
  }
 }
 if(q?.actorId===me.id&&['drawChoice','cycle','gift'].includes(q.type)){
  controls.innerHTML=q.type==='drawChoice'?'<p>「はっこう」で、追加で1枚引きますか？</p><button data-effect-choice="yes">3枚引く</button><button data-effect-choice="no">通常の2枚</button>':q.type==='cycle'?'<p>「とげキャノン」：手札1枚を捨てて、1枚引きますか？</p><select id="effectCard">'+cards()+'</select><button data-effect-choice="yes">交換する</button><button data-effect-choice="no">交換しない</button>':'<p>「ネコにこばん」：引いたカードを他のトレーナーへ渡してください。</p><select id="effectCard">'+cards(q.cardIds)+'</select><select id="effectTarget">'+options(game.players.filter(p=>p.alive&&p.id!==me.id&&(!q.targetIds||q.targetIds.includes(p.id))))+'</select><button data-effect-choice="give">渡す</button>';
  controls.querySelectorAll('[data-effect-choice]').forEach(b=>b.onclick=()=>action('respond',{choice:b.dataset.effectChoice,cardId:$('effectCard')?.value,targetId:$('effectTarget')?.value}));
 }
 if(q?.type==='attackResponse'&&q.targetId===me.id&&mon?.ability==='ふゆう'&&mon.abilityStatus==='implemented'){
  const extras=me.hand.filter(c=>c.type!=='dodge'&&['rain','thunderstorm'].includes(c.weather));
  for(const c of extras){const b=document.createElement('button');b.textContent='ふゆう：'+c.name+'で回避';b.onclick=()=>action('respond',{choice:'dodge',cardId:c.id});controls.append(b);}
 }
 if(q?.type==='printedEvent'&&q.actorId===me.id){
  const title=document.createElement('p');
  title.textContent=q.eventName;
  controls.replaceChildren(title);
  const button=(label,extra)=>{
   const el=document.createElement('button');
   el.textContent=label;
   el.onclick=()=>action('respond',extra);
   controls.append(el);
  };
  if(q.eventName==='きのみ大豊作'){
   for(const card of q.pool)button(card.name,{cardId:card.id});
   if(!q.pool.length)button('次へ',{});
  }else if(q.eventName==='ミュウの祝福'){
   button('HPを2回復',{choice:'heal'});
   if(game.mode==='expert'&&mon?.canLevelUp)button('レベルアップ',{choice:'level'});
  }else if(q.eventName==='サンダーのペナルティ')button('おてんきチェック',{choice:'weather'});
  else{
   const type=q.eventName==='ファイヤーからの試練'?'attack':'dodge';
   const usable=me.hand.filter(card=>card.type===type);
   for(const card of usable)button(card.name+'を出す',{cardId:card.id});
   if(!usable.length)button('2ダメージを受ける',{choice:'take'});
  }
 }
 if(q?.type==='attackResponse'&&q.targetId===me.id&&mon?.ability==='すながくれ'&&!mon.heldEffect&&q.effect?.id!=='dragon-adjacent'){
  const button=document.createElement('button');
  button.textContent='すながくれで回避を試みる';
  button.onclick=()=>action('respond',{choice:'sandVeil'});
  controls.append(button);
 }
 if(q?.type==='drought'&&q.actorId===me.id){
  const weather={sunny:'晴れ','partly-cloudy':'晴れのち曇り',rain:'雨',thunderstorm:'雷雨'};
  controls.innerHTML='<p>おてんきチェックは「'+esc(weather[q.weather]||'天気未登録')+'」です。ひでりで入れ替えますか？</p><select id="droughtCard">'+q.cards.map(card=>'<option value="'+esc(card.id)+'">'+esc(card.name)+' · '+esc(weather[card.weather])+'</option>').join('')+'</select><button id="droughtUse">入れ替える</button><button id="droughtSkip">使わない</button>';
  $('droughtUse').onclick=()=>action('respond',{choice:'yes',cardId:$('droughtCard').value});
  $('droughtSkip').onclick=()=>action('respond',{choice:'no'});
 }
 if(!ownTurn||!mon)return;
 const panel=document.createElement('section');panel.className='effect-controls';
 const note=mon.abilityStatus==='pending'?'<p class="effect-pending">特性「'+esc(mon.ability)+'」は自動処理未対応です。</p>':'<p><b>'+esc(mon.ability||'特性')+'</b>：'+esc(mon.abilityText||'')+'</p>';
 panel.innerHTML=note+'<label>技の対象<select id="effectTarget"><option value="">選択してください</option>'+options()+'</select></label><label>取り除くマーカー<select id="effectMarker"><option value="">自動（1種類の場合）</option><option value="plusPower">プラスパワー</option><option value="defender">ディフェンダー</option><option value="speeder">スピーダー</option></select></label><label><input id="effectRecoil" type="checkbox">すてみタックル：ダメージ+1／自分のHP−1</label>'+mon.attacks.map((m,i)=>'<div class="effect-move"><b>'+esc(m.name)+'</b> '+esc(m.text||'')+(m.effectStatus!=='implemented'?'<small class="effect-pending">一部または追加効果は未対応</small>':'')+'<button data-effect-move="'+i+'">選択中の手札でこの技を使う</button></div>').join('');
 if(mon.attacks.some(m=>m.effect?.id==='heal-many'))panel.innerHTML+='<fieldset><legend>いのちのしずくの対象</legend>'+game.players.filter(p=>p.alive).map(p=>'<label><input type="checkbox" name="effectHeal" value="'+esc(p.id)+'">'+esc(p.name)+'</label>').join('')+'</fieldset>';
 if(mon.ability==='アナライズ'&&mon.abilityStatus==='implemented')panel.innerHTML+='<fieldset><legend>アナライズ（残りHP以下の枚数）</legend>'+me.hand.map(c=>'<label><input type="checkbox" name="effectDiscard" value="'+esc(c.id)+'">'+esc(c.name)+'</label>').join('')+'<button id="useAnalyze">選んだ手札を交換</button></fieldset>';
 if(mon.ability==='すてみ'&&mon.abilityStatus==='implemented')panel.innerHTML+='<label>減らすHP<input id="effectAmount" type="number" min="1" max="'+mon.hp+'" value="1"></label><button id="useReckless">すてみを使う</button>';
 if(mon.ability==='しゅうかく'&&mon.abilityStatus==='implemented')panel.innerHTML+='<label><input id="effectHarvest" type="checkbox" checked>番の終了時に「しゅうかく」で1枚引く</label>';
 if(mon.heldEffect==='life-orb'&&mon.ability!=='くいしんぼう'){
  const label=document.createElement('label');
  label.innerHTML='<input id="useLifeOrb" type="checkbox">命中時にいのちのたまを使う';
  panel.append(label);
 }
 if(mon.ability==='せいぎのこころ'&&me.hand.length){
  const field=document.createElement('fieldset');
  field.innerHTML='<legend>せいぎのこころ</legend>'+me.hand.map(card=>'<label>'+esc(card.name)+'<select data-gift-card="'+esc(card.id)+'"><option value="">渡さない</option>'+options(game.players.filter(p=>p.alive&&p.id!==me.id))+'</select></label>').join('')+'<label>手札がなくなる場合のわざ<select id="justifiedMove">'+mon.attacks.map((move,index)=>move.trigger!=='weather'?'<option value="'+index+'">'+esc(move.name)+'</option>':'').join('')+'</select></label><button id="justifiedUse">選んだ相手に手札を渡す</button>';
  panel.append(field);
  field.querySelector('button').onclick=()=>action('justified',{gifts:Array.from(field.querySelectorAll('[data-gift-card]'),select=>({cardId:select.dataset.giftCard,targetId:select.value})).filter(gift=>gift.targetId),moveIndex:Number($('justifiedMove').value),targetId:$('effectTarget').value,secondTargetId:$('secondMoveTarget')?.value,marker:$('effectMarker').value,recoil:!!$('effectRecoil')?.checked,lifeOrb:!!$('useLifeOrb')?.checked});
 }
 controls.append(panel);
 if(['ようりょくそ','すいすい'].includes(mon.ability)&&mon.abilityStatus==='implemented'){
  mon.attacks.forEach((move,moveIndex)=>{
   if(move.trigger==='weather')return;
   const button=document.createElement('button');
   button.textContent=mon.ability+'で「'+move.name+'」を試みる';
   button.onclick=()=>action('weather-attack',{moveIndex,targetId:$('effectTarget').value,secondTargetId:$('secondMoveTarget')?.value,marker:$('effectMarker').value,costCardId:$('moveCost')?.value,recoil:!!$('effectRecoil')?.checked,lifeOrb:!!$('useLifeOrb')?.checked});
   panel.append(button);
  });
 }
 if(mon.attacks.some(move=>move.maxTargets===2)){
  const label=document.createElement('label');
  label.innerHTML='<span>2匹目（任意）</span><select id="secondMoveTarget"><option value="">選ばない</option>'+options(game.players.filter(p=>p.alive&&p.id!==me.id))+'</select>';
  panel.append(label);
 }
 if(mon.attacks.some(move=>['paid-bonus','paid-second-hit'].includes(move.effect?.id))){
  const label=document.createElement('label');
  label.innerHTML='<span>追加コスト（任意）</span><select id="moveCost"><option value="">払わない</option>'+cards()+'</select>';
  panel.append(label);
 }
 panel.querySelectorAll('[data-effect-move]').forEach(b=>b.onclick=()=>{const moveIndex=Number(b.dataset.effectMove),m=mon.attacks[moveIndex];if(!chosen){toast('先に手札のカードを選んでください');return;}if(m.trigger!=='weather'&&me.hand.find(c=>c.id===chosen)?.type!=='attack'){toast('「くらえ！」を選んでください');return;}action(m.trigger==='weather'?'move':'play',{cardId:chosen,lifeOrb:!!$('useLifeOrb')?.checked,eventChoice:$('eventChoice')?.value,moveIndex,secondTargetId:m.maxTargets===2?$('secondMoveTarget')?.value:undefined,costCardId:$('moveCost')?.value,targetId:$('effectTarget').value,targetIds:[...document.querySelectorAll('[name="effectHeal"]:checked')].map(c=>c.value),marker:$('effectMarker').value,recoil:$('effectRecoil').checked});});
 if($('useAnalyze'))$('useAnalyze').onclick=()=>action('ability',{cardIds:[...document.querySelectorAll('[name="effectDiscard"]:checked')].map(c=>c.value)});
 if($('useReckless'))$('useReckless').onclick=()=>action('ability',{amount:Number($('effectAmount').value)});
 if(mon.ability==='あめうけざら'&&mon.abilityStatus==='implemented'){
  const label=document.createElement('label');
  label.innerHTML='<input id="rainDish" type="checkbox">番の終了時に「あめうけざら」を使う';
  panel.append(label);
 }
 if(mon.heldEffect==='light-ball'&&mon.ability!=='くいしんぼう'){
  const button=document.createElement('button');
  button.textContent='選んだ対象にでんきだまを使う';
  button.onclick=()=>action('held-effect',{targetId:$('effectTarget').value});
  panel.append(button);
 }
 const end=(levelUp=false)=>action('end',{levelUp,rainDish:!!$('rainDish')?.checked,harvest:!!$('effectHarvest')?.checked});
 if($('end'))$('end').onclick=()=>end();if($('levelEnd'))$('levelEnd').onclick=()=>end(true);
 if($('discard'))$('discard').onclick=()=>action('discard',{cardIds:[...discardSet],rainDish:!!$('rainDish')?.checked,harvest:!!$('effectHarvest')?.checked});
 if($('play'))$('play').onclick=()=>action('play',{cardId:chosen,lifeOrb:!!$('useLifeOrb')?.checked,eventChoice:$('eventChoice')?.value,toolChoice:$('toolChoice')?.value,pokemonIndex:$('reviveIndex')?.value,targetId:$('target')?.value||'',marker:$('effectMarker')?.value,recoil:!!$('effectRecoil')?.checked});
}
