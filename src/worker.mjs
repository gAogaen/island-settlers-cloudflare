const RESOURCES = ["wood", "brick", "sheep", "wheat", "ore"];
const COST = {
  road: { wood: 1, brick: 1 },
  settlement: { wood: 1, brick: 1, sheep: 1, wheat: 1 },
  city: { wheat: 2, ore: 3 },
  development: { sheep: 1, wheat: 1, ore: 1 }
};
const CARD_NAMES = { wood: "木材", brick: "レンガ", sheep: "羊毛", wheat: "小麦", ore: "鉱石" };
const TERRAIN_NAMES = { wood: "森林", brick: "丘陵", sheep: "牧草地", wheat: "畑", ore: "山地", desert: "砂漠" };
const TERRAIN_RESOURCE = { wood: "wood", brick: "brick", sheep: "sheep", wheat: "wheat", ore: "ore" };
const PLAYER_COLORS = ["#ef7166", "#60a6e9", "#e9b64d", "#9b79d5", "#58b891", "#e58dc0"];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    try {
      if (request.method === "POST" && url.pathname === "/api/rooms") {
        const body = await request.json();
        const code = randomCode();
        const id = env.ROOMS.idFromName(code);
        const room = env.ROOMS.get(id);
        const result = await room.fetch("https://room/create", { method: "POST", body: JSON.stringify({ ...body, code }) });
        return result;
      }
      const match = url.pathname.match(/^\/api\/rooms\/([A-Z0-9]{5,7})(?:\/(join|action))?$/i);
      if (!match) return json({ error: "URLが正しくありません。" }, 404);
      const [, rawCode, route] = match;
      const room = env.ROOMS.get(env.ROOMS.idFromName(rawCode.toUpperCase()));
      if ((route === "join" || route === "action") && request.method === "POST") {
        const body = await request.json();
        return room.fetch(`https://room/${route}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      }
      if (!route && request.method === "GET") return room.fetch(`https://room/state?playerId=${encodeURIComponent(url.searchParams.get("playerId") || "")}&spectate=${url.searchParams.get("spectate") === "1" ? "1" : "0"}`);
      return json({ error: "この操作には対応していません。" }, 405);
    } catch (error) {
      return json({ error: error?.message || "サーバーでエラーが発生しました。" }, 400);
    }
  }
};

export class GameRoom {
  constructor(state) { this.state = state; this.storage = state.storage; }

  async fetch(request) {
    return this.state.blockConcurrencyWhile(() => this.handleRequest(request));
  }

  async handleRequest(request) {
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/create") {
      if (await this.storage.get("game")) return json({ error: "この部屋コードは使用中です。" }, 409);
      const body = await request.json();
      const player = makePlayer(body.playerName, 0);
      const game = { code: body.code, hostId: player.id, players: [player], status: "lobby", createdAt: Date.now(), revision:1, log: [`${player.name}が部屋を作りました。`] };
      await this.storage.put("game", game);
      return json({ game: publicGame(game, player.id), playerId: player.id });
    }
    const game = await this.storage.get("game");
    if (!game) return json({ error: "部屋が見つかりません。" }, 404);
    if (request.method === "POST" && url.pathname === "/join") {
      const body = await request.json();
      if (game.status !== "lobby") return json({ error: "ゲーム開始後の部屋には参加できません。" }, 409);
      if (game.players.length >= 6) return json({ error: "この部屋は満員です。" }, 409);
      const player = makePlayer(body.playerName, game.players.length);
      game.players.push(player);game.revision=(game.revision||0)+1;
      game.log ||= []; pushLog(game, `${player.name}が参加しました。`);
      await this.storage.put("game", game);
      return json({ game: publicGame(game, player.id), playerId: player.id });
    }
    if (request.method === "GET" && url.pathname === "/state" && url.searchParams.get("spectate") === "1") return json({ game: spectatorGame(game) });
    const playerId = url.searchParams.get("playerId") || (request.method === "POST" ? (await request.clone().json()).playerId : "");
    const player = game.players.find(p => p.id === playerId);
    if (!player) return json({ error: "参加者情報が確認できません。部屋コードから入り直してください。" }, 403);
    if (request.method === "GET" && url.pathname === "/state") return json({ game: publicGame(game, playerId) });
    if (request.method === "POST" && url.pathname === "/action") {
      const body = await request.json();
      try {
        const next=structuredClone(game), nextPlayer=next.players.find(p=>p.id===playerId);
        applyAction(next, nextPlayer, body);next.revision=(next.revision||0)+1;
        pushLog(next, actionLog(next, nextPlayer, body));
        await this.storage.put("game", next);
        return json({ game: publicGame(next, playerId) });
      } catch (error) { return json({ error: error.message, game: publicGame(game, playerId) }, 400); }
    }
    return json({ error: "この操作には対応していません。" }, 404);
  }
}

