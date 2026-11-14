'use strict';
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let game = null, roomCode = '', token = '', watching = false, busy = false, polling = false, timer = null, lastShownResult = '';
let soundOn = localStorage.getItem('chao-sound') === '1', audioContext = null, toastTimer = null;
const playerName = id => game?.players.find(p => p.id === id)?.name || '—';
const mine = () => game?.me?.id === game?.turnId;
function toast(text) { $('toast').textContent = text; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').textContent = '', 3600); }
function showSound() { $('sound').textContent = `音：${soundOn ? 'オン' : 'オフ'}`; $('sound').setAttribute('aria-pressed', String(soundOn)); }
function initAudio() { try { const A = window.AudioContext || window.webkitAudioContext; if (A && !audioContext) audioContext = new A(); audioContext?.resume(); } catch {} }
function playCue(kind) {
  if (!soundOn || !audioContext) return;
  try {
    const now = audioContext.currentTime, notes = kind === 'fall' ? [[180,0,.4],[120,.12,.48]] : [[523,0,.2],[659,.1,.25],[784,.2,.36]];
    for (const [frequency, delay, duration] of notes) { const osc = audioContext.createOscillator(), gain = audioContext.createGain(), at = now + delay; osc.type = kind === 'fall' ? 'triangle' : 'sine'; osc.frequency.value = frequency; gain.gain.setValueAtTime(.0001, at); gain.gain.linearRampToValueAtTime(.07, at + .015); gain.gain.exponentialRampToValueAtTime(.0001, at + duration); osc.connect(gain); gain.connect(audioContext.destination); osc.start(at); osc.stop(at + duration + .03); }
  } catch {}
}
async function api(path, data) {
  const response = await fetch('/api/chao' + path, { method: data ? 'POST' : 'GET', headers: data ? { 'content-type': 'application/json' } : {}, ...(data ? { body: JSON.stringify(data) } : {}) });
  const result = await response.json(); if (!response.ok) throw Error(result.error || '通信に失敗しました。'); return result;
}
function enterRoom(asWatch, response) {
  watching = asWatch; game = response.game; roomCode = game.code; token = response.token || '';
  if (token) localStorage.setItem(`chao-token-${roomCode}`, token);
  if ($('name').value.trim()) localStorage.setItem('chao-name', $('name').value.trim());
  history.replaceState({}, '', `?room=${roomCode}${watching ? '&spectate=1' : ''}`);
  $('entry').hidden = true; $('intro').hidden = true; $('room').hidden = false; $('roomCode').textContent = roomCode;
  $('connection').textContent = watching ? '観戦中' : '接続中'; render(); clearInterval(timer); timer = setInterval(refresh, 1500);
}
async function enter(mode) {
  if (busy) return; busy = true; initAudio();
  try {
    const name = ($('name').value || localStorage.getItem('chao-name') || 'プレイヤー').trim().slice(0,16) || 'プレイヤー';
    const code = $('code').value.trim().toUpperCase();
    const data = mode === 'create' ? await api('', { name }) : mode === 'watch' ? await api('/' + code + '?spectate=1') : await api('/' + code + '/join', { name, token: localStorage.getItem(`chao-token-${code}`) || '' });
    enterRoom(mode === 'watch', data);
  } catch (error) { toast(error.message); } finally { busy = false; }
}
async function refresh() {
  if (!game || polling || busy) return; polling = true;
  try {
    const query = watching ? '?spectate=1' : '?token=' + encodeURIComponent(token);
    const data = await api('/' + roomCode + query);
    $('connection').textContent = watching ? '観戦中' : 'オンライン';
    if (data.game.revision > game.revision) { game = data.game; render(); }
  } catch { $('connection').textContent = '再接続中'; }
  finally { polling = false; }
}
async function act(type, args = {}) {
  if (busy || watching || !game) return false; busy = true;
  document.querySelectorAll('#actions button,#start,#rematch,#chatForm button').forEach(button => button.disabled = true);
  try {
    const data = await api('/' + roomCode + '/action', { token, revision: game.revision, type, ...args });
    game = data.game; $('connection').textContent = 'オンライン'; render(); return true;
  } catch (error) { toast(error.message); return false; }
  finally { busy = false; document.querySelectorAll('#actions button,#start,#rematch,#chatForm button').forEach(button => button.disabled = false); await refresh(); }
}
function button(label, type, args = {}, className = '') { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; if (className) b.className = className; b.onclick = () => act(type, args); return b; }
function renderLobby() {
  $('lobby').hidden = game.phase !== 'lobby'; $('play').hidden = game.phase === 'lobby';
  $('lobbyPlayers').innerHTML = game.players.map(p => `<span class="chao-player-chip"><i class="chao-dot" style="--pawn-color:${p.color}"></i>${esc(p.name)}${p.id === game.hostId ? ' · ホスト' : ''}</span>`).join('');
  $('start').hidden = watching || game.me?.id !== game.hostId;
  $('start').disabled = game.players.length < 2 || watching;
}
function turnCopy() {
  const actions = $('actions'); actions.replaceChildren(); const p = game.players.find(x => x.id === game.turnId), isMine = mine(), pending = game.pending;
  const privateDie = $('privateDie');
  const myFace = pending?.myFace;
  privateDie.hidden = myFace == null;
  privateDie.textContent = myFace == null ? '' : `あなたの秘密の出目　${myFace === 'x' ? '×' : myFace}`;
  if (game.phase === 'roll') {
    $('turnTag').textContent = isMine ? 'YOUR TURN' : 'NEXT CROSSING';
    $('status').textContent = isMine ? 'ダイスを振る番です' : `${p?.name || 'プレイヤー'}がダイスを振ります`;
    $('instruction').textContent = isMine ? 'カップを振って、出目を自分だけで確認しましょう。×なら必ずブラフです。' : '出目は手番プレイヤーだけに見えます。';
    if (isMine && !watching) actions.append(button('🎲 ダイスを振る', 'roll', {}, 'chao-call'));
  } else if (game.phase === 'declare') {
    $('turnTag').textContent = isMine ? 'SECRET DIE' : 'DECLARING';
    $('status').textContent = isMine ? '出目を宣言してください' : `${p?.name || '手番プレイヤー'}が数字を宣言します`;
    $('instruction').textContent = isMine ? '出た目と同じでも、違う数字でも宣言できます。進む数を選びましょう。' : '手番プレイヤーは出目を知っています。宣言を待ちましょう。';
    if (isMine) {
      for (let n = 1; n <= 4; n++) actions.append(button(String(n), 'declare', { amount: n }, 'chao-number'));
    } else {
      privateDie.hidden = false;
      privateDie.textContent = '🔒 出目は手番プレイヤーだけに表示';
    }
  } else if (game.phase === 'challenge') {
    const due = game.challengeId === game.me?.id, declared = pending?.declared;
    $('turnTag').textContent = due ? 'CALL THE BLUFF?' : 'BLUFF CHECK';
    $('status').textContent = `${playerName(pending?.actorId)}は「${declared}」と宣言`;
    $('instruction').textContent = due ? '宣言を疑うなら「ダウト」。信じるなら見逃します。' : `${playerName(game.challengeId)}の判断を待っています。出目は手番プレイヤーだけに見えます。`;
    if (due && !watching) {
      const minePlayer = game.players.find(x => x.id === game.me?.id);
      if (minePlayer?.pawns?.some(x => x.status === 'bridge')) actions.append(button('ダウト！', 'challenge', {}, 'chao-call'));
      else {
        const goals = minePlayer?.pawns?.filter(x => x.status === 'goal') || [];
        if (goals.length) { const b = button(goals.length > 1 ? 'ダウト！' : `ダウト！（ゴール駒${goals[0].rank}番を賭ける）`, 'challenge', { stakePawnId: goals[0].id }, 'chao-call'); if(goals.length>1)b.onclick=()=>openStake(goals); actions.append(b); }
      }
      actions.append(button('見逃す', 'pass'));
    }
  } else {
    $('turnTag').textContent = watching ? 'SPECTATING' : 'WAITING'; $('status').textContent = 'ゲームが終了しました'; $('instruction').textContent = '最終順位を確認して、みんなで再戦できます。';
  }
}
function pawnHtml(pawn, player) { return `<span class="chao-pawn" style="--pawn-color:${player.color}" title="${esc(player.name)}" aria-label="${esc(player.name)}の駒">${esc(player.name.slice(0,1))}</span>`; }
function renderBridge() {
  const cells = Array.from({length:11},(_,pos) => {
    const pawns = game.players.flatMap(player => (player.pawns || []).filter(pawn => pawn.status === 'bridge' && pawn.pos === pos).map(pawn => pawnHtml(pawn,player))).join('');
    const label = pos === 0 ? '入口' : pos === 10 ? 'ゴール' : String(pos);
    return `<div class="chao-space"><span class="chao-space-label ${pos===0?'start':''} ${pos===10?'end':''}">${label}</span><div class="chao-pawns">${pawns}</div></div>`;
  }).join('');
  $('bridge').innerHTML = `<div class="chao-bridge-wrap">${cells}</div>`;
  $('goalSteps').innerHTML = Array.from({length:8},(_,i) => {
    const rank=i+1, placed=game.goalOrder.find(x=>x.rank===rank), player=placed&&game.players.find(p=>p.id===placed.playerId);
    return `<span class="chao-goal-step ${placed?'filled':''}" title="${placed?esc(player?.name):'未到着'}">${placed?pawnHtml({id:placed.pawnId},player):'·'}<small>${rank}</small></span>`;
  }).join('');
}
function renderPlayers() {
  $('players').innerHTML = game.players.map(p => {
    const pawns=p.pawns||[], active=pawns.find(x=>x.status==='bridge'),reserve=pawns.filter(x=>x.status==='reserve').length,goals=pawns.filter(x=>x.status==='goal').length,fallen=pawns.filter(x=>x.status==='fallen').length;
    const pos=active?`橋 ${active.pos===0?'入口':active.pos+'マス'}`:'橋に駒なし';
    return `<article class="chao-player-card ${p.id===game.turnId?'is-turn':''}"><div class="chao-player-name"><i class="chao-dot" style="--pawn-color:${p.color}"></i>${esc(p.name)}<small>${p.id===game.turnId?'手番':''}</small></div><div class="chao-player-stats"><span class="chao-stat">${pos}</span><span class="chao-stat">手持ち ${reserve}個</span><span class="chao-stat">ゴール ${goals}個</span><span class="chao-stat">谷底 ${fallen}個</span></div></article>`;
  }).join('');
}
function renderFinished() {
  const ended=game.phase==='finished'; $('finished').hidden=!ended;
  if (!ended) return;
  const winners=game.winners?.length?game.winners:game.winner?[game.winner]:[];
  $('winnerTitle').textContent=winners.length>1?`引き分け：${winners.map(playerName).join('・')}`:`${playerName(winners[0])}の勝ち！`;
  $('winnerText').textContent=game.winners?.length?game.winners.map(id=>{const p=game.players.find(x=>x.id===id);return `${p?.name}：${(p?.pawns||[]).reduce((s,x)=>s+(x.status==='goal'?x.rank:0),0)}点`;}).join(' ／ '):'駒を3個ゴールさせました。';
  const ready=game.rematchReady||[]; $('rematch').hidden=watching; $('rematch').textContent=ready.includes(game.me?.id)?'再戦を取り消す':'同じメンバーで再戦に参加'; $('rematch').onclick=()=>act('rematch',{ready:!ready.includes(game.me?.id)});
  $('rematchStatus').textContent=`再戦準備：${ready.length} / ${game.players.length}人`;
}
function showLastResult() {
  const result=game.lastResult;if(!result||result.id===lastShownResult)return;
  lastShownResult=result.id;$('resultTitle').textContent=result.truthful?'宣言は本当だった':'宣言はブラフだった';
  $('resultText').textContent=`出目：${result.face==='x'?'×':result.face} ／ 宣言：${result.declared} ／ ダウト：${playerName(result.challengerId)}`;
  if(!$('challengeDialog').open)$('challengeDialog').showModal();playCue(result.truthful?'win':'fall');
}
function openStake(goals) {
  $('stakeOptions').innerHTML=goals.map(pawn=>`<button type="button" class="chao-stake-option" data-pawn="${esc(pawn.id)}">ゴール駒 ${pawn.rank}番を賭ける</button>`).join('');
  $('stakeOptions').querySelectorAll('[data-pawn]').forEach(button=>button.onclick=()=>{$('stakeDialog').close();act('challenge',{stakePawnId:button.dataset.pawn});});
  $('stakeDialog').showModal();
}
function render() {
  $('roundLabel').textContent=game.round?`· ゲーム ${game.round}`:'';
  renderLobby(); if(game.phase==='lobby')return;
  turnCopy(); renderBridge(); renderPlayers();
  $('log').innerHTML=(game.log||[]).slice(0,24).map(line=>`<li>${esc(line)}</li>`).join('');
  $('messages').innerHTML=(game.messages||[]).map(msg=>`<div class="chao-chat-item"><b>${esc(msg.name)}</b>　${esc(msg.text)}</div>`).join('')||'<div class="chao-chat-item">まだメッセージはありません。</div>';
  renderFinished(); showLastResult();
  if(window.BoardgameIntro)window.BoardgameIntro.check({game:'chao',playing:game.phase!=='lobby',participant:!watching});
}
$('name').value=localStorage.getItem('chao-name')||'';
const query=new URLSearchParams(location.search); if(query.get('room'))$('code').value=query.get('room').toUpperCase();
$('create').onclick=()=>enter('create'); $('join').onclick=()=>enter('join'); $('watch').onclick=()=>enter('watch');
$('start').onclick=()=>act('start'); $('rules').onclick=()=> $('rulesDialog').showModal(); $('rulesClose').onclick=()=> $('rulesDialog').close(); $('stakeCancel').onclick=()=> $('stakeDialog').close();
$('guide').onclick=()=>{const panel=$('turnTag');if(!panel)return;panel.scrollIntoView({behavior:'smooth',block:'center'});toast($('instruction').textContent||'部屋に入ると、次の操作がここに表示されます。');};
$('resultClose').onclick=()=> $('challengeDialog').close(); $('invite').onclick=async()=>{const url=`${location.origin}/chao.html?room=${roomCode}`;try{await navigator.clipboard.writeText(url);toast('招待リンクをコピーしました。');}catch{prompt('招待リンクをコピーしてください',url);}};
$('sound').onclick=()=>{soundOn=!soundOn;localStorage.setItem('chao-sound',soundOn?'1':'0');showSound();initAudio();}; showSound();
$('chatForm').addEventListener('submit',e=>{e.preventDefault();const text=$('chatInput').value.trim();if(text&&!watching){$('chatInput').value='';act('chat',{text});}});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&$('entry').hidden===false&&$('code')===document.activeElement)$('join').click();});
window.addEventListener('pagehide',()=>clearInterval(timer));
