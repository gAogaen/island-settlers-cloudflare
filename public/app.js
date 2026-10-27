const $ = id => document.getElementById(id);
const RESOURCES = ["wood", "brick", "sheep", "wheat", "ore"];
const RESOURCE = { wood: ["🌲", "木材"], brick: ["🧱", "レンガ"], sheep: ["🐑", "羊毛"], wheat: ["🌾", "小麦"], ore: ["⛰️", "鉱石"] };
const TERRAIN = { wood: ["森林", "🌲"], brick: ["丘陵", "🧱"], sheep: ["牧草地", "🐑"], wheat: ["畑", "🌾"], ore: ["山地", "⛰️"], desert: ["砂漠", "🏜️"] };
let renderedMatchId=null,actionInFlight=false,activeActionToken=null,tradeDraft={toId:"",giveCards:{},wantCards:{}};
let boardZoom = 1, boardPan = {x:0,y:0}, boardFrame = null, boardDragged = false;
let activeTradeOfferId = null, seenTradeOfferIds = new Set(), tradeReplyInFlight = false;
let lastVictoryNoticeKey = null, pendingVictorySoundKey = null;
let lastDiceResultKey = null, diceResultTimer = null;
let lastTurnNotice = null, pendingTurnNotice = null;
let audioContext = null, lastTurnSoundKey = null, pendingTurnSoundKey = null;
let autoSkipSpecial = localStorage.getItem("island-auto-skip-special")==="1", autoSkipInFlight = false, autoSkipLastKey = null;
let robberGuideKey=null, robberSubmitting=false, tradeDialogMode=null;
let spectating = false;
let notificationCursor=null, notificationItems=[], notificationEpoch=0;
let impactCursor=null, impactTimer=null, impactHex=null;
let currentGame = null, playerId = null, roomCode = null, mode = null, selectedRobberHex = null, selectedVictim = "", pendingRoadCard = [], polling = false, soundOn = localStorage.getItem("island-sound-on")!=="0", toastTimer;

// Count inactivity only while this browser has an outstanding game action.
const IDLE_REMINDER_MS = 60_000, defaultPageTitle = document.title || "島の開拓者 | オンライン対戦";
let idleTaskKey = null, idleLastActivity = 0, idleReminderVisible = false, idleReminderCount = 0;
function pendingIdleTask(g) {
  if(spectating || !g || g.status!=="playing" || g.winner || !playerId)return null;
  const base=`${g.code}:${g.matchId||g.createdAt}:${g.turnNumber||0}:${playerId}`;
  if(g.phase==="discard") {
    const count=g.discardPending?.[playerId]||0;
    return count ? {key:`${base}:discard`,title:"資源を捨てる番です",text:`手札から${count}枚選んで決定してください。`} : null;
  }
  if(g.phase==="special")return g.specialPlayerId===playerId?{key:`${base}:special`,title:"特別建設の番です",text:"建設するか、スキップして次へ進んでください。"}:null;
  if(g.players[g.activeIndex]?.id!==playerId)return null;
  if(g.phase==="setup")return {key:`${base}:setup:${g.setupIndex}`,title:"初期配置の番です",text:"盤面で開拓地と道を配置してください。"};
  if(g.phase==="robber")return {key:`${base}:robber`,title:"盗賊を移動してください",text:"移動先のタイルを選んで決定してください。"};
  if(g.phase==="play")return {key:`${base}:play`,title:"あなたのターンです",text:"サイコロを振ってゲームを進めましょう。"};
  if(g.phase==="main")return {key:`${base}:main`,title:"あなたのターンです",text:"建設・交換を行うか、ターンを終了してください。"};
  return null;
}
function updateIdleReminder(now=Date.now()) {
  const task=pendingIdleTask(currentGame);
  if(task?.key!==idleTaskKey){idleTaskKey=task?.key||null;idleLastActivity=now;idleReminderCount=0;}
  const show=!!task && now-idleLastActivity>=IDLE_REMINDER_MS;
  const count=show?Math.floor((now-idleLastActivity)/IDLE_REMINDER_MS):0;
  if(count>idleReminderCount)playIdleReminderSound();
  idleReminderCount=count;
  idleReminderVisible=show;
  $("idleReminder").hidden=!show;
  $("turnIdleReminder").hidden=!show;
  if(show){$("idleReminderTitle").textContent=`${task.title}（${count}分経過）`;$("idleReminderText").textContent=task.text;$("turnIdleReminder").textContent=`⏳ ${task.title}：${task.text}`;}
  document.title=show?`【操作待ち】${defaultPageTitle}`:defaultPageTitle;
}
function noteIdleActivity() {if(idleTaskKey){idleLastActivity=Date.now();updateIdleReminder(idleLastActivity);}}
document.addEventListener("pointerdown",noteIdleActivity,{passive:true});
document.addEventListener("keydown",noteIdleActivity);
document.addEventListener("change",noteIdleActivity);
setInterval(()=>updateIdleReminder(),1000);

async function api(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { "content-type": "application/json", ...(options.headers || {}) } });
  const data = await response.json();
  if (!response.ok) {const error=new Error(data.error||"通信に失敗しました。");error.status=response.status;throw error;}
  return data;
}
function rememberName() { return ($("playerName").value || "プレイヤー").trim().slice(0, 16) || "プレイヤー"; }
function setError(message = "") { $("homeError").textContent = message; }
function showToast(message) { const el = $("toast"); el.textContent = message; el.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 2400); }
function resetActionNotifications() {
  notificationEpoch++;notificationCursor=null;notificationItems=[];$("actionNotifications").innerHTML="";
  impactCursor=null;impactHex=null;clearTimeout(impactTimer);$("impactNotice").hidden=true;$("diceImpact").hidden=true;$("impactEffect").hidden=true;$("diceImpactEffect").hidden=true;
}
function renderActionNotifications() {
  $("actionNotifications").innerHTML=notificationItems.map(item=>`<div class="action-notification"><span aria-hidden="true">●</span><p>${escapeHtml(item.message)}</p></div>`).join("");
}
function syncActionNotifications(g) {
  const revision=Number(g.revision)||0;
  if(notificationCursor===null){notificationCursor=revision;return;}
  const events=(g.actionEvents||[]).filter(e=>e.revision>notificationCursor&&e.revision<=revision&&e.actorId!==playerId).sort((a,b)=>a.revision-b.revision);
  notificationCursor=Math.max(notificationCursor,revision);
  for(const event of events){
    const entry={id:event.revision,message:event.message}, epoch=notificationEpoch;
    notificationItems.push(entry);notificationItems=notificationItems.slice(-4);renderActionNotifications();
    setTimeout(()=>{if(epoch!==notificationEpoch)return;notificationItems=notificationItems.filter(x=>x!==entry);renderActionNotifications();},4000);
  }
}
function syncImpactEffects(g) {
  const revision=Number(g.revision)||0;
  if(impactCursor===null){impactCursor=revision;return;}
  const events=(g.actionEvents||[]).filter(e=>e.revision>impactCursor&&e.revision<=revision&&e.impact).sort((a,b)=>a.revision-b.revision);
  impactCursor=Math.max(impactCursor,revision);
  if(spectating)return;
  for(const event of events){
    const effect=event.impact;
    if(effect.type==="burst"&&(!g.discardPending?.[playerId]||g.phase!=="discard"))continue;
    if(effect.type!=="burst"&&effect.type!=="robber")continue;
    showImpactEffect(effect);
  }
}
function showImpactEffect(effect) {
  const burst=effect.type==="burst";impactHex=burst?null:effect.hexId;
  const particles=Array.from({length:24},(_,i)=>`<i style="--angle:${i*15}deg;--distance:${120+(i%5)*35}px;--delay:${(i%4)*.035}s;--size:${6+(i%4)*3}px"></i>`).join("");
  for(const id of ["impactEffect","diceImpactEffect"]){const el=$(id);el.hidden=id==="diceImpactEffect"&&!burst;el.dataset.type=effect.type;el.innerHTML=`<div class="impact-flash"></div><div class="impact-shockwave"></div><div class="impact-particles">${particles}</div><div class="impact-silhouette">${burst?"💥":"♟"}</div>`;}
  playImpactSound(burst);
  $("impactIcon").textContent=burst?"💥":"♟";
  $("impactTitle").textContent=burst?"バースト！":"あなたの土地に盗賊！";
  $("impactText").textContent=burst?`手札から${effect.count}枚を捨ててください。`:"この土地の資源は盗賊がいる間、生産されません。";
  $("impactNotice").hidden=false;
  $("diceImpact").hidden=!burst;
  $("diceImpact").textContent=burst?`💥 バースト！ 資源を${effect.count}枚捨ててください。`:"";
  clearTimeout(impactTimer);const epoch=notificationEpoch;
  impactTimer=setTimeout(()=>{if(epoch!==notificationEpoch)return;impactHex=null;$("impactNotice").hidden=true;$("diceImpact").hidden=true;$("impactEffect").hidden=true;$("diceImpactEffect").hidden=true;if(currentGame?.map)drawBoard(currentGame,currentGame.players.find(p=>p.id===playerId));},4500);
}
function enterRoom(code, id, asSpectator = false) {
  resetActionNotifications();
  spectating=asSpectator;
  document.body.classList.add("in-room"); boardZoom=1;boardPan={x:0,y:0};
  currentGame=null;renderedMatchId=null;
  roomCode = code.toUpperCase(); lastDiceResultKey=sessionStorage.getItem(`island-dice-seen-${roomCode}`); playerId = asSpectator ? "__spectator__" : id; if(!asSpectator){localStorage.setItem(`island-room-${roomCode}`, id); localStorage.setItem("island-last-name", rememberName());}
  $("homeView").hidden = true; $("gameView").hidden = false; $("roomCodeDisplay").textContent = roomCode; $("connectionLabel").textContent = "オンライン"; refresh();
  if (window.pollTimer) clearInterval(window.pollTimer); window.pollTimer = setInterval(refresh, 2200);
  history.replaceState({}, "", `/?room=${roomCode}${spectating?"&spectate=1":""}`);
}
async function refresh() {
  if (!roomCode || polling||actionInFlight) return; polling = true;
  const requestedRoom=roomCode,requestedPlayer=playerId;
  try { const data = await api(`/api/rooms/${roomCode}?${spectating?"spectate=1":`playerId=${encodeURIComponent(playerId)}`}`); if(roomCode!==requestedRoom||playerId!==requestedPlayer)return;if(currentGame&&(data.game.revision||0)<(currentGame.revision||0))return;const changed = JSON.stringify(currentGame) !== JSON.stringify(data.game); currentGame = data.game; if (changed) render(); $("connectionLabel").textContent = "オンライン"; }
  catch (error) { if(roomCode!==requestedRoom||playerId!==requestedPlayer)return;$("connectionLabel").textContent="再接続中";if([403,404].includes(error.status)){
    forgetRoom(roomCode,playerId);$("leaveRoom").click();showToast(error.message);
  } }
  finally { polling = false; }
}
async function act(type, args = {}) {
  if(spectating||actionInFlight)return false;actionInFlight=true;const token={};activeActionToken=token;const actionRoom=roomCode,actionPlayer=playerId;
  try { const data = await api(`/api/rooms/${roomCode}/action`, { method: "POST", body: JSON.stringify({ playerId, type, ...args }) }); if(roomCode!==actionRoom||playerId!==actionPlayer)return false;currentGame = data.game; if(type==="offerTrade")tradeDraft={toId:"",giveCards:{},wantCards:{}}; mode = null; selectedRobberHex = null; pendingRoadCard = []; if(activeActionToken===token){actionInFlight=false;activeActionToken=null;} render(); if (soundOn) clickSound(); return true; }
  catch (error) { showToast(error.message); return false; }
  finally {if(activeActionToken===token){actionInFlight=false;activeActionToken=null;}}
}
function getTurnSoundKey(g) {
  if(g?.status!=="playing"||g.winner||["setup","special","finished"].includes(g.phase)||g.players[g.activeIndex]?.id!==playerId)return null;
  return `${g.code}:${g.matchId||g.createdAt}:turn:${g.turnNumber}:${playerId}`;
}
function playImpactSound(burst) {
  if(!soundOn||!audioContext||audioContext.state!=="running")return false;
  try {
    const now=audioContext.currentTime, notes=burst?[[160,0,.5,.12],[110,.12,.6,.12],[420,.07,.22,.045]]:[[260,0,.3,.08],[180,.22,.48,.1],[125,.45,.55,.09]];
    for(const [frequency,delay,duration,volume] of notes){
      const osc=audioContext.createOscillator(),gain=audioContext.createGain(),at=now+delay;
      osc.type=burst?"triangle":"sine";osc.frequency.value=frequency;
      gain.gain.setValueAtTime(.0001,at);gain.gain.linearRampToValueAtTime(volume,at+.018);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
      osc.connect(gain);gain.connect(audioContext.destination);osc.start(at);osc.stop(at+duration+.02);osc.onended=()=>{osc.disconnect();gain.disconnect();};
    }
    return true;
  }catch(_){return false;}
}
function playIdleReminderSound() {
  if(!soundOn||!audioContext||audioContext.state!=="running")return false;
  try {
    const now=audioContext.currentTime;
    [659.25,783.99,659.25].forEach((frequency,i)=>{
      const at=now+i*.18, oscillator=audioContext.createOscillator(), gain=audioContext.createGain();
      oscillator.type="sine";oscillator.frequency.value=frequency;
      gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(.11,at+.015);gain.gain.exponentialRampToValueAtTime(.0001,at+.4);
      oscillator.connect(gain);gain.connect(audioContext.destination);oscillator.start(at);oscillator.stop(at+.43);
      oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
    });
    return true;
  } catch (_) {return false;}
}
function playTurnChime() {
  if(!soundOn||!audioContext||audioContext.state!=="running")return false;
  try {
    const now=audioContext.currentTime;
    // Four softly overlapping bell notes: po-ro-rooon.
    [523.25,659.25,783.99,1046.5].forEach((frequency,i)=>{
      const at=now+i*.12,duration=i===3?1.25:.62;
      for(const [ratio,volume] of [[1,.11],[2,.022]]) {
        const oscillator=audioContext.createOscillator(),gain=audioContext.createGain();
        oscillator.type="sine";oscillator.frequency.value=frequency*ratio;
        gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(volume,at+.009);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
        oscillator.connect(gain);gain.connect(audioContext.destination);oscillator.start(at);oscillator.stop(at+duration+.03);
        oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
      }
    });
    return true;
  } catch (_) { return false; }
}
async function unlockAudio() {
  if(!soundOn)return;
  try {
    const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
    if(!audioContext||audioContext.state==="closed")audioContext=new Audio();
    if(audioContext.state==="suspended")await audioContext.resume();
    if(pendingVictorySoundKey&&currentGame?.winner&&pendingVictorySoundKey===`${currentGame.code}:${currentGame.matchId||currentGame.createdAt}:${currentGame.winner}`&&playVictoryFanfare()){pendingVictorySoundKey=null;pendingTurnSoundKey=null;return;}
    if(pendingTurnSoundKey&&pendingTurnSoundKey===getTurnSoundKey(currentGame)&&playTurnChime())pendingTurnSoundKey=null;
  } catch (_) {}
}
document.addEventListener("pointerdown",unlockAudio,{passive:true});
document.addEventListener("keydown",unlockAudio);
function maybePlayTurnSound(g) {
  const key=getTurnSoundKey(g);
  if(!key){pendingTurnSoundKey=null;return;}
  if(key===lastTurnSoundKey)return;
  lastTurnSoundKey=key;
  pendingTurnSoundKey=soundOn&&!playTurnChime()?key:null;
}
function clickSound() {
  if(!soundOn||!audioContext||audioContext.state!=="running")return;
  try { const oscillator=audioContext.createOscillator(),gain=audioContext.createGain();oscillator.frequency.value=510;gain.gain.value=.035;oscillator.connect(gain);gain.connect(audioContext.destination);oscillator.start();oscillator.stop(audioContext.currentTime+.035);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();}; }catch(_){}
}
function syncSoundButton() {
  const button=$("soundToggle");button.textContent=soundOn?"♪":"×";
  button.setAttribute("aria-label",soundOn?"音をオフにする":"音をオンにする");
  button.setAttribute("aria-pressed",String(soundOn));
}