function makePlayer(name, seat) {
  return { id: crypto.randomUUID(), name: cleanName(name), seat, color: PLAYER_COLORS[seat], hand: emptyHand(), devCards: [], playedKnights: 0, roads: [], settlements: [], cities: [], ready: false };
}
function cleanName(value) { const s = String(value || "プレイヤー").trim().slice(0, 16); return s || "プレイヤー"; }
function emptyHand() { return Object.fromEntries(RESOURCES.map(r => [r, 0])); }
function randomCode() { return Array.from(crypto.getRandomValues(new Uint8Array(6)), b => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32]).join(""); }
function json(value, status = 200) { return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } }); }
function pushLog(game, message) { game.log ||= []; if (message) game.log.unshift(`${new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo" })}  ${message}`); game.log = game.log.slice(0, 50); }
function actionLog(game, player, action) {
  const actions = { start: "ゲームを開始しました。", rematchReady: action.ready ? "再戦準備ができました。" : "再戦準備を取り消しました。", roll: `サイコロは${game.dice?.[0] || "?"}と${game.dice?.[1] || "?"}。`, buildRoad: "道を建設しました。", buildSettlement: "開拓地を建設しました。", buildCity: "都市を建設しました。", buyDevelopment: "発展カードを購入しました。", tradeBank: `${CARD_NAMES[action.give] || "資源"}を銀行で交換しました。`, offerTrade: "交換を提示しました。", respondTrade: action.accept ? "交換が成立しました。" : "交換を断りました。", endTurn: "ターンを終了しました。", endSpecial: "特別建設を終了しました。", moveRobber: "盗賊を移動しました。", discard: "資源を捨てました。", playCard: "発展カードを使いました。" };
  return `${player.name}：${actions[action.type] || "操作しました。"}`;
}
function shuffled(items) { const a = [...items]; for (let i = a.length - 1; i > 0; i--) { const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }

function createMap(playerCount) {
  const large = playerCount >= 5;
  let coords;
  if (!large) {
    coords = [];
    for (let q = -2; q <= 2; q++) for (let r = -2; r <= 2; r++) if (Math.abs(q + r) <= 2) coords.push([q, r]);
  } else {
    coords = [];
    const counts = [3, 4, 5, 6, 5, 4, 3];
    for (let row = -3; row <= 3; row++) {
      const possible = [];
      for (let q = -3; q <= 3; q++) if (Math.abs(q + row) <= 3) possible.push([q, row]);
      const target = counts[row + 3], start = Math.floor((possible.length - target) / 2);
      coords.push(...possible.slice(start, start + target));
    }
  }
  const terrains = large
    ? ["wood", "wood", "wood", "wood", "wood", "wood", "brick", "brick", "brick", "brick", "brick", "sheep", "sheep", "sheep", "sheep", "sheep", "sheep", "wheat", "wheat", "wheat", "wheat", "wheat", "wheat", "ore", "ore", "ore", "ore", "ore", "desert", "desert"]
    : ["wood", "wood", "wood", "wood", "sheep", "sheep", "sheep", "sheep", "wheat", "wheat", "wheat", "wheat", "ore", "ore", "ore", "brick", "brick", "brick", "desert"];
  const numbers = large
    ? [2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 6, 8, 8, 8, 8, 9, 9, 9, 10, 10, 10, 11, 11, 11, 12]
    : [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];
  const terrainDeck = shuffled(terrains);
  let assignedNumbers = [];
  for (let attempt = 0; attempt < 500; attempt++) {
    const deck = shuffled(numbers), candidate = terrainDeck.map(t => t === "desert" ? null : deck.pop());
    const redTiles = coords.map((coord, i) => ({ coord, number: candidate[i] })).filter(x => x.number === 6 || x.number === 8);
    const adjacentReds = redTiles.some((a, i) => redTiles.slice(i + 1).some(b => {
      const dq = a.coord[0] - b.coord[0], dr = a.coord[1] - b.coord[1];
      return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr)) === 1;
    }));
    assignedNumbers = candidate;
    if (!adjacentReds) break;
  }
  const vertexMap = new Map(), edgeMap = new Map(), hexes = [];
  const cornerAngles = [-90, -30, 30, 90, 150, 210];
  for (let i = 0; i < coords.length; i++) {
    const [q, r] = coords[i], cx = Math.sqrt(3) * (q + r / 2), cy = 1.5 * r;
    const corners = cornerAngles.map(deg => {
      const rad = deg * Math.PI / 180, x = +(cx + Math.cos(rad)).toFixed(4), y = +(cy + Math.sin(rad)).toFixed(4);
      const key = `${x},${y}`;
      if (!vertexMap.has(key)) vertexMap.set(key, { id: `v${vertexMap.size}`, x, y, hexes: [], edges: [] });
      const v = vertexMap.get(key); v.hexes.push(i); return v.id;
    });
    for (let j = 0; j < 6; j++) {
      const a = corners[j], b = corners[(j + 1) % 6], k = [a, b].sort().join("-");
      if (!edgeMap.has(k)) edgeMap.set(k, { id: `e${edgeMap.size}`, a, b, hexes: [] });
      const e = edgeMap.get(k); e.hexes.push(i);
    }
    hexes.push({ id: `h${i}`, q, r, x: cx, y: cy, corners, terrain: terrainDeck[i], number: assignedNumbers[i] });
  }
  const vertices = [...vertexMap.values()];
  for (const edge of edgeMap.values()) { vertexMap.get([...vertexMap.keys()].find(k => vertexMap.get(k).id === edge.a)).edges.push(edge.id); vertexMap.get([...vertexMap.keys()].find(k => vertexMap.get(k).id === edge.b)).edges.push(edge.id); }
  const robber = hexes.find(h => h.terrain === "desert")?.id;
  const centerX = (Math.min(...vertices.map(v => v.x)) + Math.max(...vertices.map(v => v.x))) / 2;
  const centerY = (Math.min(...vertices.map(v => v.y)) + Math.max(...vertices.map(v => v.y))) / 2;
  return { hexes, vertices, edges: [...edgeMap.values()], robber, large, centerX, centerY };
}

