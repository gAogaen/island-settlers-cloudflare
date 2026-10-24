const $ = id => document.getElementById(id);
const RESOURCES = ["wood", "brick", "sheep", "wheat", "ore"];
const RESOURCE = { wood: ["🌲", "木材"], brick: ["🧱", "レンガ"], sheep: ["🐑", "羊毛"], wheat: ["🌾", "小麦"], ore: ["⛰️", "鉱石"] };
const TERRAIN = { wood: ["森林", "🌲"], brick: ["丘陵", "🧱"], sheep: ["牧草地", "🐑"], wheat: ["畑", "🌾"], ore: ["山地", "⛰️"], desert: ["砂漠", "🏜️"] };
let boardZoom = 1, boardPan = {x:0,y:0}, boardFrame = null, boardDragged = false;
let lastTurnNotice = null, pendingTurnNotice = null;
let currentGame = null, playerId = null, roomCode = null, mode = null, selectedRobberHex = null, selectedVictim = "", pendingRoadCard = [], polling = false, soundOn = true, toastTimer;

async function api(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { "content-type": "application/json", ...(options.headers || {}) } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "通信に失敗しました。");
  return data;
}
function rememberName() { return ($("playerName").value || "プレイヤー").trim().slice(0, 16) || "プレイヤー"; }
function setError(message = "") { $("homeError").textContent = message; }
function showToast(message) { const el = $("toast"); el.textContent = message; el.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 2400); }
function enterRoom(code, id) {
  document.body.classList.add("in-room"); boardZoom=1;boardPan={x:0,y:0};
  roomCode = code.toUpperCase(); playerId = id; localStorage.setItem(`island-room-${roomCode}`, id); localStorage.setItem("island-last-name", rememberName());
  $("homeView").hidden = true; $("gameView").hidden = false; $("roomCodeDisplay").textContent = roomCode; $("connectionLabel").textContent = "オンライン"; refresh();
  if (window.pollTimer) clearInterval(window.pollTimer); window.pollTimer = setInterval(refresh, 2200);
  history.replaceState({}, "", `/?room=${roomCode}`);
}
async function refresh() {
  if (!roomCode || polling) return; polling = true;
  try { const data = await api(`/api/rooms/${roomCode}?playerId=${encodeURIComponent(playerId)}`); const changed = JSON.stringify(currentGame) !== JSON.stringify(data.game); currentGame = data.game; if (changed) render(); $("connectionLabel").textContent = "オンライン"; }
  catch (error) { $("connectionLabel").textContent = "再接続中"; if (error.message.includes("部屋が見つかりません")) showToast(error.message); }
  finally { polling = false; }
}
async function act(type, args = {}) {
  try { const data = await api(`/api/rooms/${roomCode}/action`, { method: "POST", body: JSON.stringify({ playerId, type, ...args }) }); currentGame = data.game; mode = null; selectedRobberHex = null; pendingRoadCard = []; render(); if (soundOn) clickSound(); }
  catch (error) { showToast(error.message); }
}
function clickSound() {
  try { const context = new AudioContext(), oscillator = context.createOscillator(), gain = context.createGain(); oscillator.frequency.value = 510; gain.gain.value = .045; oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + .035); } catch (_) {}
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
  try { const data = await api(`/api/rooms/${code}/join`, { method: "POST", body: JSON.stringify({ playerName: rememberName() }) }); enterRoom(code, data.playerId); }
  catch (e) { setError(e.message); }
});
$("roomCode").addEventListener("input", e => e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""));
$("startGame").addEventListener("click", () => act("start"));
$("copyCode").addEventListener("click", async () => { try { await navigator.clipboard.writeText(roomCode); showToast("部屋コードをコピーしました。"); } catch (_) { showToast(`部屋コード：${roomCode}`); } });
$("leaveRoom").addEventListener("click", () => { document.body.classList.remove("in-room"); $("turnDialog").close();$("logDialog").close();lastTurnNotice=null;pendingTurnNotice=null; if (window.pollTimer) clearInterval(window.pollTimer); roomCode = null; playerId = null; currentGame = null; localStorage.removeItem(`island-room-${$("roomCodeDisplay").textContent}`); history.replaceState({}, "", "/"); $("gameView").hidden = true; $("homeView").hidden = false; });
$("soundToggle").addEventListener("click", e => { soundOn = !soundOn; e.currentTarget.textContent = soundOn ? "♪" : "×"; showToast(soundOn ? "効果音をオンにしました。" : "効果音をオフにしました。"); });