document.querySelectorAll(".tab").forEach(tab => tab.addEventListener("click", () => {
  document.querySelectorAll(".tab").forEach(x => x.classList.toggle("active", x === tab)); const create = tab.dataset.tab === "create"; $("createFields").hidden = !create; $("joinFields").hidden = create; setError("");
}));
$("playerName").value = localStorage.getItem("island-last-name") || "";
$("playerName").addEventListener("keydown", e => { if (e.key === "Enter") (document.querySelector(".tab.active").dataset.tab === "create" ? $("createRoom") : $("joinRoom")).click(); });
$("createRoom").addEventListener("click", async () => {
  setError(""); try { const data = await api("/api/rooms", { method: "POST", body: JSON.stringify({ playerName: rememberName() }) }); enterRoom(data.game.code, data.playerId); }
  catch (e) { setError(e.message); }
});
$("joinRoom").addEventListener("click", async () => {
  setError(""); const code = $("roomCode").value.trim().toUpperCase(); if (!code) return setError("部屋コードを入力してください。");
  const remembered=localStorage.getItem(`island-room-${code}`);
  if(remembered){try {await api(`/api/rooms/${code}?playerId=${encodeURIComponent(remembered)}`);enterRoom(code,remembered);return;}catch(error){if(![403,404].includes(error.status))return setError(error.message);}}
  try { const data = await api(`/api/rooms/${code}/join`, { method: "POST", body: JSON.stringify({ playerName: rememberName() }) }); enterRoom(code, data.playerId); }
  catch (e) { setError(e.message); }
});
$("spectateRoom").addEventListener("click", async () => {
  setError(""); const code=$("roomCode").value.trim().toUpperCase(); if(!code)return setError("部屋コードを入力してください。");
  try {await api(`/api/rooms/${code}?spectate=1`);enterRoom(code,null,true);}catch(e){setError(e.message);}
});
$("roomCode").addEventListener("input", e => e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""));
$("startGame").addEventListener("click", () => act("start"));
$("copyCode").addEventListener("click", async () => { try { await navigator.clipboard.writeText(roomCode); showToast("部屋コードをコピーしました。"); } catch (_) { showToast(`部屋コード：${roomCode}`); } });
$("leaveRoom").addEventListener("click", () => { document.body.classList.remove("in-room"); $("turnDialog").close();$("robberDialog").close();$("tradeDialog").close();robberGuideKey=null;$("developmentDialog").close();$("logDialog").close();$("diceResultDialog").close();$("tradeOfferDialog").close();$("victoryDialog").close();activeTradeOfferId=null;seenTradeOfferIds.clear();lastTurnNotice=null;pendingTurnNotice=null; if (window.pollTimer) clearInterval(window.pollTimer); roomCode = null; playerId = null; currentGame = null; spectating=false; resetActionNotifications(); updateIdleReminder(); renderResumeRooms();renderHomeStats(); history.replaceState({}, "", "/"); $("gameView").hidden = true; $("homeView").hidden = false; });
$("soundToggle").addEventListener("click", () => { soundOn=!soundOn;localStorage.setItem("island-sound-on",soundOn?"1":"0");if(!soundOn){pendingTurnSoundKey=null;pendingVictorySoundKey=null;}else unlockAudio();syncSoundButton();showToast(soundOn?"通知音をオンにしました。":"通知音をオフにしました。"); });
syncSoundButton();