function beginGame(game) {
  game.status = "playing";
  game.matchId=crypto.randomUUID();game.matchNumber=(game.matchNumber||0)+1;
  game.longestRoadOwner=null;game.largestArmyOwner=null;game.lastRoll=null;game.lastProduction=null;
  game.tradeOffers=[];game.rematchReadyIds=[];game.specialQueue=[];game.specialPlayerId=null;game.normalNextIndex=null;game.pendingDevKnight=false;
  game.map = createMap(game.players.length);
  game.players.forEach((p, i) => { p.seat = i; p.color = PLAYER_COLORS[i]; p.hand = emptyHand(); p.roads = []; p.settlements = []; p.cities = []; p.devCards = []; p.playedKnights = 0; p.usedDevCard=false;p.victoryPoints=0;p.longestRoad=0; });
  game.activeIndex = 0; game.phase = "setup"; game.setupIndex = 0; game.setupStep = "settlement"; game.pendingVertex = null;
  game.turnNumber = 0; game.dice = null; game.rolled = false; game.discardPending = {}; game.winner = null;
  game.devDeck = shuffled([...[...Array(14)].map(() => "knight"), ...Array(5).fill("victory"), ...Array(2).fill("road"), ...Array(2).fill("plenty"), ...Array(2).fill("monopoly")]);
  game.ports = createPorts(game.map);
}

function createPorts(map) {
  const coast = map.edges.filter(e => e.hexes.length === 1);
  const candidates = coast.map(e => { const a = map.vertices.find(v => v.id === e.a), b = map.vertices.find(v => v.id === e.b); return { e, angle: Math.atan2((a.y + b.y) / 2 - map.centerY, (a.x + b.x) / 2 - map.centerX), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } }; }).sort((a, b) => a.angle - b.angle);
  const count = map.large ? 11 : 9, step = Math.max(1, Math.floor(candidates.length / count));
  const types = shuffled([...Array(map.large ? 6 : 4).fill("3:1"), ...RESOURCES]);
  return Array.from({ length: count }, (_, i) => { const c = candidates[(i * step) % candidates.length]; return { id: `p${i}`, type: types[i % types.length], a: c.e.a, b: c.e.b, x: c.mid.x, y: c.mid.y }; });
}

