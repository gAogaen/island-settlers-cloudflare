const COLORS = ["#e87362", "#62a8dc", "#e5b64f", "#8f79c9"];
const PAWNS_PER_PLAYER = 7;
const BRIDGE_END = 10;

export async function handleChao(storage, request) {
  const url = new URL(request.url), route = url.pathname.split("/").pop();
  try {
    let game = await storage.get("chao");
    const body = request.method === "POST" ? await request.json() : {};
    if (route === "create") {
      if (game) throw Error("この部屋コードは使用中です。");
      const player = makePlayer(body.name, 0);
      game = { code: body.code, hostId: player.id, players: [player], phase: "lobby", revision: 1,
        log: [], messages: [], rematchReady: [], goalOrder: [], round: 0 };
      log(game, `${player.name}が橋の前に集まりました。`);
      await storage.put("chao", game);
      return json({ game: view(game, player), token: player.token });
    }
    if (!game) throw Error("部屋が見つかりません。");
    if (route === "join") {
      const returning = game.players.find(p => body.token && p.token === body.token);
      if (returning) return json({ game: view(game, returning), token: returning.token, rejoined: true });
      if (game.players.some(p => p.name === cleanName(body.name))) throw Error("同じ名前の参加者がいます。保存済みの端末から復帰してください。");
      if (game.phase !== "lobby" || game.players.length >= 4) throw Error("参加できる空きがありません。2〜4人で遊べます。");
      game = structuredClone(game);
      const player = makePlayer(body.name, game.players.length);
      game.players.push(player); game.revision++;
      log(game, `${player.name}が参加しました。`);
      await storage.put("chao", game);
      return json({ game: view(game, player), token: player.token });
    }
    const token = body.token || url.searchParams.get("token"), player = game.players.find(p => p.token === token);
    if (route === "state" && request.method === "GET") {
      if (!player && url.searchParams.get("spectate") !== "1") throw Error("部屋に参加するか観戦してください。");
      return json({ game: view(game, player) });
    }
    if (route !== "action" || request.method !== "POST" || !player) throw Error("操作できません。");
    if (body.revision !== undefined && Number(body.revision) !== game.revision) throw Error("盤面が更新されています。最新状態を確認してから操作してください。");
    game = structuredClone(game);
    const actor = game.players.find(p => p.id === player.id);
    action(game, actor, body);
    game.revision++;
    await storage.put("chao", game);
    return json({ game: view(game, actor) });
  } catch (error) {
    return json({ error: error?.message || "通信に失敗しました。" }, 400);
  }
}

function action(g, p, a) {
  if (a.type === "chat") {
    const text = String(a.text || "").trim().slice(0, 180);
    if (!text) throw Error("メッセージを入力してください。");
    g.messages ||= []; g.messages.unshift({ id: crypto.randomUUID(), name: p.name, text, at: Date.now() }); g.messages = g.messages.slice(0, 30);
    return;
  }
  if (g.phase === "lobby" && a.type === "start") {
    if (p.id !== g.hostId) throw Error("部屋を作った人がゲームを開始できます。");
    if (g.players.length < 2) throw Error("2人以上でゲームを始めてください。");
    setupPawns(g);
    g.phase = "roll"; g.turnId = g.players[0].id; g.round = 1; g.pending = null; g.goalOrder = []; g.winner = null; g.winners = []; g.lastResult = null; g.rematchReady = [];
    log(g, `${g.players[0].name}からゲーム開始。サイコロを振ります。`); return;
  }
  if (g.phase === "finished" && a.type === "rematch") {
    g.rematchReady ||= [];
    if (a.ready) { if (!g.rematchReady.includes(p.id)) g.rematchReady.push(p.id); }
    else g.rematchReady = g.rematchReady.filter(id => id !== p.id);
    log(g, `${p.name}が再戦${a.ready ? "に参加" : "を保留"}しました。`);
    if (g.players.every(x => g.rematchReady.includes(x.id))) {
      setupPawns(g); g.phase = "roll"; g.turnId = g.players[0].id; g.round = (g.round || 0) + 1;
      g.pending = null; g.goalOrder = []; g.winner = null; g.winners = []; g.lastResult = null; g.rematchReady = [];
      log(g, "再戦を開始しました。すべての駒がスタートに戻ります。");
    }
    return;
  }
  if (g.phase === "finished") throw Error("ゲームは終了しています。");
  if (a.type === "roll") {
    requireTurn(g, p, "roll");
    const faces = [1, 2, 3, 4, "x", "x"], face = faces[randomInt(faces.length)];
    g.pending = { actorId: p.id, face, declared: null, challengers: [], challengedBy: null };
    g.phase = "declare"; log(g, `${p.name}がサイコロを振りました。出目を宣言します。`); return;
  }
  if (a.type === "declare") {
    requireTurn(g, p, "declare");
    const amount = Number(a.amount);
    if (!Number.isInteger(amount) || amount < 1 || amount > 4) throw Error("宣言できるのは1〜4です。");
    g.pending.declared = amount;
    g.pending.challengers = clockwise(g, p.id).filter(x => mayChallenge(x));
    g.pending.challengeIndex = 0; g.phase = "challenge";
    log(g, `${p.name}は「${amount}」と宣言しました。`);
    if (!g.pending.challengers.length) resolve(g, null);
    return;
  }
  if (g.phase === "challenge" && ["challenge", "pass"].includes(a.type)) {
    const expected = g.pending?.challengers?.[g.pending.challengeIndex];
    if (!expected || expected.id !== p.id) throw Error("今はあなたの判断ではありません。");
    if (a.type === "pass") {
      log(g, `${p.name}は宣言を見送りました。`); g.pending.challengeIndex++;
      if (g.pending.challengeIndex >= g.pending.challengers.length) resolve(g, null);
      return;
    }
    const activePawn = pawnOnBridge(p);
    const wager = activePawn ? null : p.pawns?.find(x => x.id === a.stakePawnId && x.status === "goal");
    if (!activePawn && !wager) throw Error("ダウトに賭けるゴール駒を選んでください。");
    resolve(g, { playerId: p.id, stakePawnId: activePawn?.id || wager.id }); return;
  }
  if (a.type === "rematch") throw Error("再戦できるのはゲーム終了後です。");
  throw Error("現在の状態ではその操作はできません。");
}