function render() {
  if (!currentGame) return;
  const g = currentGame, me = g.players.find(p => p.id === playerId), active = g.phase === "special" ? g.players.find(p => p.id === g.specialPlayerId) : g.players[g.activeIndex];
  if (!me) return;
  $("gameTitle").textContent = g.status === "lobby" ? "対戦ルーム" : (g.winner ? "ゲーム終了" : "島を開拓しよう" );
  $("gameStatusLabel").textContent = g.status === "lobby" ? "ROOM LOBBY" : g.winner ? "GAME FINISHED" : `TURN ${g.turnNumber || 1}`;
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
  renderPlayers(g, me); renderHand(me); renderLog(g); renderBuildingGuide(g, me); maybeShowTurnNotice(g, me);
}
function renderPlayers(g, me) {
  $("playersList").innerHTML = g.players.map((p, i) => `<div class="player-row ${g.status === "playing" && (g.phase === "special" ? p.id === g.specialPlayerId : i === g.activeIndex) ? "active" : ""}"><i class="player-swatch" style="background:${p.color}"></i><div class="player-row-main"><div class="player-row-name">${escapeHtml(p.name)}${p.id === g.hostId ? '<span class="host-tag">HOST</span>' : ""}${p.id === playerId ? " <span style=\"color:#82968d;font-weight:500\">(あなた)</span>" : ""}</div><div class="player-row-meta">手札 ${p.handCount || 0}枚 · 道 ${p.roads?.length || 0}</div></div><span class="player-points">${p.victoryPoints ?? "—"}点</span></div>`).join("");
}
function renderHand(me) {
  const hand = me.hand || Object.fromEntries(RESOURCES.map(r => [r, 0])), total = RESOURCES.reduce((n, r) => n + hand[r], 0);
  $("handTotal").textContent = `${total}枚`;
  $("resourceHand").innerHTML = RESOURCES.map(r => `<div class="resource-card"><span class="res-symbol"><img src="/assets/${r}.svg" alt="${RESOURCE[r][1]}" /></span><b>${hand[r]}</b><small>${RESOURCE[r][1]}</small></div>`).join("");
}
function renderActions(g, me, isMyTurn) {
  let notice = ""; const main = [], build = [], dev = [];
  $("tradeActions").hidden = true;
  if (g.winner) notice = `${g.players.find(p => p.id === g.winner)?.name}が10点に到達しました。`;
  else if (g.phase === "setup") notice = isMyTurn ? (g.setupStep === "settlement" ? "盤面の交差点を選んで開拓地を置きます。" : "開拓地に接する辺を選んで道を置きます。") : `${g.players[g.activeIndex]?.name}の初期配置を待っています。`;
  else if (g.phase === "discard") {
    const need = g.discardPending?.[playerId];
    notice = need ? `資源を${need}枚捨ててください。` : `${g.players.filter(p => g.discardPending?.[p.id]).map(p => p.name).join("、")}が資源を捨てています。`;
    if (need) main.push(`<div class="discard-row">${RESOURCES.map(r => `<label class="discard-label">${RESOURCE[r][0]}<select data-discard="${r}" class="discard-select">${Array.from({length:Math.min(need, me.hand[r])+1}, (_,i)=>`<option value="${i}">${i}</option>`).join("")}</select></label>`).join("")}<button class="action-btn primary" id="submitDiscard">決定</button></div>`);
  } else if (g.phase === "robber") {
    notice = isMyTurn ? (selectedRobberHex ? "盗賊を移動するタイルを確認し、相手を選んでください。" : "盤面の別の地形タイルを選び、盗賊を移動します。") : `${g.players[g.activeIndex]?.name}が盗賊を移動しています。`;
    if (isMyTurn && selectedRobberHex) {
      const h = g.map.hexes.find(x => x.id === selectedRobberHex);
      const victims = g.players.filter(p => p.id !== playerId && [...p.settlements, ...p.cities].some(v => h.corners.includes(v)) && p.handCount > 0);
      main.push(`<label style="grid-column:1/-1;font-size:9px;color:#637971">盗む相手<select id="victimSelect" class="discard-select" style="margin-left:8px">${victims.length ? victims.map(p=>`<option value="${p.id}" ${selectedVictim===p.id?"selected":""}>${escapeHtml(p.name)}</option>`).join("") : '<option value="">相手なし</option>'}</select></label><button class="action-btn primary" id="confirmRobber" style="grid-column:1/-1">このタイルに盗賊を移動</button>`);
    }
  } else if (g.phase === "play") {
    notice = isMyTurn ? "サイコロを振って資源を受け取ります。" : `${g.players[g.activeIndex]?.name}の手番です。`;
    if (isMyTurn) main.push(`<button class="action-btn primary" data-action="roll">🎲 サイコロを振る</button>`);
  } else if (g.phase === "main") {
    notice = isMyTurn ? "建設、交換、発展カードを使えます。" : `${g.players[g.activeIndex]?.name}が行動中です。`;
    if (isMyTurn) {
      main.push(`<button class="action-btn" data-action="bankToggle">⇄ 銀行交換</button><button class="action-btn" data-action="playerTradeToggle">⇄ 交渉</button><button class="action-btn" data-action="endTurn" style="grid-column:1/-1">ターン終了 →</button>`);
      build.push(`<button class="action-btn ${mode === "road" ? "active-mode" : ""}" data-mode="road">道を建設</button><button class="action-btn ${mode === "settlement" ? "active-mode" : ""}" data-mode="settlement">開拓地を建設</button><button class="action-btn ${mode === "city" ? "active-mode" : ""}" data-mode="city">都市にする</button><button class="action-btn" data-action="buyDevelopment">発展カードを購入</button>`);
      if (mode === "bank") { $("tradeActions").hidden = false; $("tradeActions").innerHTML = `<select id="tradeGive">${RESOURCES.map(r=>`<option value="${r}">${RESOURCE[r][1]}を出す（${g.tradeRates?.[r] || 4}枚）</option>`).join("")}</select><select id="tradeWant">${RESOURCES.map(r=>`<option value="${r}">${RESOURCE[r][1]}を得る</option>`).join("")}</select><button id="tradeButton" class="action-btn primary">交換</button>`; }
      if (me.devCards?.length) {
        const labels = { knight: "騎士", victory: "勝利点", road: "街道建設", plenty: "豊作", monopoly: "独占" };
        dev.push(`<div class="dev-card-list" style="grid-column:1/-1">${me.devCards.map(c=>`<span class="dev-chip">${labels[c.type] || c.type}</span>`).join("")}</div>`);
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
  if (g.phase === "main" && mode === "playerTrade") { $("tradeActions").hidden = false; renderPlayerTrades(g); }
  if (g.winner) { main.push(`<button class="action-btn" onclick="location.href='/'">新しいゲームを始める</button>`); }
  $("phaseNotice").textContent = notice; $("mainActions").innerHTML = main.join(""); $("buildActions").innerHTML = build.join(""); $("devActions").innerHTML = dev.join("");
  document.querySelectorAll("[data-action]").forEach(button => button.addEventListener("click", () => {
    const action = button.dataset.action;
    if (action === "bankToggle") { mode = mode === "bank" ? null : "bank"; render(); return; }
    if (action === "playerTradeToggle") { mode = mode === "playerTrade" ? null : "playerTrade"; render(); return; }
    if (action === "roll") return act("roll");
    if (action === "endTurn") return act("endTurn");
    if (action === "endSpecial") return act("endSpecial");
    if (action === "buyDevelopment") return act("buyDevelopment");
  }));
  document.querySelectorAll("[data-mode]").forEach(button => button.addEventListener("click", () => { mode = mode === button.dataset.mode ? null : button.dataset.mode; render(); }));
  document.querySelectorAll("[data-card]").forEach(button => button.addEventListener("click", () => useDevelopment(button.dataset.card)));
  const discardButton = $("submitDiscard"); if (discardButton) discardButton.onclick = () => { const cards = Object.fromEntries(RESOURCES.map(r => [r, Number(document.querySelector(`[data-discard="${r}"]`).value)])); act("discard", { cards }); };
  const victimSelect = $("victimSelect"); if (victimSelect) victimSelect.onchange = () => selectedVictim = victimSelect.value;
  const confirmRobber = $("confirmRobber"); if (confirmRobber) confirmRobber.onclick = () => act("moveRobber", { hexId: selectedRobberHex, victimId: selectedVictim });
  const tradeButton = $("tradeButton"); if (tradeButton) tradeButton.onclick = () => act("tradeBank", { give: $("tradeGive").value, want: $("tradeWant").value });
}
function renderPlayerTrades(g) {
  const panel = $("tradeActions"), others = g.players.filter(p => p.id !== playerId);
  const offers = (g.tradeOffers || []).filter(o => o.status === "pending" && (o.toId === playerId || o.fromId === playerId));
  const offerMarkup = offers.map(o => {
    const from = g.players.find(p => p.id === o.fromId), to = g.players.find(p => p.id === o.toId);
    const buttons = o.toId === playerId ? `<button class="action-btn primary" data-accept-offer="${o.id}">受ける</button><button class="action-btn" data-decline-offer="${o.id}">断る</button>` : `<span class="waiting-offer">返事待ち</span>`;
    return `<div class="offer-row"><small>${escapeHtml(from?.name)} → ${escapeHtml(to?.name)}：${o.giveCount} ${RESOURCE[o.give][1]} ⇄ ${o.wantCount} ${RESOURCE[o.want][1]}</small>${buttons}</div>`;
  }).join("");
  const canOffer = g.players[g.activeIndex]?.id === playerId;
  const form = canOffer ? `<div class="player-trade-form"><select id="tradeTarget">${others.map(p=>`<option value="${p.id}">${escapeHtml(p.name)}と交換</option>`).join("")}</select><select id="tradeGive">${RESOURCES.map(r=>`<option value="${r}">${RESOURCE[r][1]}を出す</option>`).join("")}</select><input id="tradeGiveCount" type="number" min="1" value="1" aria-label="出す枚数"><span>⇄</span><select id="tradeWant">${RESOURCES.map(r=>`<option value="${r}">${RESOURCE[r][1]}をもらう</option>`).join("")}</select><input id="tradeWantCount" type="number" min="1" value="1" aria-label="欲しい枚数"><button id="offerTradeButton" class="action-btn primary">交換を提示</button></div>` : "";
  panel.innerHTML = form + `<div class="offers-list">${offerMarkup || "<small class='no-offers'>交換の提示はありません。</small>"}</div>`;
  const offerButton = $("offerTradeButton"); if (offerButton) offerButton.onclick = () => act("offerTrade", { toId: $("tradeTarget").value, give: $("tradeGive").value, giveCount: Number($("tradeGiveCount").value), want: $("tradeWant").value, wantCount: Number($("tradeWantCount").value) });
  panel.querySelectorAll("[data-accept-offer]").forEach(b => b.onclick = () => act("respondTrade", { offerId: b.dataset.acceptOffer, accept: true }));
  panel.querySelectorAll("[data-decline-offer]").forEach(b => b.onclick = () => act("respondTrade", { offerId: b.dataset.declineOffer, accept: false }));
}
async function useDevelopment(type) {
  if (type === "knight") { await act("playCard", { card: type }); return; }
  if (type === "monopoly") { const resource = askResource("独占する資源の番号を入力してください。"); if (resource) act("playCard", { card: type, resource }); return; }
  if (type === "plenty") {
    const first = askResource("豊作：1枚目の資源番号を入力してください。"); if (!first) return;
    const second = askResource("豊作：2枚目の資源番号を入力してください。"); if (!second) return;
    const cards = Object.fromEntries(RESOURCES.map(r => [r, Number(r === first) + Number(r === second)])); act("playCard", { card: type, cards }); return;
  }
  if (type === "road") { mode = mode === "roadCard" ? null : "roadCard"; pendingRoadCard = []; render(); showToast("盤面で道を2か所選んでください。"); }
}
function askResource(title) {
  const list = RESOURCES.map((r, i) => `${i + 1}：${RESOURCE[r][1]}`).join("\n");
  const answer = prompt(`${title}\n${list}`, "1");
  if (answer === null) return null;
  const n = Number(answer.trim()); if (Number.isInteger(n) && n >= 1 && n <= RESOURCES.length) return RESOURCES[n - 1];
  const direct = RESOURCES.find(r => r === answer.trim()) || RESOURCES.find(r => RESOURCE[r][1] === answer.trim());
  if (!direct) showToast("資源の番号か名前を入力してください。");
  return direct || null;
}

function drawBoard(g, me) {
  const svg = $("board"); if (!g.map) return;
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
    content += `<line class="edge-hit" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" data-edge="${e.id}"/>`;
  }
  for (const v of map.vertices) {
    const owner=g.players.find(p=>(p.settlements||[]).includes(v.id)||(p.cities||[]).includes(v.id));
    if (owner) {
      const city=owner.cities.includes(v.id), x=px(v),y=py(v);
      const shape = city ? `M ${x-13} ${y+9} V ${y-4} L ${x-5} ${y-12} L ${x+2} ${y-5} V ${y-15} H ${x+12} V ${y+9} Z` : `M ${x-11} ${y+9} V ${y-3} L ${x} ${y-14} L ${x+11} ${y-3} V ${y+9} Z`;
      content += `<g class="building-piece wooden-piece"><title>${escapeHtml(owner.name)}：${city ? "都市" : "開拓地"}</title><path d="${shape}" fill="#263032" transform="translate(3,4)" class="piece-depth"/><path d="${shape}" fill="${owner.color}" class="building-outline"/><path d="${shape}" fill="${owner.color}" class="building-face"/><rect x="${x-3}" y="${y+1}" width="6" height="8" rx="1" fill="#fff9e8"/>${city ? `<rect x="${x+5}" y="${y-10}" width="4" height="4" fill="#fff9e8"/>` : ""}</g>`;
    }
    const placing = (mode === "settlement" || mode === "city" || g.phase === "setup" && g.setupStep === "settlement" && g.players[g.activeIndex]?.id === playerId);
    if (placing && !owner) content += `<circle cx="${px(v)}" cy="${py(v)}" r="3.5" fill="#fff8dc" stroke="#5e472c" stroke-width="1" pointer-events="none"/>`;
    content += `<circle class="vertex-hit ${placing ? 'placement-target' : ''}" cx="${px(v)}" cy="${py(v)}" r="19" data-vertex="${v.id}"/>`;
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
  document.querySelectorAll("[data-robber-hex]").forEach(el => { el.style.fill = "transparent"; el.style.stroke = "transparent"; el.style.pointerEvents = robberTargets ? "all" : "none"; el.style.cursor = robberTargets ? "pointer" : "default"; el.addEventListener("click", () => { if (boardDragged || !robberTargets || el.dataset.robberHex === map.robber) return; selectedRobberHex = el.dataset.robberHex; selectedVictim = ""; render(); }); });
  document.querySelectorAll("[data-edge]").forEach(el => el.addEventListener("click", () => {
    if(boardDragged)return;
    const edgeId=el.dataset.edge;
    if (mode === "road" || (g.phase === "setup" && g.setupStep === "road" && g.players[g.activeIndex]?.id === playerId)) act("buildRoad",{edgeId});
    else if (mode === "roadCard") { pendingRoadCard.push(edgeId); if (pendingRoadCard.length === Math.min(2, 15 - me.roads.length)) act("playCard",{card:"road",edgeIds:pendingRoadCard}); else showToast("もう1本、道を選んでください。"); }
  }));
  document.querySelectorAll("[data-vertex]").forEach(el => el.addEventListener("click", () => {
    if(boardDragged)return;
    const vertexId=el.dataset.vertex;
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
  hint.hidden = !hintText; hint.textContent = hintText;
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

function renderLog(g) {
  const lines=g.log?.length?g.log:["対戦ログがここに表示されます。"];
  $("gameLog").innerHTML=lines.slice(0,12).map(line=>`<p>${escapeHtml(line)}</p>`).join("");
  const panel=$("expandedGameLog"),scroll=panel.scrollTop;
  panel.innerHTML=lines.map((line,i)=>`<div class="expanded-log-row"><span class="log-index">${lines.length-i}</span><p>${escapeHtml(line)}</p></div>`).join("");
  panel.scrollTop=scroll;$("expandedLogCount").textContent=`最新${g.log?.length||0}件 · 対戦中も自動更新`;
}
function turnNotice(g,me) {
  if(g.status!=="playing"||g.winner)return null;
  if(g.phase==="special") {
    if(g.specialPlayerId!==me.id)return null;
    return {key:`${g.code}:special:${g.turnNumber}:${me.id}`,type:"special",title:"あなたの特別建設です",description:"通常の手番の間に、手持ちの資源で建設・購入できます。",rules:"できること：道・開拓地・都市の建設、発展カードの購入。\nできないこと：サイコロ、資源交換、発展カードの使用。",button:"盤面で建設する",tag:"SPECIAL BUILD",emblem:"⌂"};
  }
  if(g.players[g.activeIndex]?.id!==me.id)return null;
  if(g.phase==="setup")return {key:`${g.code}:setup:${g.setupIndex}:${me.id}`,type:"setup",title:"あなたの初期配置です",description:"開拓地を置き、その開拓地に接する道を1本配置してください。",rules:"開拓地同士は隣り合わせに置けません。\n開拓地 → 道の順に盤面を選びます。",button:"初期配置をはじめる",tag:"INITIAL PLACEMENT",emblem:"⌂"};
  return {key:`${g.code}:turn:${g.turnNumber}:${me.id}`,type:"normal",title:"あなたのターンです",description:g.rolled?"手持ちの資源で交換・建設・購入を行えます。":"まずサイコロを振り、資源を受け取りましょう。",rules:"交換・建設・発展カードの購入ができます。\n行動が終わったら「ターン終了」を押してください。",button:g.rolled?"盤面へ進む":"ターンをはじめる",tag:"YOUR TURN",emblem:"🎲"};
}
function maybeShowTurnNotice(g,me) {
  const notice=turnNotice(g,me);
  if(!notice){pendingTurnNotice=null;if($("turnDialog").open)$("turnDialog").close();return;}
  if(notice.key===lastTurnNotice)return;
  if($("logDialog").open){pendingTurnNotice={notice,name:me.name,color:me.color};return;}
  showTurnNotice(notice,me.name,me.color);
}
function showTurnNotice(notice,name,color) {
  const dialog=$("turnDialog");if(dialog.open)dialog.close();
  lastTurnNotice=notice.key;pendingTurnNotice=null;
  dialog.dataset.type=notice.type;dialog.style.setProperty("--turn-color",color);
  $("turnDialogTag").textContent=notice.tag;$("turnDialogEmblem").textContent=notice.emblem;
  $("turnDialogPlayer").textContent=name;$("turnDialogTitle").textContent=notice.title;$("turnDialogDescription").textContent=notice.description;$("turnDialogRules").textContent=notice.rules;$("acknowledgeTurn").textContent=notice.button;dialog.showModal();
}
$("acknowledgeTurn").onclick=()=>$("turnDialog").close();
$("expandLog").onclick=()=>{if($("turnDialog").open)$("turnDialog").close();$("logDialog").showModal();};
$("closeLog").onclick=()=>$("logDialog").close();
$("logDialog").addEventListener("close",()=>{if(pendingTurnNotice){const p=pendingTurnNotice;showTurnNotice(p.notice,p.name,p.color);}});
for(const id of ["turnDialog","logDialog"])$(id).addEventListener("click",e=>{if(e.target!==$(id))return;const r=$(id).getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$(id).close();});

function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

const params = new URLSearchParams(location.search), requestedCode = params.get("room")?.toUpperCase();
if (requestedCode) {
  const remembered = localStorage.getItem(`island-room-${requestedCode}`);
  if (remembered) enterRoom(requestedCode, remembered);
  else { document.querySelector('[data-tab="join"]').click(); $("roomCode").value = requestedCode; }
}