function applyAction(game, player, action) {
  if(action.type==="rematchReady") {
    if(!game.winner)throw Error("再戦準備はゲーム終了後に行えます。");
    const ready=new Set(game.rematchReadyIds||[]);
    if(action.ready===true)ready.add(player.id);else ready.delete(player.id);
    game.rematchReadyIds=[...ready];
    if(game.players.every(p=>ready.has(p.id)))beginGame(game);
    return;
  }
  if (action.type === "start") {
    if (player.id !== game.hostId) throw Error("ホストだけが開始できます。");
    if (game.status !== "lobby") throw Error("ゲームはすでに始まっています。");
    if (game.players.length < 3) throw Error("ゲーム開始には3人以上必要です。");
    beginGame(game); return;
  }
  if (game.status !== "playing") throw Error("ゲーム開始を待っています。");
  if (game.winner) throw Error("ゲームは終了しています。");
  if (game.phase === "setup") return setupAction(game, player, action);
  if (game.phase === "discard") return discardAction(game, player, action);
  if (game.phase === "robber") return robberAction(game, player, action);
  if (game.phase === "special") {
    if (game.specialPlayerId !== player.id) throw Error("特別建設フェーズの順番を待っています。");
    if (action.type === "endSpecial") return finishSpecial(game);
    if (action.type === "buildRoad") return buildRoad(game, player, action.edgeId, false);
    if (action.type === "buildSettlement") return buildSettlement(game, player, action.vertexId, false);
    if (action.type === "buildCity") return buildCity(game, player, action.vertexId);
    if (action.type === "buyDevelopment") return buyDevelopment(game, player);
    throw Error("特別建設フェーズでは建設と発展カードの購入ができます。");
  }
  if (action.type === "respondTrade") return respondTrade(game, player, action);
  if (game.activeIndex == null || game.players[game.activeIndex].id !== player.id) throw Error("あなたのターンではありません。");
  if (action.type === "offerTrade") return offerTrade(game, player, action);
  if (action.type === "roll") return rollDice(game);
  if (action.type === "endTurn") {
    if (!game.rolled || game.phase !== "main") throw Error("まずサイコロを振ってください。");
    const endedIndex = game.activeIndex;
    game.activeIndex = (game.activeIndex + 1) % game.players.length; game.players[game.activeIndex].usedDevCard = false; game.rolled = false; game.dice = null; game.turnNumber++;
    if (game.players.length >= 5) {
      game.specialQueue = Array.from({ length: game.players.length - 1 }, (_, i) => game.players[(endedIndex + 1 + i) % game.players.length].id);
      game.specialPlayerId = game.specialQueue[0]; game.normalNextIndex = game.activeIndex; game.phase = "special";
    } else game.phase = "play";
    game.tradeOffers = (game.tradeOffers || []).filter(o => o.status !== "pending");
    return;
  }
  if (game.phase === "play") throw Error("先にサイコロを振ってください。");
  if (action.type === "buildRoad") return buildRoad(game, player, action.edgeId, false);
  if (action.type === "buildSettlement") return buildSettlement(game, player, action.vertexId, false);
  if (action.type === "buildCity") return buildCity(game, player, action.vertexId);
  if (action.type === "buyDevelopment") return buyDevelopment(game, player);
  if (action.type === "tradeBank") return tradeBank(game, player, action.give, action.want);
  if (action.type === "playCard") return playCard(game, player, action);
  throw Error("選択した操作には対応していません。");
}

function setupAction(game, player, action) {
  const expected = game.players[game.setupIndex < game.players.length ? game.setupIndex : 2 * game.players.length - 1 - game.setupIndex];
  if (expected.id !== player.id) throw Error("初期配置の順番を待っています。");
  if (game.setupStep === "settlement") {
    if (action.type !== "buildSettlement") throw Error("先に開拓地を置いてください。");
    const vertex = game.map.vertices.find(v => v.id === action.vertexId); if (!vertex) throw Error("その場所は選べません。");
    if (game.players.some(p => [...p.settlements, ...p.cities].includes(vertex.id))) throw Error("そこにはすでに建物があります。");
    if (vertex.edges.some(eid => { const e = edgeById(game, eid); const other = game.map.vertices.find(v => v.id === (e.a === vertex.id ? e.b : e.a)); return game.players.some(p => [...p.settlements, ...p.cities].includes(other.id)); })) throw Error("開拓地の間は1辺以上空けてください。");
    player.settlements.push(vertex.id); game.pendingVertex = vertex.id; game.setupStep = "road";
    if (game.setupIndex >= game.players.length) for (const hid of vertex.hexes) { const h = game.map.hexes[hid], res = TERRAIN_RESOURCE[h.terrain]; if (res) player.hand[res]++; }
    return;
  }
  if (action.type !== "buildRoad") throw Error("開拓地に接する道を置いてください。");
  const edge = edgeById(game, action.edgeId); if (!edge || ![edge.a, edge.b].includes(game.pendingVertex)) throw Error("その道は選べません。");
  if (allRoads(game).has(edge.id)) throw Error("そこにはすでに道があります。");
  player.roads.push(edge.id); game.setupIndex++;
  if (game.setupIndex >= 2 * game.players.length) { game.phase = "play"; game.activeIndex = 0; game.turnNumber = 1; game.setupStep = null; refreshAwards(game); }
  else { game.activeIndex = game.setupIndex < game.players.length ? game.setupIndex : 2 * game.players.length - 1 - game.setupIndex; game.setupStep = "settlement"; }
  game.pendingVertex = null;
}
function finishSpecial(game) {
  game.specialQueue.shift();
  if (game.specialQueue.length) game.specialPlayerId = game.specialQueue[0];
  else {
    game.specialPlayerId = null; game.phase = "play"; game.activeIndex = game.normalNextIndex; game.normalNextIndex = null;
    if (game.players[game.activeIndex]?.victoryPoints >= 10) { game.winner = game.players[game.activeIndex].id; game.phase = "finished"; }
  }
}