function render() {
  if (!currentGame) return;
  syncActionNotifications(currentGame); syncImpactEffects(currentGame);
  const g = currentGame, me = spectating ? {id:playerId,hand:{},devCards:[],roads:[],settlements:[],cities:[]} : g.players.find(p => p.id === playerId), active = g.phase === "special" ? g.players.find(p => p.id === g.specialPlayerId) : g.players[g.activeIndex];
  if (!me) return;
  if(renderedMatchId!==(g.matchId||g.createdAt)){
    renderedMatchId=g.matchId||g.createdAt;mode=null;pendingRoadCard=[];selectedRobberHex=null;boardZoom=1;boardPan={x:0,y:0};
    if(!g.winner)for(const id of ["victoryDialog","turnDialog","diceResultDialog","tradeOfferDialog"])if($(id).open)$(id).close();
  }
  if(!spectating)rememberRoom(g,me);syncRematchUI(g,me);
  $("handTitle").textContent=spectating?"観戦中":"あなたの手札";
  $("handTotal").hidden=spectating;$("resourceHand").hidden=spectating;$("developmentHand").hidden=spectating;$("autoSkipControl").hidden=spectating;$("buildingGuide").hidden=spectating;
  $("gameTitle").textContent = g.status === "lobby" ? "対戦ルーム" : (g.winner ? "ゲーム終了" : "島を開拓しよう" );
  $("gameStatusLabel").textContent = spectating ? "👀 観戦中" : g.status === "lobby" ? "ROOM LOBBY" : g.winner ? "GAME FINISHED" : `TURN ${g.turnNumber || 1}`;
  $("playerCount").textContent = `${g.players.length} / 6`;
  const isMyTurn = active?.id === playerId;
  if (g.status === "lobby") {
    $("boardEmpty").hidden = false; $("board").setAttribute("hidden", ""); $("startGame").hidden = !(me.id === g.hostId && g.players.length >= 3);
    $("turnBanner").textContent = g.players.length < 3 ? `あと${3 - g.players.length}人で開始できます` : (me.id === g.hostId ? "準備ができたらゲームを開始" : "ホストがゲームを開始するのを待っています");
    $("lobbyPlayers").innerHTML = g.players.map(p => `<span class="lobby-player-chip"><i class="player-swatch" style="display:inline-block;background:${p.color};margin-right:5px"></i>${escapeHtml(p.name)}${p.id === g.hostId ? " · ホスト" : ""}</span>`).join("");
    $("phaseNotice").textContent = "3〜6人で遊べます。ホストが開始すると盤面が生成されます。"; $("mainActions").innerHTML = ""; $("buildActions").innerHTML = ""; $("devActions").innerHTML = "";
  } else {
    $("boardEmpty").hidden = true; $("board").removeAttribute("hidden"); $("startGame").hidden = true; drawBoard(g, me);
    if (g.dice) $("diceDisplay").innerHTML = `🎲 ${g.dice[0]} <span>+</span> ${g.dice[1]} <b>= ${g.dice[0] + g.dice[1]}</b>`; else $("diceDisplay").textContent = "";
    if (g.winner) $("turnBanner").textContent = `${g.players.find(p => p.id === g.winner)?.name} の勝利！`;
    else if (g.phase === "setup") $("turnBanner").textContent = `${active?.name}：${g.setupStep === "settlement" ? "開拓地" : "道"}を配置`;
    else if (g.phase === "discard") $("turnBanner").textContent = "手札の調整中";
    else if (g.phase === "robber") $("turnBanner").textContent = `${active?.name}：盗賊を移動`;
    else if (g.phase === "special") $("turnBanner").textContent = `${active?.name}：特別建設フェーズ${isMyTurn ? " · 建設できます" : ""}`;
    else $("turnBanner").textContent = `${active?.name} のターン${isMyTurn ? " · あなたの番" : ""}`;
    renderActions(g, me, isMyTurn);
  }
  renderPlayers(g, me); if(!spectating)renderHand(me,g); renderLog(g); if(!spectating)renderBuildingGuide(g, me); renderProduction(g); maybePlayTurnSound(g); maybeShowDiceResult(g); if(!spectating){maybeShowTurnNotice(g, me); maybeShowTradeOffer(g,me); saveOwnMatchResult(g,me);} maybeShowVictory(g); if($("developmentDialog").open)updateDevelopmentDialog(); syncGuidedDialogs(g); updateIdleReminder();
}
function renderPlayers(g, me) {
  $("playersList").innerHTML=g.players.map((p,i)=>{
    const active=g.status==="playing"&&(g.phase==="special"?p.id===g.specialPlayerId:i===g.activeIndex);
    const badges=(g.largestArmyOwner===p.id?'<span class="player-award army-award" title="最大騎士力による2勝利点">♞ 最大騎士力 +2点</span>':'')+(g.longestRoadOwner===p.id?'<span class="player-award road-award" title="最長交易路による2勝利点">━ 最長交易路 +2点</span>':'');
    return `<div class="player-row ${active?'active':''}"><i class="player-swatch" style="background:${p.color}"></i><div class="player-row-main"><div class="player-name-and-points"><div class="player-row-name">${escapeHtml(p.name)}${p.id===g.hostId?'<span class="host-tag">HOST</span>':''}${p.id===playerId?' <span class="self-player-label">(あなた)</span>':''}</div><span class="player-points">${p.victoryPoints??'—'}点</span></div><div class="player-public-stats"><span class="knight-stat" title="実際に使用した騎士カードの枚数">♞ 騎士 <b>${p.playedKnights||0}</b>回</span><span title="つながっている道の最大長。建設した道の総数とは異なります。">最長の道 <b>${p.longestRoad||0}</b>本</span></div><div class="player-row-meta">手札 ${p.handCount||0}枚 · 発展 ${p.devCount||0}枚</div><div class="player-row-meta">開拓地 ${p.settlements?.length||0} · 都市 ${p.cities?.length||0} · 道 ${p.roads?.length||0}本</div>${badges?'<div class="player-awards">'+badges+'</div>':''}</div></div>`;
  }).join("");
}
function renderHand(me,g) {
  const hand = me.hand || Object.fromEntries(RESOURCES.map(r => [r, 0])), total = RESOURCES.reduce((n, r) => n + hand[r], 0);
  $("handTotal").textContent = `${total}枚`;
  $("resourceHand").innerHTML = RESOURCES.map(r => `<div class="resource-card"><span class="res-symbol"><img src="/assets/${r}.svg" alt="${RESOURCE[r][1]}" /></span><b>${hand[r]}</b><small>${RESOURCE[r][1]}</small></div>`).join("");
  const info={
    knight:{name:"騎士",icon:"♞",effect:"盗賊を別のタイルへ移し、そのタイルに建物がある相手1人から資源をランダムに1枚奪います。使用した騎士が3枚以上になると、最大騎士力（2点）の対象になります。"},
    victory:{name:"勝利点",icon:"★",effect:"1枚につき1勝利点です。このゲームでは所持している間、自分の得点に自動加算されます。ほかのプレイヤーにはカードの種類とこの勝利点は公開されません。"},
    road:{name:"街道建設",icon:"━",effect:"資源を払わずに道を最大2本建設できます。通常の道路の接続条件が適用されます。"},
    plenty:{name:"豊作",icon:"❧",effect:"銀行から好きな資源を合計2枚受け取ります。同じ種類を2枚選ぶこともできます。銀行に残っている資源から選びます。"},
    monopoly:{name:"独占",icon:"⇄",effect:"資源を1種類指定し、ほかの全プレイヤーが持っているその資源をすべて受け取ります。"}
  };
  const cards=me.devCards||[],turn=g?.turnNumber??0;
  $("developmentHand").innerHTML='<div class="development-hand-heading"><b>発展カード</b><small>'+cards.length+'枚</small></div>'+
    (cards.length?'<div class="owned-dev-grid">'+Object.entries(info).filter(([type])=>cards.some(c=>c.type===type)).map(([type,d])=>{
      const owned=cards.filter(c=>c.type===type),fresh=owned.filter(c=>c.boughtTurn>=turn).length;
      const timing=type==="victory"?"得点に加算済み":fresh===owned.length?"今ターン購入":fresh?"今ターン購入 "+fresh+"枚":"所持中";
      const note=type==="victory"?"勝利点カードは使用操作が不要です。":"購入したターンには使えません。発展カードの使用は自分の通常ターンに1枚までです。";
      return `<button class="owned-dev-card dev-${type}" type="button" aria-expanded="false" aria-describedby="dev-effect-${type}"><span class="owned-dev-symbol">${d.icon}</span><span class="owned-dev-name">${d.name}</span><b class="owned-dev-count">×${owned.length}</b><small class="owned-dev-timing">${timing}</small><span class="dev-effect-tooltip" id="dev-effect-${type}" role="tooltip"><strong>${d.name}</strong><span>${d.effect}</span><em>${note}</em></span></button>`;
    }).join('')+'</div><small class="dev-help">カーソルを合わせる・タップで効果を表示</small>':'<p class="empty-development">発展カードはまだありません</p>');
  $("developmentHand").querySelectorAll(".owned-dev-card").forEach(button=>button.onclick=()=>{
    const open=button.getAttribute("aria-expanded")==="true";
    $("developmentHand").querySelectorAll(".owned-dev-card").forEach(b=>b.setAttribute("aria-expanded","false"));
    button.setAttribute("aria-expanded",String(!open));
  });

}
document.addEventListener("pointerdown",e=>{if(!e.target.closest?.(".owned-dev-card"))document.querySelectorAll(".owned-dev-card[aria-expanded=true]").forEach(b=>b.setAttribute("aria-expanded","false"));});
document.addEventListener("keydown",e=>{if(e.key==="Escape")document.querySelectorAll(".owned-dev-card[aria-expanded=true]").forEach(b=>b.setAttribute("aria-expanded","false"));});
function renderActions(g, me, isMyTurn) {
  let notice = ""; const main = [], build = [], dev = [];

  if (g.winner) notice = `${g.players.find(p => p.id === g.winner)?.name}が10点に到達しました。`;
  else if (g.phase === "setup") notice = isMyTurn ? (g.setupStep === "settlement" ? "盤面の交差点を選んで開拓地を置きます。" : "開拓地に接する辺を選んで道を置きます。") : `${g.players[g.activeIndex]?.name}の初期配置を待っています。`;
  else if (g.phase === "discard") {
    const need = g.discardPending?.[playerId];
    notice = need ? `資源を${need}枚捨ててください。` : `${g.players.filter(p => g.discardPending?.[p.id]).map(p => p.name).join("、")}が資源を捨てています。`;
    if (need) main.push(`<div class="discard-row">${RESOURCES.map(r => `<label class="discard-label">${RESOURCE[r][0]}<select data-discard="${r}" class="discard-select">${Array.from({length:Math.min(need, me.hand[r])+1}, (_,i)=>`<option value="${i}">${i}</option>`).join("")}</select></label>`).join("")}<button class="action-btn primary" id="submitDiscard">決定</button></div>`);
  } else if (g.phase === "robber") {
    notice = isMyTurn ? (selectedRobberHex ? "盗賊を移動するタイルを確認し、相手を選んでください。" : "盤面の別の地形タイルを選び、盗賊を移動します。") : `${g.players[g.activeIndex]?.name}が盗賊を移動しています。`;
    if(isMyTurn)main.push(`<button class="action-btn primary" data-action="robberGuide">${selectedRobberHex?"盗賊の移動先を確認":"盗賊の移動方法を見る"}</button>`);
  } else if (g.phase === "play") {
    notice = isMyTurn ? "サイコロを振って資源を受け取ります。" : `${g.players[g.activeIndex]?.name}の手番です。`;
    if (isMyTurn) main.push(`<button class="action-btn primary" data-action="roll">🎲 サイコロを振る</button>`);
  } else if (g.phase === "main") {
    notice = isMyTurn ? "建設、交換、発展カードを使えます。" : `${g.players[g.activeIndex]?.name}が行動中です。`;
    if (isMyTurn) {
      main.push(`<button class="action-btn" data-action="bankToggle">⇄ 銀行交換</button><button class="action-btn" data-action="playerTradeToggle">⇄ 交渉</button><button class="action-btn" data-action="endTurn" style="grid-column:1/-1">ターン終了 →</button>`);
      build.push(`<button class="action-btn ${mode === "road" ? "active-mode" : ""}" data-mode="road">道を建設</button><button class="action-btn ${mode === "settlement" ? "active-mode" : ""}" data-mode="settlement">開拓地を建設</button><button class="action-btn ${mode === "city" ? "active-mode" : ""}" data-mode="city">都市にする</button><button class="action-btn" data-action="buyDevelopment">発展カードを購入</button>`);

      if (me.devCards?.length) {
        const labels = { knight: "騎士", victory: "勝利点", road: "街道建設", plenty: "豊作", monopoly: "独占" };

        for (const type of ["knight", "plenty", "monopoly", "road"]) if (me.devCards.some(c => c.type === type && c.boughtTurn < g.turnNumber)) dev.push(`<button class="action-btn" data-card="${type}" ${me.usedDevCard ? "disabled" : ""}>${labels[type]}を使う</button>`);
      }
    }
  } else if (g.phase === "special") {
    notice = isMyTurn ? "5〜6人戦の特別建設です。資源を使って建設できます。" : `${g.players.find(p => p.id === g.specialPlayerId)?.name}の特別建設を待っています。`;
    if (isMyTurn) {
      main.push(`<button class="action-btn primary" data-action="endSpecial" style="grid-column:1/-1">建設を終えて次へ →</button>`);
      build.push(`<button class="action-btn ${mode === "road" ? "active-mode" : ""}" data-mode="road">道を建設</button><button class="action-btn ${mode === "settlement" ? "active-mode" : ""}" data-mode="settlement">開拓地を建設</button><button class="action-btn ${mode === "city" ? "active-mode" : ""}" data-mode="city">都市にする</button><button class="action-btn" data-action="buyDevelopment">発展カードを購入</button>`);
    }
  }
  if (g.phase === "main" && !isMyTurn && (g.tradeOffers || []).some(o => o.status === "pending" && o.toId === playerId)) main.push(`<button class="action-btn" data-action="playerTradeToggle">交換の提示を見る</button>`);

  if (g.winner && !spectating) { main.push(`<button class="action-btn primary" data-action="rematchReady">${(g.rematchReadyIds||[]).includes(playerId)?"再戦準備を取り消す":"同じメンバーで再戦"}（${g.rematchReadyIds?.length||0}/${g.players.length}）</button><button class="action-btn primary" data-action="viewResults">🏆 結果を見る</button><button class="action-btn" onclick="location.href='/'">新しいゲームを始める</button>`); }
  if(g.winner && spectating)main.push(`<button class="action-btn primary" data-action="viewResults">🏆 結果を見る</button>`);
  $("phaseNotice").textContent = notice; $("mainActions").innerHTML = main.join(""); $("buildActions").innerHTML = build.join(""); $("devActions").innerHTML = dev.join("");
  document.querySelectorAll("[data-action]").forEach(button => button.addEventListener("click", () => {
    const action = button.dataset.action;
    if(action==="viewResults"){showVictory(currentGame);return;}
    if(action==="rematchReady"){toggleRematchReady();return;}
    if (action === "robberGuide") { openRobberDialog(); return; }
    if (action === "bankToggle") { openTradeDialog("bank"); return; }
    if (action === "playerTradeToggle") { const me=currentGame.players.find(p=>p.id===playerId),incoming=incomingTradeOffers(currentGame)[0]; if(incoming){showTradeOffer(currentGame,me,incoming);return;} openTradeDialog("player"); return; }
    if (action === "roll") return act("roll");
    if (action === "endTurn") return act("endTurn");
    if (action === "endSpecial") return act("endSpecial");
    if (action === "buyDevelopment") return act("buyDevelopment");
  }));
  document.querySelectorAll("[data-mode]").forEach(button => button.addEventListener("click", () => { mode = mode === button.dataset.mode ? null : button.dataset.mode;pendingRoadCard=[]; render(); }));
  document.querySelectorAll("[data-card]").forEach(button => button.addEventListener("click", () => useDevelopment(button.dataset.card)));
  const discardButton = $("submitDiscard"); if (discardButton) discardButton.onclick = () => { const cards = Object.fromEntries(RESOURCES.map(r => [r, Number(document.querySelector(`[data-discard="${r}"]`).value)])); act("discard", { cards }); };
}
function robberAvailable(g) {return !!g&&!spectating&&g.status==="playing"&&!g.winner&&g.phase==="robber"&&g.players[g.activeIndex]?.id===playerId;}
function openRobberDialog() {
  const g=currentGame;if(!robberAvailable(g))return;
  const hex=g.map.hexes.find(h=>h.id===selectedRobberHex),panel=$("robberVictims");
  $("robberDialogStep").textContent=hex?"② 相手を選んで確定":"① 盤面で移動先を選ぶ";
  $("robberDialogInfo").textContent=hex?`移動先：${TERRAIN[hex.terrain][0]}${hex.number?"（数字 "+hex.number+"）":""}。盗賊がいる土地では資源が生産されません。`:"盗賊を今いる場所以外へ移します。移動先に相手の建物があれば、その相手から資源を1枚奪えます。";
  const victims=hex?g.players.filter(p=>p.id!==playerId&&[...p.settlements,...p.cities].some(v=>hex.corners.includes(v))&&p.handCount>0):[];
  if(!victims.some(p=>p.id===selectedVictim))selectedVictim=victims.length===1?victims[0].id:"";
  panel.innerHTML=hex?(victims.length?'<b>資源を奪う相手</b>'+victims.map(p=>`<button type="button" class="robber-victim ${selectedVictim===p.id?"selected":""}" data-robber-victim="${p.id}" aria-pressed="${selectedVictim===p.id}"><i style="background:${p.color}"></i><span>${escapeHtml(p.name)}</span><small>手札 ${p.handCount}枚</small></button>`).join(""):'<p>奪える相手はいません。盗賊の移動のみ行います。</p>'):"";
  panel.querySelectorAll("[data-robber-victim]").forEach(b=>b.onclick=()=>{selectedVictim=b.dataset.robberVictim;openRobberDialog();});
  $("robberDialogStatus").textContent=hex?(victims.length>1&&!selectedVictim?"資源を奪う相手を1人選んでください。":"内容を確認して移動を確定してください。"):"盤面の土地をタップしてください。";
  $("robberConfirm").hidden=!hex;$("robberConfirm").disabled=robberSubmitting||(victims.length>0&&!selectedVictim);
  $("robberChooseTile").textContent=hex?"移動先を選び直す":"盤面で移動先を選ぶ";
  if(!$("robberDialog").open)$("robberDialog").showModal();
}
$("closeRobberDialog").onclick=()=>$("robberDialog").close();
$("robberChooseTile").onclick=()=>{$("robberDialog").close();$("boardWrap").scrollIntoView({block:"nearest",behavior:"smooth"});};
$("robberConfirm").onclick=async()=>{if(robberSubmitting||$("robberConfirm").disabled||!selectedRobberHex)return;robberSubmitting=true;$("robberConfirm").disabled=true;try{if(await act("moveRobber",{hexId:selectedRobberHex,victimId:selectedVictim}))$("robberDialog").close();}finally{robberSubmitting=false;if($("robberDialog").open)openRobberDialog();}};
function syncGuidedDialogs(g) {
  if(!robberAvailable(g)){robberGuideKey=null;if($("robberDialog").open)$("robberDialog").close();}
  else {const key=`${g.code}:${g.matchId||g.createdAt}:${g.turnNumber}:${g.lastRoll?.id||""}:${!!g.pendingDevKnight}`;
    if(key!==robberGuideKey&&!selectedRobberHex&&!['diceResultDialog','turnDialog','developmentDialog','tradeOfferDialog','victoryDialog','logDialog'].some(id=>$(id).open)){robberGuideKey=key;openRobberDialog();}}
  if($("tradeDialog").open&&(g.phase!=="main"||g.winner||g.players[g.activeIndex]?.id!==playerId))$("tradeDialog").close();
  else if($("tradeDialog").open&&tradeDialogMode==="bank")updateBankTrade();
}
$("turnDialog").addEventListener("close",()=>{if(currentGame)syncGuidedDialogs(currentGame);});
$("logDialog").addEventListener("close",()=>{if(currentGame)syncGuidedDialogs(currentGame);});
function openTradeDialog(type) {
  const g=currentGame;if(!g||spectating||g.phase!=="main"||g.players[g.activeIndex]?.id!==playerId)return;
  tradeDialogMode=type;$("tradeDialogTitle").textContent=type==="bank"?"銀行・港と交換":"プレイヤーと交渉";
  $("tradeDialogDescription").textContent=type==="bank"?"渡す資源と受け取る資源を選びます":"相手と、渡す・受け取る資源を選びます";
  const panel=$("tradeActions");
  if(type==="player")renderPlayerTrades(g);
  else {panel.innerHTML=`<p class="guided-info">同じ資源を必要枚数渡し、好きな資源を1枚受け取ります。港を持っている場合は交換比率が下がります。</p><label class="trade-field">渡す資源<select id="modalTradeGive">${RESOURCES.map(r=>`<option value="${r}">${RESOURCE[r][1]}（${g.tradeRates?.[r]||4}枚必要・手札${g.players.find(p=>p.id===playerId).hand[r]}枚）</option>`).join("")}</select></label><label class="trade-field">受け取る資源<select id="modalTradeWant">${RESOURCES.map(r=>`<option value="${r}">${RESOURCE[r][1]}（銀行${g.bankResources?.[r]??"?"}枚）</option>`).join("")}</select></label><p id="bankTradeStatus" class="guided-status" aria-live="polite"></p><button id="confirmBankTrade" class="primary-button">この条件で交換</button>`;
    if($("modalTradeWant"))$("modalTradeWant").value="brick";
    if($("modalTradeGive"))$("modalTradeGive").onchange=updateBankTrade;
    if($("modalTradeWant"))$("modalTradeWant").onchange=updateBankTrade;
    if($("confirmBankTrade"))$("confirmBankTrade").onclick=async()=>{const give=$("modalTradeGive").value,want=$("modalTradeWant").value;if(await act("tradeBank",{give,want})){$("tradeDialog").close();showToast("銀行と交換しました。");}else updateBankTrade();};
    updateBankTrade();}
  if(!$("tradeDialog").open)$("tradeDialog").showModal();
}
function updateBankTrade() {
  const give=$("modalTradeGive")?.value,want=$("modalTradeWant")?.value,button=$("confirmBankTrade"),status=$("bankTradeStatus"),g=currentGame,me=g?.players.find(p=>p.id===playerId);
  if(!button||!status||!me||!give||!want)return;
  const rate=g.tradeRates?.[give]||4;let message="";
  if(g.phase!=="main"||g.players[g.activeIndex]?.id!==playerId)message="現在は交換できません。";
  else if(give===want)message="異なる資源を選んでください。";
  else if(me.hand[give]<rate)message=`${RESOURCE[give][1]}が${rate}枚必要です（手札${me.hand[give]}枚）。`;
  else if(g.bankResources?.[want]===0)message="受け取る資源が銀行にありません。";
  button.disabled=!!message;status.textContent=message||`${RESOURCE[give][1]} ${rate}枚 → ${RESOURCE[want][1]} 1枚`;
}
$("closeTradeDialog").onclick=()=>$("tradeDialog").close();
$("cancelTradeDialog").onclick=()=>$("tradeDialog").close();
$("tradeDialog").addEventListener("close",()=>{tradeDialogMode=null;const me=currentGame?.players.find(p=>p.id===playerId);if(me)maybeShowTradeOffer(currentGame,me);});

