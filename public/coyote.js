'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let game=null,code='',token='',watching=false,busy=false,refreshing=false,poll=null,modalKind='',seenResult='',seenTurn='',toastTimer=null;
let soundOn=localStorage.getItem('cy-sound')==='1',audioContext=null;
const specialText={night:'数字は0。このラウンドの答え合わせ後、捨て札も含めた36枚を切り直します。',double:'基本カードの合計を最後に2倍にします。',fox:'最大の正の数字カード1枚だけを0として計算します。',cave:'答え合わせのときに山札から1枚を引き、そのカードも計算に加えます。'};
const name=id=>game?.players.find(p=>p.id===id)?.name||'—';
const seatNo=id=>game?.players.find(p=>p.id===id)?.seat||'—';
const mine=()=>Boolean(game?.me&&game.turnId===game.me.id&&game.phase==='bidding');
function toast(s){$('toast').textContent=s;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{$('toast').textContent='';},4500);}
function modal(kind,title,body,actions=''){
  modalKind=kind;$('dialogTitle').textContent=title;$('dialogBody').innerHTML=body;$('dialogActions').innerHTML=actions;$('dialogError').textContent='';
  if(!$('dialog').open)$('dialog').showModal();
}
function closeModal(){$('dialog').close();modalKind='';}
function initAudio(){try{const A=window.AudioContext||window.webkitAudioContext;if(A&&!audioContext)audioContext=new A();audioContext?.resume();}catch{}}
function chime(){if(!soundOn||!audioContext)return;try{[523,659,784].forEach((f,i)=>{const o=audioContext.createOscillator(),v=audioContext.createGain(),t=audioContext.currentTime+i*.12;o.frequency.value=f;o.connect(v);v.connect(audioContext.destination);v.gain.setValueAtTime(0,t);v.gain.linearRampToValueAtTime(.07,t+.02);v.gain.exponentialRampToValueAtTime(.001,t+.22);o.start(t);o.stop(t+.24);});}catch{}}
function showSound(){$('sound').textContent='音：'+(soundOn?'オン':'オフ');$('sound').setAttribute('aria-pressed',String(soundOn));}
async function api(path,data){
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
 try{const r=await fetch('/api/coyote'+path,{method:data?'POST':'GET',signal:controller.signal,...(data?{headers:{'content-type':'application/json'},body:JSON.stringify(data)}:{})});const d=await r.json();if(!r.ok)throw Error(d.error||'通信に失敗しました。');return d;}finally{clearTimeout(timeout);}
}
function connection(){$('connection').textContent=watching?'観戦中':game?.players.find(p=>p.id===game.me?.id)?.life===0?'脱落後の観戦':'接続中';}
async function enter(mode){
 if(busy)return;busy=true;initAudio();
 try{const c=$('code').value.trim().toUpperCase(),n=$('name').value.trim(),asWatcher=mode==='watch';
  const d=mode==='create'?await api('',{name:n}):asWatcher?await api('/'+c+'?spectate=1'):await api('/'+c+'/join',{name:n,token:localStorage.getItem('cy-token-'+c)||''});
  watching=asWatcher;game=d.game;code=game.code;token=d.token||'';seenResult='';seenTurn='';
  if(token)localStorage.setItem('cy-token-'+code,token);localStorage.setItem('cy-name',n);history.replaceState({},'','?room='+code);
  $('entry').hidden=true;$('intro').hidden=true;$('room').hidden=false;connection();render();clearInterval(poll);poll=setInterval(refresh,1500);
 }catch(e){toast(e.name==='AbortError'?'通信がタイムアウトしました。もう一度お試しください。':e.message);}finally{busy=false;}
}
async function refresh(){
 if(!game||refreshing||busy)return;refreshing=true;
 try{const d=await api('/'+code+(watching?'?spectate=1':'?token='+encodeURIComponent(token)));connection();if(d.game.revision>game.revision){game=d.game;render();}}
 catch{$('connection').textContent='再接続中 · 自動で再試行';}finally{refreshing=false;}
}
async function act(type,args={}){
 if(busy||!game||watching)return false;busy=true;const submitted=[...document.querySelectorAll('[data-submit]')].filter(b=>!b.disabled);submitted.forEach(b=>b.disabled=true);
 try{const d=await api('/'+code+'/action',{token,type,revision:game.revision,matchId:game.matchId,roundId:game.roundId,...args});game=d.game;closeModal();connection();render();return true;}
 catch(e){const message=e.name==='AbortError'?'通信を確認できませんでした。再接続後に盤面を確認してください。':e.message;$('dialogError').textContent=message;toast(message);return false;}
 finally{busy=false;submitted.forEach(b=>b.disabled=false);await refresh();}
}
function relativeSeats(){if(!game?.me)return game.players;const index=game.players.findIndex(p=>p.id===game.me.id);return [...game.players.slice(index),...game.players.slice(0,index)];}
function layoutSeats(){
 if(!game)return;const mobile=window.innerWidth<=980,ps=relativeSeats(),n=ps.length,w=$('table').clientWidth||Math.min(window.innerWidth-24,1156);
 const side=Math.max(0,Math.ceil((n-2)/2)),h=mobile?Math.max(510,164+(side+1)*158):(n>=9?900:n>=8?760:680);
 $('table').style.setProperty('--mobile-height',h+'px');$('table').style.setProperty('--desktop-height',h+'px');const points=new Map();
 ps.forEach((p,i)=>{let x,y;
  if(!mobile){const a=i*2*Math.PI/n;x=50-42*Math.sin(a);y=50+37*Math.cos(a);}
  else if(i===0){x=50;y=(h-82)/h*100;}
  else if(n===2){x=50;y=82/h*100;}
  else if(n===3){x=i===1?22:78;y=27;}
  else{const left=Math.floor((n-2)/2),right=n-2-left,topIndex=left+1;
   if(i===topIndex){x=50;y=82/h*100;}
   else if(i<topIndex){x=56/w*100;y=(h-82-(h-164)*i/(left+1))/h*100;}
   else{x=100-56/w*100;y=(82+(h-164)*(i-topIndex)/(right+1))/h*100;}}
  const el=document.querySelector(`[data-seat-id="${p.id}"]`);if(el){el.style.left=x+'%';el.style.top=y+'%';}points.set(p.id,{x:x/100*1000,y:y/100*h});
 });
 const svg=$('turnArrow');svg.setAttribute('viewBox',`0 0 1000 ${h}`);
 if(game.phase!=='bidding'||n<2){svg.innerHTML='';return;}
 const a=points.get(game.turnId),b=points.get(game.nextId);if(!a||!b)return;
 const inset=p=>({x:500+(p.x-500)*.73,y:h/2+(p.y-h/2)*.73}),a1=inset(a),b1=inset(b);
 svg.innerHTML=`<defs><marker id="arrowHead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z" fill="#edb750"/></marker></defs><path d="M${a1.x} ${a1.y} Q${(a1.x+b1.x)/2} ${(a1.y+b1.y)/2} ${b1.x} ${b1.y}" fill="none" stroke="#edb750" stroke-width="2.5" stroke-dasharray="6 7" opacity=".75" marker-end="url(#arrowHead)"/>`;
}
function cardMarkup(p){
 if(!p.hasCard)return `<div class="seat-card empty"><strong>${p.life>0?'·':'—'}</strong><small>${p.life>0?'着席中':'脱落'}</small></div>`;
 if(!p.card)return `<div class="seat-card hidden-card" role="img" aria-label="${p.id===game.me?.id?'あなたのカードは自分には見えません':'観戦中のカードは非公開です'}"><strong>?</strong><small>${p.id===game.me?.id?'自分には見えません':'答え合わせまで非公開'}</small></div>`;
 return `<button class="seat-card ${typeof p.card.value==='string'?'special':''} ${p.card.kind==='negative'?'negative':''}" data-card-player="${p.id}" aria-label="席${p.seat} ${esc(p.name)}のカード ${esc(p.card.label)}"><strong>${esc(p.card.label)}</strong><small>${p.card.kind==='number'||p.card.kind==='negative'?'NUMBER':({night:'夜',double:'2倍',fox:'最大1枚を0',cave:'追加で1枚'})[p.card.kind]}</small></button>`;
}
function render(){
 renderPublicDiscards();
 const me=game.me?.id,host=me===game.hostId,alive=game.players.filter(p=>p.life>0),lobby=game.phase==='lobby',revealed=['reveal','finished'].includes(game.phase);
 if(['bid','challenge'].includes(modalKind)&&!mine()||modalKind==='result'&&!revealed)closeModal();
 $('roomCode').textContent='ROOM '+code;$('roundLabel').textContent=lobby?'着席中':'ROUND '+game.round;
 $('lobby').hidden=!lobby;$('life').value=String(game.startingLife);$('life').disabled=!host;$('shuffle').hidden=!host;$('start').hidden=!host;$('start').disabled=game.players.length<2;
 $('remaining').textContent=`${game.players.length}席 · ${alive.length}人参加中${lobby?'':` · 山札${game.deckCount}枚`}`;
 $('tableHint').textContent=watching?'観戦席から見ています':'あなたの席が手前です';
 $('seats').innerHTML=relativeSeats().map(p=>{
  const current=p.id===game.turnId,next=p.id===game.nextId,tag=lobby?(p.id===game.hostId?'ホスト':'着席済み'):p.life===0?'脱落 · 席は固定':current?'● いまの手番':next?'次の手番 →':p.lastBid!==null?`「${p.lastBid}」と宣言`:'順番待ち';
  return `<article class="seat ${p.id===me?'me':''} ${current?'current':''} ${next?'next':''} ${p.life===0?'out':''}" data-seat-id="${p.id}" aria-label="席${p.seat} ${esc(p.name)}${p.id===me?' あなた':''}${current?' 現在の手番':''}${next?' 次の手番':''}${p.life===0?' 脱落':''}"><div class="seat-head"><span class="seat-number">${p.seat}</span><b>${esc(p.name)}${p.id===me?' · あなた':''}</b></div>${cardMarkup(p)}<div class="seat-life" aria-label="残りライフ${p.life}">${'●'.repeat(p.life)}<span>${'○'.repeat(game.startingLife-p.life)}</span></div><span class="seat-tag">${tag}</span></article>`;
 }).join('');
 $('seats').querySelectorAll('[data-card-player]').forEach(b=>b.onclick=()=>{const p=game.players.find(p=>p.id===b.dataset.cardPlayer);modal('card',p.name+'のカード',`<div class="result-score"><strong>${esc(p.card.label)}</strong></div><p>${esc(specialText[p.card.value]||'この数字を場の合計に加えます。')}</p>`);});
 const center=$('tableCenter');
 center.innerHTML=lobby?'<small>TAKE A SEAT</small><div class="center-name">卓を囲もう</div><p>2〜10人で対戦</p>':game.phase==='bidding'?`<small>いまの宣言</small><div class="bid-number">${game.bid===null?'—':esc(game.bid)}</div><p>${game.bid===null?'最初の数字を待っています':`席${seatNo(game.bidderId)} ${esc(name(game.bidderId))}`}</p><span class="center-dot"></span><span class="center-name">席${seatNo(game.turnId)}の番</span><p class="small-hint">${esc(name(game.turnId))} → ${esc(name(game.nextId))}</p>`:`<small>${game.phase==='finished'?'WINNER':'答え合わせ'}</small><div class="bid-number">${game.phase==='finished'?'♛':game.result.total}</div><div class="center-name">${game.phase==='finished'?esc(name(game.winner)):esc(name(game.result.loserId))+' −1'}</div><p>${game.phase==='finished'?'最後の1人になりました':'カードを公開中'}</p>`;
 if(me&&alive.length>1&&!lobby&&game.players.find(p=>p.id===me).life>0){let i=game.players.findIndex(p=>p.id===me),prev=null;for(let k=1;k<game.players.length;k++){const p=game.players[(i-k+game.players.length)%game.players.length];if(p.life>0){prev=p;break;}}const nextId=(()=>{for(let k=1;k<game.players.length;k++){const p=game.players[(i+k)%game.players.length];if(p.life>0)return p.id;}})();$('neighbors').innerHTML=`前：席${prev?.seat} ${esc(prev?.name)} <b>→ あなた（席${seatNo(me)}） →</b> 次：席${seatNo(nextId)} ${esc(name(nextId))}`;}else $('neighbors').textContent=lobby?'席番号の順に時計回り。最初の手番はランダムで決めます。':watching?'観戦中のカードは、コヨーテの答え合わせで公開されます。':'脱落した後も、同じ席から対戦を見守れます。';
 $('turnTag').textContent=lobby?'WAITING FOR PLAYERS':game.phase==='bidding'?(mine()?'YOUR TURN':'CLOCKWISE · 次の席へ'):game.phase==='finished'?'GAME SET':'ROUND REVEAL';
 $('status').textContent=lobby?(host?'みんながそろったら開始してください':'ホストの開始を待っています'):game.phase==='bidding'?(mine()?'あなたの手番です':`席${seatNo(game.turnId)} ${name(game.turnId)}の手番`):game.phase==='finished'?name(game.winner)+'の勝利！':'全員のカードを公開しています';
 $('instruction').textContent=lobby?'仮面カードを使わない基本ルールです。':game.phase==='bidding'?(game.bid===null?'最初の人は1以上の整数を宣言します。':`直前の宣言は${name(game.bidderId)}の「${game.bid}」。数字を上げるか、コヨーテ！`):game.phase==='finished'?'ホストが再戦を始めると、同じ席順で全員が復帰します。':`次は席${seatNo(game.result.nextStarterId)} ${name(game.result.nextStarterId)}から。確認済み ${game.ready.length}/${alive.length}人。`;
 let actions='';
 if(mine())actions='<button id="openBid" class="primary">数字を宣言</button><button id="openChallenge" class="challenge-button" '+(game.bid===null?'disabled':'')+'>コヨーテ！</button>';
 else if(revealed)actions='<button id="showResult">答え合わせを見る</button>'+(game.phase==='reveal'&&me&&alive.some(p=>p.id===me)?`<button id="ready" class="primary" ${game.ready.includes(me)?'disabled':''}>${game.ready.includes(me)?'みんなの確認を待っています':'確認して次へ'}</button>`:'')+(game.phase==='finished'&&host?'<button id="rematch" class="primary">もう一度対戦</button>':'');
 $('actions').innerHTML=actions;if($('openBid'))$('openBid').onclick=openBid;if($('openChallenge'))$('openChallenge').onclick=openChallenge;if($('showResult'))$('showResult').onclick=showResult;if($('ready'))$('ready').onclick=()=>act('ready');if($('rematch'))$('rematch').onclick=()=>confirmStart(true);
 $('mobileDock').hidden=!mine();
 $('mobileDock').innerHTML=mine()?`<small>あなたの番<br>次：席${seatNo(game.nextId)}</small><button id="mobileBid" class="primary">数字を宣言</button><button id="mobileChallenge" class="challenge-button" ${game.bid===null?'disabled':''}>コヨーテ！</button>`:'';
 if($('mobileBid'))$('mobileBid').onclick=openBid;if($('mobileChallenge'))$('mobileChallenge').onclick=openChallenge;
 $('order').innerHTML=game.players.map(p=>`<li class="${p.id===game.turnId?'current':''} ${p.life===0?'out':''}" ${p.id===game.turnId?'aria-current="step"':''}><span>${p.seat}. ${esc(p.name)}${p.id===me?'（自分）':''}${p.id===game.turnId?' · いま':p.id===game.nextId?' · 次':''}</span></li>`).join('');
 $('bids').innerHTML=game.bids.length?game.bids.map(b=>`<li>席${seatNo(b.playerId)} ${esc(name(b.playerId))} <b>${b.value}</b></li>`).join(''):'<li class="waiting">まだ数字は宣言されていません。</li>';
 $('log').innerHTML=game.log.map(s=>'<li>'+esc(s)+'</li>').join('');layoutSeats();
 if(revealed){const key=game.matchId+':'+game.roundId;if(key!==seenResult){seenResult=key;showResult();}else if(modalKind==='result')showResult();}
 const turnKey=game.matchId+':'+game.roundId+':'+game.revision;if(mine()&&turnKey!==seenTurn){seenTurn=turnKey;toast(`あなたの手番です。次は席${seatNo(game.nextId)} ${name(game.nextId)}。`);chime();}
}
function openBid(){
 if(!mine())return;const min=game.bid===null?1:game.bid+1;
 if(!Number.isSafeInteger(min)){toast('これ以上の整数は扱えないため、コヨーテを宣言してください。');return;}
 modal('bid','数字を宣言する',`<p>席${seatNo(game.me.id)}のあなたから、次は席${seatNo(game.nextId)} ${esc(name(game.nextId))}へ。</p><div class="bid-context">${game.bid===null?'最初の宣言です。1以上の整数を選んでください。':`直前：${esc(name(game.bidderId))}の <strong>${game.bid}</strong>`}</div><label for="bidValue">宣言する数字<input id="bidValue" class="bid-input" type="number" min="${min}" max="9007199254740991" step="1" inputmode="numeric" value="${min}"></label><div class="quick-bids"><button data-add="1">+1</button><button data-add="5">+5</button><button data-add="10">+10</button><button id="resetBid">最小値</button></div><p class="fine">自分のカードは見えません。全員のカード合計を超えないと思う数字を選びます。</p>`,'<button id="submitBid" data-submit class="primary">この数字を宣言</button>');
 $('dialogBody').querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{const v=Number($('bidValue').value)+Number(b.dataset.add);if(Number.isSafeInteger(v))$('bidValue').value=String(v);});$('resetBid').onclick=()=>$('bidValue').value=String(min);
 $('submitBid').onclick=()=>{const v=Number($('bidValue').value);if(!Number.isSafeInteger(v)||v<min){$('dialogError').textContent=`${min}以上の整数を入力してください。`;return;}act('bid',{value:v});};$('bidValue').onkeydown=e=>{if(e.key==='Enter')$('submitBid').click();};
}
function openChallenge(){if(!mine()||game.bid===null)return;modal('challenge','コヨーテ！ と宣言しますか？',`<div class="bid-context">席${seatNo(game.bidderId)} ${esc(name(game.bidderId))}の宣言 <strong>${game.bid}</strong></div><p>「${game.bid}」が実際の合計を超えていると思ったら宣言します。全員のカードが公開され、超えていれば相手が、同じか少なければあなたがライフを1失います。</p>`,'<button id="cancelChallenge">考え直す</button><button id="submitChallenge" data-submit class="challenge-button">コヨーテ！</button>');$('cancelChallenge').onclick=closeModal;$('submitChallenge').onclick=()=>act('challenge');}
function showResult(){
 const r=game.result;if(!r)return;const me=game.me?.id,alive=game.players.filter(p=>p.life>0),canReady=game.phase==='reveal'&&alive.some(p=>p.id===me),ready=game.ready.includes(me),host=game.hostId===me;
 const body=`<div class="result-score"><div><small>直前の宣言</small><strong>${r.bid}</strong></div><span class="comparison">${r.success?'＞':'≤'}</span><div><small>実際の合計</small><strong>${r.total}</strong></div></div><p><b>${esc(name(r.challengerId))}のコヨーテ${r.success?'成功':'失敗'}。</b> ${esc(name(r.loserId))}がライフを1失いました。${r.eliminated?'このプレイヤーは脱落です。':''}</p><div class="result-cards">${r.cards.map(x=>`<div class="result-card">席${seatNo(x.playerId)} ${esc(name(x.playerId))}<strong>${esc(x.card.label)}</strong></div>`).join('')}${r.drawn.map(c=>`<div class="result-card">？で追加<strong>${esc(c.label)}</strong></div>`).join('')}</div><div class="calculation">基本カード合計 ${r.raw}${r.removed?` − 最大の1枚 ${r.removed}`:''}${r.multiplier===2?' → 2倍':''} ＝ <b>${r.total}</b>${r.reshuffle?'<br>夜カードが出たため、次のラウンド前に36枚を切り直します。':''}</div><p class="ready-note">${game.phase==='finished'?`最後に残った${esc(name(game.winner))}の勝利です！`:`次は席${seatNo(r.nextStarterId)} ${esc(name(r.nextStarterId))}から。確認済み ${game.ready.length}/${alive.length}人。`}</p>`;
 const buttons=game.phase==='finished'?(host?'<button id="resultRematch" data-submit class="primary">同じ席順でもう一度</button>':''):canReady?`<button id="resultReady" data-submit class="primary" ${ready?'disabled':''}>${ready?'みんなの確認を待っています':'確認して次へ'}</button>`:'';
 modal('result',game.phase==='finished'?'対戦終了 · '+name(game.winner)+'の勝利':'第'+game.round+'ラウンドの答え合わせ',body,buttons+(game.phase==='reveal'&&host?'<button id="forceNext">ホストが次へ進める</button>':''));
 if($('resultReady'))$('resultReady').onclick=()=>act('ready');if($('resultRematch'))$('resultRematch').onclick=()=>confirmStart(true);
 if($('forceNext'))$('forceNext').onclick=()=>{modal('force','確認を待たずに進めますか？','<p>まだ確認していない人がいます。切断した人がいる場合などに使ってください。全員のカードを伏せて、次のラウンドを配ります。</p>','<button id="cancelForce">戻る</button><button id="submitForce" data-submit class="primary">次のラウンドへ</button>');$('cancelForce').onclick=showResult;$('submitForce').onclick=()=>act('next',{force:true});};
}
function confirmStart(rematch=false){modal('start',rematch?'同じ席順で再戦しますか？':'この席順で始めますか？',`<p>${game.players.length}人・ライフ${game.startingLife}。最初の手番だけランダムで決まり、その後は時計回りです。</p><ol>${game.players.map(p=>`<li>席${p.seat} ${esc(p.name)}</li>`).join('')}</ol>`,'<button id="submitStart" data-submit class="primary">'+(rematch?'再戦を始める':'対戦を始める')+'</button>');$('submitStart').onclick=()=>act('start');}
function showRules(){modal('rules','コヨーテの遊び方',`<ol class="rule-list"><li>2〜10人で、1人1枚。<b>自分の数字だけ見えません。</b> 自分の席は画面手前、席順は固定です。</li><li>最初の人は1以上の整数を宣言。次の人は<b>時計回り</b>に、もっと大きな数字を言うか「コヨーテ！」。</li><li>直前の数字が全カードの合計を超えていると疑ったらコヨーテ。<b>超えていたら直前の人、同じか少なければコヨーテと言った人</b>がライフを1失います。</li><li>全員が確認すると次のラウンドへ。負けた人から始め、脱落した場合はその勝負の勝者から始めます。</li><li>基本はライフ3。0になると脱落し、手番はその席を飛ばします。<b>最後に残った1人が勝利。</b></li></ol><h3>4種類の特殊カード</h3><div class="special-list">${Object.entries(specialText).map(([k,t])=>`<div class="special-item"><strong>${({night:'0 ↻ 夜',double:'×2',fox:'MAX→0',cave:'？'})[k]}</strong>${t}</div>`).join('')}</div><p class="fine">「？」の追加カードも特殊効果の計算に含めます。MAX→0は同じ最大値が複数あっても1枚のみ。山札が足りないときは捨て札を切り直します。</p><p>この卓は仮面カードなしの基本ルールです。開始前にライフ4も選べます。</p><a href="https://www.newgamesorder.jp/games/coyote" target="_blank" rel="noopener">公式サイト・説明書 ↗</a>`);}
function showDeck(){const rows=[['1〜5','各4'],['10','3'],['15','2'],['20','1'],['0','3'],['−5','2'],['−10','1'],['0 ↻ / ×2 / MAX→0 / ？','各1']];modal('deck','36枚のカード構成',`<table class="card-counts"><thead><tr><th>カード</th><th>枚数</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</tbody></table>${game?`<h3>公開の捨て札 · ${game.discard.length}枚</h3><div class="discard-chips">${game.discard.map(c=>'<span>'+esc(c.label)+'</span>').join('')||'<p class="fine">まだありません。</p>'}</div><p class="fine">山札は${game.deckCount}枚。順番やあなたのカードの数字は表示しません。</p>`:''}`);}
$('create').onclick=()=>enter('create');$('join').onclick=()=>enter('join');$('watch').onclick=()=>enter('watch');$('close').onclick=closeModal;$('dialog').addEventListener('cancel',()=>{modalKind='';});$('rules').onclick=showRules;$('deckInfo').onclick=showDeck;
$('guide').onclick=()=>{if(!game){showRules();return;}if(game.phase==='reveal'||game.phase==='finished'){showResult();return;}if(mine()){openBid();return;}modal('guide','次にすること',`<p>${esc($('status').textContent)}</p><p>${esc($('instruction').textContent)}</p><p>金色の枠がいまの手番。「次の手番」の席へ時計回りに進みます。あなたの席は常に手前です。</p>`);};
$('start').onclick=()=>confirmStart();$('shuffle').onclick=()=>act('shuffleSeats');$('life').onchange=()=>act('settings',{life:Number($('life').value)});
$('invite').onclick=async()=>{const u=location.origin+'/coyote.html?room='+code;try{await navigator.clipboard.writeText(u);toast('招待URLをコピーしました。');}catch{modal('invite','招待URL',`<p>このURLを友達に送ってください。</p><input id="inviteURL" readonly value="${esc(u)}" aria-label="招待URL">`);}};
$('sound').onclick=()=>{soundOn=!soundOn;localStorage.setItem('cy-sound',soundOn?'1':'0');initAudio();showSound();if(soundOn)chime();};showSound();
$('name').value=localStorage.getItem('cy-name')||'';$('code').value=new URL(location.href).searchParams.get('room')||'';
window.addEventListener('resize',layoutSeats);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});

function renderPublicDiscards(){
 const cards=game?.discard||[];
 const counts=new Map();
 for(const card of cards){const label=String(card.label);counts.set(label,(counts.get(label)||0)+1);}
 $('discardCount').textContent=cards.length+'枚';
 $('publicDiscards').innerHTML=counts.size?[...counts].map(([label,count])=>'<span><b>'+esc(label)+'</b> × '+count+'枚</span>').join(''):'<p class="fine">'+(game?'捨て札はまだありません。':'入室すると、この卓の公開された捨て札を表示します。')+'</p>';
 $('mobileDiscardCount').textContent=cards.length+'枚';
 $('mobilePublicDiscards').innerHTML=counts.size?[...counts].map(([label,count])=>'<span><b>'+esc(label)+'</b> × '+count+'</span>').join(''):'<span>まだありません</span>';
 $('discardNote').textContent=game?'山札 '+game.deckCount+'枚 · 切り直し後は捨て札表示もリセットされます。':'カードの切り直しに合わせて更新されます。';
}