function rollDice(game) {
  if (game.phase !== "play" || game.rolled) throw Error("このターンはすでにサイコロを振っています。");
  const a = 1 + crypto.getRandomValues(new Uint32Array(1))[0] % 6, b = 1 + crypto.getRandomValues(new Uint32Array(1))[0] % 6;
  game.dice = [a, b]; game.rolled = true;
  game.lastRoll={id:crypto.randomUUID(),turnNumber:game.turnNumber,playerId:game.players[game.activeIndex].id,playerName:game.players[game.activeIndex].name,dice:[a,b]};
  if (a + b === 7) {
    game.discardPending = {};
    for (const p of game.players) { const total = totalCards(p.hand); if (total > 7) game.discardPending[p.id] = Math.floor(total / 2); }
    game.phase = Object.keys(game.discardPending).length ? "discard" : "robber";
    game.lastProduction={id:game.lastRoll.id,number:7,tiles:[],blockedTiles:[],payouts:game.players.map(p=>({playerId:p.id,resources:emptyHand()})),shortages:[]};
  } else { distribute(game, a + b); game.phase = "main"; }
}
function distribute(game, number) {
  const payouts = game.players.map(() => emptyHand()),shortages=[];
  for (const h of game.map.hexes) {
    if (h.number !== number || h.id === game.map.robber) continue;
    const res = TERRAIN_RESOURCE[h.terrain]; if (!res) continue;
    for (const vId of h.corners) game.players.forEach((p, pi) => { if (p.settlements.includes(vId)) payouts[pi][res]++; if (p.cities.includes(vId)) payouts[pi][res] += 2; });
  }
  for (const r of RESOURCES) {
    let requested = payouts.reduce((sum, hand) => sum + hand[r], 0), available = bankAvailable(game, r);
    if (requested > available) {shortages.push(r);payouts.forEach(hand=>hand[r]=0);continue;}
    game.players.forEach((p, i) => p.hand[r] += payouts[i][r]);
  }
  game.lastProduction={id:game.lastRoll?.id||crypto.randomUUID(),number,tiles:game.map.hexes.filter(h=>h.number===number&&h.id!==game.map.robber).map(h=>h.id),blockedTiles:game.map.hexes.filter(h=>h.number===number&&h.id===game.map.robber).map(h=>h.id),payouts:game.players.map((p,i)=>({playerId:p.id,resources:payouts[i]})),shortages};
  for(const row of game.lastProduction.payouts)if(totalCards(row.resources)>0)pushLog(game,`${game.players.find(p=>p.id===row.playerId).name}が${RESOURCES.filter(r=>row.resources[r]>0).map(r=>CARD_NAMES[r]+row.resources[r]+"枚").join("・")}を獲得。`);
}
function discardAction(game, player, action) {
  const needed = game.discardPending[player.id]; if (!needed) throw Error("手札を捨てる必要はありません。");
  if (action.type !== "discard") throw Error("指定枚数の資源を捨ててください。");
  const cards = action.cards || {};
  if (RESOURCES.reduce((n, r) => n + Number(cards[r] || 0), 0) !== needed) throw Error(`${needed}枚を選択してください。`);
  for (const r of RESOURCES) { const n = Number(cards[r] || 0); if (!Number.isInteger(n) || n < 0 || n > player.hand[r]) throw Error("選択した資源の枚数が不正です。"); player.hand[r] -= n; }
  delete game.discardPending[player.id];
  if (!Object.keys(game.discardPending).length) game.phase = "robber";
}
function robberAction(game, player, action) {
  if (game.players[game.activeIndex].id !== player.id) throw Error("盗賊を動かせるのは手番のプレイヤーです。");
  if (action.type !== "moveRobber") throw Error("盗賊の移動先を選んでください。");
  const hex = game.map.hexes.find(h => h.id === action.hexId); if (!hex || hex.id === game.map.robber) throw Error("別のタイルを選んでください。");
  game.map.robber = hex.id;
  const targets = game.players.filter(p => p.id !== player.id && [...p.settlements, ...p.cities].some(v => hex.corners.includes(v)) && totalCards(p.hand) > 0);
  const victim = targets.find(p => p.id === action.victimId) || targets[0];
  if (victim) { const pool = RESOURCES.flatMap(r => Array(victim.hand[r]).fill(r)); const resource = pool[crypto.getRandomValues(new Uint32Array(1))[0] % pool.length]; victim.hand[resource]--; player.hand[resource]++; }
  game.phase = "main";
  if (game.pendingDevKnight) { game.players[game.activeIndex].playedKnights++; game.pendingDevKnight = false; refreshAwards(game); checkWinner(game); }
}

