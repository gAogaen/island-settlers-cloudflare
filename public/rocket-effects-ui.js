// Additional move/ability controls use the same authenticated action endpoint.
function renderEffectControls(){
 const me=game?.me;if(!me)return;const mon=me.team?.[me.activeIndex||0];
 const controls=$('controls'),q=game.pending,ownTurn=game.phase==='playing'&&!q&&game.turnId===me.id;
 const options=(players=game.players.filter(p=>p.alive))=>players.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+'</option>').join('');
 const cards=(ids=null)=>(me.hand||[]).filter(c=>!ids||ids.includes(c.id)).map(c=>'<option value="'+esc(c.id)+'">'+esc(c.name)+' · '+esc(c.weather||'天気なし')+'</option>').join('');
 if(q?.actorId===me.id&&['drawChoice','cycle','gift'].includes(q.type)){
  controls.innerHTML=q.type==='drawChoice'?'<p>「はっこう」で、追加で1枚引きますか？</p><button data-effect-choice="yes">3枚引く</button><button data-effect-choice="no">通常の2枚</button>':q.type==='cycle'?'<p>「とげキャノン」：手札1枚を捨てて、1枚引きますか？</p><select id="effectCard">'+cards()+'</select><button data-effect-choice="yes">交換する</button><button data-effect-choice="no">交換しない</button>':'<p>「ネコにこばん」：引いたカードを他のトレーナーへ渡してください。</p><select id="effectCard">'+cards(q.cardIds)+'</select><select id="effectTarget">'+options(game.players.filter(p=>p.alive&&p.id!==me.id))+'</select><button data-effect-choice="give">渡す</button>';
  controls.querySelectorAll('[data-effect-choice]').forEach(b=>b.onclick=()=>action('respond',{choice:b.dataset.effectChoice,cardId:$('effectCard')?.value,targetId:$('effectTarget')?.value}));
 }
 if(q?.type==='attackResponse'&&q.targetId===me.id&&mon?.ability==='ふゆう'&&mon.abilityStatus==='implemented'){
  const extras=me.hand.filter(c=>c.type!=='dodge'&&['rain','thunderstorm'].includes(c.weather));
  for(const c of extras){const b=document.createElement('button');b.textContent='ふゆう：'+c.name+'で回避';b.onclick=()=>action('respond',{choice:'dodge',cardId:c.id});controls.append(b);}
 }
 if(!ownTurn||!mon)return;
 const panel=document.createElement('section');panel.className='effect-controls';
 const note=mon.abilityStatus==='pending'?'<p class="effect-pending">特性「'+esc(mon.ability)+'」は自動処理未対応です。</p>':'<p><b>'+esc(mon.ability||'特性')+'</b>：'+esc(mon.abilityText||'')+'</p>';
 panel.innerHTML=note+'<label>技の対象<select id="effectTarget"><option value="">選択してください</option>'+options()+'</select></label><label>取り除くマーカー<select id="effectMarker"><option value="">自動（1種類の場合）</option><option value="plusPower">プラスパワー</option><option value="defender">ディフェンダー</option><option value="speeder">スピーダー</option></select></label><label><input id="effectRecoil" type="checkbox">すてみタックル：ダメージ+1／自分のHP−1</label>'+mon.attacks.map((m,i)=>'<div class="effect-move"><b>'+esc(m.name)+'</b> '+esc(m.text||'')+(m.effectStatus!=='implemented'?'<small class="effect-pending">一部または追加効果は未対応</small>':'')+'<button data-effect-move="'+i+'">選択中の手札でこの技を使う</button></div>').join('');
 if(mon.attacks.some(m=>m.effect?.id==='heal-many'))panel.innerHTML+='<fieldset><legend>いのちのしずくの対象</legend>'+game.players.filter(p=>p.alive).map(p=>'<label><input type="checkbox" name="effectHeal" value="'+esc(p.id)+'">'+esc(p.name)+'</label>').join('')+'</fieldset>';
 if(mon.ability==='アナライズ'&&mon.abilityStatus==='implemented')panel.innerHTML+='<fieldset><legend>アナライズ（残りHP以下の枚数）</legend>'+me.hand.map(c=>'<label><input type="checkbox" name="effectDiscard" value="'+esc(c.id)+'">'+esc(c.name)+'</label>').join('')+'<button id="useAnalyze">選んだ手札を交換</button></fieldset>';
 if(mon.ability==='すてみ'&&mon.abilityStatus==='implemented')panel.innerHTML+='<label>減らすHP<input id="effectAmount" type="number" min="1" max="'+mon.hp+'" value="1"></label><button id="useReckless">すてみを使う</button>';
 if(mon.ability==='しゅうかく'&&mon.abilityStatus==='implemented')panel.innerHTML+='<label><input id="effectHarvest" type="checkbox" checked>番の終了時に「しゅうかく」で1枚引く</label>';
 controls.append(panel);
 panel.querySelectorAll('[data-effect-move]').forEach(b=>b.onclick=()=>{const moveIndex=Number(b.dataset.effectMove),m=mon.attacks[moveIndex];if(!chosen){toast('先に手札のカードを選んでください');return;}if(m.trigger!=='weather'&&me.hand.find(c=>c.id===chosen)?.type!=='attack'){toast('「くらえ！」を選んでください');return;}action(m.trigger==='weather'?'move':'play',{cardId:chosen,moveIndex,targetId:$('effectTarget').value,targetIds:[...document.querySelectorAll('[name="effectHeal"]:checked')].map(c=>c.value),marker:$('effectMarker').value,recoil:$('effectRecoil').checked});});
 if($('useAnalyze'))$('useAnalyze').onclick=()=>action('ability',{cardIds:[...document.querySelectorAll('[name="effectDiscard"]:checked')].map(c=>c.value)});
 if($('useReckless'))$('useReckless').onclick=()=>action('ability',{amount:Number($('effectAmount').value)});
 const end=(levelUp=false)=>action('end',{levelUp,harvest:!!$('effectHarvest')?.checked});
 if($('end'))$('end').onclick=()=>end();if($('levelEnd'))$('levelEnd').onclick=()=>end(true);
 if($('discard'))$('discard').onclick=()=>action('discard',{cardIds:[...discardSet],harvest:!!$('effectHarvest')?.checked});
 if($('play'))$('play').onclick=()=>action('play',{cardId:chosen,toolChoice:$('toolChoice')?.value,targetId:$('target')?.value||'',marker:$('effectMarker')?.value,recoil:!!$('effectRecoil')?.checked});
}