function offerBundle(offer,side) {
  return Object.fromEntries(RESOURCES.map(r=>[r,Number(offer[side+"Cards"]?.[r]??(offer[side]===r?offer[side+"Count"]:0))||0]));
}
function resourceBundleText(cards) {return RESOURCES.filter(r=>cards[r]>0).map(r=>RESOURCE[r][1]+"×"+cards[r]).join(" ＋ ")||"なし";}
function resourceBundleHTML(cards) {return RESOURCES.filter(r=>cards[r]>0).map(r=>`<span class="bundle-item"><img src="/assets/${r}.svg" alt="${RESOURCE[r][1]}"><b>${RESOURCE[r][1]} ×${cards[r]}</b></span>`).join("");}
function renderPlayerTrades(g) {
  const panel=$("tradeActions"),others=g.players.filter(p=>p.id!==playerId),me=g.players.find(p=>p.id===playerId);
  const offers=(g.tradeOffers||[]).filter(o=>o.status==="pending"&&(o.toId===playerId||o.fromId===playerId));
  const offerMarkup=offers.map(o=>`<div class="offer-row"><small>${escapeHtml(g.players.find(p=>p.id===o.fromId)?.name)} → ${escapeHtml(g.players.find(p=>p.id===o.toId)?.name)}<br>${resourceBundleText(offerBundle(o,"give"))} ⇄ ${resourceBundleText(offerBundle(o,"want"))}</small>${o.toId===playerId?`<button class="action-btn primary" data-accept-offer="${o.id}">受ける</button><button class="action-btn" data-decline-offer="${o.id}">断る</button>`:'<span class="waiting-offer">返事待ち</span>'}</div>`).join("");
  const canOffer=g.players[g.activeIndex]?.id===playerId;
  if(!others.some(p=>p.id===tradeDraft.toId))tradeDraft.toId=others[0]?.id||"";
  const form=canOffer?`<div class="multi-trade-form"><select id="tradeTarget">${others.map(p=>`<option value="${p.id}" ${p.id===tradeDraft.toId?'selected':''}>${escapeHtml(p.name)}と交換</option>`).join("")}</select><div class="multi-trade-header"><span>資源</span><b>渡す</b><b>受け取る</b></div>${RESOURCES.map(r=>`<label class="multi-trade-row"><span><img src="/assets/${r}.svg" alt="">${RESOURCE[r][1]}</span><input data-trade-side="giveCards" data-resource="${r}" type="number" min="0" max="${me.hand[r]}" value="${tradeDraft.giveCards[r]||0}" aria-label="渡す${RESOURCE[r][1]}の枚数"><input data-trade-side="wantCards" data-resource="${r}" type="number" min="0" max="24" value="${tradeDraft.wantCards[r]||0}" aria-label="受け取る${RESOURCE[r][1]}の枚数"></label>`).join("")}<small>複数種類をまとめて提示できます。</small><button id="offerTradeButton" class="action-btn primary">この条件で交換を提示</button></div>`:"";
  panel.innerHTML=form+`<div class="offers-list">${offerMarkup||'<small class="no-offers">交換の提示はありません。</small>'}</div>`;
  if($("tradeTarget"))$("tradeTarget").onchange=e=>tradeDraft.toId=e.target.value;
  panel.querySelectorAll("[data-trade-side]").forEach(input=>input.oninput=()=>tradeDraft[input.dataset.tradeSide][input.dataset.resource]=Number(input.value));
  if($("offerTradeButton"))$("offerTradeButton").onclick=async()=>{if(await act("offerTrade",{toId:tradeDraft.toId,giveCards:{...tradeDraft.giveCards},wantCards:{...tradeDraft.wantCards}})){$("tradeDialog").close();showToast("交換の提案を送りました。");}};
  panel.querySelectorAll("[data-accept-offer]").forEach(b=>b.onclick=()=>act("respondTrade",{offerId:b.dataset.acceptOffer,accept:true}));
  panel.querySelectorAll("[data-decline-offer]").forEach(b=>b.onclick=()=>act("respondTrade",{offerId:b.dataset.declineOffer,accept:false}));
}
let developmentDraft=null,developmentSubmitting=false;
const DEVELOPMENT_INFO={
  knight:{name:"騎士",effect:"盗賊を別の地形へ移動し、その地形に建物がある相手から資源を1枚奪います。",instructions:"カードを使ったあと、盤面で盗賊の移動先を選びます。"},
  plenty:{name:"豊作",effect:"銀行から好きな資源を合計2枚受け取ります。同じ資源を2枚選ぶこともできます。",instructions:"受け取る資源を合計2枚選んでください。銀行にない資源は選べません。"},
  monopoly:{name:"独占",effect:"選んだ資源を、他の全プレイヤーからすべて受け取ります。",instructions:"独占する資源を1種類選んでください。"},
  road:{name:"街道建設",effect:"資源を払わずに道を最大2本建設します。通常の道の接続ルールが適用されます。",instructions:"盤面に戻ったら光っている辺を1〜2本選び、「道を確定」を押してください。確定前ならキャンセルできます。"}
};
function useDevelopment(type) {
  if(!DEVELOPMENT_INFO[type]||spectating)return;
  developmentDraft={type,cards:Object.fromEntries(RESOURCES.map(r=>[r,0])),resource:null};
  $("developmentDialogTitle").textContent=DEVELOPMENT_INFO[type].name+"を使う";
  $("developmentEffect").textContent=DEVELOPMENT_INFO[type].effect;
  $("developmentInstructions").textContent=DEVELOPMENT_INFO[type].instructions;
  updateDevelopmentDialog();
  if(!$("developmentDialog").open)$("developmentDialog").showModal();
}
function updateDevelopmentDialog() {
  if(!developmentDraft)return;
  const {type,cards,resource}=developmentDraft, total=RESOURCES.reduce((n,r)=>n+cards[r],0), bank=currentGame?.bankResources;
  const selecting=type==="plenty"||type==="monopoly";
  $("developmentChoices").innerHTML=selecting?RESOURCES.map(r=>{
    const n=cards[r],available=bank?.[r], selected=type==="monopoly"&&resource===r;
    if(type==="plenty")return `<div class="development-choice"><img src="/assets/${r}.svg" alt=""><b>${RESOURCE[r][1]}</b><small>${available==null?"":"銀行 "+available+"枚"}</small><div class="development-stepper"><button type="button" data-dev-minus="${r}" aria-label="${RESOURCE[r][1]}を減らす" ${n===0?"disabled":""}>−</button><strong>${n}</strong><button type="button" data-dev-plus="${r}" aria-label="${RESOURCE[r][1]}を増やす" ${total>=2||(available!=null&&n>=available)?"disabled":""}>＋</button></div></div>`;
    return `<button type="button" class="development-choice development-resource ${selected?"selected":""}" data-dev-resource="${r}" aria-pressed="${selected}"><img src="/assets/${r}.svg" alt=""><b>${RESOURCE[r][1]}</b><small>${selected?"選択中":"選ぶ"}</small></button>`;
  }).join(""):"";
  const panel=$("developmentChoices");
  panel.querySelectorAll("[data-dev-minus]").forEach(b=>b.onclick=()=>{cards[b.dataset.devMinus]--;updateDevelopmentDialog();});
  panel.querySelectorAll("[data-dev-plus]").forEach(b=>b.onclick=()=>{const r=b.dataset.devPlus;if(RESOURCES.reduce((n,k)=>n+cards[k],0)<2&&(bank?.[r]==null||cards[r]<bank[r]))cards[r]++;updateDevelopmentDialog();});
  panel.querySelectorAll("[data-dev-resource]").forEach(b=>b.onclick=()=>{developmentDraft.resource=b.dataset.devResource;updateDevelopmentDialog();});
  $("developmentSelection").textContent=type==="plenty"?(total===2?"受け取る資源："+resourceBundleText(cards):`あと${2-total}枚選んでください`):type==="monopoly"?(resource?"独占する資源："+RESOURCE[resource][1]:"資源を1種類選んでください"):"";
  const unavailable=type==="plenty"&&bank&&RESOURCES.some(r=>cards[r]>(bank[r]??0));
  if(unavailable)$("developmentSelection").textContent="銀行の残数が変わりました。選び直してください。";
  $("confirmDevelopment").disabled=developmentSubmitting||!!unavailable||(type==="plenty"&&total!==2)||(type==="monopoly"&&!resource);
  $("confirmDevelopment").textContent=type==="road"?"盤面で道を選ぶ":type==="knight"?"騎士を使う":type==="plenty"?"この資源を受け取る":"この資源を独占する";
}
$("closeDevelopment").onclick=()=>$("developmentDialog").close();
$("cancelDevelopment").onclick=()=>$("developmentDialog").close();
$("developmentDialog").addEventListener("close",()=>{developmentDraft=null;if(currentGame)syncGuidedDialogs(currentGame);});
$("confirmDevelopment").onclick=async()=>{
  if(!developmentDraft||developmentSubmitting||$("confirmDevelopment").disabled)return;
  const {type,cards,resource}=developmentDraft;
  if(type==="road"){$("developmentDialog").close();mode="roadCard";pendingRoadCard=[];render();showToast("光っている道を1〜2本選び、確定してください。");return;}
  developmentSubmitting=true;updateDevelopmentDialog();
  try {const ok=await act("playCard",{card:type,...(type==="plenty"?{cards:{...cards}}:type==="monopoly"?{resource}:{})});if(ok){$("developmentDialog").close();if(type==="knight")showToast("盗賊を移動するタイルを選んでください。");}}
  finally {developmentSubmitting=false;updateDevelopmentDialog();}
};