function buildRoad(game, player, edgeId, free) {
  const edge = edgeById(game, edgeId); if (!edge) throw Error("その道は選べません。");
  if (allRoads(game).has(edge.id)) throw Error("そこにはすでに道があります。");
  if (!free) pay(player, COST.road);
  const connected = [edge.a, edge.b].some(vId => {
    if (player.settlements.includes(vId) || player.cities.includes(vId)) return true;
    const v = game.map.vertices.find(x => x.id === vId);
    return v.edges.some(eid => { if (eid === edge.id) return false; const owner = game.players.find(p => p.roads.includes(eid)); if (!owner || owner.id !== player.id) return false; return !game.players.some(p => p.id !== player.id && [...p.settlements, ...p.cities].includes(vId)); });
  });
  if (!connected) throw Error("自分の道か建物につながる場所に置いてください。");
  if (player.roads.length >= 15) throw Error("道の駒をすべて使っています。");
  player.roads.push(edge.id); refreshAwards(game); checkWinner(game);
}
function buildSettlement(game, player, vertexId, free) {
  const v = game.map.vertices.find(x => x.id === vertexId); if (!v) throw Error("その場所は選べません。");
  if (game.players.some(p => [...p.settlements, ...p.cities].includes(v.id))) throw Error("そこにはすでに建物があります。");
  if (v.edges.some(eid => { const e = edgeById(game, eid), far = e.a === v.id ? e.b : e.a; return game.players.some(p => [...p.settlements, ...p.cities].includes(far)); })) throw Error("建物の間は1辺以上空けてください。");
  if (!v.edges.some(eid => player.roads.includes(eid))) throw Error("自分の道に接する場所を選んでください。");
  if (!free) pay(player, COST.settlement);
  if (player.settlements.length >= 5) throw Error("開拓地の駒をすべて使っています。");
  player.settlements.push(v.id); refreshAwards(game); checkWinner(game);
}
function buildCity(game, player, vertexId) {
  if (!player.settlements.includes(vertexId)) throw Error("自分の開拓地を選んでください。");
  if (player.cities.length >= 4) throw Error("都市の駒をすべて使っています。");
  pay(player, COST.city); player.settlements = player.settlements.filter(v => v !== vertexId); player.cities.push(vertexId); refreshAwards(game); checkWinner(game);
}
function buyDevelopment(game, player) {
  if (!game.devDeck.length) throw Error("発展カードが残っていません。");
  pay(player, COST.development); const type = game.devDeck.pop(); player.devCards.push({ type, boughtTurn: game.turnNumber }); refreshAwards(game); checkWinner(game);
}
function playCard(game, player, action) {
  const type = action.card;
  const index = player.devCards.findIndex(c => c.type === type && c.boughtTurn < game.turnNumber && type !== "victory");
  if (index < 0) throw Error("このターンに購入したカードは使えません。");
  if (player.usedDevCard) throw Error("発展カードは1ターンに1枚までです。");
  player.devCards.splice(index, 1); player.usedDevCard = true;
  if (type === "knight") { game.phase = "robber"; game.pendingDevKnight = true; return; }
  if (type === "plenty") {
    const cards = action.cards || {};
    if (RESOURCES.reduce((n, r) => n + Number(cards[r] || 0), 0) !== 2) throw Error("選ぶ資源は合計2枚です。");
    for (const r of RESOURCES) { const n = Number(cards[r] || 0); if (!Number.isInteger(n) || n < 0) throw Error("資源の選択が不正です。"); }
    for (const r of RESOURCES) if (Number(cards[r] || 0) > bankAvailable(game, r)) throw Error("銀行の資源が足りません。");
    for (const r of RESOURCES) player.hand[r] += Number(cards[r] || 0);
  } else if (type === "monopoly") {
    if (!RESOURCES.includes(action.resource)) throw Error("資源を選んでください。");
    let gained = 0; for (const other of game.players) if (other.id !== player.id) { gained += other.hand[action.resource]; other.hand[action.resource] = 0; } player.hand[action.resource] += gained;
  } else if (type === "road") {
    if (!Array.isArray(action.edgeIds) || action.edgeIds.length < 1 || action.edgeIds.length > Math.min(2, 15 - player.roads.length)) throw Error("道を1〜2本選んでください。");
    for (const edgeId of action.edgeIds) buildRoad(game, player, edgeId, true);
  }
  refreshAwards(game); checkWinner(game);
}
function tradeBank(game, player, give, want) {
  if (!RESOURCES.includes(give) || !RESOURCES.includes(want) || give === want) throw Error("交換する資源を選んでください。");
  const rate = tradeRate(game, player, give); if (player.hand[give] < rate) throw Error(`${CARD_NAMES[give]}が${rate}枚必要です。`);
  if (bankAvailable(game, want) < 1) throw Error("銀行にその資源が残っていません。");
  player.hand[give] -= rate; player.hand[want]++;
}
function normalizeTradeCards(value) {
  if(!value||typeof value!=="object"||Array.isArray(value)||Object.keys(value).some(k=>!RESOURCES.includes(k)))throw Error("交換する資源が不正です。");
  const cards=emptyHand();
  for(const r of RESOURCES){const n=Number(value[r]||0);if(!Number.isInteger(n)||n<0||n>24)throw Error("交換枚数は0〜24枚で指定してください。");cards[r]=n;}
  return cards;
}
function tradeCards(offer,side) {
  if(offer[side+"Cards"])return normalizeTradeCards(offer[side+"Cards"]);
  const cards=emptyHand();if(RESOURCES.includes(offer[side]))cards[offer[side]]=Number(offer[side+"Count"]||0);return cards;
}
function offerTrade(game, player, action) {
  if(game.phase!=="main")throw Error("プレイヤー交換はサイコロを振った後に行えます。");
  const target=game.players.find(p=>p.id===action.toId&&p.id!==player.id);
  if(!target)throw Error("交換相手を選んでください。");
  const giveCards=action.giveCards?normalizeTradeCards(action.giveCards):tradeCards(action,"give"),wantCards=action.wantCards?normalizeTradeCards(action.wantCards):tradeCards(action,"want");
  if(!totalCards(giveCards)||!totalCards(wantCards))throw Error("双方の資源を1枚以上選んでください。");
  if(RESOURCES.some(r=>giveCards[r]&&wantCards[r]))throw Error("同じ種類の資源を渡す側と受け取る側の両方には指定できません。");
  if(RESOURCES.some(r=>player.hand[r]<giveCards[r]))throw Error("提示する資源が足りません。");
  game.tradeOffers=(game.tradeOffers||[]).filter(o=>o.status!=="pending"||(o.fromId!==player.id&&o.toId!==player.id));
  game.tradeOffers.push({id:crypto.randomUUID(),fromId:player.id,toId:target.id,giveCards,wantCards,status:"pending"});
}
function respondTrade(game,player,action) {
  if(game.phase!=="main")throw Error("この交換は終了しています。");
  const offer=(game.tradeOffers||[]).find(o=>o.id===action.offerId&&o.status==="pending");
  if(!offer||offer.toId!==player.id||game.players[game.activeIndex].id!==offer.fromId)throw Error("交換の提示が見つからないか、すでに終了しています。");
  const from=game.players.find(p=>p.id===offer.fromId),give=tradeCards(offer,"give"),want=tradeCards(offer,"want");
  if(action.accept){
    if(RESOURCES.some(r=>from.hand[r]<give[r]||player.hand[r]<want[r]))throw Error("手札が変わったため交換できません。");
    for(const r of RESOURCES){from.hand[r]+=want[r]-give[r];player.hand[r]+=give[r]-want[r];}
    offer.status="accepted";
  }else offer.status="declined";
}
function tradeRate(game, player, resource) {
  let rate = 4;
  for (const port of game.ports || []) if ([port.a, port.b].some(v => player.settlements.includes(v) || player.cities.includes(v))) {
    if (port.type === "3:1") rate = Math.min(rate, 3);
    if (port.type === resource) rate = Math.min(rate, 2);
  }
  return rate;
}
function pay(player, cost) { for (const [r, n] of Object.entries(cost)) if (player.hand[r] < n) throw Error(`${CARD_NAMES[r]}が足りません。`); for (const [r, n] of Object.entries(cost)) player.hand[r] -= n; }
function edgeById(game, id) { return game.map.edges.find(e => e.id === id); }
function allRoads(game) { return new Set(game.players.flatMap(p => p.roads)); }
function bankAvailable(game, resource) { return (game.players.length >= 5 ? 24 : 19) - game.players.reduce((sum, p) => sum + p.hand[resource], 0); }
function totalCards(hand) { return RESOURCES.reduce((sum, r) => sum + hand[r], 0); }
function refreshAwards(game) {
  for (const p of game.players) { p.longestRoad = longestRoad(game, p); p.victoryPoints = p.settlements.length + p.cities.length * 2 + p.devCards.filter(c => c.type === "victory").length; }
  const roadOwner = awardOwner(game.players, "longestRoad", 5, game.longestRoadOwner);
  if (roadOwner !== undefined) game.longestRoadOwner = roadOwner;
  const armyOwner = awardOwner(game.players, "playedKnights", 3, game.largestArmyOwner);
  if (armyOwner !== undefined) game.largestArmyOwner = armyOwner;
  for (const p of game.players) p.victoryPoints += (p.id === game.longestRoadOwner ? 2 : 0) + (p.id === game.largestArmyOwner ? 2 : 0);
}
function awardOwner(players, field, min, previous) {
  const high = Math.max(...players.map(p => p[field] || 0)); if (high < min) return null;
  const leaders = players.filter(p => p[field] === high);
  if (leaders.length === 1) return leaders[0].id;
  if (leaders.some(p => p.id === previous)) return previous;
  return null;
}
function longestRoad(game, player) {
  const edges = player.roads.map(id => edgeById(game, id)).filter(Boolean), adjacency = new Map();
  for (const e of edges) for (const v of [e.a, e.b]) { if (!adjacency.has(v)) adjacency.set(v, []); adjacency.get(v).push(e); }
  let best = 0;
  function dfs(v, used, length) {
    best = Math.max(best, length);
    if (length && game.players.some(p => p.id !== player.id && [...p.settlements, ...p.cities].includes(v))) return;
    for (const e of adjacency.get(v) || []) if (!used.has(e.id)) { used.add(e.id); dfs(e.a === v ? e.b : e.a, used, length + 1); used.delete(e.id); }
  }
  for (const v of adjacency.keys()) dfs(v, new Set(), 0);
  return best;
}
function checkWinner(game) { if (game.phase === "special") return; const p = game.players[game.activeIndex]; if (!p || p.victoryPoints < 10) return; if (p) { game.winner = p.id; game.phase = "finished"; } }

