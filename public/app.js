const $ = id => document.getElementById(id);
const RESOURCES = ["wood", "brick", "sheep", "wheat", "ore"];
const RESOURCE = { wood: ["🌲", "木材"], brick: ["🧱", "レンガ"], sheep: ["🐑", "羊毛"], wheat: ["🌾", "小麦"], ore: ["⛰️", "鉱石"] };
const TERRAIN = { wood: ["森林", "🌲"], brick: ["丘陵", "🧱"], sheep: ["牧草地", "🐑"], wheat: ["畑", "🌾"], ore: ["山地", "⛰️"], desert: ["砂漠", "🏜️"] };
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
$("leaveRoom").addEventListener("click", () => { if (window.pollTimer) clearInterval(window.pollTimer); roomCode = null; playerId = null; currentGame = null; localStorage.removeItem(`island-room-${$("roomCodeDisplay").textContent}`); history.replaceState({}, "", "/"); $("gameView").hidden = true; $("homeView").hidden = false; });
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
  renderPlayers(g, me); renderHand(me); renderLog(g);
}
function renderPlayers(g, me) {
  $("playersList").innerHTML = g.players.map((p, i) => `<div class="player-row ${g.status === "playing" && (g.phase === "special" ? p.id === g.specialPlayerId : i === g.activeIndex) ? "active" : ""}"><i class="player-swatch" style="background:${p.color}"></i><div class="player-row-main"><div class="player-row-name">${escapeHtml(p.name)}${p.id === g.hostId ? '<span class="host-tag">HOST</span>' : ""}${p.id === playerId ? " <span style=\"color:#82968d;font-weight:500\">(あなた)</span>" : ""}</div><div class="player-row-meta">手札 ${p.handCount || 0}枚 · 道 ${p.roads?.length || 0}</div></div><span class="player-points">${p.victoryPoints ?? "—"}点</span></div>`).join("");
}
function renderHand(me) {
  const hand = me.hand || Object.fromEntries(RESOURCES.map(r => [r, 0])), total = RESOURCES.reduce((n, r) => n + hand[r], 0);
  $("handTotal").textContent = `${total}枚`;
  $("resourceHand").innerHTML = RESOURCES.map(r => `<div class="resource-card"><span class="res-symbol">${RESOURCE[r][0]}</span><b>${hand[r]}</b><small>${RESOURCE[r][1]}</small></div>`).join("");
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
  const scale = Math.min(map.large ? 48 : 59, 590 / maxX, 590 / maxY), px = v => 450 + (v.x - map.centerX) * scale, py = v => 335 + (v.y - map.centerY) * scale;
  let content = "";
  for (const h of map.hexes) {
    const points = h.corners.map(id => { const v=vertices.get(id); return `${px(v)},${py(v)}`; }).join(" ");
    const [terrainLabel, icon] = TERRAIN[h.terrain];
    content += `<polygon class="hex hex-${h.terrain}" points="${points}" data-hex="${h.id}"/>`;
    content += `<text class="hex-terrain" x="${450+(h.x-map.centerX)*scale}" y="${335+(h.y-map.centerY)*scale-13}">${icon}</text>`;
    if (h.number) {
      const hot = h.number === 6 || h.number === 8, cx=450+(h.x-map.centerX)*scale, cy=335+(h.y-map.centerY)*scale+14;
      content += `<circle class="hex-number ${hot ? "hot" : ""}" cx="${cx}" cy="${cy}" r="13"/><text class="hex-num-text" x="${cx}" y="${cy}">${h.number}</text><text class="hex-num-pips" x="${cx}" y="${cy+19}">${"•".repeat(Math.max(1, 6-Math.abs(7-h.number)))}</text>`;
    }
    if (h.id === map.robber) content += `<text class="robber-marker" x="${450+(h.x-map.centerX)*scale}" y="${335+(h.y-map.centerY)*scale+2}">♟</text>`;
    content += `<polygon class="hex-select" points="${points}" data-robber-hex="${h.id}"/>`;
  }
  for (const port of g.ports || []) {
    const a=vertices.get(port.a),b=vertices.get(port.b),cx=(px(a)+px(b))/2,cy=(py(a)+py(b))/2;
    content += `<g class="port-marker"><circle cx="${cx}" cy="${cy}" r="9" fill="#f6f3e5" stroke="#879c8f"/><text class="port-tag" x="${cx}" y="${cy}">${port.type}</text></g>`;
  }
  const roads = new Map(); for (const p of g.players) for (const edgeId of p.roads || []) roads.set(edgeId,p);
  for (const e of map.edges) {
    const a=vertices.get(e.a),b=vertices.get(e.b),owner=roads.get(e.id); const x1=px(a),y1=py(a),x2=px(b),y2=py(b);
    if (owner) content += `<line class="edge-road" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" style="stroke:${owner.color}"/>`;
    content += `<line class="edge-hit" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" data-edge="${e.id}"/>`;
  }
  for (const v of map.vertices) {
    const owner=g.players.find(p=>(p.settlements||[]).includes(v.id)||(p.cities||[]).includes(v.id));
    if (owner) {
      const city=owner.cities.includes(v.id), x=px(v),y=py(v);
      const shape = city ? `M ${x-13} ${y+9} V ${y-4} L ${x-5} ${y-12} L ${x+2} ${y-5} V ${y-15} H ${x+12} V ${y+9} Z` : `M ${x-11} ${y+9} V ${y-3} L ${x} ${y-14} L ${x+11} ${y-3} V ${y+9} Z`;
      content += `<g class="building-piece"><title>${escapeHtml(owner.name)}：${city ? "都市" : "開拓地"}</title><circle cx="${x}" cy="${y}" r="18" class="building-base"/><path d="${shape}" fill="${owner.color}" class="building-outline"/><path d="${shape}" fill="${owner.color}" class="building-face"/><rect x="${x-3}" y="${y+1}" width="6" height="8" rx="1" fill="#fff9e8"/>${city ? `<rect x="${x+5}" y="${y-10}" width="4" height="4" fill="#fff9e8"/>` : ""}</g>`;
    }
    content += `<circle class="vertex-hit" cx="${px(v)}" cy="${py(v)}" r="19" data-vertex="${v.id}"/>`;
  }
  svg.innerHTML = content;
  const robberTargets = g.phase === "robber" && g.players[g.activeIndex]?.id === playerId || (mode === "devKnightPending");
  document.querySelectorAll("[data-robber-hex]").forEach(el => { el.style.fill = "transparent"; el.style.stroke = "transparent"; el.style.pointerEvents = robberTargets ? "all" : "none"; el.style.cursor = robberTargets ? "pointer" : "default"; el.addEventListener("click", () => { if (!robberTargets || el.dataset.robberHex === map.robber) return; selectedRobberHex = el.dataset.robberHex; selectedVictim = ""; render(); }); });
  document.querySelectorAll("[data-edge]").forEach(el => el.addEventListener("click", () => {
    const edgeId=el.dataset.edge;
    if (mode === "road" || (g.phase === "setup" && g.setupStep === "road" && g.players[g.activeIndex]?.id === playerId)) act("buildRoad",{edgeId});
    else if (mode === "roadCard") { pendingRoadCard.push(edgeId); if (pendingRoadCard.length === Math.min(2, 15 - me.roads.length)) act("playCard",{card:"road",edgeIds:pendingRoadCard}); else showToast("もう1本、道を選んでください。"); }
  }));
  document.querySelectorAll("[data-vertex]").forEach(el => el.addEventListener("click", () => {
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
function renderLog(g) { $("gameLog").innerHTML = (g.log?.length ? g.log : ["対戦ログがここに表示されます。"]).slice(0, 12).map(line => `<p>${escapeHtml(line)}</p>`).join(""); }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

const params = new URLSearchParams(location.search), requestedCode = params.get("room")?.toUpperCase();
if (requestedCode) {
  const remembered = localStorage.getItem(`island-room-${requestedCode}`);
  if (remembered) enterRoom(requestedCode, remembered);
  else { document.querySelector('[data-tab="join"]').click(); $("roomCode").value = requestedCode; }
}