function resolve(g, challenge) {
  const pending = g.pending, actor = g.players.find(p => p.id === pending.actorId), declared = pending.declared;
  const truthful = pending.face === declared;
  if (!challenge) {
    log(g, `${actor.name}の宣言は見破られず、${declared}マス進みました。`);
    advancePawn(g, actor, declared);
  } else {
    const challenger = g.players.find(p => p.id === challenge.playerId);
    pending.challengedBy = challenger.id;
    if (truthful) {
      log(g, `出目は${faceLabel(pending.face)}。宣言は本当でした。${challenger.name}の駒が谷底へ落ちます。`);
      losePawn(g, challenger, challenge.stakePawnId);
      advancePawn(g, actor, declared);
    } else {
      log(g, `出目は${faceLabel(pending.face)}。宣言はウソでした。${actor.name}の駒が谷底へ落ちます。`);
      losePawn(g, actor, pawnOnBridge(actor)?.id);
      const challengerPawn = pawnOnBridge(challenger);
      if (challengerPawn) advancePawn(g, challenger, declared);
      else log(g, `${challenger.name}はゴール駒を賭けていたため、宣言分の移動はありません。`);
    }
    g.lastResult = { id: crypto.randomUUID(), face: pending.face, truthful, declared, challengerId: challenger.id };
  }
  pending.resolved = { face: pending.face, truthful, declared, challengerId: challenge?.playerId || null };
  if (g.phase === "finished" || g.winner) { g.phase = "finished"; return; }
  g.pending = null;
  nextTurn(g, actor.id);
}

function advancePawn(g, p, spaces) {
  const pawn = pawnOnBridge(p); if (!pawn) return;
  const destination = pawn.pos + spaces;
  if (destination >= BRIDGE_END) {
    const occupied = new Set(g.goalOrder.map(item => item.rank));
    pawn.status = "goal"; pawn.pos = null; pawn.rank = Array.from({ length: 8 }, (_, i) => i + 1).find(rank => !occupied.has(rank));
    if (!pawn.rank) { pawn.status = "bridge"; pawn.pos = BRIDGE_END - 1; finishByPoints(g, "ゴール階段が埋まりました。"); return; }
    g.goalOrder.push({ playerId: p.id, pawnId: pawn.id, rank: pawn.rank });
    log(g, `${p.name}の駒が${pawn.rank}番目でゴールしました。`);
    if (p.pawns.filter(x => x.status === "goal").length >= 3) { g.winner = p.id; g.phase = "finished"; log(g, `${p.name}が3個の駒をゴールさせ、勝利しました！`); return; }
    if (g.goalOrder.length >= 8) { finishByPoints(g, "ゴール階段が埋まりました。"); return; }
    replacePawn(g, p);
  } else { pawn.pos = destination; log(g, `${p.name}の駒は橋の${destination}マス目。`); }
}