function legalBuildTargets(game,p) {
  const result={roads:[],settlements:[],cities:[],freeRoads:[]};
  if(!p||!game.map||game.winner)return result;
  const ownsTurn=game.phase==="special"?game.specialPlayerId===p.id:game.players[game.activeIndex]?.id===p.id;
  if(!ownsTurn)return result;
  const setup=game.phase==="setup",regular=["main","special"].includes(game.phase);
  if(!setup&&!regular)return result;
  const occupied=new Set(game.players.flatMap(x=>[...x.settlements,...x.cities])),roads=allRoads(game);
  const canPay=cost=>Object.entries(cost).every(([r,n])=>p.hand[r]>=n);
  if((setup&&game.setupStep==="road")||regular){
    if(p.roads.length<15)for(const edge of game.map.edges){
      if(roads.has(edge.id))continue;
      const connected=setup?[edge.a,edge.b].includes(game.pendingVertex):[edge.a,edge.b].some(v=>{
        if(p.settlements.includes(v)||p.cities.includes(v))return true;
        if(game.players.some(x=>x.id!==p.id&&[...x.settlements,...x.cities].includes(v)))return false;
        return game.map.vertices.find(x=>x.id===v).edges.some(id=>p.roads.includes(id));
      });
      if(connected){result.freeRoads.push(edge.id);if(setup||canPay(COST.road))result.roads.push(edge.id);}
    }
  }
  if((setup&&game.setupStep==="settlement")||(regular&&p.settlements.length<5&&canPay(COST.settlement))){
    for(const v of game.map.vertices){
      if(occupied.has(v.id))continue;
      if(v.edges.some(id=>{const e=edgeById(game,id);return occupied.has(e.a===v.id?e.b:e.a);}))continue;
      if(setup||v.edges.some(id=>p.roads.includes(id)))result.settlements.push(v.id);
    }
  }
  if(regular&&p.cities.length<4&&canPay(COST.city))result.cities=[...p.settlements];
  return result;
}