function drawBoard(g, me) {
  const svg = $("board"); if (!g.map) return;
  const targets=buildTargets(g,me);
  const map = g.map, vertices = new Map(map.vertices.map(v => [v.id, v])), edges = new Map(map.edges.map(e => [e.id, e]));
  const maxX = Math.max(...map.vertices.map(v=>v.x))-Math.min(...map.vertices.map(v=>v.x)), maxY = Math.max(...map.vertices.map(v=>v.y))-Math.min(...map.vertices.map(v=>v.y));
  const scale = Math.min(740 / (maxX + 3.5), 600 / (maxY + 3.5)), px = v => 450 + (v.x - map.centerX) * scale, py = v => 335 + (v.y - map.centerY) * scale;
  let content = `<defs><pattern id="ocean-waves" width="44" height="30" patternUnits="userSpaceOnUse"><rect width="44" height="30" fill="#168ba7"/><path d="M-10 9 Q0 3 11 9 T33 9 T55 9 M12 24 Q23 18 34 24 T56 24" fill="none" stroke="#6bd3db" stroke-width="1.1" opacity=".3"/></pattern><filter id="token-shadow" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="2" stdDeviation="1.3" flood-opacity=".4"/></filter></defs>`;
  const landCoords = new Set(map.hexes.map(h => `${h.q},${h.r}`)), seaCoords = new Map();
  for (const h of map.hexes) for (const [dq, dr] of [[1,0],[-1,0],[0,1],[0,-1],[1,-1],[-1,1]]) {
    const q=h.q+dq,r=h.r+dr,key=`${q},${r}`;if(!landCoords.has(key)) seaCoords.set(key,{q,r});
  }
  for(const {q,r} of seaCoords.values()) {
    const cx=450+(Math.sqrt(3)*(q+r/2)-map.centerX)*scale,cy=335+(1.5*r-map.centerY)*scale;
    const points=[-90,-30,30,90,150,210].map(a=>`${cx+scale*Math.cos(a*Math.PI/180)},${cy+scale*Math.sin(a*Math.PI/180)}`).join(' ');
    content+=`<polygon points="${points}" fill="url(#ocean-waves)" stroke="#126d87" stroke-width="1"/>`;
  }
  for (const h of map.hexes) {
    const points = h.corners.map(id => { const v=vertices.get(id); return `${px(v)},${py(v)}`; }).join(" ");
    const [terrainLabel, icon] = TERRAIN[h.terrain];
    const hx=450+(h.x-map.centerX)*scale,hy=335+(h.y-map.centerY)*scale;
    content += `<defs><clipPath id="clip-${h.id}"><polygon points="${points}"/></clipPath></defs><polygon class="hex hex-${h.terrain}" points="${points}" data-hex="${h.id}"/><image href="/assets/${h.terrain}.svg" x="${hx-Math.sqrt(3)*scale/2}" y="${hy-scale}" width="${Math.sqrt(3)*scale}" height="${2*scale}" preserveAspectRatio="none" clip-path="url(#clip-${h.id})" pointer-events="none"/><polygon points="${points}" class="tile-rim"/>`;
    if(g.phase==="robber"&&g.players[g.activeIndex]?.id===playerId&&h.id!==map.robber)content+=`<polygon points="${points}" class="robber-target-outline"/>`;
    if(impactHex===h.id)content+=`<polygon points="${points}" class="robber-impact-tile"/>`;
    if(g.dice&&g.lastProduction?.id===g.lastRoll?.id){
      if(g.lastProduction.tiles.includes(h.id))content+=`<polygon points="${points}" class="produced-tile"/>`;
      if(g.lastProduction.blockedTiles.includes(h.id))content+=`<polygon points="${points}" class="blocked-production-tile"/>`;
    }
    if (h.number) {
      const hot = h.number === 6 || h.number === 8, cx=450+(h.x-map.centerX)*scale, cy=335+(h.y-map.centerY)*scale;
      content += `<circle class="hex-number ${hot ? "hot" : ""}" cx="${cx}" cy="${cy}" r="17"/><text class="hex-num-text ${hot ? 'hot' : ''}" x="${cx}" y="${cy-3}">${h.number}</text><text class="hex-num-pips ${hot ? 'hot' : ''}" x="${cx}" y="${cy+9}">${"•".repeat(Math.max(1, 6-Math.abs(7-h.number)))}</text>`;
    }
    if (h.id === map.robber) content += `<g transform="translate(${hx+24},${hy-8})" class="wood-robber"><ellipse cx="0" cy="19" rx="10" ry="4" fill="#16344266"/><path d="M-9 16 Q-7 4 -4 0 Q-10 -11 0 -13 Q10 -11 4 0 Q7 4 9 16 Z" fill="#5e6770" stroke="#202f37" stroke-width="2"/><path d="M-3 -8 Q0 -10 2 -7 M-3 3 L-5 12" stroke="#c9d0d0" stroke-width="2" fill="none"/></g>`;
    content += `<polygon class="hex-select" points="${points}" data-robber-hex="${h.id}"/>`;
  }
  for (const port of g.ports || []) {
    const a=vertices.get(port.a),b=vertices.get(port.b),cx=(px(a)+px(b))/2,cy=(py(a)+py(b))/2;
    const dx=cx-450,dy=cy-335,n=Math.hypot(dx,dy)||1,ox=cx+dx/n*31,oy=cy+dy/n*31;
    const label=port.type==='3:1'?'3:1':RESOURCE[port.type][1]+' 2:1';
    content += `<g class="port-marker" pointer-events="none"><path d="M${px(a)} ${py(a)} L${ox} ${oy} L${px(b)} ${py(b)}" fill="none" stroke="#f5e7b3" stroke-width="2" stroke-dasharray="3 2"/><g transform="translate(${ox},${oy})"><path d="M-13 3 H13 L8 9 H-8Z" fill="#6b3e25" stroke="#efd7a0"/><path d="M0 -16 V3 M-1 -14 L-11 0 H-1Z M2 -12 L11 -1 H2Z" fill="#fff1ce" stroke="#a67e45" stroke-width=".7"/><rect x="-24" y="12" width="48" height="14" rx="4" fill="#f8e9bf" stroke="#9f7d44"/><text class="port-tag" x="0" y="19">${label}</text></g></g>`;
  }
  const roads = new Map(); for (const p of g.players) for (const edgeId of p.roads || []) roads.set(edgeId,p);
  for (const e of map.edges) {
    const a=vertices.get(e.a),b=vertices.get(e.b),owner=roads.get(e.id); const x1=px(a),y1=py(a),x2=px(b),y2=py(b);
    if (owner) content += `<g class="wood-road" pointer-events="none"><line x1="${x1}" y1="${y1+3}" x2="${x2}" y2="${y2+3}" stroke="#203132" stroke-width="11"/><line class="edge-road" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" style="stroke:${owner.color}"/><line x1="${x1}" y1="${y1-2}" x2="${x2}" y2="${y2-2}" stroke="#ffffff66" stroke-width="2"/></g>`;
    if(pendingRoadCard.includes(e.id)&&mode==="roadCard")content+=`<line class="road-preview" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
    if(targets.roads.has(e.id))content+=`<line class="candidate-road" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
    content += `<line style="pointer-events:${targets.roads.has(e.id)||(mode==="roadCard"&&pendingRoadCard.includes(e.id))?'stroke':'none'}" class="edge-hit" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" data-edge="${e.id}"/>`;
  }
  for (const v of map.vertices) {
    const owner=g.players.find(p=>(p.settlements||[]).includes(v.id)||(p.cities||[]).includes(v.id));
    if (owner) {
      const city=owner.cities.includes(v.id), x=px(v),y=py(v);
      const shape = city ? `M ${x-13} ${y+9} V ${y-4} L ${x-5} ${y-12} L ${x+2} ${y-5} V ${y-15} H ${x+12} V ${y+9} Z` : `M ${x-11} ${y+9} V ${y-3} L ${x} ${y-14} L ${x+11} ${y-3} V ${y+9} Z`;
      content += `<g class="building-piece wooden-piece"><title>${escapeHtml(owner.name)}：${city ? "都市" : "開拓地"}</title><path d="${shape}" fill="#263032" transform="translate(3,4)" class="piece-depth"/><path d="${shape}" fill="${owner.color}" class="building-outline"/><path d="${shape}" fill="${owner.color}" class="building-face"/><rect x="${x-3}" y="${y+1}" width="6" height="8" rx="1" fill="#fff9e8"/>${city ? `<rect x="${x+5}" y="${y-10}" width="4" height="4" fill="#fff9e8"/>` : ""}</g>`;
    }
    const placing=targets.vertices.has(v.id);
    if(placing)content+=`<circle class="candidate-building" cx="${px(v)}" cy="${py(v)}" r="${owner?18:8}"/>`;
    content+=`<circle class="vertex-hit" style="pointer-events:${placing?'all':'none'}" cx="${px(v)}" cy="${py(v)}" r="19" data-vertex="${v.id}"/>`;
  }
  svg.innerHTML = content;
  const xs=map.vertices.map(px),ys=map.vertices.map(py),margin=scale*.85;
  boardFrame={x:Math.min(...xs)-margin,y:Math.min(...ys)-margin,w:Math.max(...xs)-Math.min(...xs)+margin*2,h:Math.max(...ys)-Math.min(...ys)+margin*2};
  applyBoardCamera();
  let drag=null;
  svg.onpointerdown=e=>{ if(e.button!==0)return;boardDragged=false;drag={x:e.clientX,y:e.clientY,pan:{...boardPan}}; };
  svg.onpointermove=e=>{
    if(!drag)return; const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    if(Math.hypot(dx,dy)>7) {boardDragged=true;const box=svg.getBoundingClientRect(),ratio=Math.max(boardFrame.w/boardZoom/box.width,boardFrame.h/boardZoom/box.height);boardPan={x:drag.pan.x-dx*ratio,y:drag.pan.y-dy*ratio};svg.setPointerCapture(e.pointerId);applyBoardCamera();}
  };
  svg.onpointerup=()=>{drag=null;};svg.onpointercancel=()=>{drag=null;};

  const robberTargets = g.phase === "robber" && g.players[g.activeIndex]?.id === playerId || (mode === "devKnightPending");
  document.querySelectorAll("[data-robber-hex]").forEach(el => { el.style.fill = "transparent"; el.style.stroke = "transparent"; el.style.pointerEvents = robberTargets ? "all" : "none"; el.style.cursor = robberTargets ? "pointer" : "default"; el.addEventListener("click", () => { if (boardDragged || !robberTargets || el.dataset.robberHex === map.robber) return; selectedRobberHex = el.dataset.robberHex; selectedVictim = ""; render(); openRobberDialog(); }); });
  document.querySelectorAll("[data-edge]").forEach(el => el.addEventListener("click", () => {
    if(boardDragged)return;
    const edgeId=el.dataset.edge;if(!targets.roads.has(edgeId)&&!(mode==="roadCard"&&pendingRoadCard.includes(edgeId)))return;
    if (mode === "road" || (g.phase === "setup" && g.setupStep === "road" && g.players[g.activeIndex]?.id === playerId)) act("buildRoad",{edgeId});
    else if(mode==="roadCard"){const index=pendingRoadCard.indexOf(edgeId);if(index>=0)pendingRoadCard=pendingRoadCard.slice(0,index);else pendingRoadCard.push(edgeId);render();}
  }));
  document.querySelectorAll("[data-vertex]").forEach(el => el.addEventListener("click", () => {
    if(boardDragged)return;
    const vertexId=el.dataset.vertex;if(!targets.vertices.has(vertexId))return;
    if (mode === "settlement" || (g.phase === "setup" && g.setupStep === "settlement" && g.players[g.activeIndex]?.id === playerId)) act("buildSettlement",{vertexId});
    else if (mode === "city") act("buildCity",{vertexId});
  }));
  const hint = $("selectionHint");
  let hintText="";
  if (g.phase === "setup" && g.players[g.activeIndex]?.id === playerId) hintText=g.setupStep === "settlement" ? "交差点をタップして開拓地を配置" : "開拓地に接する辺をタップして道を配置";
  else if (g.phase === "robber" && g.players[g.activeIndex]?.id === playerId) hintText="盗賊を移動する地形タイルをタップ";
  else if (mode === "road") hintText="道を置く辺をタップ";
  else if (mode === "settlement") hintText="開拓地を置く交差点をタップ";
  else if (mode === "city") hintText="都市にする自分の開拓地をタップ";
  else if (mode === "roadCard") hintText=`街道建設：道を選択（${pendingRoadCard.length}/2）`;
  if(["road","settlement","city","roadCard"].includes(mode)&&!targets.roads.size&&!targets.vertices.size&&!pendingRoadCard.length)hintText="建設できる場所がありません。資源・接続・駒の残数をご確認ください。";
  hint.hidden = !hintText; hint.textContent = hintText;
  $("cancelSelection").hidden=!(mode||selectedRobberHex);
  $("confirmRoadCard").hidden=mode!=="roadCard"||!pendingRoadCard.length;
  $("confirmRoadCard").textContent=`道${pendingRoadCard.length}本で確定`;
}