function losePawn(g, p, id) {
  const pawn = p.pawns?.find(x => x.id === id && ["bridge", "goal"].includes(x.status));
  if (!pawn) return;
  if (pawn.status === "goal") g.goalOrder = (g.goalOrder || []).filter(item => item.pawnId !== pawn.id);
  pawn.status = "fallen"; pawn.pos = null; pawn.rank = null;
  replacePawn(g, p);
}

function replacePawn(g, p) {
  if (pawnOnBridge(p)) return;
  const next = p.pawns?.find(x => x.status === "reserve");
  if (next) { next.status = "bridge"; next.pos = 0; log(g, `${p.name}の新しい駒が橋の入口に立ちました。`); }
}

function nextTurn(g, afterId) {
  const players = g.players, start = players.findIndex(p => p.id === afterId);
  const next = Array.from({ length: players.length }, (_, n) => players[(start + n + 1) % players.length]).find(p => pawnOnBridge(p));
  if (!next) {
    finishByPoints(g, "すべての駒が橋からなくなりました。"); return;
  }
  g.turnId = next.id; g.phase = "roll"; g.round++;
  log(g, `次は${next.name}の手番です。`);
}

function finishByPoints(g, reason) {
  const scores = g.players.map(p => ({ id: p.id, score: (p.pawns || []).reduce((sum, pawn) => sum + (pawn.status === "goal" ? pawn.rank : 0), 0) }));
  const best = Math.max(0, ...scores.map(x => x.score)); g.winners = scores.filter(x => x.score === best).map(x => x.id);
  g.winner = g.winners.length === 1 ? g.winners[0] : null; g.phase = "finished";
  log(g, `${reason}最終得点で${g.winners.map(id => g.players.find(p => p.id === id)?.name).join("・")}の勝ちです。`);
}

function view(g, me) {
  const pending = g.pending ? { actorId: g.pending.actorId, declared: g.pending.declared, challengers: g.pending.challengers?.map(p => p.id) || [], challengeIndex: g.pending.challengeIndex,
    challengedBy: g.pending.challengedBy || null, resolved: g.phase === "finished" ? g.pending.resolved : undefined } : null;
  if (pending && me?.id === g.pending?.actorId && !g.pending.resolved) pending.myFace = g.pending.face;
  const currentChallenger = g.pending?.challengers?.[g.pending.challengeIndex];
  return { code: g.code, hostId: g.hostId, revision: g.revision, phase: g.phase, turnId: g.turnId, round: g.round,
    players: g.players.map(p => ({ id: p.id, name: p.name, seat: p.seat, color: p.color, pawns: p.pawns?.map(x => ({ ...x })) || null, canChallenge: Boolean(pawnOnBridge(p) || p.pawns?.some(x => x.status === "goal")) })),
    pending, challengeId: currentChallenger?.id || null, me: me ? { id: me.id, token: me.token } : null,
    log: (g.log || []).slice(0, 35), messages: g.messages || [], goalOrder: g.goalOrder || [], lastResult: g.lastResult || null, winner: g.winner, winners: g.winners || [], rematchReady: g.rematchReady || [] };
}

function mayChallenge(p) { return Boolean(pawnOnBridge(p) || p.pawns?.some(x => x.status === "goal")); }
function setupPawns(g) { g.players.forEach((p, i) => { p.seat = i; p.pawns = Array.from({ length: PAWNS_PER_PLAYER }, (_, n) => ({ id: `${p.id}-${n + 1}`, status: n === 0 ? "bridge" : "reserve", pos: n === 0 ? 0 : null, rank: null })); }); }
function pawnOnBridge(p) { return p?.pawns?.find(x => x.status === "bridge"); }
function clockwise(g, id) { const index = g.players.findIndex(p => p.id === id); return [...g.players.slice(index + 1), ...g.players.slice(0, index)]; }
function requireTurn(g, p, phase) { if (g.phase !== phase || g.turnId !== p.id) throw Error("現在の手番ではありません。"); }
function faceLabel(face) { return face === "x" ? "×" : String(face); }
function log(g, message) { g.log ||= []; g.log.unshift(`${new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo" })}　${message}`); g.log = g.log.slice(0, 50); }
function makePlayer(name, seat) { return { id: crypto.randomUUID(), token: crypto.randomUUID(), name: cleanName(name), seat, color: COLORS[seat] }; }
function cleanName(value) { const name = String(value || "プレイヤー").trim().slice(0, 16); return name || "プレイヤー"; }
function randomInt(max) { return crypto.getRandomValues(new Uint32Array(1))[0] % max; }
function json(value, status = 200) { return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } }); }