function publicGame(game, viewerId) {
  const output = structuredClone(game);
  output.players = output.players.map(p => ({ ...p, hand: p.id === viewerId ? p.hand : undefined, handCount: totalCards(p.hand), devCards: p.id === viewerId ? p.devCards : undefined, devCount: p.devCards.length, roads: p.roads, settlements: p.settlements, cities: p.cities }));
  if (output.devDeck) output.devDeckCount = output.devDeck.length;
  delete output.devDeck;
  output.tradeRates = Object.fromEntries(RESOURCES.map(r => [r, tradeRate(game, game.players.find(p => p.id === viewerId) || game.players[0], r)]));
  output.players.forEach(p => { if (p.id !== viewerId && !game.winner) p.victoryPoints = (p.victoryPoints || 0) - game.players.find(x => x.id === p.id).devCards.filter(c => c.type === "victory").length; });
  output.bankResources=Object.fromEntries(RESOURCES.map(r=>[r,bankAvailable(game,r)]));
  output.legalMoves=legalBuildTargets(game,game.players.find(p=>p.id===viewerId));
  output.log = output.log || [];
  output.tradeOffers = output.tradeOffers || [];
  return output;
}

// A spectator gets only public information and cannot receive player credentials.
function spectatorGame(game) {
  const output=publicGame(game, null);
  output.tradeOffers=[];
  delete output.tradeRates;
  const aliases=new Map(game.players.map((p,i)=>[p.id,`seat-${i+1}`]));
  function anonymize(value) {
    if(typeof value === "string") return aliases.get(value)||value;
    if(Array.isArray(value)) return value.map(anonymize);
    if(value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key,v])=>[aliases.get(key)||key,anonymize(v)]));
    return value;
  }
  return anonymize(output);
}