function applyBoardCamera() {
  if(!boardFrame)return;
  const w=boardFrame.w/boardZoom,h=boardFrame.h/boardZoom;
  boardPan.x=Math.max(-boardFrame.w*.45,Math.min(boardFrame.w*.45,boardPan.x));
  boardPan.y=Math.max(-boardFrame.h*.45,Math.min(boardFrame.h*.45,boardPan.y));
  $("board").setAttribute("viewBox",`${boardFrame.x+(boardFrame.w-w)/2+boardPan.x} ${boardFrame.y+(boardFrame.h-h)/2+boardPan.y} ${w} ${h}`);
  $("zoomReset").textContent=boardZoom===1?"全体":Math.round(boardZoom*100)+"%";
}
$("zoomIn").onclick=()=>{boardZoom=Math.min(2.5,boardZoom+.25);applyBoardCamera();};
$("zoomOut").onclick=()=>{boardZoom=Math.max(1,boardZoom-.25);if(boardZoom===1)boardPan={x:0,y:0};applyBoardCamera();};
$("zoomReset").onclick=()=>{boardZoom=1;boardPan={x:0,y:0};applyBoardCamera();};
function renderBuildingGuide(g,me) {
  const recipes=[{name:"道",icon:"━",mode:"road",cost:{wood:1,brick:1},stock:15-(me.roads?.length||0)},
    {name:"開拓地",icon:"⌂",mode:"settlement",cost:{wood:1,brick:1,sheep:1,wheat:1},stock:5-(me.settlements?.length||0)},
    {name:"都市",icon:"▥",mode:"city",cost:{wheat:2,ore:3},stock:4-(me.cities?.length||0)},
    {name:"発展カード",icon:"▤",mode:"development",cost:{sheep:1,wheat:1,ore:1},stock:g.devDeckCount??0}];
  const active=g.phase==="special"?g.specialPlayerId===playerId:g.players[g.activeIndex]?.id===playerId;
  const phaseAllowed=g.status==="playing"&&!g.winner&&active&&["main","special"].includes(g.phase);
  $("buildingGuide").innerHTML='<div class="guide-heading"><b>建設・購入に必要な資源</b><small>数字は必要枚数</small></div><div class="recipe-grid">'+recipes.map(r=>{
    const affordable=Object.entries(r.cost).every(([k,n])=>(me.hand?.[k]||0)>=n),hasCityBase=r.mode!=="city"||me.settlements.length>0;
    const canBuild=affordable&&r.stock>0&&hasCityBase;
    return `<button class="recipe ${canBuild?'affordable':''}" data-recipe="${r.mode}" ${phaseAllowed&&canBuild?'':'disabled'}><span class="recipe-name"><i>${r.icon}</i>${r.name}</span><span class="recipe-cost">${Object.entries(r.cost).map(([k,n])=>`<span class="recipe-resource ${(me.hand?.[k]||0)<n?'missing':''}"><img src="/assets/${k}.svg" alt="${RESOURCE[k][1]}"><span>${RESOURCE[k][1]}<b>×${n}</b></span></span>`).join('')}</span><span class="recipe-status">${r.stock<1?'駒・カードなし':!hasCityBase?'自分の開拓地が必要':canBuild?(phaseAllowed?'建設・購入できます':'必要な資源あり'):'資源が足りません'}</span></button>`;
  }).join('')+'</div>';
  document.querySelectorAll('[data-recipe]').forEach(b=>b.onclick=()=>{const m=b.dataset.recipe;if(m==='development')act('buyDevelopment');else{mode=m;render();$("boardWrap").scrollIntoView({block:'nearest',behavior:'smooth'});}});
}





function playVictoryFanfare() {
  if(!soundOn||!audioContext||audioContext.state!=="running")return false;
  try {
    const now=audioContext.currentTime;
    const note=(frequency,start,duration,volume=.07)=>{
      const at=now+start;
      for(const [type,ratio,level] of [["triangle",1,volume],["sine",2,volume*.18]]) {
        const oscillator=audioContext.createOscillator(),gain=audioContext.createGain();oscillator.type=type;oscillator.frequency.value=frequency*ratio;
        gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(level,at+.02);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
        oscillator.connect(gain);gain.connect(audioContext.destination);oscillator.start(at);oscillator.stop(at+duration+.04);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
      }
    };
    [[523.25,0,.18],[523.25,.18,.18],[523.25,.36,.25],[659.25,.66,.28],[783.99,.96,.3],[1046.5,1.3,1.6]].forEach(n=>note(...n));
    [261.63,329.63,392].forEach(f=>note(f,1.3,1.7,.035));
    return true;
  }catch(_){return false;}
}

