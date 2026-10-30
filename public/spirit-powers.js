function programModal(card){
 const me=current(),targets=game.lands.filter(l=>(game.legalTargets?.[card.id]||[]).includes(l.id)),name=l=>`${game.players.find(p=>p.id===l.board)?.name||'島'} · ${l.terrain} ${l.index+1}`,unitName={explorers:'遠征隊',towns:'町',cities:'都市',dahan:'ダハン'},support=card.targetSpirit;
 const spirits=game.players.filter(p=>!card.targetAnother||game.players.length===1||p.id!==me.id);
 modal(card.name,card.label,(support?selection('対象の精霊',spirits.map(p=>[p.id,`${p.name} · ${spirit(p.spirit)?.[1]||''}`]),'programSpirit'):selection('対象の土地',targets.map(l=>[l.id,name(l)]),'programLand'))+(card.supportLand?'<div id="programSupportLandWrap"></div>':'')+(card.modes?selection('使う効果',card.modes.map(m=>[m.id,m.name]),'programMode'):'')+'<div id="programFields"></div>',`<button data-close="actionDialog">戻る</button><button class="primary" id="confirmProgram">能力を解決</button>`,'POWER RESOLUTION');
 const targetSpirit=()=>support?game.players.find(p=>p.id===$('programSpirit')?.value):me;
 const selectedLand=()=>game.lands.find(l=>l.id===($('programSupportLand')?.value||$('programLand')?.value));
 const config=()=>({...card,...(card.modes?.find(m=>m.id===$('programMode')?.value)||{})});
 const movement=s=>s.move||({harbingers:{direction:'push',types:['dahan'],limit:2},washAway:{direction:'push',types:['explorers','towns'],limit:3},bounty:{direction:'gather',types:['dahan'],limit:2},fruitful:{direction:'gather',types:['explorers','dahan'],limits:{explorers:2,dahan:2}}})[card.program];
 const update=()=>{
  const s=config(),actor=targetSpirit(),l=selectedLand();let fields='';$('confirmProgram').disabled=false;
  if(!support&&!l){$('confirmProgram').disabled=true;$('programFields').innerHTML='<p>合法な対象地がありません。効果を使わずフェイズを完了できます。</p>';return;}
  if(card.program==='lightningBoon'){const powers=(actor?.playedPowers||[]).filter(c=>c.speed==='slow'&&c.playSpeed!=='fast'&&!c.used);fields+=`<div class="si-select-cards">${powers.map(c=>`<label><input type="checkbox" data-boon="${safe(c.id)}"><span>${safe(c.name)}</span></label>`).join('')||'<p>対象精霊に未解決の遅い能力はありません。</p>'}</div>`;}
  if(l){
   const adjacent=game.lands.filter(n=>l.neighbors.includes(n.id));
   if(['flashFloods','rituals','manifestation'].includes(card.program)){
    let left=card.program==='rituals'?(l.dahan>=3?5:2):card.program==='manifestation'?l.dahan*l.presenceOwners.filter(id=>id===me.id).length:l.coastal?2:1;
    fields+=`<fieldset class="si-growth-place"><legend>${left}ダメージを割り振る</legend>`;
    for(const [t,hp] of [['explorers',1],['towns',2],['cities',3]])for(let i=0;i<l[t];i++){const max=hp-(l.invaderDamage?.[t]?.[i]||0),n=Math.min(left,max);left-=n;fields+=`<label class="si-field">${unitName[t]} ${i+1}（残り体力${max}）<input type="number" data-damage-type="${t}" data-damage-index="${i}" min="0" max="${max}" value="${n}"></label>`;}fields+='</fieldset>';
   }
   if(card.replaceTypes){const types=card.replaceTypes.filter(t=>l[t]);if(types.length)fields+=selection('置き換える建物',types.map(t=>[t,`${unitName[t]} → ${t==='cities'?'町':'遠征隊'}`]),'programUnit');}
   if(card.program==='stem'&&!['山','砂漠'].includes(l.terrain)){const buildings=[];for(const t of ['towns','cities'])for(let i=0;i<l[t];i++)buildings.push([t+'|'+i,`${unitName[t]} ${i+1}`]);if(buildings.length)fields+=selection('1ダメージを与える建物',buildings,'programBuilding');}
   const move=movement(s);
   if(move){
    if(move.direction==='gather')for(const from of adjacent)for(const t of move.types)if(from[t]){const id=`gather-${from.id}-${t}`;fields+=`<label class="si-field">${safe(name(from))}から${unitName[t]}を集める（${from[t]}個）<input id="${safe(id)}" type="number" data-move-from="${safe(from.id)}" data-move-type="${t}" data-direction="gather" min="0" max="${Math.min(from[t],move.limits?.[t]??move.limit??999)}" value="0"></label>`;if(t==='dahan'&&me.spirit==='thunderspeaker'&&from.presenceOwners.includes(me.id))fields+=`<label class="si-field">同行する存在<input type="number" data-presence-for="${safe(id)}" min="0" max="${from.presenceOwners.filter(id=>id===me.id).length}" value="0"></label>`;}
    if(move.direction==='push'){
     const destinations=adjacent.map(n=>[n.id,name(n)]),ocean=game.players.find(p=>p.spirit==='ocean'&&((p.id===l.board&&p.oceanPresence)||game.lands.some(n=>n.board===l.board&&n.presenceOwners.includes(p.id))));
     for(const t of move.types)for(let i=0;i<l[t];i++){const id=`push-${t}-${i}`,places=t!=='dahan'&&l.coastal&&ocean?[...destinations,[`ocean:${ocean.id}`,'海へ移動して溺没させる']]:destinations;fields+=selection(`${unitName[t]} ${i+1}`,[['','移動しない'],...places],id).replace('<select ',`<select data-move-from="${safe(l.id)}" data-move-type="${t}" data-direction="push" `);if(t==='dahan'&&me.spirit==='thunderspeaker'&&l.presenceOwners.includes(me.id))fields+=`<label class="si-field"><input type="checkbox" data-presence-for="${id}">自分の存在1つを同行させる</label>`;}
    }
   }
   if(s.presence){const owner=actor||me,own=game.lands.filter(n=>n.presenceOwners.includes(owner.id));fields+=selection('存在の取り方',[...(owner.presence>0?[['','トラックから新たに配置']]:[]),...own.map(n=>[n.id,`${name(n)}の存在を移動`])],'programPresenceFrom')+selection('新しく置く場合に進めるトラック',[['energy','エネルギー'],['plays','カードプレイ']],'programTrack');}
  }
  $('programFields').innerHTML=fields;
 };
 const updateSpirit=()=>{if(card.supportLand){const actor=targetSpirit(),ids=game.powerSupportTargets?.[card.id]?.[actor?.id]||[];$('programSupportLandWrap').innerHTML=selection('対象精霊の土地',game.lands.filter(l=>ids.includes(l.id)).map(l=>[l.id,name(l)]),'programSupportLand');$('programSupportLand').onchange=update;}update();};
 if(support)$('programSpirit').onchange=updateSpirit;else $('programLand').onchange=update;
 if($('programMode'))$('programMode').onchange=update;
 updateSpirit();
 $('confirmProgram').onclick=async()=>{
  const l=selectedLand(),landId=l?.id,spiritId=$('programSpirit')?.value,moves=[],damagePlan=[],fastCards=[...$('programFields').querySelectorAll('[data-boon]:checked')].map(x=>x.dataset.boon);
  for(const x of $('programFields').querySelectorAll('[data-move-from]')){const direction=x.dataset.direction,n=direction==='push'?(x.value?1:0):Number(x.value);if(!n)continue;const escort=[...$('programFields').querySelectorAll('[data-presence-for]')].find(p=>p.dataset.presenceFor===x.id),presenceCount=escort?(escort.type==='checkbox'?(escort.checked||escort.hasAttribute('checked')?1:0):Number(escort.value)):0;moves.push({from:x.dataset.moveFrom,to:direction==='push'?x.value:landId,type:x.dataset.moveType,count:n,presenceCount});}
  for(const x of $('programFields').querySelectorAll('[data-damage-type]'))damagePlan.push({type:x.dataset.damageType,index:Number(x.dataset.damageIndex),amount:Number(x.value)});
  const building=$('programBuilding')?.value?.split('|');
  if(await act('resolve',{cardId:card.id,landId,spiritId,moves,damagePlan,fastCards,mode:$('programMode')?.value,unitType:building?.[0]||$('programUnit')?.value,unitIndex:building?Number(building[1]):0,track:$('programTrack')?.value,presenceFrom:$('programPresenceFrom')?.value}))close('actionDialog');
 };
}