function maybeShowVictory(g) {
  if(!g.winner)return;
  const key=`${g.code}:${g.matchId||g.createdAt}:${g.winner}`;
  if(key===lastVictoryNoticeKey||sessionStorage.getItem("island-victory-seen-"+g.code)===key)return;
  lastVictoryNoticeKey=key;sessionStorage.setItem("island-victory-seen-"+g.code,key);pendingVictorySoundKey=soundOn&&!playVictoryFanfare()?key:null;showVictory(g);
}
function showVictory(g) {
  const winner=g.players.find(p=>p.id===g.winner);if(!winner)return;
  pendingTurnNotice=null;pendingTurnSoundKey=null;clearTimeout(diceResultTimer);
  for(const id of ["turnDialog","diceResultDialog","tradeOfferDialog","logDialog"])if($(id).open)$(id).close();
  $("victoryTitle").textContent=winner.id===playerId?"あなたの勝利！":`${winner.name} の勝利！`;
  $("victorySubtitle").textContent=`${winner.name} が島の開拓を制しました。`;
  $("victoryScore").textContent=String(winner.victoryPoints||10);
  $("victoryAwards").innerHTML=(g.largestArmyOwner===winner.id?'<span>♞ 最大騎士力</span>':'')+(g.longestRoadOwner===winner.id?'<span>━ 最長交易路</span>':'');
  const players=[...g.players].sort((a,b)=>(b.victoryPoints||0)-(a.victoryPoints||0));
  $("victoryStandings").innerHTML=players.map((p,i)=>{
    const rank=players.findIndex(x=>(x.victoryPoints||0)===(p.victoryPoints||0))+1;
    return `<div class="victory-result-row ${p.id===winner.id?'champion':''}"><span class="victory-rank">${p.id===winner.id?'♛':rank}</span><i style="background:${p.color}"></i><div><b>${escapeHtml(p.name)}${p.id===playerId?'（あなた）':''}</b><small>開拓地 ${p.settlements?.length||0} · 都市 ${p.cities?.length||0} · 騎士 ${p.playedKnights||0}回</small></div><strong>${p.victoryPoints||0}<small>点</small></strong></div>`;
  }).join('');
  const colors=["#f4cf68","#fff4c5","#7fbfa1","#e79868","#c9b7ec"];
  $("victoryConfetti").innerHTML=Array.from({length:48},(_,i)=>`<i style="--x:${(i*37)%100}%;--delay:${(i%9)*.1}s;--duration:${2.4+(i%7)*.22}s;--color:${colors[i%colors.length]};--rotate:${i*47}deg"></i>`).join('');
  syncRematchUI(g,g.players.find(p=>p.id===playerId));
  const dialog=$("victoryDialog");if(!dialog.open)dialog.showModal();
}
$("closeVictory").onclick=()=>$("victoryDialog").close();
$("acknowledgeVictory").onclick=()=>$("victoryDialog").close();

function incomingTradeOffers(g) {
  if(g.status!=="playing"||g.winner||g.phase!=="main")return [];
  return (g.tradeOffers||[]).filter(o=>o.status==="pending"&&o.toId===playerId&&g.players[g.activeIndex]?.id===o.fromId);
}
function maybeShowTradeOffer(g,me) {
  const incoming=incomingTradeOffers(g),dialog=$("tradeOfferDialog");
  if(activeTradeOfferId&&!incoming.some(o=>o.id===activeTradeOfferId)) {
    if(dialog.open){dialog.close();if(!tradeReplyInFlight)showToast("この交換の提案は終了しました。");}
    activeTradeOfferId=null;
  }
  if(dialog.open&&activeTradeOfferId) {
    const offer=incoming.find(o=>o.id===activeTradeOfferId);
    if(offer)updateTradeOfferAvailability(me,offer);
    return;
  }
  const fresh=incoming.find(o=>!seenTradeOfferIds.has(o.id));
  if(fresh&&!$("diceResultDialog").open&&!$("tradeDialog").open)showTradeOffer(g,me,fresh);
}
function updateTradeOfferAvailability(me,offer) {
  const want=offerBundle(offer,"want"),missing=RESOURCES.filter(r=>(me.hand?.[r]||0)<want[r]);
  $("acceptTradeOffer").disabled=tradeReplyInFlight||missing.length>0;$("declineTradeOffer").disabled=tradeReplyInFlight;
  $("tradeOfferStatus").textContent=missing.length?"渡す資源が足りません："+missing.map(r=>RESOURCE[r][1]+"（手札"+(me.hand?.[r]||0)+"／必要"+want[r]+"）").join("、"):"内容を確認して「受ける」か「断る」を選んでください。";
}
function showTradeOffer(g,me,offer) {
  activeTradeOfferId=offer.id;seenTradeOfferIds.add(offer.id);
  $("tradeOfferSender").textContent=`${g.players.find(p=>p.id===offer.fromId)?.name||"プレイヤー"} からの提案`;
  $("tradeOfferMaterials").innerHTML='<div class="trade-material"><b>あなたが受け取る</b>'+resourceBundleHTML(offerBundle(offer,"give"))+'</div><span class="trade-offer-arrow">⇄</span><div class="trade-material"><b>あなたが渡す</b>'+resourceBundleHTML(offerBundle(offer,"want"))+'</div>';
  updateTradeOfferAvailability(me,offer);if(!$("tradeOfferDialog").open)$("tradeOfferDialog").showModal();
}
async function replyToTradeOffer(accept) {
  if(tradeReplyInFlight)return;
  const offer=incomingTradeOffers(currentGame).find(o=>o.id===activeTradeOfferId);
  if(!offer){$("tradeOfferDialog").close();showToast("この交換の提案は終了しました。");return;}
  tradeReplyInFlight=true;const me=currentGame.players.find(p=>p.id===playerId);updateTradeOfferAvailability(me,offer);
  try { if(await act("respondTrade",{offerId:offer.id,accept})){$("tradeOfferDialog").close();activeTradeOfferId=null;showToast(accept?"交換が成立しました。":"交換を断りました。");}else await refresh(); }
  finally {tradeReplyInFlight=false;const remaining=incomingTradeOffers(currentGame).find(o=>o.id===activeTradeOfferId);if(remaining)updateTradeOfferAvailability(currentGame.players.find(p=>p.id===playerId),remaining);}
}
$("acceptTradeOffer").onclick=()=>replyToTradeOffer(true);
$("declineTradeOffer").onclick=()=>replyToTradeOffer(false);
$("closeTradeOffer").onclick=()=>$("tradeOfferDialog").close();
$("laterTradeOffer").onclick=()=>$("tradeOfferDialog").close();

function diceFace(value) {
  const dots={1:[[20,20]],2:[[10,10],[30,30]],3:[[10,10],[20,20],[30,30]],4:[[10,10],[30,10],[10,30],[30,30]],5:[[10,10],[30,10],[20,20],[10,30],[30,30]],6:[[10,9],[30,9],[10,20],[30,20],[10,31],[30,31]]};
  return `<svg viewBox="0 0 40 40" role="img" aria-label="${value}"><rect x="1" y="1" width="38" height="38" rx="7" fill="#fff9e6" stroke="#a68a58"/>${(dots[value]||[]).map(([x,y])=>`<circle cx="${x}" cy="${y}" r="3.3" fill="#443927"/>`).join("")}</svg>`;
}
function maybeShowDiceResult(g) {
  if(g.status!=="playing"||g.winner)return;
  const event=g.lastRoll||(g.dice?{id:`${g.turnNumber}:${g.dice.join("-")}`,playerName:g.players[g.activeIndex]?.name,dice:g.dice}:null);
  if(!event||!Array.isArray(event.dice)||event.dice.length!==2||!event.dice.every(n=>Number.isInteger(n)&&n>=1&&n<=6))return;
  const key=`${g.code}:${event.id}`;if(key===lastDiceResultKey)return;
  lastDiceResultKey=key;sessionStorage.setItem(`island-dice-seen-${g.code}`,key);
  if($("turnDialog").open)$("turnDialog").close();
  const sum=event.dice[0]+event.dice[1];
  $("diceRollerName").textContent=`${event.playerName||"プレイヤー"} がサイコロを振りました`;
  $("diceResultFaces").innerHTML=diceFace(event.dice[0])+'<span>＋</span>'+diceFace(event.dice[1]);
  $("diceResultTotal").textContent=String(sum);
  $("diceProductionSummary").innerHTML=productionMarkup(g);
  $("diceResultHelp").textContent=sum===7?"7が出ました。必要な手札調整のあと、盗賊を移動します。":"出目に対応するタイルから資源が生産されます。";
  const dialog=$("diceResultDialog");if(!dialog.open)dialog.showModal();
  clearTimeout(diceResultTimer);diceResultTimer=setTimeout(()=>dialog.close(),3000);
}
$("closeDiceResult").onclick=()=>$("diceResultDialog").close();
$("acknowledgeDiceResult").onclick=()=>$("diceResultDialog").close();
$("diceResultDialog").addEventListener("close",()=>{
  clearTimeout(diceResultTimer);diceResultTimer=null;
  const me=currentGame?.players.find(p=>p.id===playerId);if(me){maybeShowTurnNotice(currentGame,me);maybeShowTradeOffer(currentGame,me);syncGuidedDialogs(currentGame);}
});

function renderLog(g) {
  const lines=g.log?.length?g.log:["対戦ログがここに表示されます。"];
  $("gameLog").innerHTML=lines.slice(0,12).map(line=>`<p>${escapeHtml(line)}</p>`).join("");
  const panel=$("expandedGameLog"),scroll=panel.scrollTop;
  panel.innerHTML=lines.map((line,i)=>`<div class="expanded-log-row"><span class="log-index">${lines.length-i}</span><p>${escapeHtml(line)}</p></div>`).join("");
  panel.scrollTop=scroll;$("expandedLogCount").textContent=`最新${g.log?.length||0}件 · 対戦中も自動更新`;
}
function turnNotice(g,me) {
  if(g.status!=="playing"||g.winner||["robber","discard"].includes(g.phase))return null;
  if(g.phase==="special") {
    if(g.specialPlayerId!==me.id)return null;
    return {key:`${g.code}:${g.matchId||g.createdAt}:special:${g.turnNumber}:${me.id}`,type:"special",title:"あなたの特別建設です",description:"通常の手番の間に、手持ちの資源で建設・購入できます。",rules:"できること：道・開拓地・都市の建設、発展カードの購入。\nできないこと：サイコロ、資源交換、発展カードの使用。",button:"盤面で建設する",tag:"SPECIAL BUILD",emblem:"⌂"};
  }
  if(g.players[g.activeIndex]?.id!==me.id)return null;
  if(g.phase==="setup")return {key:`${g.code}:${g.matchId||g.createdAt}:setup:${g.setupIndex}:${me.id}`,type:"setup",title:"あなたの初期配置です",description:"開拓地を置き、その開拓地に接する道を1本配置してください。",rules:"開拓地同士は隣り合わせに置けません。\n開拓地 → 道の順に盤面を選びます。",button:"初期配置をはじめる",tag:"INITIAL PLACEMENT",emblem:"⌂"};
  return {key:`${g.code}:${g.matchId||g.createdAt}:turn:${g.turnNumber}:${me.id}`,type:"normal",title:"あなたのターンです",description:g.rolled?"手持ちの資源で交換・建設・購入を行えます。":"まずサイコロを振り、資源を受け取りましょう。",rules:"交換・建設・発展カードの購入ができます。\n行動が終わったら「ターン終了」を押してください。",button:g.phase==="play"&&!g.rolled?"🎲 サイコロを振る":"盤面へ進む",tag:"YOUR TURN",emblem:"🎲"};
}
function maybeShowTurnNotice(g,me) {
  syncAutoSkipControls();
  if(autoSkipSpecial&&g.status==="playing"&&!g.winner&&g.phase==="special"&&g.specialPlayerId===me.id){
    pendingTurnNotice=null;if($("turnDialog").open)$("turnDialog").close();autoSkipSpecialTurn(g,me);return;
  }
  const notice=turnNotice(g,me);
  if(!notice){pendingTurnNotice=null;if($("turnDialog").open)$("turnDialog").close();return;}
  if(notice.key===lastTurnNotice)return;
  if($("logDialog").open){pendingTurnNotice={notice,name:me.name,color:me.color};return;}
  showTurnNotice(notice,me.name,me.color);
}
function showTurnNotice(notice,name,color) {
  if($("diceResultDialog").open){pendingTurnNotice={notice,name,color};return;}
  const dialog=$("turnDialog");if(dialog.open)dialog.close();
  lastTurnNotice=notice.key;pendingTurnNotice=null;
  $("skipSpecialBuild").hidden=notice.type!=="special";
  dialog.dataset.type=notice.type;dialog.style.setProperty("--turn-color",color);
  $("turnDialogTag").textContent=notice.tag;$("turnDialogEmblem").textContent=notice.emblem;
  $("turnDialogPlayer").textContent=name;$("turnDialogTitle").textContent=notice.title;$("turnDialogDescription").textContent=notice.description;$("turnDialogRules").textContent=notice.rules;$("acknowledgeTurn").textContent=notice.button;$("acknowledgeTurn").disabled=false;$("turnDialogFootnote").textContent=notice.type==="normal"&&currentGame?.phase==="play"&&!currentGame.rolled?"ボタンを押すとサイコロを振り、結果を盤面に表示します。":"盤面に戻って操作してください。";dialog.showModal();
}

function syncAutoSkipControls() {
  $("autoSkipSpecial").checked=autoSkipSpecial;
  $("autoSkipStatus").textContent=autoSkipSpecial?"特別建設 自動スキップ：ON":"特別建設 自動スキップ：OFF";
  $("autoSkipExplanation").textContent=autoSkipSpecial?"建設できる場合も自動でパス。ここで解除できます。":"自分の番に建設するか選択します。";
}
function setAutoSkipSpecial(enabled) {
  autoSkipSpecial=enabled;localStorage.setItem("island-auto-skip-special",enabled?"1":"0");autoSkipLastKey=null;syncAutoSkipControls();
  showToast(enabled?"特別建設を毎回自動でスキップします。":"特別建設の自動スキップを解除しました。");
  const me=currentGame?.players.find(p=>p.id===playerId);if(me)maybeShowTurnNotice(currentGame,me);
}
async function autoSkipSpecialTurn(g,me) {
  const key=`${g.code}:${g.matchId||g.createdAt}:special:${g.turnNumber}:${me.id}`;
  if(autoSkipInFlight||autoSkipLastKey===key)return;
  autoSkipLastKey=key;autoSkipInFlight=true;
  try {
    const ok=await act("endSpecial");
    if(ok)showToast("特別建設を自動スキップしました。");
    else {
      autoSkipSpecial=false;localStorage.setItem("island-auto-skip-special","0");syncAutoSkipControls();
      showToast("自動スキップに失敗したため、モードを解除しました。");
      const player=currentGame?.players.find(p=>p.id===playerId);if(player)maybeShowTurnNotice(currentGame,player);
    }
  } finally { autoSkipInFlight=false; }
}
$("autoSkipSpecial").onchange=e=>setAutoSkipSpecial(e.target.checked);

syncAutoSkipControls();

$("acknowledgeTurn").onclick=async()=>{
  const button=$("acknowledgeTurn"),dialog=$("turnDialog");
  if(button.disabled)return;
  const canRoll=dialog.dataset.type==="normal"&&currentGame?.status==="playing"&&!currentGame.winner&&currentGame.phase==="play"&&!currentGame.rolled&&currentGame.players[currentGame.activeIndex]?.id===playerId;
  if(!canRoll){dialog.close();return;}
  button.disabled=true;button.textContent="サイコロを振っています…";
  try {
    if(await act("roll")){
      dialog.close();
      if(currentGame?.dice)showToast(`🎲 ${currentGame.dice[0]} ＋ ${currentGame.dice[1]} ＝ ${currentGame.dice[0]+currentGame.dice[1]}`);
    }
  } finally {button.disabled=false;button.textContent="🎲 サイコロを振る";}
};
$("skipSpecialBuild").onclick=async()=>{
  if(currentGame?.phase!=="special"||currentGame.specialPlayerId!==playerId)return;
  const button=$("skipSpecialBuild");button.disabled=true;button.textContent="次の人へ移動中…";
  try { if(await act("endSpecial"))$("turnDialog").close(); }
  finally { button.disabled=false;button.textContent="特別建設をスキップ"; }
};
$("expandLog").onclick=()=>{if($("turnDialog").open)$("turnDialog").close();$("logDialog").showModal();};
$("closeLog").onclick=()=>$("logDialog").close();
$("logDialog").addEventListener("close",()=>{if(pendingTurnNotice){const p=pendingTurnNotice;showTurnNotice(p.notice,p.name,p.color);}});
for(const id of ["turnDialog","logDialog","diceResultDialog","tradeOfferDialog"])$(id).addEventListener("click",e=>{if(e.target!==$(id))return;const r=$(id).getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$(id).close();});

function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }


function cancelBoardSelection() {mode=null;pendingRoadCard=[];selectedRobberHex=null;render();}
$("cancelSelection").onclick=cancelBoardSelection;
$("confirmRoadCard").onclick=()=>{if(mode==="roadCard"&&pendingRoadCard.length)act("playCard",{card:"road",edgeIds:[...pendingRoadCard]});};
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&(mode||selectedRobberHex))cancelBoardSelection();});
function roadCardCandidates(g,me,extra) {
  if(me.roads.length+extra.length>=15||extra.length>=2)return [];
  const owned=new Set([...me.roads,...extra]),occupied=new Set(g.players.flatMap(p=>p.roads));extra.forEach(id=>occupied.add(id));
  return g.map.edges.filter(e=>!occupied.has(e.id)&&[e.a,e.b].some(v=>{
    if(me.settlements.includes(v)||me.cities.includes(v))return true;
    if(g.players.some(p=>p.id!==me.id&&[...p.settlements,...p.cities].includes(v)))return false;
    return g.map.vertices.find(x=>x.id===v).edges.some(id=>owned.has(id));
  })).map(e=>e.id);
}
function buildTargets(g,me) {
  const moves=g.legalMoves||{},result={roads:new Set(),vertices:new Set()};
  if(g.winner)return result;
  if(mode==="roadCard"&&g.phase==="main"&&g.players[g.activeIndex]?.id===me.id){result.roads=new Set(roadCardCandidates(g,me,pendingRoadCard));return result;}
  if(mode==="road"||g.phase==="setup"&&g.setupStep==="road")result.roads=new Set(moves.roads||[]);
  if(mode==="settlement"||g.phase==="setup"&&g.setupStep==="settlement")result.vertices=new Set(moves.settlements||[]);
  if(mode==="city")result.vertices=new Set(moves.cities||[]);
  return result;
}
function productionMarkup(g) {
  const event=g.lastProduction;if(!event)return '<small class="no-production">サイコロを振ると獲得資源を表示します。</small>';
  if(event.number===7)return '<p class="production-seven">7：資源の生産はありません。</p>';
  return (event.payouts||[]).map(row=>{const p=g.players.find(p=>p.id===row.playerId);return `<div class="production-row"><b>${escapeHtml(p?.name||"")}</b><span>${RESOURCES.some(r=>row.resources[r]>0)?resourceBundleHTML(row.resources):'<small>獲得なし</small>'}</span></div>`;}).join('')+(event.shortages?.length?'<p class="production-shortage">銀行不足：'+event.shortages.map(r=>RESOURCE[r][1]).join('・')+'</p>':'');
}
function renderProduction(g) {$("productionSummary").innerHTML=productionMarkup(g);}
function readSavedRooms() {try{const a=JSON.parse(localStorage.getItem("island-resume-rooms-v1")||"[]");return Array.isArray(a)?a:[];}catch(_){return [];}}
function rememberRoom(g,me) {
  try {const rooms=readSavedRooms().filter(r=>r.code!==g.code||r.playerId!==me.id);rooms.unshift({code:g.code,playerId:me.id,name:me.name,status:g.winner?((g.rematchReadyIds||[]).includes(me.id)?"rematch":"finished"):g.status,at:Date.now()});localStorage.setItem("island-resume-rooms-v1",JSON.stringify(rooms.slice(0,12)));renderResumeRooms();}catch(_){}
}
function forgetRoom(code,id) {try{localStorage.setItem("island-resume-rooms-v1",JSON.stringify(readSavedRooms().filter(r=>r.code!==code||r.playerId!==id)));}catch(_){}}
function renderResumeRooms() {
  const rooms=readSavedRooms().filter(r=>r.status!=="finished");
  $("resumeRooms").innerHTML=rooms.length?'<h2>対戦に戻る</h2><p>同じプレイヤー・手札・盤面のまま復帰できます。</p><div class="resume-room-list">'+rooms.map((r,i)=>`<button data-resume-room="${i}"><b>${escapeHtml(r.code)}</b><span>${escapeHtml(r.name)} · ${r.status==="lobby"?"参加待ち":r.status==="rematch"?"再戦待ち":"進行中"}</span><strong>復帰 →</strong></button>`).join('')+'</div>':"";
  $("resumeRooms").querySelectorAll("[data-resume-room]").forEach(b=>b.onclick=()=>{const r=rooms[Number(b.dataset.resumeRoom)];enterRoom(r.code,r.playerId);});
}
function syncRematchUI(g,me) {
  if(!g.winner){if($("victoryDialog").open)$("victoryDialog").close();return;}
  $("rematchReadyButton").hidden=spectating;
  const ready=g.rematchReadyIds||[];
  $("rematchReadyButton").textContent=ready.includes(me?.id)?"再戦準備を取り消す":"同じメンバーで再戦する";
  $("rematchReadyStatus").textContent=`準備完了 ${ready.length}/${g.players.length}人。全員が準備すると新しい盤面で開始します。`;
}
function toggleRematchReady() {if(currentGame?.winner)act("rematchReady",{ready:!(currentGame.rematchReadyIds||[]).includes(playerId)});}
$("rematchReadyButton").onclick=toggleRematchReady;
renderResumeRooms();

function readMatchHistory() {
  try {
    const value=JSON.parse(localStorage.getItem("island-match-history-v1")||"[]");
    return Array.isArray(value)?value.filter(r=>r&&typeof r.key==="string"&&typeof r.won==="boolean"):[];
  }catch(_){return [];}
}
function saveOwnMatchResult(g,me) {
  if(!g.winner||!me)return;
  const key=`${g.code}:${g.matchId||g.createdAt||""}:${me.id}`,history=readMatchHistory();
  if(history.some(r=>r.key===key))return;
  const winner=g.players.find(p=>p.id===g.winner);
  history.push({key,at:Date.now(),won:g.winner===me.id,points:me.victoryPoints||0,name:me.name,winnerName:winner?.name||"",players:g.players.length,roomCode:g.code});
  try {localStorage.setItem("island-match-history-v1",JSON.stringify(history));renderHomeStats();}catch(_){showToast("ブラウザに戦績を保存できませんでした。");}
}
function renderHomeStats() {
  const history=readMatchHistory(),games=history.length,wins=history.filter(r=>r.won).length,best=Math.max(0,...history.map(r=>Number(r.points)||0));
  const totals=[["対戦数",games+"戦"],["勝利数",wins+"勝"],["勝率",games?Math.round(wins/games*100)+"%":"—"],["最高得点",games?best+"点":"—"]];
  $("homeStatsSummary").innerHTML=totals.map(([label,value])=>`<div><small>${label}</small><strong>${value}</strong></div>`).join("");
  $("homeMatchHistory").innerHTML=games?history.slice(-8).reverse().map(r=>{
    const date=new Date(r.at).toLocaleString("ja-JP",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"});
    return `<div class="home-match-row"><span class="match-result ${r.won?'won':'lost'}">${r.won?'WIN':'LOSE'}</span><div class="match-history-main"><b>${escapeHtml(r.name)} <span>${r.points}点</span></b><small>${r.players}人対戦 · 勝者：${escapeHtml(r.winnerName)}</small></div><time>${date}</time></div>`;
  }).join(""):'<div class="empty-match-history">まだ戦績がありません。ゲームが終了すると、ここに結果が残ります。</div>';
}
renderHomeStats();

const params = new URLSearchParams(location.search), requestedCode = params.get("room")?.toUpperCase();
if (requestedCode) {
  const remembered = localStorage.getItem(`island-room-${requestedCode}`);
  if(params.get("spectate")==="1") enterRoom(requestedCode,null,true);
  else
  if (remembered) enterRoom(requestedCode, remembered);
  else { document.querySelector('[data-tab="join"]').click(); $("roomCode").value = requestedCode; }
}
