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
      const df=url.pathname.match(/^\/api\/daifugo(?:\/([A-Z0-9]{6})(?:\/(join|action))?)?$/i);
      if(df){const code=df[1]?.toUpperCase()||randomCode(),route=df[1]?(df[2]||"state"):"create";if((route==="state"&&request.method!=="GET")||(route!=="state"&&request.method!=="POST"))return json({error:"操作が正しくありません。"},405);const room=env.ROOMS.get(env.ROOMS.idFromName("daifugo:"+code));return room.fetch(`https://room/df/${route}${url.search}`,request.method==="POST"?{method:"POST",body:JSON.stringify({...await request.json(),code})}:undefined);}
      const rd=url.pathname.match(/^\/api\/reddoor(?:\/([A-Z0-9]{6})(?:\/(join|action))?)?$/i);
      if(rd){const code=rd[1]?.toUpperCase()||randomCode(),route=rd[1]?(rd[2]||"state"):"create";if((route==="state"&&request.method!=="GET")||(route!=="state"&&request.method!=="POST"))return json({error:"操作が正しくありません。"},405);const room=env.ROOMS.get(env.ROOMS.idFromName("reddoor:"+code));return room.fetch(`https://room/rd/${route}${url.search}`,request.method==="POST"?{method:"POST",body:JSON.stringify({...await request.json(),code})}:undefined);}
      const pg=url.pathname.match(/^\/api\/penguin(?:\/([A-Z0-9]{6})(?:\/(join|action))?)?$/i);
      if(pg){const code=pg[1]?.toUpperCase()||randomCode(),route=pg[1]?(pg[2]||"state"):"create";if((route==="state"&&request.method!=="GET")||(route!=="state"&&request.method!=="POST"))return json({error:"操作が正しくありません。"},405);const room=env.ROOMS.get(env.ROOMS.idFromName("penguin:"+code));return room.fetch(`https://room/pg/${route}${url.search}`,request.method==="POST"?{method:"POST",body:JSON.stringify({...await request.json(),code})}:undefined);}
      const tb=url.pathname.match(/^\/api\/timebomb(?:\/([A-Z0-9]{6})(?:\/(join|action))?)?$/i);
      if(tb){
        const code=tb[1]?.toUpperCase()||randomCode();
        const room=env.ROOMS.get(env.ROOMS.idFromName("timebomb:"+code));
        const route=tb[1]?(tb[2]||"state"):"create";
        if((route==="state"&&request.method!=="GET")||(route!=="state"&&request.method!=="POST"))return json({error:"操作が正しくありません。"},405);
        const body=request.method==="POST"?{...await request.json(),code}:null;
        return room.fetch(`https://room/tb/${route}${url.search}`,body?{method:"POST",body:JSON.stringify(body)}:undefined);
      }
      const si=url.pathname.match(/^\/api\/spirit(?:\/([A-Z0-9]{6})(?:\/(join|action))?)?$/i);
      if(si){const code=si[1]?.toUpperCase()||randomCode(),route=si[1]?(si[2]||"state"):"create";if((route==="state"&&request.method!=="GET")||(route!=="state"&&request.method!=="POST"))return json({error:"操作が正しくありません。"},405);const room=env.ROOMS.get(env.ROOMS.idFromName("spirit:"+code));return room.fetch(`https://room/si/${route}${url.search}`,request.method==="POST"?{method:"POST",body:JSON.stringify({...await request.json(),code})}:undefined);}
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
    if(new URL(request.url).pathname.startsWith("/df/"))return handleDaifugo(this.storage,request);
    if(new URL(request.url).pathname.startsWith("/rd/"))return handleReddoor(this.storage,request);
    if(new URL(request.url).pathname.startsWith("/pg/"))return handlePenguin(this.storage,request);
    if(new URL(request.url).pathname.startsWith("/tb/"))return handleTimebomb(this.storage,request);
    if(new URL(request.url).pathname.startsWith("/si/"))return handleSpiritIsland(this.storage,request);
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
      const matches=game.players.filter(p=>p.name===cleanName(body.playerName));
      if(matches.length>1)return json({error:"同じ名前の参加者が複数いるため、保存済みの参加情報から復帰してください。"},409);
      if(matches.length===1)return json({game:publicGame(game,matches[0].id),playerId:matches[0].id,rejoined:true});
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
        const message=actionLog(next, nextPlayer, body);
        pushLog(next, message);
        next.actionEvents ||= [];
        const event={revision:next.revision,actorId:nextPlayer.id,message,at:Date.now()};
        if(body.type==="roll" && next.phase==="discard")event.impact={type:"burst",targets:{...next.discardPending}};
        if(body.type==="moveRobber") {
          const hex=next.map.hexes.find(h=>h.id===body.hexId);
          if(hex)event.impact={type:"robber",hexId:hex.id,targets:Object.fromEntries(next.players.filter(p=>p.id!==nextPlayer.id&&[...p.settlements,...p.cities].some(v=>hex.corners.includes(v))).map(p=>[p.id,true]))};
        }
        if(body.type==="playCard")event.development=developmentAnnouncement(game,next,nextPlayer,body);
        next.actionEvents.push(event);
        next.actionEvents=next.actionEvents.slice(-50);
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
function developmentAnnouncement(before,after,player,action){
 const effect={card:action.card,playerName:player.name};
 if(action.card==='monopoly'){effect.resource=action.resource;effect.total=player.hand[action.resource]-before.players.find(p=>p.id===player.id).hand[action.resource];}
 if(action.card==='plenty')effect.resources=Object.fromEntries(RESOURCES.filter(r=>Number(action.cards?.[r])>0).map(r=>[r,Number(action.cards[r])]));
 if(action.card==='road')effect.roads=action.edgeIds.length;
 return effect;
}
function actionLog(game, player, action) {
  const actions = { start: "ゲームを開始しました。", rematchReady: action.ready ? "再戦準備ができました。" : "再戦準備を取り消しました。", roll: `サイコロは${game.dice?.[0] || "?"}と${game.dice?.[1] || "?"}。`, buildRoad: "道を建設しました。", buildSettlement: "開拓地を建設しました。", buildCity: "都市を建設しました。", buyDevelopment: "発展カードを購入しました。", tradeBank: `${CARD_NAMES[action.give] || "資源"}を銀行で交換しました。`, offerTrade: "交換を提示しました。", respondTrade: action.accept ? "交換が成立しました。" : "交換を断りました。", endTurn: "ターンを終了しました。", endSpecial: "特別建設を終了しました。", moveRobber: "盗賊を移動しました。", discard: "資源を捨てました。", playCard: `${({knight:"騎士",plenty:"豊作",monopoly:"独占",road:"街道建設"})[action.card] || "発展カード"}を使いました。` };
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
  game.players = shuffled(game.players);
  game.map = createMap(game.players.length);
  pushLog(game, `手番順：${game.players.map(p=>p.name).join(" → ")}`);
  game.players.forEach((p, i) => { p.seat = i; p.hand = emptyHand(); p.roads = []; p.settlements = []; p.cities = []; p.devCards = []; p.playedKnights = 0; p.usedDevCard=false;p.victoryPoints=0;p.longestRoad=0; });
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
  output.actionEvents=(output.actionEvents||[]).map(event=>{
    const impact=event.impact;delete event.impact;
    if(impact?.targets?.[viewerId])event.impact={type:impact.type,hexId:impact.hexId,count:impact.type==="burst"?impact.targets[viewerId]:undefined};
    return event;
  });
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

// Time Bomb is isolated in its own Durable Object namespace and storage key.
function tbShuffle(a){return shuffled(a);}
function tbPlayer(name){return {id:crypto.randomUUID(),token:crypto.randomUUID(),name:cleanName(name),role:null,cards:[],memory:[],ready:false};}
function tbLog(g,text){g.log.unshift(text);g.log=g.log.slice(0,80);}
function tbDeal(g,pool){pool=tbShuffle(pool);const size=pool.length/g.players.length;if(!Number.isInteger(size))throw Error("配布枚数が不正です。");for(const p of g.players){p.cards=pool.splice(0,size).map(type=>({id:crypto.randomUUID(),type,open:false}));p.memory=p.cards.map(c=>c.type);p.ready=false;}g.phase="inspect";g.targetId=null;}
function tbStart(g){const n=g.players.length;if(n<3||n>8)throw Error("3〜8人で開始できます。");const counts={3:[2,2],4:[3,2],5:[3,2],6:[4,2],7:[5,3],8:[5,3]}[n];const roles=tbShuffle([...Array(counts[0]).fill('police'),...Array(counts[1]).fill('bomber')]);g.players.forEach(p=>p.role=roles.pop());g.matchId=crypto.randomUUID();g.round=1;g.cuts=0;g.defused=0;g.winner=null;g.reason=null;g.lastCut=null;g.discard=[];g.readyIds=[];g.holderId=g.players[crypto.getRandomValues(new Uint32Array(1))[0]%n].id;tbDeal(g,[...Array(n).fill('defuse'),'bomb',...Array(4*n-1).fill('safe')]);tbLog(g,'配布しました。自分のカードと陣営を確認してください。');}
function tbAction(g,p,a){
 if(a.type==='start'){if(p.id!==g.hostId||!['lobby','finished'].includes(g.phase))throw Error('ホストだけが開始できます。');tbStart(g);return;}
 if(a.type==='chat'){const message=String(a.message||'').trim().slice(0,180);if(!message)throw Error('メッセージを入力してください。');g.messages.push({id:crypto.randomUUID(),name:p.name,text:message});g.messages=g.messages.slice(-60);return;}
 if(a.type==='ready'){if(g.phase!=='inspect')throw Error('確認は終了しています。');p.ready=true;if(g.players.every(x=>x.ready)){g.phase='cut';tbLog(g,'全員の確認が終わりました。ニッパー係は他の人のカードを選んでください。');}return;}
 if(a.type==='peek'){if(!['inspect','cut'].includes(g.phase))throw Error('現在は確認できません。');p.memory=p.cards.filter(c=>!c.open).map(c=>c.type);const hidden=tbShuffle(p.cards.filter(c=>!c.open));for(const c of hidden)c.id=crypto.randomUUID();p.cards=[...p.cards.filter(c=>c.open),...hidden];return;}
 if(a.type==='next'){if(g.phase!=='between'||p.id!==g.holderId)throw Error('次のニッパー係が配布を進めます。');g.round++;g.cuts=0;tbDeal(g,g.players.flatMap(x=>x.cards.filter(c=>!c.open).map(c=>c.type)));tbLog(g,`ラウンド${g.round}：残ったカードを混ぜて配り直しました。`);return;}
 if(a.type==='target'||a.type==='clearTarget'){if(g.phase!=='cut'||g.holderId!==p.id)throw Error('ニッパー係だけが指名できます。');if(a.type==='clearTarget'){g.targetId=null;return;}const target=g.players.find(x=>x.id===a.ownerId&&x.id!==p.id&&x.cards.some(c=>!c.open));if(!target)throw Error('他の人の残っているカードを選んでください。');g.targetId=target.id;tbLog(g,`${p.name}が${target.name}を指名しました。`);return;}
 if(a.type!=='cut'||g.phase!=='cut'||g.holderId!==p.id)throw Error('ニッパー係の操作を待っています。');
 const owner=g.players.find(x=>x.id===a.ownerId);if(!owner||owner.id===p.id||owner.id!==g.targetId)throw Error('自分以外のカードを選んでください。');const card=owner.cards.find(c=>c.id===a.cardId&&!c.open);if(!card)throw Error('そのカードは選べません。');card.open=true;g.targetId=null;g.cuts++;g.holderId=owner.id;g.discard.push({type:card.type,round:g.round,ownerName:owner.name,actorName:p.name});if(card.type==='defuse')g.defused++;
 g.lastCut={id:crypto.randomUUID(),actor:p.name,owner:owner.name,ownerId:owner.id,cardId:card.id,type:card.type,round:g.round};tbLog(g,`${p.name} → ${owner.name}：${{safe:'しーん…',defuse:'解除成功！',bomb:'BOOM！'}[card.type]}`);
 if(card.type==='bomb'){g.winner='bomber';g.reason='爆弾の導線が切られました。';}
 else if(g.defused===g.players.length){g.winner='police';g.reason='すべての解除カードを公開しました！';}
 else if(g.cuts===g.players.length&&g.round===4){g.winner='bomber';g.reason='4ラウンドが終了し、時間切れです。';}
 if(g.winner){g.phase='finished';tbLog(g,`${g.winner==='police'?'タイムポリス':'ボマー団'}の勝利！`);}else if(g.cuts===g.players.length)g.phase='between';
}
function tbView(g,p){return {code:g.code,phase:g.phase,revision:g.revision,matchId:g.matchId,hostId:g.hostId,holderId:g.holderId,targetId:g.targetId,round:g.round,cuts:g.cuts,defused:g.defused,winner:g.winner,reason:g.reason,lastCut:g.lastCut,discard:g.discard,log:g.log,messages:g.messages,me:p?{id:p.id,role:p.role,memory:p.cards.filter(c=>!c.open).map(c=>c.type).sort(),ready:p.ready}:null,players:g.players.map(x=>({id:x.id,name:x.name,ready:x.ready,role:g.winner?x.role:undefined,cards:x.cards.map(c=>({id:c.id,open:c.open,type:c.open||g.winner?c.type:undefined}))}))};}
async function handleTimebomb(storage,request){
 const url=new URL(request.url),route=url.pathname.split('/').pop();
 try{
 let g=await storage.get('timebomb');const a=request.method==='POST'?await request.json():{};
 if(route==='create'){if(g)return json({error:'この部屋は使用中です。'},409);const p=tbPlayer(a.name);g={code:a.code,hostId:p.id,players:[p],phase:'lobby',revision:1,log:['部屋を作りました。'],messages:[],discard:[]};await storage.put('timebomb',g);return json({game:tbView(g,p),token:p.token});}
 if(!g)return json({error:'部屋が見つかりません。'},404);
 if(route==='join'){const matches=g.players.filter(p=>p.name===cleanName(a.name));if(matches.length>1)return json({error:'同じ名前が複数あります。保存済みの参加情報から復帰してください。'},409);if(matches.length===1)return json({game:tbView(g,matches[0]),token:matches[0].token,rejoined:true});if(g.phase!=='lobby'||g.players.length>=8)return json({error:'開始済み、または満員です。'},409);const p=tbPlayer(a.name);g.players.push(p);g.revision++;tbLog(g,`${p.name}が参加しました。`);await storage.put('timebomb',g);return json({game:tbView(g,p),token:p.token});}
 const token=url.searchParams.get('token')||a.token,p=g.players.find(x=>x.token===token);
 if(route==='state'&&request.method==='GET'){if(!p&&url.searchParams.get('spectate')!=='1')return json({error:'参加者情報が確認できません。'},403);return json({game:tbView(g,p)});}
 if(route!=='action'||request.method!=='POST'||!p)return json({error:'操作できません。'},403);
 tbAction(g,p,a);g.revision++;await storage.put('timebomb',g);return json({game:tbView(g,p)});
 }catch(e){return json({error:e.message||'処理に失敗しました。'},400);}
}

const PG_COLORS=['green','yellow','red','purple','blue'];
function pgPlayer(name){return {id:crypto.randomUUID(),token:crypto.randomUUID(),name:cleanName(name),hand:[],score:0,out:false};}
function pgPositions(g){
 const board=g.board||[],at=(r,x)=>board.find(c=>c.r===r&&c.x===x),result=[];
 const bottom=board.filter(c=>c.r===0);if(!bottom.length)return [{r:0,x:0,colors:[...PG_COLORS]}];
 const lo=Math.min(...bottom.map(c=>c.x)),hi=Math.max(...bottom.map(c=>c.x));
 if(hi-lo+1<g.base){result.push({r:0,x:lo-1,colors:[...PG_COLORS]},{r:0,x:hi+1,colors:[...PG_COLORS]});}
 for(const c of board){if(c.r>=g.base-1||!at(c.r,c.x+1)||at(c.r+1,c.x))continue;result.push({r:c.r+1,x:c.x,colors:[...new Set([c.color,at(c.r,c.x+1).color])]});}
 return result;
}
function pgLegal(g,p){if(!p||g.phase!=='playing'||g.players[g.activeIndex]?.id!==p.id||p.out)return [];return pgPositions(g).map(pos=>({...pos,colors:pos.colors.filter(c=>p.hand.some(card=>card.color===c))})).filter(pos=>pos.colors.length);}
function pgEvent(g,text){g.log.unshift(text);g.log=g.log.slice(0,60);}
function pgFinishRound(g){g.results=g.players.map(p=>({id:p.id,name:p.name,remaining:p.hand.length,delta:p.score-p.roundStartScore,score:p.score,hand:p.hand.map(c=>c.color)}));g.history.push({round:g.round,results:structuredClone(g.results)});g.phase=g.round===g.players.length?'finished':'roundEnd';if(g.phase==='finished'){const best=Math.min(...g.players.map(p=>p.score));g.winners=g.players.filter(p=>p.score===best).map(p=>p.id);}pgEvent(g,`ラウンド${g.round}終了。${g.phase==='finished'?'最終結果が出ました！':'次のパーティへ進みましょう。'}`);}
function pgAdvance(g,from){for(let offset=1;offset<=g.players.length;offset++){const i=(from+offset)%g.players.length,p=g.players[i];if(p.out)continue;g.activeIndex=i;if(!p.hand.length){p.out=true;continue;}if(pgLegal(g,p).length)return;p.out=true;p.score+=p.hand.length;g.lastEvents.push({id:crypto.randomUUID(),type:'out',playerId:p.id,name:p.name,points:p.hand.length});pgEvent(g,`${p.name}は置けるカードがなく、${p.hand.length}失点。`);}pgFinishRound(g);}
function pgDeal(g){const deck=shuffled(PG_COLORS.flatMap(color=>Array(color==='green'?8:7).fill(color))).map(color=>({id:crypto.randomUUID(),color}));const n=g.players.length,size=n===2?14:Math.floor(36/n);g.base=n===2?7:8;g.board=[];g.results=[];g.lastMove=null;g.lastEvents=[];g.phase='playing';g.players.forEach(p=>{p.hand=deck.splice(0,size);p.out=false;p.roundStartScore=p.score;});if(n===5){const card=deck.pop();g.board.push({...card,r:0,x:0,ownerId:null});}g.activeIndex=(g.firstStart+g.round-1)%n;pgEvent(g,`ラウンド${g.round}開始。${g.players[g.activeIndex].name}から！`);pgAdvance(g,(g.activeIndex+n-1)%n);}
function pgStart(g){if(g.players.length<2||g.players.length>6)throw Error('2〜6人で開始できます。');g.matchId=crypto.randomUUID();g.round=1;g.firstStart=crypto.getRandomValues(new Uint32Array(1))[0]%g.players.length;g.players.forEach(p=>p.score=0);g.winners=[];g.history=[];g.log=[];pgDeal(g);}
function pgAction(g,p,a){
 if(a.type==='start'){if(p.id!==g.hostId||!['lobby','finished'].includes(g.phase))throw Error('ホストだけが開始できます。');pgStart(g);return;}
 if(a.type==='chat'){const text=String(a.message||'').trim().slice(0,160);if(!text)throw Error('メッセージを入力してください。');g.messages.push({id:crypto.randomUUID(),name:p.name,text});g.messages=g.messages.slice(-50);return;}
 if(a.type==='next'){if(p.id!==g.hostId||g.phase!=='roundEnd')throw Error('ホストが次のラウンドを始めます。');g.round++;pgDeal(g);return;}
 if(a.type!=='place'||g.phase!=='playing'||g.players[g.activeIndex]?.id!==p.id||p.out)throw Error('あなたの手番ではありません。');
 const card=p.hand.find(c=>c.id===a.cardId);if(!card)throw Error('手札のカードを選んでください。');const pos=pgLegal(g,p).find(pos=>pos.r===a.r&&pos.x===a.x&&pos.colors.includes(card.color));if(!pos)throw Error('その場所には置けません。');
 p.hand=p.hand.filter(c=>c.id!==card.id);g.board.push({...card,r:pos.r,x:pos.x,ownerId:p.id});g.lastMove={id:crypto.randomUUID(),name:p.name,playerId:p.id,cardId:card.id,color:card.color,r:pos.r,x:pos.x};g.lastEvents=[];pgEvent(g,`${p.name}が${{green:'みどり',yellow:'きいろ',red:'あか',purple:'むらさき',blue:'あお'}[card.color]}のペンギンを配置。`);
 if(!p.hand.length){const returned=Math.min(2,p.score);p.score-=returned;p.out=true;g.lastEvents.push({id:crypto.randomUUID(),type:'clear',playerId:p.id,name:p.name,points:returned});pgEvent(g,`${p.name}が手札を出し切りました！${returned}点返却。`);}
 pgAdvance(g,g.activeIndex);
}
function pgView(g,p){return {code:g.code,revision:g.revision,phase:g.phase,matchId:g.matchId,hostId:g.hostId,round:g.round,totalRounds:g.players.length,base:g.base,activeId:g.players[g.activeIndex]?.id,board:g.board||[],lastMove:g.lastMove,lastEvents:g.lastEvents||[],results:g.results||[],history:g.history||[],winners:g.winners||[],log:g.log,messages:g.messages,me:p?{id:p.id,hand:p.hand}:null,legalMoves:pgLegal(g,p),players:g.players.map(x=>({id:x.id,name:x.name,score:x.score,out:x.out,handCount:x.hand.length}))};}
async function handlePenguin(storage,request){const url=new URL(request.url),route=url.pathname.split('/').pop();try{let g=await storage.get('penguin');const a=request.method==='POST'?await request.json():{};
 if(route==='create'){if(g)return json({error:'この部屋は使用中です。'},409);const p=pgPlayer(a.name);g={code:a.code,hostId:p.id,players:[p],phase:'lobby',revision:1,log:['氷のテーブルを用意しました。'],messages:[]};await storage.put('penguin',g);return json({game:pgView(g,p),token:p.token});}
 if(!g)return json({error:'部屋が見つかりません。'},404);
 if(route==='join'){const p=g.players.find(p=>p.name===cleanName(a.name));if(p)return json({game:pgView(g,p),token:p.token,rejoined:true});if(g.phase!=='lobby'||g.players.length>=6)return json({error:'開始済み、または満員です。'},409);const player=pgPlayer(a.name);g.players.push(player);g.revision++;pgEvent(g,`${player.name}が参加しました。`);await storage.put('penguin',g);return json({game:pgView(g,player),token:player.token});}
 const token=a.token||url.searchParams.get('token'),p=g.players.find(p=>p.token===token);
 if(route==='state'&&request.method==='GET'){if(!p&&url.searchParams.get('spectate')!=='1')return json({error:'参加者情報が確認できません。'},403);return json({game:pgView(g,p)});}
 if(route!=='action'||request.method!=='POST'||!p)return json({error:'操作できません。'},403);
 const next=structuredClone(g),actor=next.players.find(x=>x.id===p.id);pgAction(next,actor,a);next.revision++;await storage.put('penguin',next);return json({game:pgView(next,actor)});
 }catch(e){return json({error:e.message||'処理に失敗しました。'},400);}}

// Red Door: basic 16-card game. Hidden rooms and roles never enter public views.
const RD_DECK={killer:1,silver:3,trap:1,gas:2,empty:2,exit:1,gun:1,vest:1,clue:2,insight:1,ammo:1};
const RD_NAMES={killer:'殺人鬼の鍵',silver:'銀の鍵',trap:'殺人鬼の罠',gas:'催眠ガス',empty:'何も無い部屋',exit:'脱出口',gun:'拳銃',vest:'防弾チョッキ',clue:'小さな手がかり',insight:'違和感の看破',ammo:'弾丸のある部屋',fbi:'FBI手帳'};
const RD_EXTRA={clown:'道化の灯',shadow:'脱出口の影',fbi:'FBI手帳'};
function rdSettings(raw={}){const extras=raw.extras??[];if(!Array.isArray(extras)||extras.some(x=>!Object.hasOwn(RD_EXTRA,x))||new Set(extras).size!==extras.length)throw Error('追加カードの設定が正しくありません。');return {extras};}
const rdKey=c=>['silver','killer'].includes(c.type);
function rdPlayer(name){return {id:crypto.randomUUID(),token:crypto.randomUUID(),name:cleanName(name),alive:true,killer:false,fbi:false,items:[],notes:[]};}
function rdLog(g,text){g.log.unshift(text);g.log=g.log.slice(0,80);}
function rdEvent(g,type,text,extra={}){g.lastEvent={id:crypto.randomUUID(),type,text,...extra};rdLog(g,text);}
function rdShuffle(g){g.layout=(g.layout||0)+1;g.doorHistory=[];g.board=shuffled(g.board).map((c,slot)=>({id:crypto.randomUUID(),type:c.type,open:false,slot}));g.layoutSize=g.board.length;g.players.forEach(p=>p.notes=[]);}
function rdStart(g,firstId){if(g.players.length<4||g.players.length>6)throw Error('基本ルールは4〜6人で遊びます。');if(firstId&&!g.players.some(p=>p.id===firstId))throw Error('最初のプレイヤーを選び直してください。');g.matchId=crypto.randomUUID();g.phase='explore';g.turn=1;g.activeIndex=firstId?g.players.findIndex(p=>p.id===firstId):crypto.getRandomValues(new Uint32Array(1))[0]%g.players.length;g.pending=null;g.removed=[];g.winnerIds=[];g.ending=null;g.reason=null;g.escapeKeys=null;g.log=[];g.players.forEach(p=>Object.assign(p,{alive:true,killer:false,fbi:false,items:[],notes:[]}));g.rules=rdSettings(g.rules);g.board=Object.entries({...RD_DECK,...Object.fromEntries(g.rules.extras.map(t=>[t,1]))}).flatMap(([type,n])=>Array.from({length:n},()=>({type})));rdShuffle(g);rdEvent(g,'start','屋敷の扉が閉ざされました。'+g.players[g.activeIndex].name+'から探索を始めます。');}
function rdFinish(g,ending,winners,text){g.phase='finished';g.ending=ending;g.winnerIds=winners.map(p=>p.id);g.reason=text;g.pending=null;rdEvent(g,'ending',text);}
function rdCheck(g){const alive=g.players.filter(p=>p.alive);if(!alive.length){rdFinish(g,'lost',[],'屋敷に生き残った者はいませんでした。');return true;}if(alive.length===1&&alive[0].killer){rdFinish(g,'last',alive,'最後に生き残ったのは、殺人鬼でした。');return true;}return false;}
function rdNext(g){g.pending=null;if(g.fbiShufflePending){g.fbiShufflePending=false;rdShuffle(g);rdEvent(g,'shuffle','FBIの捜査が完了し、残りの扉を混ぜて再配置しました。');}if(rdCheck(g))return;g.phase='explore';do{g.activeIndex=(g.activeIndex+1)%g.players.length;}while(!g.players[g.activeIndex].alive);g.turn++;}
function rdScatter(g,p){g.board.push(...p.items.map(c=>({type:c.type})));p.items=[];rdShuffle(g);}
function rdDamage(g,p,scatter=false){const vest=p.items.find(c=>c.type==='vest');if(vest){p.items=p.items.filter(c=>c.id!==vest.id);g.removed.push({type:'vest'});}else p.alive=false;if(scatter||!p.alive)rdScatter(g,p);return !!vest;}
function rdKeys(g){return g.players.flatMap(p=>p.items.filter(rdKey));}
function rdFourthKey(g){if(rdKeys(g).length!==4)return false;const keys=[];for(const p of g.players){keys.push(...p.items.filter(rdKey));p.items=p.items.filter(c=>!rdKey(c));}g.removed.push(...keys.filter(c=>c.type==='killer').map(c=>({type:c.type})));g.board.push(...keys.filter(c=>c.type==='silver').map(c=>({type:c.type})));rdShuffle(g);rdEvent(g,'shuffle','4つ目の鍵が見つかり、すべての鍵が回収されました。殺人鬼の鍵を除外し、扉を並べ直します。');return true;}
function rdRemember(p,g,c){p.notes=p.notes.filter(n=>n.slot!==c.slot);p.notes.push({slot:c.slot,type:c.type,layout:g.layout});}
function rdAction(g,p,a){
 if(a.type==='start'){if(p.id!==g.hostId||!['lobby','finished'].includes(g.phase))throw Error('ホストだけが開始できます。');if(a.rules)g.rules=rdSettings(a.rules);rdStart(g,a.firstPlayerId);return;}
 if(a.type==='chat'){const text=String(a.message||'').trim().slice(0,180);if(!text)throw Error('メッセージを入力してください。');g.messages.push({id:crypto.randomUUID(),name:p.name,text});g.messages=g.messages.slice(-60);return;}
 if(g.phase==='lobby'||g.phase==='finished'||!p.alive||g.players[g.activeIndex]?.id!==p.id)throw Error('あなたの探索の番ではありません。');
 if(a.matchId!==g.matchId||a.turn!==g.turn)throw Error('手番が更新されました。画面を確認してください。');
 if(a.type==='open'){if(g.phase!=='explore')throw Error('先に確認中のカードを処理してください。');const card=g.board.find(c=>c.id===a.cardId&&!c.open);if(!card)throw Error('閉じている扉を選んでください。');g.phase='resolve';g.pending={id:crypto.randomUUID(),kind:'room',cardId:card.id};rdRemember(p,g,card);(g.doorHistory??=[]).push({slot:card.slot,name:p.name,playerId:p.id,turn:g.turn});rdEvent(g,'open',p.name+'が扉 '+String(card.slot+1).padStart(2,'0')+' を調べています。');return;}
 const pending=g.pending;if(!pending||a.pendingId!==pending.id)throw Error('確認内容が更新されました。');if(pending.kind==='fbiSelect'){if(a.type!=='fbiSelect')throw Error('公開する扉を選んでください。');const target=g.board.find(x=>x.id===a.targetId&&!x.open);if(!target)throw Error('まだ閉じている扉を選んでください。');g.fbiShufflePending=true;g.phase='resolve';g.pending={id:crypto.randomUUID(),kind:'room',cardId:target.id,fbi:true};rdRemember(p,g,target);(g.doorHistory??=[]).push({slot:target.slot,name:p.name,playerId:p.id,turn:g.turn});rdEvent(g,'fbi',p.name+'がFBI手帳で扉を選びました。');return;}const c=g.board.find(c=>c.id===pending.cardId);if(!c)throw Error('扉が並べ替えられました。');

 if(pending.kind==='escapeChoice'){
  if(a.type!=='escapeDoor'||![0,1].includes(a.door))throw Error('最後の扉を選んでください。');
  const bad=pending.shadowAt===a.door;if(bad){g.players.forEach(x=>x.alive=false);rdFinish(g,'lost',[],'選んだのは脱出口の影でした。生存者は全員死亡しました。');}else rdFinish(g,'escaped',g.players.filter(x=>!x.killer),'本当の脱出口を選び、脱出に成功しました！');return;
 }
 if(pending.kind==='peek'){
  if(a.type!=='peek')throw Error('確認する扉を選んでください。');const target=g.board.find(x=>x.id===a.cardId&&!x.open&&x.id!==c.id);if(!target)throw Error('別の閉じた扉を選んでください。');rdRemember(p,g,target);pending.kind='peekResult';pending.peek={slot:target.slot,type:target.type};return;
 }
 if(pending.kind==='peekResult'){if(a.type!=='continue')throw Error('内容を確認して進んでください。');rdNext(g);return;}
 if(pending.kind==='insight'){
  if(a.type!=='inspect')throw Error('公開する鍵を選んでください。');const owner=g.players.find(x=>x.id!==p.id&&x.alive&&x.items.some(k=>k.id===a.itemId&&rdKey(k)&&!k.open));if(!owner)throw Error('他の生存者の伏せた鍵を選んでください。');const key=owner.items.find(k=>k.id===a.itemId);if(key.type==='killer'){owner.items=owner.items.filter(k=>k.id!==key.id);g.removed.push({type:'killer'});}else key.open=true;rdEvent(g,'inspect',owner.name+'の鍵は「'+RD_NAMES[key.type]+'」でした。'+(key.type==='killer'?'鍵を除外します。正体は変わりません。':''));rdNext(g);return;
 }
 if(pending.kind==='shoot'){
  if(a.type!=='shoot')throw Error('撃つ相手を選んでください。');const target=g.players.find(x=>x.id===a.targetId&&x.id!==p.id&&x.alive);if(!target)throw Error('他の生存者を選んでください。');const saved=rdDamage(g,target);rdEvent(g,saved?'saved':'death',p.name+'が'+target.name+'を撃ちました。'+(saved?'防弾チョッキが命を守りました。':'死亡し、持ち物が場へ戻りました。扉が並べ直されます。'));rdNext(g);return;
 }
 if(pending.kind!=='room'||a.type!=='resolve')throw Error('カードの案内に従ってください。');const choice=a.choice;
 if(choice==='return'){
  const allowed=c.type==='empty'||c.type==='exit'||c.type==='ammo'||(p.killer&&['trap','gas'].includes(c.type));if(!allowed)throw Error('このカードは伏せて戻せません。');rdEvent(g,'return',p.name+'は「何も無い部屋だった」と告げ、扉を閉じました。');rdNext(g);return;
 }
 if(c.type==='fbi'){if(choice!=='use')throw Error('FBI手帳を公開してください。');c.open=true;g.removed.push({type:'fbi'});p.fbi=true;pending.kind='fbiSelect';rdEvent(g,'fbi',p.name+'がFBI手帳を公開しました。');return;}
 if(['silver','killer','gun','vest'].includes(c.type)){
  if(choice!=='take')throw Error('アイテムを受け取ってください。');g.board=g.board.filter(x=>x.id!==c.id);p.items.push({id:crypto.randomUUID(),type:c.type,open:!rdKey(c)});if(c.type==='killer')p.killer=true;rdEvent(g,'item',p.name+'が'+(rdKey(c)?'伏せた鍵':RD_NAMES[c.type])+'を手に入れました。');rdFourthKey(g);rdNext(g);return;
 }
 if(c.type==='clown'){
  if(choice!=='use')throw Error('カードの内容を確認してください。');p.killer=!p.killer;rdEvent(g,'return',p.name+'は「何も無い部屋だった」と告げ、扉を閉じました。');rdNext(g);return;
 }
 if(c.type==='shadow'){
  if(choice!=='use')throw Error('カードを公開してください。');c.open=true;rdEvent(g,'shadow',p.name+'が脱出口の影を公開しました。脱出成功時は最後の二択が待ち受けます。');rdNext(g);return;
 }
 if(c.type==='exit'){
  if(choice!=='escape'||rdKeys(g).length!==3)throw Error('脱出には手元の鍵が合計3枚必要です。');c.open=true;const failed=rdKeys(g).some(rdKeyCard=>rdKeyCard.type==='killer');g.escapeKeys=rdKeys(g).map(k=>k.type);if(!failed&&g.board.some(x=>x.type==='shadow'&&x.open)){pending.kind='escapeChoice';pending.shadowAt=crypto.getRandomValues(new Uint32Array(1))[0]%2;rdEvent(g,'shadow','銀の鍵がそろいました。最後に本物の脱出口を選びます。');return;}rdFinish(g,failed?'betrayed':'escaped',g.players.filter(x=>failed?x.killer:!x.killer),failed?'3本の鍵の中に、殺人鬼の鍵が紛れていました。脱出失敗。':'3本すべてが銀の鍵でした。屋敷からの脱出に成功しました！');return;
 }
 if(c.type==='ammo'){
  if(choice!=='aim'||!p.items.some(i=>i.type==='gun')||!g.players.some(x=>x.alive&&x.id!==p.id))throw Error('拳銃と撃つ相手が必要です。');c.open=true;pending.kind='shoot';rdEvent(g,'ammo',p.name+'が弾丸を見つけ、拳銃を構えました。');return;
 }
 if(c.type==='clue'){
  if(choice!=='use')throw Error('手がかりを使ってください。');c.open=true;rdEvent(g,'clue',p.name+'が小さな手がかりを発見しました。別の扉をそっと確認します。');if(g.board.some(x=>!x.open&&x.id!==c.id))pending.kind='peek';else rdNext(g);return;
 }
 if(c.type==='insight'){
  if(choice!=='use')throw Error('鍵を調べてください。');c.open=true;rdEvent(g,'insight',p.name+'が違和感の看破を発見しました。');if(g.players.some(x=>x.id!==p.id&&x.alive&&x.items.some(k=>rdKey(k)&&!k.open)))pending.kind='insight';else{rdLog(g,'他の生存者に伏せた鍵がないため、効果はありません。');rdNext(g);}return;
 }
 if(c.type==='gas'){
  if(choice!=='use')throw Error('ガスの処理を進めてください。');g.board=g.board.filter(x=>x.id!==c.id);g.removed.push({type:'gas'});rdScatter(g,p);rdEvent(g,'shuffle',p.name+'が催眠ガスを浴びました。持ち物を場へ戻し、扉が並べ直されます。');rdNext(g);return;
 }
 if(c.type==='trap'){
  if(choice!=='use')throw Error('罠の処理を進めてください。');const saved=rdDamage(g,p,true);rdEvent(g,saved?'saved':'death',p.name+'が殺人鬼の罠にかかりました。'+(saved?'防弾チョッキで生還しました。':'死亡しました。')+'持ち物を場へ戻し、扉が並べ直されます。');rdNext(g);return;
 }
 throw Error('カードの処理を選んでください。');
}
function rdView(g,p){const finished=g.phase==='finished',omniscient=finished||!!p&&!p.alive,active=g.players[g.activeIndex],pending=g.pending,card=pending&&g.board.find(c=>c.id===pending.cardId);return {code:g.code,phase:g.phase,revision:g.revision,matchId:g.matchId,hostId:g.hostId,activeId:active?.id,turn:g.turn,layout:g.layout,rules:g.rules||{extras:[]},boardSlots:g.layoutSize||0,omniscient,doorHistory:g.doorHistory||[],ending:g.ending,reason:g.reason,winnerIds:g.winnerIds||[],escapeKeys:finished?g.escapeKeys:undefined,log:g.log,messages:g.messages,lastEvent:g.lastEvent,keyCount:rdKeys(g).length,removed:g.removed||[],pending:pending?{actorId:active.id,cardId:pending.cardId}:null,board:(g.board||[]).map(c=>({id:c.id,slot:c.slot,open:c.open,type:c.open||omniscient||pending?.kind==='fbiSelect'&&p?.id===active?.id?c.type:undefined})),players:g.players.map(x=>({id:x.id,name:x.name,alive:x.alive,killer:omniscient?x.killer:undefined,fbi:!!x.fbi&&p?.id===x.id,items:x.items.map(c=>({id:c.id,key:rdKey(c),open:c.open,type:c.open||omniscient||pending?.kind==='fbiSelect'&&p?.id===active?.id?c.type:undefined}))})),me:p?{id:p.id,killer:p.killer,fbi:!!p.fbi,alive:p.alive,items:p.items,notes:p.notes,pending:pending&&active?.id===p.id?{...Object.fromEntries(Object.entries(pending).filter(([k])=>k!=='shadowAt')),type:pending?.kind==='fbiSelect'?'fbi':card?.type,slot:card?.slot,canHide:p.killer&&['trap','gas'].includes(card?.type)}:null}:null};}
async function handleReddoor(storage,request){const url=new URL(request.url),route=url.pathname.split('/').pop();try{let g=await storage.get('reddoor');const a=request.method==='POST'?await request.json():{};
 if(route==='create'){if(g)return json({error:'この部屋は使用中です。'},409);const p=rdPlayer(a.name);g={code:a.code,hostId:p.id,players:[p],rules:rdSettings(a.rules),phase:'lobby',revision:1,log:['赤い屋敷の入口です。'],messages:[],board:[],removed:[]};await storage.put('reddoor',g);return json({game:rdView(g,p),token:p.token});}
 if(!g)return json({error:'部屋が見つかりません。'},404);
 if(route==='join'){const matches=g.players.filter(x=>x.name===cleanName(a.name));if(matches.length>1)return json({error:'同じ名前が複数います。保存済みの参加情報を使ってください。'},409);if(matches.length)return json({game:rdView(g,matches[0]),token:matches[0].token,rejoined:true});if(g.phase!=='lobby'||g.players.length>=6)return json({error:'開始済み、または満員です。'},409);const p=rdPlayer(a.name);g.players.push(p);g.revision++;rdLog(g,p.name+'が屋敷に集まりました。');await storage.put('reddoor',g);return json({game:rdView(g,p),token:p.token});}
 const token=a.token||url.searchParams.get('token'),p=g.players.find(x=>x.token===token);
 if(route==='state'&&request.method==='GET'){if(!p&&url.searchParams.get('spectate')!=='1')return json({error:'参加者情報が確認できません。'},403);return json({game:rdView(g,p)});}
 if(route!=='action'||request.method!=='POST'||!p)return json({error:'操作できません。'},403);const next=structuredClone(g),actor=next.players.find(x=>x.id===p.id);rdAction(next,actor,a);next.revision++;await storage.put('reddoor',next);return json({game:rdView(next,actor)});
 }catch(e){return json({error:e.message||'処理に失敗しました。'},400);}}

// Daifugo rooms use an independent namespace and server-authoritative card rules.
const DF_RULES={eightCut:true,revolution:true,suitLock:true,gekiShibari:false,cityFall:true,spadeThree:true,stairs:true,stairRevolution:false,elevenBack:false,fiveSkip:false,sevenGive:false,tenDiscard:false,exchange:true,forbiddenFinish:true};
const DF_SUITS=['S','H','D','C'];
function dfSettings(raw={}){const rules={};for(const [k,v] of Object.entries(DF_RULES)){if(raw[k]!==undefined&&typeof raw[k]!=='boolean')throw Error('ルールのON/OFFを選び直してください。');rules[k]=raw[k]??v;}for(const [key,def,min,max] of [['jokerCount',2,0,2],['rounds',3,1,10]]){const n=raw[key]??def;if(!Number.isInteger(n)||n<min||n>max)throw Error('ジョーカー枚数またはゲーム数が正しくありません。');rules[key]=n;}rules.pairSuitLockMode=raw.pairSuitLockMode??'exact';if(!['exact','partial','off'].includes(rules.pairSuitLockMode))throw Error('ペアのスートしばりを選び直してください。');if(!rules.stairs||!rules.revolution)rules.stairRevolution=false;return rules;}
function dfPlayer(name){return {id:crypto.randomUUID(),token:crypto.randomUUID(),name:cleanName(name),hand:[],status:'playing',score:0,rank:null};}
function dfLog(g,text,type='notice'){g.log.unshift(text);g.log=g.log.slice(0,80);g.events.push({id:crypto.randomUUID(),type,text});g.events=g.events.slice(-30);}
function dfReversed(g){return !!g.revolution!==!!g.back;}
function dfSort(cards,reverse=false){return [...cards].sort((a,b)=>(a.rank===16?99:reverse?18-a.rank:a.rank)-(b.rank===16?99:reverse?18-b.rank:b.rank)||DF_SUITS.indexOf(a.suit)-DF_SUITS.indexOf(b.suit));}
function dfComb(a,n){const out=[];function visit(at,pick){if(pick.length===n){out.push(pick);return;}for(let i=at;i<=a.length-(n-pick.length);i++)visit(i+1,[...pick,a[i]]);}visit(0,[]);return out;}
function dfMelds(cards,rules){
 if(!cards.length)return [];const natural=cards.filter(c=>c.rank!==16),jokers=cards.length-natural.length,out=[],count=cards.length;
 if(!natural.length){if(count<=2)out.push({kind:'group',rank:16,count,mask:null});return out;}
 if(natural.every(c=>c.rank===natural[0].rank)&&count<=6){
  const suits=natural.map(c=>c.suit);if(count<=4){for(const mask of dfComb(DF_SUITS,count).map(s=>s.join('')))if(suits.every(s=>mask.includes(s)))out.push({kind:'group',rank:natural[0].rank,count,mask});}
  else out.push({kind:'group',rank:natural[0].rank,count,mask:null});
 }
 if(rules.stairs&&count>=3&&count<=13&&natural.every(c=>c.suit===natural[0].suit)&&new Set(natural.map(c=>c.rank)).size===natural.length){for(let low=3;low+count-1<=15;low++){const high=low+count-1;if(natural.every(c=>c.rank>=low&&c.rank<=high))out.push({kind:'run',rank:low,low,high,count,mask:natural[0].suit});}}
 return out;
}
function dfMeldKey(m){return [m.kind,m.rank,m.count,m.mask||'-',m.low||0].join(':');}
function dfGekiNext(rank,reversed){return reversed?(rank===3?15:rank-1):(rank===15?3:rank+1);}
function dfGekiAdjacent(g,m){const t=g.table?.meld;return !!(g.rules.gekiShibari&&t&&t.kind==='group'&&m.kind==='group'&&t.rank!==16&&m.rank!==16&&t.count===m.count&&t.mask&&t.mask===m.mask&&m.rank===dfGekiNext(t.rank,dfReversed(g)));}
function dfOptions(g,p,cards){
 const reversed=dfReversed(g),table=g.table,out=[];for(const m of dfMelds(cards,g.rules)){
  const counter=!!(g.rules.spadeThree&&table?.meld.kind==='group'&&table.meld.count===1&&table.meld.rank===16&&cards.length===1&&cards[0].rank===3&&cards[0].suit==='S');
  if(!counter){if(g.gekiLock&&table){const t=table.meld;if(m.kind!=='group'||m.count!==t.count||m.mask!==g.gekiLock||m.rank!==dfGekiNext(t.rank,reversed))continue;}if(table){const t=table.meld;if(m.kind!==t.kind||m.count!==t.count)continue;if(m.rank===16){if(t.rank===16)continue;}else if(!dfGekiAdjacent(g,m)&&(t.rank===16||(!reversed&&m.rank<=t.rank)||(reversed&&m.rank>=t.rank)))continue;}
   if(g.lock&&m.rank!==16){const pair=m.kind==='group'&&m.count===2,mode=g.rules.pairSuitLockMode||'exact';if(pair&&mode==='partial'){if(!m.mask||![...g.lock].every(s=>m.mask.includes(s)))continue;}else if(!(pair&&mode==='off')&&m.mask!==g.lock)continue;}
  }
  out.push({...m,key:dfMeldKey(m),counter,foul:cards.length===p.hand.length?dfFoul(g,cards,m):null});
 }return out;
}
function dfFoul(g,cards,m){if(!g.rules.forbiddenFinish)return null;if(cards.some(c=>c.rank===16))return 'ジョーカー上がり';const strongest=dfReversed(g)?3:15;if(cards.some(c=>c.rank===strongest))return (strongest===3?'3':'2')+'上がり';if(g.rules.eightCut&&m.kind==='group'&&cards.some(c=>c.rank===8))return '8切り上がり';if(g.rules.spadeThree&&cards.length===1&&cards[0].rank===3&&cards[0].suit==='S')return 'スペード3上がり';return null;}
function dfMoves(g,p){
 if(!p||g.phase!=='playing'||g.players[g.activeIndex]?.id!==p.id||p.status!=='playing')return [];
 const moves=[],seen=new Set(),j=p.hand.filter(c=>c.rank===16),push=cards=>{const ids=cards.map(c=>c.id).sort(),identity=ids.join(',');if(seen.has(identity))return;seen.add(identity);for(const m of dfOptions(g,p,cards))moves.push({...m,cardIds:ids});};
 const table=g.table?.meld;
 if(!table||table.kind==='group'){
  for(let rank=3;rank<=15;rank++){const a=p.hand.filter(c=>c.rank===rank);if(!a.length)continue;for(let n=1;n<=a.length;n++)for(const real of dfComb(a,n))for(let k=0;k<=j.length;k++){if(table&&n+k!==table.count)continue;for(const wild of dfComb(j,k))push([...real,...wild]);}}
  for(let k=1;k<=j.length;k++){if(!table||table.count===k)for(const wild of dfComb(j,k))push(wild);}
 }
 if(g.rules.stairs&&(!table||table.kind==='run'))for(const suit of DF_SUITS){const a=p.hand.filter(c=>c.suit===suit),byRank=new Map(a.map(c=>[c.rank,c]));for(let n=3;n<=Math.min(13,a.length+j.length);n++){if(table&&n!==table.count)continue;for(let low=3;low+n-1<=15;low++){const real=[];let missing=0;for(let rank=low;rank<low+n;rank++){if(byRank.has(rank))real.push(byRank.get(rank));else missing++;}if(missing>j.length||!real.length)continue;for(let omit=0;omit<=Math.min(real.length-1,j.length-missing);omit++)for(const omitted of dfComb(real,omit)){const kept=real.filter(c=>!omitted.includes(c));for(const wild of dfComb(j,missing+omit))push([...kept,...wild]);}}}}
 moves.sort((a,b)=>a.cardIds.length-b.cardIds.length||Number(!!a.foul)-Number(!!b.foul)||((dfReversed(g)?-1:1)*(a.rank-b.rank))||a.key.localeCompare(b.key));return moves;
}
function dfActive(g){return g.players.filter(p=>p.status==='playing');}
function dfNextIndex(g,from,allowPassed=true){for(let n=1;n<=g.players.length;n++){const i=(from+n)%g.players.length,p=g.players[i];if(p.status==='playing'&&(allowPassed||!g.passed.includes(p.id)))return i;}return -1;}
function dfTitle(n,rank){if(rank===1)return '大富豪';if(rank===n)return '大貧民';if(n>=4&&rank===2)return '富豪';if(n>=4&&rank===n-1)return '貧民';return '平民';}
function dfRoundEnd(g){
 const active=dfActive(g);if(active.length>1)return false;const order=[...g.finished,...active.map(p=>p.id),...(g.fallen?[g.fallen]:[]),...g.fouls.map(f=>f.id).reverse()];if(new Set(order).size!==g.players.length)throw Error('順位の集計に失敗しました。');
 g.results=order.map((id,i)=>{const p=g.players.find(x=>x.id===id),rank=i+1,points=g.players.length-rank;p.rank=rank;p.score+=points;return {id,name:p.name,rank,title:dfTitle(g.players.length,rank),reason:g.fouls.find(f=>f.id===id)?.reason||(g.fallen===id?'都落ち':'上がり順'),points,score:p.score};});g.previousOrder=order;g.history.push({round:g.round,results:structuredClone(g.results)});g.phase=g.round===g.rules.rounds?'finished':'roundEnd';g.pending=null;g.turn++;if(g.phase==='finished'){const high=Math.max(...g.players.map(p=>p.score));g.winnerIds=g.players.filter(p=>p.score===high).map(p=>p.id);}dfLog(g,`第${g.round}ゲーム終了。${g.results[0].name}が大富豪！`,'result');return true;
}
function dfClear(g,from,reason){if(g.table){g.discard.push(...g.pile);g.pile=[];}g.table=null;g.passed=[];g.lock=null;g.gekiLock=null;g.back=false;g.trick++;const p=g.players[from];g.activeIndex=p?.status==='playing'?from:dfNextIndex(g,from);g.turn++;dfLog(g,reason+' 次は'+g.players[g.activeIndex].name+'から。','clear');}
function dfAdvance(g,from,skip=0,cut=false,reason='場が流れました。'){
 if(dfRoundEnd(g))return;
 const eligible=dfActive(g).filter(p=>p.id!==g.leadId&&!g.passed.includes(p.id));if(cut||!eligible.length){const leader=cut?from:g.players.findIndex(p=>p.id===g.leadId);dfClear(g,leader<0?from:leader,reason);return;}
 if(skip>=eligible.length){dfClear(g,from,'5スキップで全員を飛ばし、場が流れました。');return;}
 let i=from;for(let s=0;s<=skip;s++){for(let n=0;n<g.players.length;n++){i=(i+1)%g.players.length;if(eligible.some(p=>p.id===g.players[i].id))break;}}g.activeIndex=i;g.turn++;
}
function dfFinishPlayer(g,p,foul){if(p.hand.length)return;if(foul){p.status='foul';g.fouls.push({id:p.id,reason:foul});dfLog(g,p.name+'は'+foul+'で反則上がり。下位へ回ります。','foul');return;}p.status='finished';g.finished.push(p.id);dfLog(g,p.name+'が上がりました！','finish');if(g.rules.cityFall&&g.previousOrder?.length&&g.finished.length===1&&g.previousOrder[0]!==p.id){const old=g.players.find(x=>x.id===g.previousOrder[0]);if(old.status==='playing'){old.status='fallen';g.fallen=old.id;g.discard.push(...old.hand);old.hand=[];dfLog(g,old.name+'が都落ち。残りのカードを伏せて退場します。','fallen');}}}
function dfDeal(g){
 const deck=shuffled([...DF_SUITS.flatMap(suit=>Array.from({length:13},(_,i)=>({id:crypto.randomUUID(),suit,rank:i+3}))),...Array.from({length:g.rules.jokerCount},()=>({id:crypto.randomUUID(),suit:'J',rank:16}))]);
 g.players.forEach(p=>Object.assign(p,{hand:[],status:'playing'}));const offset=(g.firstStart+g.round-1)%g.players.length;deck.forEach((c,i)=>g.players[(i+offset)%g.players.length].hand.push(c));g.players.forEach(p=>p.hand=dfSort(p.hand));g.table=null;g.pile=[];g.discard=[];g.passed=[];g.lock=null;g.gekiLock=null;g.revolution=false;g.back=false;g.pending=null;g.finished=[];g.fouls=[];g.fallen=null;g.results=[];g.trick=1;g.turn++;g.exchangeTasks=[];g.activeIndex=g.previousOrder?.length?g.players.findIndex(p=>p.id===g.previousOrder.at(-1)):g.firstStart;g.leadId=null;g.phase='playing';
 if(g.rules.exchange&&g.previousOrder?.length){const pairs=[[g.previousOrder[0],g.previousOrder.at(-1),2]];if(g.players.length>=4)pairs.push([g.previousOrder[1],g.previousOrder.at(-2),1]);for(const [highId,lowId,count] of pairs){const high=g.players.find(p=>p.id===highId),low=g.players.find(p=>p.id===lowId),strong=dfSort(low.hand).slice(-count);low.hand=low.hand.filter(c=>!strong.includes(c));high.hand.push(...strong);high.hand=dfSort(high.hand);g.exchangeTasks.push({from:highId,to:lowId,count,done:false});}g.phase='exchange';dfLog(g,'第'+g.round+'ゲームの配札完了。下位の人から強いカードを渡しました。上位の人は返すカードを選んでください。','exchange');}
 else dfLog(g,'第'+g.round+'ゲーム開始。'+g.players[g.activeIndex].name+'から！','deal');
}
function dfStart(g){if(g.players.length<3||g.players.length>6)throw Error('3〜6人で開始できます。');g.matchId=crypto.randomUUID();g.round=1;g.turn=0;g.firstStart=crypto.getRandomValues(new Uint32Array(1))[0]%g.players.length;g.previousOrder=[];g.history=[];g.events=[];g.log=[];g.winnerIds=[];g.players.forEach(p=>{p.score=0;p.rank=null;});dfDeal(g);}
function dfSelected(p,ids){if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length)throw Error('カードを重複せず選んでください。');const cards=ids.map(id=>p.hand.find(c=>c.id===id));if(cards.some(c=>!c))throw Error('手札にないカードが含まれています。');return cards;}
function dfAction(g,p,a){
 if(a.type==='chat'){const text=String(a.message||'').trim().slice(0,180);if(!text)throw Error('メッセージを入力してください。');g.messages.push({id:crypto.randomUUID(),name:p.name,text});g.messages=g.messages.slice(-60);return;}
 if(a.type==='settings'){if(p.id!==g.hostId||g.phase!=='lobby')throw Error('開始前にホストが設定できます。');g.rules=dfSettings(a.rules);dfLog(g,'ホストがルールを変更しました。');return;}
 if(a.type==='start'){if(p.id!==g.hostId||!['lobby','finished'].includes(g.phase))throw Error('ホストだけが開始できます。');dfStart(g);return;}
 if(a.type==='next'){if(p.id!==g.hostId||g.phase!=='roundEnd'||a.matchId!==g.matchId||a.round!==g.round)throw Error('ホストが次のゲームを開始します。');g.round++;dfDeal(g);return;}
 if(a.matchId!==g.matchId||a.round!==g.round)throw Error('ゲームが更新されました。画面を確認してください。');
 if(a.type==='exchange'){
  if(g.phase!=='exchange')throw Error('カード交換は終了しています。');const task=g.exchangeTasks.find(t=>t.from===p.id&&!t.done);if(!task)throw Error('あなたのカード交換は完了しています。');const cards=dfSelected(p,a.cardIds);if(cards.length!==task.count)throw Error(task.count+'枚選んでください。');const low=g.players.find(x=>x.id===task.to);p.hand=p.hand.filter(c=>!cards.includes(c));low.hand=dfSort([...low.hand,...cards]);task.done=true;dfLog(g,p.name+'が返すカードを決めました。','exchange');if(g.exchangeTasks.every(t=>t.done)){g.phase='playing';g.turn++;dfLog(g,'交換が完了。'+g.players[g.activeIndex].name+'から始めます。','deal');}return;
 }
 if(g.phase!=='playing'||g.players[g.activeIndex]?.id!==p.id||p.status!=='playing')throw Error('あなたの手番ではありません。');if(a.turn!==g.turn)throw Error('手番が進んでいます。選び直してください。');
 if(a.type==='effect'){
  const pending=g.pending;if(!pending||a.pendingId!==pending.id)throw Error('選択内容が更新されました。');let cards=[];if(!Array.isArray(a.cardIds))throw Error('カードを選んでください。');if(a.cardIds.length)cards=dfSelected(p,a.cardIds);if(cards.length>pending.max)throw Error('選べる枚数を超えています。');p.hand=p.hand.filter(c=>!cards.includes(c));if(pending.kind==='give'){const target=g.players.find(x=>x.id===pending.targetId);if(!target||target.status!=='playing')throw Error('渡す相手が見つかりません。');target.hand=dfSort([...target.hand,...cards]);dfLog(g,p.name+'が'+target.name+'へ'+cards.length+'枚渡しました。','give');}else{g.discard.push(...cards);dfLog(g,p.name+'が'+cards.length+'枚を伏せて捨てました。','discard');}g.pending=null;dfFinishPlayer(g,p,null);dfAdvance(g,g.activeIndex);return;
 }
 if(g.pending)throw Error('先に7渡し・10捨ての選択を完了してください。');
 if(a.type==='pass'){if(!g.table)throw Error('場が空のときはパスできません。');g.passed.push(p.id);dfLog(g,p.name+'はパス。','pass');dfAdvance(g,g.activeIndex);return;}
 if(a.type!=='play')throw Error('操作が正しくありません。');const cards=dfSelected(p,a.cardIds),meld=dfOptions(g,p,cards).find(m=>m.key===a.meldKey);if(!meld)throw Error('同じ枚数・同じ種類で、場より強い組み合わせを選んでください。しばりにも注意してください。');
 const triggerGeki=dfGekiAdjacent(g,meld);if(triggerGeki&&!g.gekiLock){g.gekiLock=meld.mask;dfLog(g,'激縛り！ 同じマークの次の数字だけ出せます。','lock');}const old=g.table?.meld;let locked=g.lock;const pair=meld.kind==='group'&&meld.count===2,mode=g.rules.pairSuitLockMode||'exact';if(g.rules.suitLock&&old?.mask&&meld.mask&&meld.rank!==16){if(pair&&mode==='off')locked=null;else if(pair&&mode==='partial')locked=DF_SUITS.filter(s=>(locked||'').includes(s)||(old.mask.includes(s)&&meld.mask.includes(s))).join('')||null;else if(!locked&&meld.mask===old.mask)locked=meld.mask;}
 p.hand=p.hand.filter(c=>!cards.includes(c));g.pile.push(...cards);g.table={cards:structuredClone(cards),meld,playerId:p.id,name:p.name};g.leadId=p.id;if(locked&&locked!==g.lock)dfLog(g,'スートしばり！ 同じマークを含む組み合わせで続けます。','lock');g.lock=locked;
 const rankName=meld.rank===16?'ジョーカー':({11:'J',12:'Q',13:'K',14:'A',15:'2'}[meld.rank]||meld.rank);dfLog(g,p.name+'：'+(meld.kind==='run'?cards.length+'枚の階段':rankName+'を'+cards.length+'枚')+'。','play');
 if(g.rules.revolution&&((meld.kind==='group'&&cards.length>=4)||(g.rules.stairRevolution&&meld.kind==='run'&&cards.length>=5))){g.revolution=!g.revolution;dfLog(g,g.revolution?'革命！ 数字の強さが逆転します。':'革命返し！ 数字の強さが戻ります。','revolution');}
 if(g.rules.elevenBack&&meld.kind==='group'&&cards.some(c=>c.rank===11)){g.back=!g.back;dfLog(g,'11バック！ 場が流れるまで数字の強弱が切り替わります。','back');}
 const group=meld.kind==='group',cut=!!(meld.counter||(g.rules.eightCut&&group&&cards.some(c=>c.rank===8))||(meld.rank===16&&cards.length===2)||(group&&cards.length===6));
 const reason=meld.counter?'スペ3返し！ 場を流します。':g.rules.eightCut&&group&&cards.some(c=>c.rank===8)?'8切り！ 場を流します。':'最強の組み合わせで場を流します。';
 if(!p.hand.length){dfFinishPlayer(g,p,meld.foul);dfAdvance(g,g.activeIndex,0,cut,reason);return;}
 if(!cut&&group){let kind=null,max=0;if(g.rules.sevenGive&&cards.some(c=>c.rank===7)){kind='give';max=Math.min(p.hand.length,cards.filter(c=>c.rank===7).length);}else if(g.rules.tenDiscard&&cards.some(c=>c.rank===10)){kind='discard';max=Math.min(p.hand.length,cards.filter(c=>c.rank===10).length);}if(kind&&max){const targetId=g.players[dfNextIndex(g,g.activeIndex)]?.id;g.pending={id:crypto.randomUUID(),kind,max,targetId:kind==='give'?targetId:null};return;}}
 const skip=g.rules.fiveSkip&&group?cards.filter(c=>c.rank===5).length:0;if(skip)dfLog(g,'5スキップ！ '+skip+'人分の手番を飛ばします。','skip');dfAdvance(g,g.activeIndex,skip,cut,reason);
}
function dfView(g,p){const ownTask=p?g.exchangeTasks?.find(t=>t.from===p.id&&!t.done):null;return {code:g.code,revision:g.revision,phase:g.phase,rules:g.rules,hostId:g.hostId,matchId:g.matchId,round:g.round,turn:g.turn,trick:g.trick,activeId:g.players[g.activeIndex]?.id,revolution:!!g.revolution,back:!!g.back,reversed:dfReversed(g),lock:g.lock,gekiLock:g.gekiLock||null,gekiNext:g.gekiLock&&g.table?dfGekiNext(g.table.meld.rank,dfReversed(g)):null,table:g.table,discardCount:g.discard?.length||0,passed:g.passed||[],events:g.events,log:g.log,messages:g.messages,results:g.results||[],history:g.history||[],winnerIds:g.winnerIds||[],exchangeTasks:(g.exchangeTasks||[]).map(t=>({...t})),pending:g.pending?{playerId:g.players[g.activeIndex].id,kind:g.pending.kind,max:g.pending.max,targetId:g.pending.targetId}:null,players:g.players.map(x=>({id:x.id,name:x.name,status:x.status,score:x.score,rank:x.rank,handCount:x.hand.length})),me:p?{id:p.id,hand:p.hand,exchange:ownTask?{...ownTask}:null,pending:g.pending&&g.players[g.activeIndex]?.id===p.id?{...g.pending}:null}:null,legalMoves:dfMoves(g,p)};}
async function handleDaifugo(storage,request){const url=new URL(request.url),route=url.pathname.split('/').pop();try{let g=await storage.get('daifugo');const a=request.method==='POST'?await request.json():{};
 if(route==='create'){if(g)return json({error:'この部屋は使用中です。'},409);const p=dfPlayer(a.name);g={code:a.code,hostId:p.id,players:[p],phase:'lobby',revision:1,rules:dfSettings(a.rules),messages:[],log:[],events:[]};dfLog(g,'大富豪のテーブルを用意しました。');await storage.put('daifugo',g);return json({game:dfView(g,p),token:p.token});}
 if(!g)return json({error:'部屋が見つかりません。'},404);
 if(route==='join'){const matches=g.players.filter(x=>x.name===cleanName(a.name));if(matches.length>1)return json({error:'同じ名前が複数います。保存済みの参加情報を使ってください。'},409);if(matches.length)return json({game:dfView(g,matches[0]),token:matches[0].token,rejoined:true});if(g.phase!=='lobby'||g.players.length>=6)return json({error:'開始済み、または満員です。'},409);const p=dfPlayer(a.name);g.players.push(p);g.revision++;dfLog(g,p.name+'が参加しました。');await storage.put('daifugo',g);return json({game:dfView(g,p),token:p.token});}
 const token=a.token||url.searchParams.get('token'),p=g.players.find(x=>x.token===token);if(route==='state'&&request.method==='GET'){if(!p&&url.searchParams.get('spectate')!=='1')return json({error:'参加者情報が確認できません。'},403);return json({game:dfView(g,p)});}
 if(route!=='action'||request.method!=='POST'||!p)return json({error:'操作できません。'},403);const next=structuredClone(g),actor=next.players.find(x=>x.id===p.id);dfAction(next,actor,a);next.revision++;await storage.put('daifugo',next);return json({game:dfView(next,actor)});
 }catch(e){return json({error:e.message||'処理に失敗しました。'},400);}}

// Spirit Island cooperative room. Effects are resolved from structured choices;
// secret hands are only included in the authenticated player's view.

function siOceanNeedsCleanup(g){return(g.oceans||[]).some(l=>l.dahan+l.explorers+l.towns+l.cities>0);}
function siPrepareOceanCleanup(g){if(g.cleanupChoices?.length||!siOceanNeedsCleanup(g)||g.powerContext||g.pendingCascades?.length||g.counterattackChoices?.length||g.presenceLossChoices?.length||g.vengeanceChoices?.length||siScenarioPending(g)||g.powerGains?.length)return;g.cleanupChoices=[];for(const sea of g.oceans||[]){siSyncDahan(sea);siSyncInvaderDamage(sea);const pieces=[];for(const type of ['explorers','towns','cities','dahan']){const ids=type==='dahan'?sea.dahanIds:sea.invaderIds[type];for(let i=0;i<sea[type];i++)pieces.push({id:ids[i],type,damage:(type==='dahan'?sea.dahanDamage:sea.invaderDamage[type])[i]||0});}if(pieces.length)g.cleanupChoices.push({playerId:sea.board,fromId:sea.id,targetIds:g.lands.filter(l=>sea.neighbors.includes(l.id)).map(l=>l.id),pieces});}}
function siApplyOceanCleanup(g,p,a){const t=g.cleanupChoices?.[0],placements=a.placements||[];if(!t||t.playerId!==p.id||!Array.isArray(placements)||placements.length!==t.pieces.length||new Set(placements.map(m=>m.pieceId)).size!==t.pieces.length)throw Error('海域に残った全てのコマを、最も近い沿岸へ配置してください。');for(const m of placements)if(!t.targetIds.includes(m.to)||!t.pieces.some(piece=>piece.id===m.pieceId))throw Error('整理するコマと沿岸の土地を選び直してください。');const from=siAllNodes(g).find(l=>l.id===t.fromId);for(const m of placements){const piece=t.pieces.find(x=>x.id===m.pieceId),to=g.lands.find(l=>l.id===m.to),type=piece.type,ids=type==='dahan'?from.dahanIds:from.invaderIds[type],damage=type==='dahan'?from.dahanDamage:from.invaderDamage[type],index=ids.indexOf(piece.id);if(index<0)throw Error('コマの状態が変わりました。');ids.splice(index,1);const [wound]=damage.splice(index,1);from[type]--;if(type==='dahan'){siSyncDahan(to);if(wound<2+(to.dahanHealthBonus||0)||to.dahanImmune){to.dahan++;to.dahanIds.push(piece.id);to.dahanDamage.push(wound);}}else{siSyncInvaderDamage(to);if(wound<siInvaderHealth(to)[type]){to[type]++;to.invaderIds[type].push(piece.id);to.invaderDamage[type].push(wound);siCheckCapitalAt(to);}}}g.cleanupChoices.shift();siLog(g,'海域に残ったコマを最も近い沿岸へ整理した（移動・破壊としては扱わない）。','info');if(!g.cleanupChoices.length)siResumeScenario(g);}

function siPieceIndex(g,l,type,fallback=0,pieceId=null){if(type==='dahan')siSyncDahan(l);else siSyncInvaderDamage(l);const ids=type==='dahan'?l.dahanIds:l.invaderIds[type];if(pieceId){const index=ids.indexOf(pieceId);if(index<0)throw Error('選んだコマは移動元にありません。');return index;}const preferred=g?.piecePreferences?.[l.id]?.[type]||[];for(const id of preferred){const i=ids.indexOf(id);if(i>=0)return i;}return Math.min(fallback,ids.length-1);}
function siValidatePiecePreferences(g,preferences){if(!preferences)return;for(const [landId,types] of Object.entries(preferences)){const l=siAllNodes(g).find(l=>l.id===landId);if(!l)throw Error('コマを選ぶ土地を確認してください。');for(const [type,ids] of Object.entries(types)){if(!['explorers','towns','cities','dahan'].includes(type)||!Array.isArray(ids)||new Set(ids).size!==ids.length)throw Error('優先するコマを重複なく選んでください。');if(type==='dahan')siSyncDahan(l);else siSyncInvaderDamage(l);const available=type==='dahan'?l.dahanIds:l.invaderIds[type];if(ids.some(id=>!available.includes(id)))throw Error('選んだコマの状態が変わりました。');}}}

const SI_SCENARIOS=[{id:'none',name:'通常ゲーム',difficulty:0},{id:'blitz',name:'電撃戦',difficulty:0},{id:'heart',name:'島の心臓を守れ',difficulty:0},{id:'rituals',name:'恐怖の儀式',difficulty:3},{id:'insurrection',name:'ダハンの反乱',difficulty:4}];
function siScenario(g,id){return (g.scenario||'none')===id;}
function siScenarioPending(g){return !!(g.scenarioTasks?.length||g.raidingMovedIds?.length||g.militaryResponses?.length||siScenario(g,'insurrection')&&g.insurrectionFinal&&!g.finalRaidQueued);}
function siScenarioSpeed(g,c){return siScenario(g,'blitz')?'fast':c.playSpeed||c.speed;}
function siScenarioCost(g,c,accelerated=false){return c.cost-(siScenario(g,'blitz')&&(c.speed==='fast'||accelerated||c.blitzAccelerated)?1:0);}
function siPrintedPowerCost(g,c){return siScenario(g,'blitz')&&(c.speed==='fast'||c.blitzAccelerated)?Math.max(0,c.cost-1):c.cost;}
function siScenarioCardView(g,c){return siScenario(g,'blitz')?{...c,playSpeed:'fast',payCost:siScenarioCost(g,c)}:c;}
function siScenarioTask(g,task){g.scenarioTasks??=[];g.scenarioTasks.push({id:crypto.randomUUID(),...task});}
function siScenarioTaskTargets(g,t){if(!t)return[];if(t.kind==='response'){const from=siAllNodes(g).find(l=>l.id===t.fromId),lands=g.lands.filter(l=>l.dahan);if(!lands.length)return[];const distances=lands.map(l=>siDistance(g,from,l)),min=Math.min(...distances);return lands.filter((l,i)=>distances[i]===min);}return siAllNodes(g).filter(l=>(t.targetIds||[]).includes(l.id));}
function siInitialSetupChoices(g){g.setupChoices=[];for(const p of g.players){const own=g.lands.filter(l=>l.board===p.id);if(p.spirit==='ocean'){const old=own.find(l=>l.presenceOwners.includes(p.id));if(old){old.presenceOwners.splice(old.presenceOwners.indexOf(p.id),1);old.presence--;p.presence++;}g.setupChoices.push({kind:'initialPresence',playerId:p.id,targetIds:own.filter(l=>l.coastal).map(l=>l.id),name:'海の精霊：最初の沿岸を選ぶ'});}if(g.islandMap==='thematic'&&p.spirit==='green'){const targets=own.filter(l=>l.terrain==='ジャングル'&&!l.dahan),old=own.find(l=>l.terrain==='ジャングル'&&l.presenceOwners.includes(p.id));if(old&&targets.length>1){old.presenceOwners.splice(old.presenceOwners.indexOf(p.id),1);old.presence--;p.presence++;g.setupChoices.push({kind:'initialPresence',playerId:p.id,targetIds:targets.map(l=>l.id),name:'緑の精霊：ダハンのいないジャングルを選ぶ'});}}if(p.spirit==='thunderspeaker'){for(const l of own){const n=l.presenceOwners.filter(id=>id===p.id).length;l.presenceOwners=l.presenceOwners.filter(id=>id!==p.id);l.presence=l.presenceOwners.length;p.presence+=n;}g.setupChoices.push({kind:'thunderInitial',playerId:p.id,remaining:2,chosen:[],name:'雷鳴の精霊：ダハンが多い2つの土地を選ぶ'});}}}
function siSetupTargets(g,t){if(t.kind==='thunderInitial'){const lands=g.lands.filter(l=>l.board===t.playerId&&!t.chosen.includes(l.id)),max=Math.max(...lands.map(l=>l.dahan));return lands.filter(l=>l.dahan===max);}return siAllNodes(g).filter(l=>t.targetIds.includes(l.id));}
function siApplySetupChoice(g,p,a){const t=g.setupChoices?.[0],l=siSetupTargets(g,t||{}).find(l=>l.id===a.landId);if(!t||t.playerId!==p.id||!l)throw Error('準備中の存在を置く土地を選んでください。');if(t.kind==='guardPresence'){const key=a.track==='plays'?'playTrack':'energyTrack',track=a.track==='plays'?'plays':'energy';if(siTrackRemaining(p)[track]<=0)throw Error('存在トラックに空きがありません。');p[key]=(p[key]||0)+1;}l.presenceOwners.push(p.id);l.presence++;p.presence--;if(t.kind==='thunderInitial'){t.chosen.push(l.id);t.remaining--;if(t.remaining===0)g.setupChoices.shift();}else g.setupChoices.shift();if(!g.setupChoices.length)siContinueSetup(g);}
function siContinueSetup(g){if(g.setupChoices?.length||g.escalationChoices?.length||g.scenarioTasks?.length||g.buildChoice)return;const s=g.setupState;if(!s)return;g.initialExplore=true;try{if(s.step===0){siInvader(g,'explore');if(g.scenarioTasks.length)return;s.step=1;}if(s.step===1){if(siScenario(g,'blitz')){if(!siBuildCard(g,g.invaderSlots.build,'setup'))return;}s.step=2;}if(s.step===2){if(siScenario(g,'blitz')){siInvader(g,'explore');if(g.scenarioTasks.length)return;}s.step=3;}}finally{g.initialExplore=false;}if(s.step===3){s.step=4;siAdversaryPostSetup(g);if(g.escalationChoices.length)return;}if(s.step===4){s.step=5;if(siScenario(g,'heart'))siSetupHeart(g);if(g.setupChoices.length)return;}g.setupState=null;g.phase='growth';g.players.forEach(p=>p.ready=false);siLog(g,'島の準備と初期探索が完了しました。','start');}
function siSetupHeart(g){g.innerLandIds=g.players.map((p,i)=>g.lands.filter(l=>l.board===p.id)[g.players.length<=2?6:siHeartIndex(g,i)].id);for(const l of g.lands)while(l.towns)siRemoveInvader(g,l,'towns',siPieceIndex(g,l,'towns',0),false);for(const p of g.players){const inner=g.lands.find(l=>l.board===p.id&&g.innerLandIds.includes(l.id));siAddInvader(inner,'explorers');let targets=[inner];if(p.spirit==='ocean'){const coast=g.lands.filter(l=>l.board===p.id&&l.coastal),min=Math.min(...coast.map(l=>siDistance(g,inner,l)));targets=coast.filter(l=>siDistance(g,inner,l)===min);}g.setupChoices.push({kind:'guardPresence',playerId:p.id,targetIds:targets.map(l=>l.id),name:'島の心臓：追加の存在とトラックを選ぶ'});for(const deck of ['minor','major'])if(g.powerDecks[deck].length)p.hand.push(g.powerDecks[deck].shift());}}
function siHeartIndex(g,i){if(g.islandMap==='thematic')return({E:9,W:5,NE:5,NW:8}[g.players[i].islandBoard]);return g.players.length===4&&i%2===1?7:({A:6,B:6,C:3,D:5}[g.players[i].islandBoard]);}
function siPrepareBlitzExplore(g,card,lands){if(!siScenario(g,'blitz'))return false;if(g.blitzExplore)return false;g.blitzExplore={picks:{},targetIds:lands.map(l=>l.id)};for(const p of g.players){const targetIds=lands.filter(l=>l.board===p.id&&!siFearSkip(g,'explore',l)).map(l=>l.id);if(targetIds.length)siScenarioTask(g,{kind:'blitzExplore',playerId:p.id,targetIds,name:'電撃戦：追加の遠征隊',description:'今回探索する土地の1つへ、遠征隊をもう1つ追加します。'});}return !!g.scenarioTasks.length;}
function siFinishScenarioAction(g,prepend=false){if(!siScenario(g,'insurrection')||!g.lands)return;const previous=prepend?(g.scenarioTasks||[]).splice(0):[];if(g.insurrectionFinal&&!g.finalRaidQueued&&!previous.length&&!g.scenarioTasks?.length&&!g.raidingMovedIds?.length&&!g.militaryResponses?.length&&!g.pendingCascades?.length&&!g.counterattackChoices?.length&&!g.presenceLossChoices?.length&&!g.vengeanceChoices?.length){g.finalRaidQueued=true;for(const l of g.lands)if(l.dahan&&totalInvaders(l))siScenarioTask(g,{kind:'raid',playerId:l.board,landId:l.id,targetIds:[l.id],amount:l.dahan*2,name:'ダハンの反乱：一斉蜂起'});}const moved=new Set(g.raidingMovedIds||[]);g.raidingMovedIds=[];for(const l of g.lands){siSyncDahan(l);const amount=l.dahanIds.filter(id=>moved.has(id)).length;if(amount&&totalInvaders(l))siScenarioTask(g,{kind:'raid',playerId:l.board,landId:l.id,targetIds:[l.id],amount,name:'ダハンの反乱：絶え間ない襲撃'});}for(const r of g.militaryResponses||[])siScenarioTask(g,{kind:'response',playerId:g.players.find(p=>p.id===r.board)?.id||g.hostId,fromId:r.fromId,type:r.type,name:'ダハンの反乱：軍の対応',description:'ダハンのいる最も近い土地へ侵略者を追加します。同距離の土地から選べます。'});g.militaryResponses=[];if(previous.length)g.scenarioTasks.push(...previous);}
function siResumeScenario(g){siFinishScenarioAction(g,true);if(g.scenarioTasks?.length||g.pendingCascades?.length||g.counterattackChoices?.length||g.presenceLossChoices?.length||g.vengeanceChoices?.length)return;if(siCheckEnd(g))return;if(g.setupState)siContinueSetup(g);else if(g.ritualResolution)siContinueRitual(g);else if(g.resumeFear){g.resumeFear=false;siResolveFear(g);}else if(g.invaderResolution)siResolveInvaderPhase(g,true);}
function siApplyScenarioChoice(g,p,a){const t=g.scenarioTasks?.[0];if(!t||t.playerId!==p.id)throw Error('シナリオの選択順を待っています。');if(t.kind==='raid'){const l=g.lands.find(l=>l.id===t.landId);siFearDamage(g,l,t.amount,a.damagePlan||a.plans?.[l.id]||[]);g.scenarioTasks.shift();siFlushDeaths(g);siResumeScenario(g);return;}if(t.kind==='ritualPush'){const l=g.lands.find(l=>l.id===t.landId),targets=siScenarioTaskTargets(g,t),counts=a.counts||{},values=targets.map(l=>Number(counts[l.id]||0));if(Object.keys(counts).some(id=>!t.targetIds.includes(id))||values.some(n=>!Number.isInteger(n)||n<0)||values.reduce((n,x)=>n+x,0)!==l.dahan||Math.max(...values)-Math.min(...values)>1)throw Error('全ダハンを隣接地へ、個数の差が1以内になるよう均等に押し出してください。');for(let i=0;i<targets.length;i++)for(let n=0;n<values[i];n++)siMoveDahan(g,l,targets[i],p.id);g.scenarioTasks.shift();siResumeScenario(g);return;}const targets=siScenarioTaskTargets(g,t),l=targets.find(l=>l.id===a.landId);if(!l&&targets.length||!targets.length&&a.landId)throw Error('シナリオの対象地を選び直してください。');if(t.kind==='blitzExplore')g.blitzExplore.picks[p.id]=l.id;else if(t.kind==='response'&&l)siAddInvader(l,t.type);g.scenarioTasks.shift();siResumeScenario(g);}
function siRitualTargets(g){return (g.lands||[]).filter(l=>l.dahan>=3*g.players.length&&g.players.every(p=>l.presenceOwners.includes(p.id)));}
function siRitualAction(g,p,a){if(!siScenario(g,'rituals')||!['fast','slow'].includes(g.phase))throw Error('儀式は早い・遅い能力のフェイズに行います。');if(a.type==='proposeRitual'){const l=siRitualTargets(g).find(l=>l.id===a.landId);if(!l||g.ritualProposal)throw Error('全精霊の存在と十分なダハンのある土地を選んでください。');g.ritualProposal={landId:l.id,proposerId:p.id,contributions:{}};return;}const r=g.ritualProposal;if(!r)throw Error('儀式を行う土地を先に選んでください。');if(a.type==='cancelRitual'){g.ritualProposal=null;return;}if(a.type==='ritualContribute'){const l=g.lands.find(l=>l.id===r.landId),energy=Number(a.energy),presence=Number(a.presence);if(!Number.isInteger(energy)||energy<0||energy>Math.min(3,p.energy)||!Number.isInteger(presence)||presence<0||presence>Math.min(3,l.presenceOwners.filter(id=>id===p.id).length))throw Error('自分が支払える精霊力と存在の個数を選んでください。');const proposed={...r.contributions,[p.id]:{energy,presence}};if(Object.values(proposed).reduce((n,c)=>n+c.energy,0)>3||Object.values(proposed).reduce((n,c)=>n+c.presence,0)>3)throw Error('全員の合計が精霊力3・存在3を超えています。');r.contributions=proposed;return;}if(a.type==='performRitual'){const l=siRitualTargets(g).find(l=>l.id===r.landId),cs=Object.values(r.contributions);if(!l||!g.players.every(p=>r.contributions[p.id])||cs.reduce((n,c)=>n+c.energy,0)!==3||cs.reduce((n,c)=>n+c.presence,0)!==3)throw Error('全員の同意と、精霊力3・存在3の負担を確定してください。');for(const spirit of g.players){const c=r.contributions[spirit.id];if(spirit.energy<c.energy||l.presenceOwners.filter(id=>id===spirit.id).length<c.presence)throw Error('負担できる資源が変わりました。');}g.ritualResolution={landId:l.id,returnPhase:g.phase,ready:Object.fromEntries(g.players.map(p=>[p.id,p.ready])),step:'fear'};for(const spirit of g.players){const c=r.contributions[spirit.id];spirit.energy-=c.energy;siDestroyPresence(g,l,spirit.id,c.presence);}g.ritualProposal=null;g.terror++;siLog(g,`恐怖の儀式により恐怖レベル${g.terror}へ。`,'scenario');if(siCheckEnd(g))return;siResolveFear(g);return;}throw Error('儀式の操作を選び直してください。');}
function siContinueRitual(g){const r=g.ritualResolution;if(!r)return;if(r.step==='fear'){r.step='push';const l=g.lands.find(l=>l.id===r.landId),targetIds=g.lands.filter(n=>siAdjacent(l,n)).map(l=>l.id);if(l.dahan&&targetIds.length){siScenarioTask(g,{kind:'ritualPush',landId:l.id,targetIds,playerId:l.board,name:'恐怖の儀式：ダハンを均等に押し出す'});return;}}if(g.scenarioTasks.length)return;g.phase=r.returnPhase;for(const p of g.players)p.ready=r.ready[p.id];g.ritualResolution=null;siCheckEnd(g);}

function siInvaderHealth(l){return l.invaderHealth||{explorers:1,towns:2,cities:3};}
function siCheckCapitalAt(l){if(l.englandCapital&&l.towns+l.cities>=7)l.capitalReached=true;}
function siBuildEligible(g,l){return totalInvaders(l)>0||(siAdversary(g).id==='england'&&siAdversary(g).level>=1&&g.lands.filter(n=>siAdjacent(l,n)).reduce((n,x)=>n+x.towns+x.cities,0)>=2);}
function siMaybeGreenAction(g,l,kind){if(g.initialExplore)return false;if(siAdversary(g).id!=='england')return false;const green=g.players.find(p=>p.spirit==='green'&&l.presenceOwners.filter(id=>id===p.id).length>=2);if(!green)return false;g.buildChoice={playerId:green.id,landId:l.id,kind};return true;}
function siBuildCard(g,card,tag){if(!card)return true;g.buildResolution??={tag,targetIds:g.lands.filter(l=>(card.landIds?card.landIds.includes(l.id):card.coastal?l.coastal:(card.terrains||[card.terrain]).includes(l.terrain))&&siBuildEligible(g,l)).map(l=>l.id),index:0};const r=g.buildResolution;if(r.tag!==tag)throw Error('前の建設処理が未完了です。');while(r.index<r.targetIds.length){const l=g.lands.find(l=>l.id===r.targetIds[r.index]);if(siFearSkip(g,'build',l)||g.greenSkipped?.build?.includes(l.id)){r.index++;continue;}if(siMaybeGreenAction(g,l,'build'))return false;siAddInvader(l,l.towns>l.cities?'cities':'towns');r.index++;if(siCheckEnd(g))return true;}g.buildResolution=null;siLog(g,`${tag==='immigration'?'移民の増加':tag==='escalation'?'建設ブーム':'侵略者の建設'}を解決。`,'invader');return true;}
function siFinishEnglandEscalation(g){const task=g.escalationChoices[0];if(!task?.chosenLandId)return;if(!siBuildCard(g,{landIds:[task.chosenLandId]},'escalation'))return;g.escalationChoices.shift();if(siCheckEnd(g))return;if(!g.escalationChoices.length){if(g.setupState)siContinueSetup(g);else if(g.invaderResolution)siResolveInvaderPhase(g,true);}}
function siApplyInvaderChoice(g,p,a){const t=g.buildChoice,l=g.lands.find(l=>l.id===t?.landId);if(!t||t.playerId!==p.id||typeof a.prevent!=='boolean')throw Error('緑の精霊が侵略者行動を止めるか選んでください。');if(a.prevent){if(l.presenceOwners.filter(id=>id===p.id).length<2)throw Error('聖域の存在が必要です。');siDestroyPresence(g,l,p.id);siLog(g,`${p.name}が存在を1つ犠牲にして${t.kind==='build'?'今回の建設':'今回の荒廃'}を止めた。`,'power');}g.buildChoice=null;if(t.kind==='ravage'){g.ravageDecisions??={};g.ravageDecisions[l.id]=a.prevent;}else{if(!a.prevent)siAddInvader(l,l.towns>l.cities?'cities':'towns');g.buildResolution.index++;}if(siCheckEnd(g))return;if(g.buildResolution?.tag==='escalation')siFinishEnglandEscalation(g);else if(g.invaderResolution)siResolveInvaderPhase(g,true);}
const SI_ADVERSARIES=[{id:'england',name:'イングランド',difficulty:[1,3,4,6,7,9,11],fearExtras:[[0,0,0],[0,1,0],[1,1,0],[1,2,1],[1,2,2],[1,2,2],[1,2,1]]},{id:'sweden',name:'スウェーデン',difficulty:[1,2,3,5,6,7,8],fearExtras:[[0,0,0],[0,0,0],[0,1,0],[0,1,0],[0,1,1],[1,1,1],[1,1,2]]},{id:'none',name:'敵対国なし',difficulty:[0],fearExtras:[[0,0,0]]},{id:'prussia',name:'ブランデンブルク＝プロイセン',difficulty:[1,2,4,6,7,9,10],fearExtras:[[0,0,0],[0,0,0],[0,0,0],[0,1,0],[1,1,0],[1,1,0],[1,1,1]]}];
function siAdversary(g){const config=g.adversary||{id:'none',level:0},info=SI_ADVERSARIES.find(x=>x.id===config.id)||SI_ADVERSARIES.find(x=>x.id==='none');return{...info,level:config.level||0};}
function siAdversaryDeck(g,deck){const a=siAdversary(g);if(a.id!=='prussia')return deck;let one=deck.filter(c=>c.stage===1),two=deck.filter(c=>c.stage===2),three=deck.filter(c=>c.stage===3),early=[];if(a.level>=2)early.push(three.pop());if(a.level>=3)one.shift();if(a.level>=4)two.shift();if(a.level>=5)one.shift();if(a.level>=6)one.shift();return[...one,...early,...two,...three];}
function siAdversarySetup(g){const a=siAdversary(g);for(const l of siAllNodes(g)){l.invaderHealth={explorers:1,towns:a.id==='england'&&a.level>=5?3:2,cities:a.id==='england'&&a.level>=5?4:3};l.englandCapital=a.id==='england'&&!l.isOcean;}if(a.id==='england'&&a.level>=2)for(const p of g.players){const lands=g.lands.filter(l=>l.board===p.id);siAddInvader(lands[0],'cities');siAddInvader(lands[1],'towns');}if(a.id==='sweden')for(const p of g.players){const lands=g.lands.filter(l=>l.board===p.id);if(a.level>=2){siAddInvader(lands[3],'cities');if(lands[3].blight){lands[3].blight--;lands[4].blight++;}}if(a.level>=6){siAddInvader(lands[7],'towns');lands[7].blight++;}}if(a.id==='prussia'&&a.level>=1)for(const l of g.lands.filter(l=>l.index===2))siAddInvader(l,'towns');}
function siAdversaryEscalation(g,card){if(!g.initialExplore&&card?.escalation&&siAdversary(g).id==='england'){for(const p of g.players){const lands=g.lands.filter(l=>l.board===p.id),max=Math.max(...lands.map(l=>l.towns+l.cities));if(max>0)g.escalationChoices.push({kind:'england',playerId:p.id,targetIds:lands.filter(l=>l.towns+l.cities===max).map(l=>l.id),name:'イングランド：建設ブーム',description:'この島で町・都市の合計が最も多い土地を選び、建設を行います。'});}return;}if(g.initialExplore||!card?.escalation||siAdversary(g).id!=='prussia')return;g.escalationChoices??=[];for(const p of g.players){const lands=g.lands.filter(l=>l.board===p.id);if(!lands.some(l=>l.towns+l.cities>0))continue;const targetIds=lands.filter(l=>!l.towns).map(l=>l.id);if(targetIds.length)g.escalationChoices.push({playerId:p.id,targetIds,name:'プロイセン：入植者の到着'});}if(g.escalationChoices.length)siLog(g,'各島で町を追加する土地を選んでください。','invader');}
function siEscalationTargets(g,task){if(!task)return[];if(task.kind==='england'){const lands=g.lands.filter(l=>l.board===task.playerId),max=Math.max(...lands.map(l=>l.towns+l.cities));return lands.filter(l=>l.towns+l.cities===max);}if(task.kind==='mining'){const from=g.lands.find(l=>l.id===task.fromId);return g.lands.filter(l=>siAdjacent(from,l)&&!l.towns&&!l.cities);}return g.lands.filter(l=>task.targetIds.includes(l.id)&&(task.kind==='royal'||!l.towns));}
function siApplyEscalation(g,p,a){const task=g.escalationChoices?.[0],targets=siEscalationTargets(g,task),l=targets.find(l=>l.id===a.landId);if(!task||task.playerId!==p.id||targets.length&&!l||!targets.length&&a.landId)throw Error('自分の順番に、追加先として選べる土地を選んでください。');if(task.kind==='england'){task.chosenLandId=l.id;siFinishEnglandEscalation(g);return;}if(l){siAddInvader(l,'towns');siLog(g,`${p.name}が敵対国の効果で${l.terrain}${l.index+1}へ町を追加。`,'invader');}g.escalationChoices.shift();if(!g.escalationChoices.length){if(g.setupState)siContinueSetup(g);else if(g.invaderResolution)siResolveInvaderPhase(g,true);}}
function siAdversaryPostSetup(g){const a=siAdversary(g);if(a.id!=='sweden'||a.level<4)return;const card=g.invaderDeck[g.invaderIndex++];g.setupDiscard=card;for(const p of g.players){const lands=g.lands.filter(l=>l.board===p.id&&(card.coastal?l.coastal:card.terrains.includes(l.terrain))),min=Math.min(...lands.map(totalInvaders));if(!lands.length)continue;const targetIds=lands.filter(l=>totalInvaders(l)===min).map(l=>l.id);g.escalationChoices.push({kind:'royal',playerId:p.id,targetIds,name:'スウェーデン：王室の後援',description:'初期探索後に捨てたカードと一致する、侵略者が最も少ない土地へ町を追加します。'});}siLog(g,'王室の後援で侵略者デッキを1枚進め、各島に町を追加します。','invader');}
function siAdversaryExploreLand(g,l,card){if(g.initialExplore||!card.escalation||siAdversary(g).id!=='sweden'||!l.dahan||totalInvaders(l)<l.dahan)return;siSyncDahan(l);l.dahan--;l.dahanDamage.pop();l.dahanIds.pop();siAddInvader(l,'towns');siLog(g,`${l.terrain}${l.index+1}のダハン1個が町に置き換わった。`,'invader');}
function siInvaderDamage(g,l){const a=siAdversary(g),steel=a.id==='sweden'&&a.level>=3;return l.explorers+l.towns*(steel?3:2)+l.cities*(steel?5:3);}
function siExtraRavageBlight(g,l){if(g.phase==='finished')return 0;if(g.blightPool<=0){if(g.blightFlipped){g.phase='finished';g.winner=false;return 0;}siFlipBlight(g);}l.blight++;g.blightPool--;if(g.blightPool===0){if(!g.blightFlipped)siFlipBlight(g);else{g.phase='finished';g.winner=false;siLog(g,'島を覆う荒廃が限界に達した。','defeat');}}return 1;}
function siAdversaryRavage(g,l,damage,placed){const a=siAdversary(g);if(a.id!=='sweden'||!placed)return 0;let extra=0;if(a.level>=1&&damage>=6)extra=siExtraRavageBlight(g,l);if(a.level>=5){const task={kind:'mining',fromId:l.id,playerId:g.players.find(p=>p.id===l.board)?.id||g.hostId,name:'スウェーデン：鉱山への殺到',description:'荒廃した土地の隣接地で、町も都市もない土地へ町を1つ追加します。'};if(siEscalationTargets(g,task).length)g.escalationChoices.push(task);}return extra;}
const SI_SPIRITS=[
 {id:'lightning',name:'雷の申し子',element:'炎・風',tone:'#e9a943',style:'速攻',setup:[1,5]},
 {id:'river',name:'日の光の中で高まる川',element:'水・月',tone:'#52a7c8',style:'移動・成長',setup:[0,7]},
 {id:'earth',name:'大地の活力',element:'大地・植物',tone:'#77a66a',style:'防御',setup:[2,4]},
 {id:'shadows',name:'影が炎のように揺らぐ',element:'月・炎',tone:'#9774b8',style:'恐怖',setup:[4,6]},
 {id:'green',name:'緑が猛威を振るう',element:'植物・大地',tone:'#4c9b71',style:'存在・防御',setup:[5,7]},
 {id:'thunderspeaker',name:'雷鳴を響かせる者',element:'風・太陽',tone:'#d49b4d',style:'ダハン',setup:[0,3]},
 {id:'bringer',name:'夢と悪夢をもたらすもの',element:'月・獣',tone:'#756ba7',style:'恐怖',setup:[2,5]},
 {id:'ocean',name:'飢えた海の貪り手',element:'水・月',tone:'#397e9d',style:'沿岸',setup:[1,6]}
];
const SI_TERRAINS=['山','ジャングル','砂漠','湿地'];
const SI_FEAR_CARDS=[
 {key:'unseen',name:'目に見えない不安',effects:[{kind:'remove',filter:'site',types:['explorers','towns']},{kind:'remove',filter:'presence',types:['explorers','towns']},{kind:'remove',filter:'presence',types:['explorers','towns','cities'],citySite:true}]},
 {key:'scapegoats',name:'生け贄',effects:[{kind:'scapegoats'},{kind:'scapegoats'},{kind:'scapegoats'}]},
 {key:'emigration',name:'人口流出の加速',effects:[{kind:'remove',filter:'coastal',types:['explorers']},{kind:'remove',filter:'coastal',types:['explorers','towns']},{kind:'remove',types:['explorers','towns']}]},
 {key:'guard',name:'油断なきダハン',effects:[{kind:'guard'},{kind:'guard'},{kind:'guard'}]},
 {key:'tales',name:'残酷な物語',effects:[{kind:'remove',filter:'dahan',types:['explorers']},{kind:'remove',filter:'dahan',types:['explorers','towns'],explorerCount:2},{kind:'tales'}]},
 {key:'retreat',name:'退却！',effects:[{kind:'push',filter:'inland',types:['explorers'],count:2,optional:true},{kind:'push',filter:'inland',types:['explorers','towns'],count:3,optional:true},{kind:'push',types:['explorers','towns'],count:999,optional:true}]},
 {key:'raid',name:'ダハンの襲撃',effects:[{kind:'raid',filter:'dahan',different:true},{kind:'raid',filter:'dahan',different:true},{kind:'raid',filter:'dahan',different:true}]},
 {key:'enheartened',name:'勇気づけられたダハン',effects:[{kind:'dahanMove',optional:true},{kind:'enheartened',different:true},{kind:'enheartened',different:true}]},
 {key:'avoid',name:'ダハンの回避',effects:[{kind:'avoid'},{kind:'avoid'},{kind:'avoid'}]},
 {key:'safety',name:'避難所の探索',effects:[{kind:'seekPush',optional:true},{kind:'seekGather',optional:true},{kind:'health',filter:'noCity',health:3,optional:true}]},
 {key:'interior',name:'内陸の警戒',effects:[{kind:'remove',filter:'inland',types:['explorers']},{kind:'remove',filter:'inland',types:['explorers','towns']},{kind:'remove',types:['explorers','towns']}]},
 {key:'belief',name:'根付いた信仰',effects:[{kind:'belief'},{kind:'belief'},{kind:'health',different:true,presenceHealth:2}]},
 {key:'isolation',name:'隔離',effects:[{kind:'remove',maxInvaders:1,types:['explorers','towns']},{kind:'remove',maxInvaders:2,types:['explorers','towns']},{kind:'remove',maxInvaders:2,types:['explorers','towns','cities']}]},
 {key:'overseas',name:'より安全に見える海外貿易',effects:[{kind:'overseas'},{kind:'overseas'},{kind:'overseas'}]},
 {key:'trade',name:'貿易の損失',effects:[{kind:'trade'},{kind:'downgrade',filter:'coastal',types:['towns'],optional:true},{kind:'downgrade',filter:'coastal',types:['towns','cities'],optional:true}]}
];
// Base-set shared power metadata; descriptions are mechanical summaries.
const SI_SHARED_POWERS=[
 {
  "name": "凶暴な顎の獣",
  "englishName": "Savage Mawbeasts",
  "label": "ジャングル・湿地なら恐怖1と1ダメージ。動物3でさらに1ダメージ。",
  "cost": 0,
  "speed": "slow",
  "elements": [
   "炎",
   "動物"
  ],
  "effect": "program",
  "program": "shared",
  "sharedKey": 0,
  "cardType": "minor",
  "range": 1,
  "sourceSacred": true
 },
 {
  "name": "貪欲な成長",
  "englishName": "Voracious Growth",
  "label": "2ダメージ、または荒廃1つを戻す。",
  "cost": 1,
  "speed": "slow",
  "elements": [
   "水",
   "植物"
  ],
  "effect": "program",
  "program": "shared",
  "sharedKey": 1,
  "cardType": "minor",
  "range": 1,
  "sourceSacred": true,
  "targetTerrains": [
   "ジャングル",
   "湿地"
  ]
 },
 {
  "name": "木々と石の目覚め",
  "englishName": "Rouse the Trees and Stones",
  "label": "2ダメージの後、遠征隊1つを押し出す。",
  "cost": 1,
  "speed": "slow",
  "elements": [
   "炎",
   "大地",
   "植物"
  ],
  "effect": "program",
  "program": "shared",
  "sharedKey": 2,
  "cardType": "minor",
  "range": 1,
  "sourceSacred": true,
  "requiresNoBlight": true
 },
 {
  "name": "包み込む守り",
  "englishName": "Encompassing Ward",
  "label": "対象精霊の存在がある全ての土地に防御2。",
  "cost": 1,
  "speed": "fast",
  "elements": [
   "太陽",
   "水",
   "大地"
  ],
  "effect": "program",
  "program": "shared",
  "sharedKey": 3,
  "cardType": "minor",
  "range": 0,
  "targetSpirit": true
 },
 {
  "name": "清めの歌",
  "englishName": "Song of Sanctity",
  "label": "遠征隊がいれば全て押し出す。いなければ荒廃1つを戻す。",
  "cost": 1,
  "speed": "slow",
  "elements": [
   "太陽",
   "水",
   "植物"
  ],
  "effect": "program",
  "program": "shared",
  "sharedKey": 4,
  "cardType": "minor",
  "range": 1,
  "targetTerrains": [
   "山",
   "ジャングル"
  ]
 },
 {
  "name": "不思議な融解",
  "englishName": "Uncanny Melting",
  "label": "侵略者がいれば恐怖1。砂漠・湿地なら荒廃1つを戻す。",
  "cost": 1,
  "speed": "slow",
  "elements": [
   "太陽",
   "月",
   "水"
  ],
  "effect": "program",
  "program": "shared",
  "sharedKey": 5,
  "cardType": "minor",
  "range": 1,
  "sourceSacred": true
 },
 {
  "name": "燃える森の影",
  "englishName": "Shadows of the Burning Forest",
  "label": "恐怖2。山・ジャングルなら遠征隊1つと町1つを押し出す。",
  "cost": 0,
  "speed": "slow",
  "elements": [
   "月",
   "炎",
   "植物"
  ],
  "effect": "program",
  "program": "shared",
  "sharedKey": 6,
  "cardType": "minor",
  "range": 0,
  "requiresInvaders": true
 },
 {
  "name": "蒸気の噴出",
  "englishName": "Steam Vents",
  "label": "遠征隊1つを破壊。大地3なら代わりに町1つでもよい。",
  "cost": 1,
  "speed": "fast",
  "elements": [
   "炎",
   "風",
   "水",
   "大地"
  ],
  "effect": "program",
  "program": "shared",
  "sharedKey": 7,
  "cardType": "minor",
  "range": 0
 },
 {
  "name": "夜の狩りを隠す",
  "englishName": "Veil the Night's Hunt",
  "label": "ダハンの数まで異なる侵略者に各1ダメージ、またはダハンを最大3つ押し出す。",
  "cost": 1,
  "speed": "fast",
  "elements": [
   "月",
   "風",
   "動物"
  ],
  "effect": "program",
  "program": "shared",
  "sharedKey": 8,
  "cardType": "minor",
  "range": 2,
  "requiresDahan": true
 },
 {
  "name": "元素の恩恵",
  "englishName": "Elemental Boon",
  "label": "異なる元素を3種類選び対象精霊へ与える。他の精霊なら自分も同じ元素を得る。",
  "cost": 1,
  "speed": "fast",
  "elements": [],
  "effect": "program",
  "program": "shared",
  "sharedKey": 9,
  "cardType": "minor",
  "range": 0,
  "targetSpirit": true
 },
 {
  "name": "貪る蟻",
  "englishName": "Devouring Ants",
  "label": "恐怖1。1ダメージ（ジャングル・砂漠では2）。ダハン1つを破壊。",
  "cost": 1,
  "speed": "slow",
  "elements": [
   "太陽",
   "大地",
   "動物"
  ],
  "effect": "program",
  "program": "shared",
  "sharedKey": 10,
  "cardType": "minor",
  "range": 1,
  "sourceSacred": true
 },
 {
  "name": "暗く絡み合う森",
  "englishName": "Dark and Tangled Woods",
  "label": "恐怖2。山・ジャングルなら防御3。",
  "cost": 1,
  "speed": "fast",
  "elements": [
   "月",
   "大地",
   "植物"
  ],
  "effect": "program",
  "program": "shared",
  "sharedKey": 11,
  "cardType": "minor",
  "range": 1
 },
 {
  "name": "大群の力を奪う",
  "englishName": "Sap the Strength of Multitudes",
  "label": "防御5。風1で射程が1延びる。",
  "cost": 0,
  "speed": "fast",
  "elements": [
   "水",
   "動物"
  ],
  "effect": "program",
  "program": "shared",
  "sharedKey": 12,
  "cardType": "minor",
  "range": 0
 },
 {
  "name": "まどろみへ漂う",
  "englishName": "Drift down into Slumber",
  "label": "防御1。ジャングル・砂漠なら代わりに防御4。",
  "cost": 0,
  "speed": "fast",
  "elements": [
   "風",
   "大地",
   "植物"
  ],
  "effect": "program",
  "program": "shared",
  "sharedKey": 13,
  "cardType": "minor",
  "range": 2
 },
 {
  "name": "幽霊と残り火の地",
  "englishName": "Land of Haunts and Embers",
  "label": "恐怖2、遠征隊・町を最大2つ押し出す。荒廃があれば恐怖と上限がそれぞれ2増える。最後に荒廃1つ。",
  "cost": 0,
  "speed": "fast",
  "elements": [
   "月",
   "炎",
   "風"
  ],
  "effect": "program",
  "program": "shared",
  "sharedKey": 14,
  "cardType": "minor",
  "range": 2
 },
 {
  "name": "自然のしなやかさ",
  "englishName": "Nature's Resilience",
  "label": "防御6。水2なら代わりに荒廃1つを戻してもよい。",
  "cost": 1,
  "speed": "fast",
  "elements": [
   "大地",
   "植物",
   "動物"
  ],
  "effect": "program",
  "program": "shared",
  "sharedKey": 15,
  "cardType": "minor",
  "range": 1,
  "sourceSacred": true
 },
 {
  "name": "炎の破滅の幻",
  "englishName": "Visions of Fiery Doom",
  "label": "恐怖1、遠征隊・町1つを押し出す。炎2で恐怖が1増える。",
  "cost": 1,
  "speed": "fast",
  "elements": [
   "月",
   "炎"
  ],
  "effect": "program",
  "program": "shared",
  "sharedKey": 16,
  "cardType": "minor",
  "range": 0
 },
 {
  "name": "飢えた大地に引き込む",
  "englishName": "Pull Beneath the Hungry Earth",
  "label": "自分の存在があれば恐怖1と1ダメージ。砂漠・湿地なら追加1ダメージ。",
  "cost": 1,
  "speed": "slow",
  "elements": [
   "月",
   "水",
   "大地"
  ],
  "effect": "program",
  "program": "shared",
  "sharedKey": 17,
  "cardType": "minor",
  "range": 1
 },
 {
  "name": "ダハンの道への誘い",
  "englishName": "Call of the Dahan Ways",
  "label": "遠征隊1つをダハンに置換。月2なら代わりに町を置換できる。",
  "cost": 1,
  "speed": "slow",
  "elements": [
   "月",
   "水",
   "動物"
  ],
  "effect": "program",
  "program": "shared",
  "sharedKey": 18,
  "cardType": "minor",
  "range": 1,
  "requiresDahan": true
 },
 {
  "name": "流血への呼び声",
  "englishName": "Call to Bloodshed",
  "label": "ダハンの数のダメージ、またはダハンを最大3つ集める。",
  "cost": 1,
  "speed": "slow",
  "elements": [
   "太陽",
   "炎",
   "動物"
  ],
  "effect": "program",
  "program": "shared",
  "sharedKey": 19,
  "cardType": "minor",
  "range": 1,
  "requiresDahan": true
 },
 {
  "name": "孤立への呼び声",
  "englishName": "Call to Isolation",
  "label": "ダハンの数まで遠征隊・町を押し出す、またはダハン1つを押し出す。",
  "cost": 0,
  "speed": "fast",
  "elements": [
   "太陽",
   "風",
   "動物"
  ],
  "effect": "program",
  "program": "shared",
  "sharedKey": 20,
  "cardType": "minor",
  "range": 1,
  "requiresDahan": true
 },
 {
  "name": "移住への呼び声",
  "englishName": "Call to Migrate",
  "label": "ダハンを最大3つ集め、その後最大3つ押し出す。",
  "cost": 1,
  "speed": "slow",
  "elements": [
   "炎",
   "風",
   "動物"
  ],
  "effect": "program",
  "program": "shared",
  "sharedKey": 21,
  "cardType": "minor",
  "range": 1
 },
 {
  "name": "手入れへの呼び声",
  "englishName": "Call to Tend",
  "label": "荒廃1つを戻す、またはダハンを最大3つ押し出す。",
  "cost": 1,
  "speed": "slow",
  "elements": [
   "水",
   "植物",
   "動物"
  ],
  "effect": "program",
  "program": "shared",
  "sharedKey": 22,
  "cardType": "minor",
  "range": 1,
  "requiresDahan": true
 },
 {
  "name": "大地の抵抗を早める",
  "englishName": "Quicken the Earth's Struggles",
  "label": "全ての町・都市に各1ダメージ、または防御10。",
  "cost": 1,
  "speed": "fast",
  "elements": [
   "月",
   "炎",
   "大地",
   "動物"
  ],
  "effect": "program",
  "program": "shared",
  "sharedKey": 23,
  "cardType": "minor",
  "range": 0,
  "sourceSacred": true
 },
 {
  "name": "危険な妄想",
  "englishName": "Delusions of Danger",
  "label": "遠征隊1つを押し出す、または恐怖2。",
  "cost": 1,
  "speed": "fast",
  "elements": [
   "太陽",
   "月",
   "風"
  ],
  "effect": "program",
  "program": "shared",
  "sharedKey": 24,
  "cardType": "minor",
  "range": 1
 },
 {
  "name": "干ばつ",
  "englishName": "Drought",
  "label": "町を3つ破壊した後、残る町・都市に各1ダメージ。荒廃1つ。太陽3で都市1つを破壊。",
  "cost": 1,
  "speed": "slow",
  "elements": [
   "太陽",
   "炎",
   "大地"
  ],
  "effect": "program",
  "program": "shared",
  "sharedKey": 25,
  "cardType": "minor",
  "range": 1
 },
 {
  "name": "不変の贈り物",
  "englishName": "Gift of Constancy",
  "label": "対象へ精霊力2。ラウンド末にプレイしたカード1枚を手札へ戻せる。他の精霊が対象なら自分も1枚戻せる。",
  "cost": 0,
  "speed": "fast",
  "elements": [
   "太陽",
   "大地"
  ],
  "effect": "program",
  "program": "shared",
  "sharedKey": 26,
  "cardType": "minor",
  "range": 0,
  "targetSpirit": true
 },
 {
  "name": "魅惑の輝き",
  "englishName": "Enticing Splendor",
  "label": "遠征隊・町1つ、またはダハンを最大2つ集める。",
  "cost": 0,
  "speed": "fast",
  "elements": [
   "太陽",
   "風",
   "植物"
  ],
  "effect": "program",
  "program": "shared",
  "sharedKey": 27,
  "cardType": "minor",
  "range": 0,
  "requiresNoBlight": true
 },
 {
  "name": "心を奪う幻影",
  "englishName": "Entrancing Apparitions",
  "label": "防御2。侵略者がいなければ遠征隊を最大2つ集める。",
  "cost": 1,
  "speed": "fast",
  "elements": [
   "月",
   "風",
   "水"
  ],
  "effect": "program",
  "program": "shared",
  "sharedKey": 28,
  "cardType": "minor",
  "range": 1
 },
 {
  "name": "生きた力の贈り物",
  "englishName": "Gift of Living Energy",
  "label": "精霊力1を与える。他の精霊なら追加1、自分の聖域が2つ以上ならさらに追加1。",
  "cost": 0,
  "speed": "fast",
  "elements": [
   "太陽",
   "炎",
   "植物"
  ],
  "effect": "program",
  "program": "shared",
  "sharedKey": 29,
  "cardType": "minor",
  "range": 0,
  "targetSpirit": true
 },
 {
  "name": "能力の贈り物",
  "englishName": "Gift of Power",
  "label": "対象精霊が小能力を1枚獲得する。",
  "cost": 0,
  "speed": "slow",
  "elements": [
   "月",
   "水",
   "大地",
   "植物"
  ],
  "effect": "program",
  "program": "shared",
  "sharedKey": 30,
  "cardType": "minor",
  "range": 0,
  "targetSpirit": true
 },
 {
  "name": "根をかじるもの",
  "englishName": "Gnawing Rootbiters",
  "label": "町を最大2つ押し出す。",
  "cost": 0,
  "speed": "slow",
  "elements": [
   "大地",
   "動物"
  ],
  "effect": "program",
  "program": "shared",
  "sharedKey": 31,
  "cardType": "minor",
  "range": 1
 },
 {
  "name": "未知への誘惑",
  "englishName": "Lure of the Unknown",
  "label": "遠征隊・町1つを集める。",
  "cost": 0,
  "speed": "fast",
  "elements": [
   "月",
   "炎",
   "風",
   "植物"
  ],
  "effect": "program",
  "program": "shared",
  "sharedKey": 32,
  "cardType": "minor",
  "range": 2,
  "requiresNoInvaders": true
 },
 {
  "name": "浄化の炎",
  "englishName": "Purifying Flame",
  "label": "荒廃の数のダメージ。山・砂漠では代わりに荒廃1つを戻せる。",
  "cost": 1,
  "speed": "slow",
  "elements": [
   "太陽",
   "炎",
   "風",
   "植物"
  ],
  "effect": "program",
  "program": "shared",
  "sharedKey": 33,
  "cardType": "minor",
  "range": 1,
  "sourceSacred": true
 },
 {
  "name": "血の雨",
  "englishName": "Rain of Blood",
  "label": "恐怖2。町・都市が計2つ以上なら恐怖3。",
  "cost": 0,
  "speed": "slow",
  "elements": [
   "風",
   "水",
   "動物"
  ],
  "effect": "program",
  "program": "shared",
  "sharedKey": 34,
  "cardType": "minor",
  "range": 1,
  "sourceSacred": true,
  "requiresInvaders": true
 },
 {
  "name": "つかむ手を伸ばす",
  "englishName": "Reaching Grasp",
  "label": "対象精霊の能力の射程がこのターン2延びる。",
  "cost": 0,
  "speed": "fast",
  "elements": [
   "太陽",
   "風",
   "水"
  ],
  "effect": "program",
  "program": "shared",
  "sharedKey": 35,
  "cardType": "minor",
  "range": 0,
  "targetSpirit": true
 },
 {
  "name": "腐敗の加速",
  "englishName": "Accelerated Rot",
  "label": "恐怖2と4ダメージ。太陽3・水2・植物3なら追加5ダメージと荒廃1つ除去。",
  "cost": 4,
  "speed": "slow",
  "elements": [
   "太陽",
   "水",
   "植物"
  ],
  "effect": "program",
  "program": "shared",
  "sharedKey": 36,
  "cardType": "major",
  "range": 2,
  "targetTerrains": [
   "ジャングル",
   "湿地"
  ]
 },
 {
  "name": "浄化の洪水",
  "englishName": "Cleansing Floods",
  "label": "4ダメージと荒廃1つ除去。水4なら追加10ダメージ。湿地の存在から射程1。",
  "cost": 5,
  "speed": "slow",
  "elements": [
   "太陽",
   "水"
  ],
  "effect": "program",
  "program": "shared",
  "sharedKey": 37,
  "cardType": "major",
  "range": 1,
  "sourceTerrain": [
   "湿地"
  ]
 },
 {
  "name": "生きた炎の柱",
  "englishName": "Pillar of Living Flame",
  "label": "恐怖3と5ダメージ。ジャングル・湿地なら荒廃1つ。炎4で恐怖+2、ダメージ+5。",
  "cost": 5,
  "speed": "slow",
  "elements": [
   "炎"
  ],
  "effect": "program",
  "program": "shared",
  "sharedKey": 38,
  "cardType": "major",
  "range": 2,
  "sourceSacred": true
 },
 {
  "name": "毒された土地",
  "englishName": "Poisoned Land",
  "label": "恐怖1と7ダメージ。荒廃1つを加え全ダハンを破壊。大地3・植物2・動物2で荒廃の数だけ恐怖+1・追加4ダメージ。",
  "cost": 3,
  "speed": "slow",
  "elements": [
   "大地",
   "植物",
   "動物"
  ],
  "effect": "program",
  "program": "shared",
  "sharedKey": 39,
  "cardType": "major",
  "range": 1
 },
 {
  "name": "恐ろしい悪夢",
  "englishName": "Terrifying Nightmares",
  "label": "恐怖2、遠征隊・町を最大4つ押し出す。月4で恐怖+4。",
  "cost": 4,
  "speed": "fast",
  "elements": [
   "月",
   "風"
  ],
  "effect": "program",
  "program": "shared",
  "sharedKey": 40,
  "cardType": "major",
  "range": 2
 },
 {
  "name": "木々と石が戦を語る",
  "englishName": "The Trees and Stones Speak of War",
  "label": "ダハン1つごとに1ダメージと防御2。太陽2・大地2・植物2なら最大2つ押し出し、その防御も移動。",
  "cost": 2,
  "speed": "fast",
  "elements": [
   "太陽",
   "大地",
   "植物"
  ],
  "effect": "program",
  "program": "shared",
  "sharedKey": 41,
  "cardType": "major",
  "range": 1,
  "requiresDahan": true
 },
 {
  "name": "絡み合う能力",
  "englishName": "Entwined Power",
  "label": "互いの存在から能力を使える。対象が能力1枚を得て、残りから自分も1枚獲得。水2・植物4なら双方精霊力3と手札1枚の交換を選べる。",
  "cost": 2,
  "speed": "fast",
  "elements": [
   "月",
   "水",
   "植物"
  ],
  "effect": "program",
  "program": "shared",
  "sharedKey": 42,
  "cardType": "major",
  "range": 0,
  "targetSpirit": true,
  "targetAnother": true
 },
 {
  "name": "身をすくませる恐怖",
  "englishName": "Paralyzing Fright",
  "label": "恐怖4。このターンの侵略者行動を停止。風2・大地3で恐怖+4。",
  "cost": 4,
  "speed": "fast",
  "elements": [
   "風",
   "大地"
  ],
  "effect": "program",
  "program": "shared",
  "sharedKey": 43,
  "cardType": "major",
  "range": 1,
  "sourceSacred": true
 },
 {
  "name": "能力の嵐",
  "englishName": "Powerstorm",
  "label": "精霊力3と、コストを再度払うカード再使用1回。太陽2・炎2・風3なら計3回。",
  "cost": 3,
  "speed": "fast",
  "elements": [
   "太陽",
   "炎",
   "風"
  ],
  "effect": "program",
  "program": "shared",
  "sharedKey": 44,
  "cardType": "major",
  "range": 0,
  "targetSpirit": true
 },
 {
  "name": "雷の鉤爪",
  "englishName": "Talons of Lightning",
  "label": "恐怖3と5ダメージ。炎3・風3なら射程3、隣接地ごとに町1つ破壊。",
  "cost": 6,
  "speed": "fast",
  "elements": [
   "炎",
   "風"
  ],
  "effect": "program",
  "program": "shared",
  "sharedKey": 45,
  "cardType": "major",
  "range": 1,
  "targetTerrains": [
   "山",
   "湿地"
  ]
 },
 {
  "name": "ジャングルの飢え",
  "englishName": "The Jungle Hungers",
  "label": "遠征隊・町・ダハンを全て破壊。月2・植物3なら都市1つも破壊し、ダハンは破壊しない。",
  "cost": 3,
  "speed": "slow",
  "elements": [
   "月",
   "植物"
  ],
  "effect": "program",
  "program": "shared",
  "sharedKey": 46,
  "cardType": "major",
  "range": 1,
  "sourceTerrain": [
   "ジャングル"
  ]
 },
 {
  "name": "激痛にのたうつ大地",
  "englishName": "The Land Thrashes in Furious Pain",
  "label": "対象の荒廃×2、隣接地の荒廃×1のダメージ。月3・大地3なら隣接地で繰り返す。",
  "cost": 4,
  "speed": "slow",
  "elements": [
   "月",
   "炎",
   "大地"
  ],
  "effect": "program",
  "program": "shared",
  "sharedKey": 47,
  "cardType": "major",
  "range": 2,
  "requiresBlight": true
 },
 {
  "name": "津波",
  "englishName": "Tsunami",
  "label": "恐怖2と8ダメージ、ダハン2つ破壊。水3・大地2なら同じ島の他の沿岸地に恐怖1・4ダメージ・ダハン1つ破壊。",
  "cost": 6,
  "speed": "slow",
  "elements": [
   "水",
   "大地"
  ],
  "effect": "program",
  "program": "shared",
  "sharedKey": 48,
  "cardType": "major",
  "range": 2,
  "sourceSacred": true,
  "requiresCoastal": true
 },
 {
  "name": "夜明けの活力",
  "englishName": "Vigor of the Breaking Dawn",
  "label": "ダハン1つごとに2ダメージ。太陽3・動物2なら最大2つ押し出し、移動先で1つにつき2ダメージ。",
  "cost": 3,
  "speed": "fast",
  "elements": [
   "太陽",
   "動物"
  ],
  "effect": "program",
  "program": "shared",
  "sharedKey": 49,
  "cardType": "major",
  "range": 2,
  "requiresDahan": true
 },
 {
  "name": "死者の復讐",
  "englishName": "Vengeance of the Dead",
  "label": "恐怖3。その後このターンに対象地で町・都市・ダハンが破壊されるたび、その数だけ追加ダメージ。動物3なら隣接地へも割り振れる。",
  "cost": 3,
  "speed": "fast",
  "elements": [
   "月",
   "炎",
   "動物"
  ],
  "effect": "program",
  "program": "shared",
  "sharedKey": 50,
  "cardType": "major",
  "range": 3
 },
 {
  "name": "陽光の翼で包む",
  "englishName": "Wrap in Wings of Sunlight",
  "label": "ダハンを最大5つ、好きな1つの土地へ移し、防御5。太陽2・風2・動物2なら先に最大3つ集める。",
  "cost": 3,
  "speed": "fast",
  "elements": [
   "太陽",
   "風",
   "動物"
  ],
  "effect": "program",
  "program": "shared",
  "sharedKey": 51,
  "cardType": "major",
  "range": 0
 },
 {
  "name": "燃え上がる再生",
  "englishName": "Blazing Renewal",
  "label": "対象精霊の破壊された存在を最大2つ、使用者から距離2の1土地へ戻す。置ければ町・都市に各2ダメージ。炎3・大地3・植物2なら追加4ダメージ。",
  "cost": 5,
  "speed": "fast",
  "elements": [
   "炎",
   "大地",
   "植物"
  ],
  "effect": "program",
  "program": "shared",
  "sharedKey": 52,
 "supportLand": "any",
  "cardType": "major",
  "range": 0,
  "targetSpirit": true
 },
 {
  "name": "錆と萎縮の風",
  "englishName": "Winds of Rust and Atrophy",
  "label": "恐怖1と防御6。都市→町、または町→遠征隊の置換1回。風3・水3・動物2なら繰り返す。",
  "cost": 3,
  "speed": "fast",
  "elements": [
   "風",
   "水",
   "動物"
  ],
  "effect": "program",
  "program": "shared",
  "sharedKey": 53,
  "cardType": "major",
  "range": 3,
  "sourceSacred": true
 },
 {
  "name": "不屈の領有",
  "englishName": "Indomitable Claim",
  "label": "地形制限を無視して存在1つを置き、防御20。太陽2・大地3なら侵略者がいれば恐怖3、このターンの行動停止。",
  "cost": 4,
  "speed": "fast",
  "elements": [
   "太陽",
   "大地"
  ],
  "effect": "program",
  "program": "shared",
  "sharedKey": 54,
  "cardType": "major",
  "range": 1
 },
 {
  "name": "忘却の霧",
  "englishName": "Mists of Oblivion",
  "label": "全侵略者に各1ダメージ。破壊した建物1つにつき追加恐怖1（上限4）。月2・風3・水2なら追加3ダメージ。",
  "cost": 4,
  "speed": "slow",
  "elements": [
   "月",
   "風",
   "水"
  ],
  "effect": "program",
  "program": "shared",
  "sharedKey": 55,
  "cardType": "major",
  "range": 3
 },
 {
  "name": "無限の生命力",
  "englishName": "Infinite Vitality",
  "label": "ダハンの体力+4。対象地への荒廃追加を防ぐ。大地4ならダハンへのダメージと破壊を防ぎ、対象か隣接地の荒廃1つ除去。",
  "cost": 3,
  "speed": "fast",
  "elements": [
   "大地",
   "植物",
   "動物"
  ],
  "effect": "program",
  "program": "shared",
  "sharedKey": 56,
  "cardType": "major",
  "range": 1,
  "sourceSacred": true
 },
 {
  "name": "血縁の絆を溶かす",
  "englishName": "Dissolve the Bonds of Kinship",
  "label": "都市1つ→遠征隊2つ、町1つ・ダハン1つ→各遠征隊1つに置換し、全遠征隊を可能な限り異なる隣接地へ押し出す。炎2・水2・動物3なら先に遠征隊と建物が互いに攻撃。",
  "cost": 4,
  "speed": "slow",
  "elements": [
   "炎",
   "水",
   "動物"
  ],
  "effect": "program",
  "program": "shared",
  "sharedKey": 57,
  "cardType": "major",
  "range": 1
 }
];
// Per-card Unique power programs, including Midnight's Major-Power gain.
// Descriptions summarize the mechanics; printed card text/art is not bundled.
const SI_UNIQUE_POWERS={
 lightning:[
  {name:'開拓地を砕く',englishName:'Shatter Homesteads',label:'恐怖1。町1つを破壊する。聖域から距離2。',effect:'program',program:'shatter',sourceSacred:true,cost:2,elements:['炎','風'],speed:'slow',range:2},
  {name:'荒れ狂う嵐',englishName:'Raging Storm',label:'土地にいる侵略者の各コマに1ダメージ。',effect:'program',program:'storm',cost:3,elements:['炎','風','水'],speed:'slow',range:1},
  {name:'雷の恩恵',englishName:"Lightning's Boon",label:'選んだ精霊の遅い能力を最大2つ、早い能力へ変更する。',effect:'program',program:'lightningBoon',targetSpirit:true,cost:1,elements:['炎','風'],speed:'fast',range:0},
  {name:'稲妻の先触れ',englishName:'Harbingers of the Lightning',label:'ダハンを最大2つ押し出す。建物のある土地へ移動させた場合は恐怖1。',effect:'program',program:'harbingers',cost:0,elements:['炎','風'],speed:'slow',range:1}
 ],
 river:[
  {name:'鉄砲水',englishName:'Flash Floods',label:'1ダメージ。対象地が沿岸なら2ダメージ。',effect:'program',program:'flashFloods',cost:2,elements:['太陽','水'],speed:'fast',range:1},
  {name:'押し流す',englishName:'Wash Away',label:'遠征隊・町を合わせて最大3つ、隣接地へ押し出す。',effect:'program',program:'washAway',cost:1,elements:['水','大地'],speed:'slow',range:1},
  {name:'活力の祝福',englishName:'Boon of Vigor',label:'自分には精霊力1。他の精霊には、このターンに出したカード枚数分の精霊力。',effect:'program',program:'vigor',targetSpirit:true,cost:0,elements:['太陽','水','植物'],speed:'fast',range:0},
  {name:'川の恵み',englishName:"River's Bounty",label:'ダハンを最大2つ集める。2つ以上になればダハン1つと精霊力1を得る。',effect:'program',program:'bounty',cost:0,elements:['太陽','水','動物'],speed:'slow',range:0}
 ],
 earth:[
  {name:'癒しの土地を守る',englishName:'Guard the Healing Land',label:'荒廃を1つカードへ戻し、防御4。聖域から距離1。',effect:'program',program:'healingLand',sourceSacred:true,cost:3,elements:['水','大地','植物'],speed:'fast',range:1},
  {name:'完全なる静寂の一年',englishName:'A Year of Perfect Stillness',label:'このターン、対象地の侵略者の行動をすべて停止する。',effect:'program',program:'stillness',cost:3,elements:['太陽','大地'],speed:'fast',range:1},
  {name:'破壊の儀式',englishName:'Rituals of Destruction',label:'ダハンのいる土地に2ダメージ。ダハン3つ以上なら計5ダメージと恐怖2。聖域から距離1。',effect:'program',program:'rituals',sourceSacred:true,requiresDahan:true,cost:3,elements:['太陽','月','炎','大地','植物'],speed:'slow',range:1},
  {name:'実り豊かな大地の誘い',englishName:'Draw of the Fruitful Earth',label:'隣接地から遠征隊を最大2つ、ダハンを最大2つ集める。',effect:'program',program:'fruitful',cost:1,elements:['大地','植物','動物'],speed:'slow',range:1}
 ],
 shadows:[
  {name:'覆い隠す影',englishName:'Concealing Shadows',label:'恐怖1。この土地のダハンは、このターンの荒廃でダメージを受けない。',effect:'program',program:'concealing',cost:0,elements:['月','風'],speed:'fast',range:0},
  {name:'恩義への報い',englishName:'Favors Called Due',label:'ダハンを最大4つ集める。侵略者がいて、ダハンがその数を上回れば恐怖3。',effect:'program',program:'favors',move:{direction:'gather',types:['dahan'],limit:4},cost:1,elements:['月','風','動物'],speed:'slow',range:1},
  {name:'恐怖の外套',englishName:'Mantle of Dread',label:'恐怖2。対象精霊の存在がある土地1つから、遠征隊1つと町1つを押し出せる。',effect:'program',program:'mantle',targetSpirit:true,supportLand:'presence',move:{direction:'push',types:['explorers','towns'],limits:{explorers:1,towns:1}},cost:1,elements:['月','炎','風'],speed:'slow',range:0},
  {name:'作物の枯死',englishName:'Crops Wither and Fade',label:'恐怖2。町1つを遠征隊へ、または都市1つを町へ置き換える。',effect:'program',program:'crops',replaceTypes:['towns','cities'],cost:1,elements:['月','炎','植物'],speed:'slow',range:0}
 ],
 green:[
  {name:'一夜の成長',englishName:'Overgrow in a Night',label:'存在を1つ配置。または、対象地に自分の存在と侵略者がいれば恐怖3。',effect:'program',program:'overgrow',modes:[{id:'presence',name:'存在を置く',presence:true},{id:'fear',name:'恐怖3'}],cost:2,elements:['月','植物'],speed:'fast',range:1},
  {name:'増殖の祝福',englishName:'Gift of Proliferation',label:'別の精霊が、自分の存在から距離1以内に存在を1つ配置する。1人プレイでは自分を対象にできる。',effect:'program',program:'proliferation',targetSpirit:true,targetAnother:true,supportLand:'range1',presence:true,cost:1,elements:['月','植物'],speed:'fast',range:0},
  {name:'緑に覆われた畑',englishName:'Fields Choked with Growth',label:'町1つ、またはダハンを最大3つ押し出す。',effect:'program',program:'fields',modes:[{id:'town',name:'町を押し出す',move:{direction:'push',types:['towns'],limit:1}},{id:'dahan',name:'ダハンを押し出す',move:{direction:'push',types:['dahan'],limit:3}}],cost:0,elements:['太陽','水','植物'],speed:'slow',range:1},
  {name:'清水の流れを止める',englishName:'Stem the Flow of Fresh Water',label:'町または都市1つに1ダメージ。山・砂漠なら全ての町と都市にそれぞれ1ダメージ。聖域から距離1。',effect:'program',program:'stem',sourceSacred:true,cost:0,elements:['水','植物'],speed:'slow',range:1}
 ],
 thunderspeaker:[
  {name:'力と栄光の顕現',englishName:'Manifestation of Power and Glory',label:'恐怖1。ダハンの数×自分の存在数のダメージ。ダハンのいる土地が対象。',effect:'program',program:'manifestation',requiresDahan:true,damageFormula:'manifestation',cost:3,elements:['太陽','炎','風'],speed:'slow',range:0},
  {name:'警告の言葉',englishName:'Words of Warning',label:'防御3。荒廃時、対象地のダハンは侵略者と同時にダメージを与える。',effect:'program',program:'warning',requiresDahan:true,cost:1,elements:['太陽','風','動物'],speed:'fast',range:1},
  {name:'不意の襲撃',englishName:'Sudden Ambush',label:'ダハンを最大1つ集める。その後、ダハンの数だけ遠征隊を破壊する。',effect:'program',program:'ambush',move:{direction:'gather',types:['dahan'],limit:1},cost:2,elements:['炎','風','動物'],speed:'fast',range:1},
  {name:'雷鳴の声',englishName:'Voice of Thunder',label:'ダハンを最大4つ押し出す。または、侵略者がいれば恐怖2。',effect:'program',program:'voice',modes:[{id:'push',name:'ダハンを押し出す',move:{direction:'push',types:['dahan'],limit:4}},{id:'fear',name:'恐怖2'}],cost:0,elements:['太陽','風'],speed:'slow',range:1}
 ],
 bringer:[
  {name:'捕食者の悪夢',englishName:'Predatory Nightmares',label:'2ダメージ相当の悪夢。その後、ダハンを最大2つ押し出す。聖域から距離1。',effect:'program',program:'predatory',sourceSacred:true,requiresInvaders:true,move:{direction:'push',types:['dahan'],limit:2},cost:2,elements:['月','炎','大地','動物'],speed:'slow',range:1},
  {name:'恐ろしい幻影',englishName:'Dread Apparitions',label:'このターン、能力が対象地に恐怖を与えるたび、その恐怖の数だけ防御を得る。恐怖1。',effect:'program',program:'dread',requiresInvaders:true,cost:2,elements:['月','風'],speed:'fast',range:1},
  {name:'真夜中の夢への呼びかけ',englishName:"Call on Midnight's Dream",label:'恐怖2、またはダハンのいる土地で大能力を獲得。この能力自身を忘れればダハンの数の精霊力を得て、大能力を直ちにプレイできる。',effect:'program',program:'midnight',requiresDahanOrInvaders:true,modes:[{id:'fear',name:'侵略者がいれば恐怖2'},{id:'major',name:'ダハンがいれば大能力を獲得'}],cost:0,elements:['月','動物'],speed:'fast',range:0},
  {name:'ダハンの夢',englishName:'Dreams of the Dahan',label:'ダハンを最大2つ集める。または、建物があればダハンの数だけ恐怖（最大3）。',effect:'program',program:'dreams',modes:[{id:'gather',name:'ダハンを集める',move:{direction:'gather',types:['dahan'],limit:2}},{id:'fear',name:'建物のある土地に恐怖を与える'}],cost:0,elements:['月','風'],speed:'fast',range:2}
 ],
 ocean:[
  {name:'深みからの呼び声',englishName:'Call of the Deeps',label:'隣接地から遠征隊を1つ集める。対象が海なら、さらに1つ集められる。海に入った侵略者は溺没する。',effect:'program',program:'deeps',requiresCoastal:true,move:{direction:'gather',types:['explorers'],limit:2,required:1},cost:0,elements:['月','風','水'],speed:'fast',range:0},
  {name:'つかむ潮流',englishName:'Grasping Tide',label:'恐怖2と防御4。沿岸が対象。',effect:'program',program:'grasping',requiresCoastal:true,cost:1,elements:['月','水'],speed:'fast',range:1},
  {name:'陸の者を呑む',englishName:'Swallow the Land-Dwellers',label:'対象地の遠征隊・町・ダハンを、それぞれ1つ溺没させる。沿岸が対象。',effect:'program',program:'swallow',requiresCoastal:true,cost:0,elements:['水','大地'],speed:'slow',range:0},
  {name:'潮汐の恩恵',englishName:'Tidal Boon',label:'別の精霊が精霊力2を得る。その存在のある土地から町1つとダハン最大2つを押し出せる。ダハンは海を経由して別の沿岸へ移動できる。',effect:'program',program:'tidal',targetSpirit:true,targetAnother:true,supportLand:'presence',move:{direction:'push',types:['towns','dahan'],limits:{towns:1,dahan:2},rescueOcean:true},cost:1,elements:['月','水','大地'],speed:'slow',range:0}
 ]
};
// Printed base-set innate thresholds. Each innate is available once per turn;
// repeated innate instances are separate immediate actions.
const SI_INNATES={
 lightning:{name:'雷鳴のごとき破壊',needs:{炎:3,風:2},effect:'program',program:'shared',sharedKey:58,sourceSacred:true,label:'町1つを破壊。上の元素条件を満たすほど、都市への変更や追加の建物破壊を行える。',range:1,speed:'slow'},
 river:{name:'大洪水',needs:{太陽:1,水:2},effect:'program',program:'shared',sharedKey:59,sourceSacred:true,label:'遠征隊・町1つを押し出す。太陽2・水3で2ダメージと最大3つ押し出し。太陽3・水4・大地1で代わりに全侵略者へ各2ダメージ。',range:1,speed:'slow'},
 earth:{name:'力の贈り物',needs:{太陽:1,大地:2,植物:2},effect:'program',program:'shared',sharedKey:60,targetSpirit:true,label:'対象精霊はコスト1以下の能力カードを1回、無料で繰り返せる。太陽2・大地3・植物2で上限3、太陽2・大地4・植物3で上限6。',range:0,speed:'fast'},
 shadows:{name:'闇が不用心な者を呑む',needs:{月:2,炎:1},effect:'program',program:'shared',sharedKey:61,sourceSacred:true,label:'遠征隊1つを集める。月3・炎2で遠征隊を最大2つ破壊し各恐怖1。月4・炎3・風2でさらに3ダメージと破壊した侵略者ごとに恐怖1。',range:1,speed:'fast'},
 green:{name:'蔓が石造りを引き裂く',needs:{月:1,植物:2},effect:'program',program:'shared',sharedKey:62,label:'町・都市1つに1ダメージ。月2・植物3で直ちに1回、月3・植物4でさらに1回繰り返す。',range:0,speed:'slow'},
 thunderspeaker:{name:'戦士を集める',needs:{動物:1},effect:'program',program:'shared',sharedKey:64,label:'風の数までダハンを集め、太陽の数まで押し出す。風4で早い能力にできる。',range:1,speed:'slow'},
 bringer:{name:'精霊はなお夢を見る',needs:{月:2,風:2},activationAny:[{月:2,風:2},{月:3}],effect:'program',program:'shared',sharedKey:66,targetSpirit:true,label:'月2・風2なら伏せた恐怖カード1枚を公開。月3なら対象精霊が既に持つ元素を1つ追加。',range:0,speed:'fast'},
 ocean:{name:'船を粉々に砕く',needs:{月:1,風:1,水:2},effect:'program',program:'shared',sharedKey:68,requiresCoastal:true,label:'恐怖1。月2・風1・水3で追加恐怖1。月3・風2・水4でさらに恐怖2。',range:0,speed:'fast'}
};
const SI_SECOND_INNATES={
 green:{name:'全てを覆う緑',needs:{水:1,植物:3},effect:'program',program:'shared',sharedKey:63,sourceSacred:true,label:'防御2。水2・植物4なら代わりに防御4。水3・大地1・植物5ならさらに荒廃1つを戻す。',range:1,speed:'fast'},
 thunderspeaker:{name:'激しい襲撃を率いる',needs:{太陽:2,炎:1},effect:'program',program:'shared',sharedKey:65,label:'ダハン2つごとに町1つを破壊。太陽4・炎3ならダハン3つごとに都市1つも破壊。風4で早い能力にできる。',range:0,speed:'slow'},
 bringer:{name:'夜の恐怖',needs:{月:1,風:1},effect:'program',program:'shared',sharedKey:67,requiresInvaders:true,label:'恐怖1。月2・風1・動物1で追加恐怖1。月3・風2・動物1でさらに恐怖1。',range:0,speed:'fast'},
 ocean:{name:'海が岸を砕く',needs:{水:2,大地:1},effect:'program',program:'shared',sharedKey:69,requiresCoastal:true,label:'町1つを呑み込む。水3・大地2なら代わりに都市でもよい。水4・大地3ならさらに町・都市1つを呑み込む。',range:0,speed:'slow'}
};
function siInnateCard(p,id='innate'){const spec=id==='innate2'?SI_SECOND_INNATES[p.spirit]:SI_INNATES[p.spirit];if(!spec||(id==='innate2'?p.secondaryInnateUsed:p.innateUsed))return null;const elements=siElementCounts(p),met=needs=>Object.entries(needs).every(([e,n])=>(elements[e]||0)>=n);if(!(spec.activationAny?spec.activationAny.some(met):met(spec.needs)))return null;return{id,...spec,playSpeed:(id==='innate'&&p.fastInnate||(p.fastInnateIds||[]).includes(id))?'fast':spec.speed,cost:0,element:Object.entries(spec.needs).map(([e,n])=>`${e}${n}`).join('・'),cardType:'innate',ready:true,used:false};}
function siInnateCards(p){return ['innate','innate2'].map(id=>siInnateCard(p,id)).filter(Boolean).map(c=>p.blitz?{...c,playSpeed:'fast'}:c);}
// Presence tracks use the values visible on the spirit board: only the latest
// uncovered energy/card-play value applies. The first four spirits are the
// low-complexity base-game spirits. Symbol-only spaces repeat the last value;
// their elements and reclaim abilities are handled separately.
const SI_TRACKS={
 lightning:{energy:[1,1,2,2,3,4,4,5],plays:[2,3,4,5,6]},
 river:{energy:[1,2,2,3,4,4,5],plays:[1,2,2,3,3,4,5]},
 earth:{energy:[2,3,4,6,7,8],plays:[1,1,2,2,3,4]},
 shadows:{energy:[0,1,3,4,5,6],plays:[1,2,3,3,4,5]},
 green:{energy:[0,1,1,2,2,2,3],plays:[1,1,2,2,3,4]},
 thunderspeaker:{energy:[1,1,2,2,2,3],plays:[1,2,2,3,3,3,4]},
 bringer:{energy:[2,2,3,3,4,4,5],plays:[2,2,2,3,3,3]},
 ocean:{energy:[0,0,0,1,1,1,2],plays:[1,2,2,3,4,5]}
};
const SI_GROWTH={
 lightning:[
  {name:'回収・能力獲得・精霊力+1',effects:[{kind:'reclaim'},{kind:'gain'},{kind:'energy',amount:1}]},
  {name:'存在2つ（距離2・距離0）',effects:[{kind:'presence',range:2},{kind:'presence',range:0}]},
  {name:'存在1つ（距離1）・精霊力+3',effects:[{kind:'presence',range:1},{kind:'energy',amount:3}]}
 ],
 river:[
  {name:'回収・能力獲得・精霊力+1',effects:[{kind:'reclaim'},{kind:'gain'},{kind:'energy',amount:1}]},
  {name:'存在2つ（距離1）',effects:[{kind:'presence',range:1},{kind:'presence',range:1}]},
  {name:'存在1つ（距離2）・能力獲得',effects:[{kind:'presence',range:2},{kind:'gain'}]}
 ],
 earth:[
  {name:'回収・存在1つ（距離2）',effects:[{kind:'reclaim'},{kind:'presence',range:2}]},
  {name:'能力獲得・存在1つ（距離0）',effects:[{kind:'gain'},{kind:'presence',range:0}]},
  {name:'存在1つ（距離1）・精霊力+2',effects:[{kind:'presence',range:1},{kind:'energy',amount:2}]}
 ],
 shadows:[
  {name:'回収・能力獲得',effects:[{kind:'reclaim'},{kind:'gain'}]},
  {name:'能力獲得・存在1つ（距離1）',effects:[{kind:'gain'},{kind:'presence',range:1}]},
  {name:'存在1つ（距離3）・精霊力+3',effects:[{kind:'presence',range:3},{kind:'energy',amount:3}]}
 ],
 green:[{name:'必ず存在を配置・回収・能力獲得',effects:[{kind:'presence',range:2,targetTerrains:['ジャングル','湿地']},{kind:'reclaim'},{kind:'gain'}]},{name:'必ず存在を配置・追加配置・カードプレイ+1',effects:[{kind:'presence',range:2,targetTerrains:['ジャングル','湿地']},{kind:'presence',range:1},{kind:'cardPlay',amount:1}]},{name:'必ず存在を配置・能力獲得・精霊力+3',effects:[{kind:'presence',range:2,targetTerrains:['ジャングル','湿地']},{kind:'gain'},{kind:'energy',amount:3}]}],
 thunderspeaker:[{name:'回収・能力を2回獲得',effects:[{kind:'reclaim'},{kind:'gain'},{kind:'gain'}]},{name:'存在2つ（距離2・距離1）',effects:[{kind:'presence',range:2,requiresDahan:true},{kind:'presence',range:1,requiresDahan:true}]},{name:'存在1つ（距離1）・精霊力+4',effects:[{kind:'presence',range:1},{kind:'energy',amount:4}]}],
 bringer:[{name:'回収・能力獲得',effects:[{kind:'reclaim'},{kind:'gain'}]},{name:'回収1枚・存在1つ（距離0）',effects:[{kind:'reclaimOne'},{kind:'presence',range:0}]},{name:'能力獲得・存在1つ（距離1）',effects:[{kind:'gain'},{kind:'presence',range:1}]},{name:'ダハンか侵略者の土地へ存在（距離4）・精霊力+2',effects:[{kind:'presence',range:4,requiresDahanOrInvaders:true},{kind:'energy',amount:2}]}],
 ocean:[{name:'引き潮：回収・能力獲得・精霊力+2・各海域へ存在を集める',effects:[{kind:'reclaim'},{kind:'gain'},{kind:'energy',amount:2},{kind:'oceanGather'}]},{name:'満ちる前：任意の海域へ存在2つ・精霊力+1',effects:[{kind:'presence',onlyOcean:true,anyRange:true},{kind:'presence',onlyOcean:true,anyRange:true},{kind:'energy',amount:1}]},{name:'満ち潮：能力獲得・沿岸へ存在（距離1）・各海域から存在を押し出す',effects:[{kind:'gain'},{kind:'presence',range:1,onlyCoastal:true},{kind:'oceanPush'}]}]
};
const SI_TRACK_ELEMENTS={green:{energy:[{at:2,element:'植物'},{at:5,element:'植物'}]},thunderspeaker:{energy:[{at:1,element:'風'},{at:3,element:'炎'},{at:4,element:'太陽'}]},bringer:{energy:[{at:1,element:'風'},{at:3,element:'月'},{at:5,element:'any'}],plays:[{at:5,element:'any'}]},ocean:{energy:[{at:1,element:'月'},{at:2,element:'水'},{at:4,element:'大地'},{at:5,element:'水'}]}};
function siGrowthTargets(g,p,e){const nodes=e.onlyOcean?g.oceans||[]:g.lands;return nodes.filter(l=>(!e.targetTerrains||e.targetTerrains.includes(l.terrain))&&(!e.requiresDahan||l.dahan>0)&&(!e.requiresDahanOrInvaders||l.dahan+totalInvaders(l)>0)&&(!e.onlyCoastal||l.coastal)&&((e.onlyOcean&&e.anyRange)||siAllNodes(g).some(from=>{if(!from.presenceOwners.includes(p.id))return false;const allowed=[...g.lands,...(from.isOcean?[from]:[])],seen=new Set([from.id]),q=[[from.id,0]];while(q.length){const [id,d]=q.shift();if(id===l.id)return d<=e.range;if(d>=e.range)continue;const node=allowed.find(n=>n.id===id);for(const next of node?.neighbors||[])if(!seen.has(next)&&allowed.some(n=>n.id===next)){seen.add(next);q.push([next,d+1]);}}return false;})));}
function siGrowthOceanOptions(g,p,e){if(!['oceanGather','oceanPush'].includes(e.kind))return[];return(g.oceans||[]).map(sea=>({oceanId:sea.id,candidates:e.kind==='oceanGather'?g.lands.filter(l=>siAdjacent(l,sea)&&l.presenceOwners.includes(p.id)).map(l=>l.id):sea.presenceOwners.includes(p.id)?g.lands.filter(l=>siAdjacent(sea,l)).map(l=>l.id):[]})).filter(x=>x.candidates.length);}
// A thematic coastal land can border two Oceans. Reserve every source Presence
// before moving any, so one token cannot be gathered into both at once.
function siApplyOceanGrowth(g,p,e,a){const options=siGrowthOceanOptions(g,p,e),remaining=new Map(g.lands.map(l=>[l.id,l.presenceOwners.filter(id=>id===p.id).length])),moves=[];for(const o of options){const id=a.oceanChoices?.[o.oceanId];if(!id&&e.kind==='oceanGather')continue;if(!o.candidates.includes(id))throw Error('海域へ集める元の土地、または押し出す先を選んでください。');const sea=g.oceans.find(l=>l.id===o.oceanId),coast=g.lands.find(l=>l.id===id);if(e.kind==='oceanGather'){if(remaining.get(id)<1)throw Error('同じ存在を複数の海域へ集めることはできません。');remaining.set(id,remaining.get(id)-1);moves.push([coast,sea]);}else moves.push([sea,coast]);}if(e.kind==='oceanGather')for(const o of options)if(!a.oceanChoices?.[o.oceanId]&&o.candidates.some(id=>remaining.get(id)>0))throw Error('集められる存在が残っている海域の配置先を選んでください。');for(const [from,to] of moves){const index=from.presenceOwners.indexOf(p.id);if(index<0)throw Error('移動する存在の状態を確認してください。');from.presenceOwners.splice(index,1);from.presence=from.presenceOwners.length;to.presenceOwners.push(p.id);to.presence=to.presenceOwners.length;}}
function siGrowthPresence(g,p,e,a){const legal=siGrowthTargets(g,p,e);if(!legal.length)return;const land=legal.find(l=>l.id===a.landId);if(!land)throw Error('成長で存在を置ける土地を選んでください。');if(a.fromId==='destroyed'){if(p.spirit!=='green'||!p.destroyedPresence||g.blightFlipped&&p.energy<1)throw Error('再生する存在か精霊力がありません。');p.destroyedPresence--;if(g.blightFlipped)p.energy--;land.presenceOwners.push(p.id);land.presence=land.presenceOwners.length;}else if(a.fromId){const from=siAllNodes(g).find(l=>l.id===a.fromId&&l.presenceOwners.includes(p.id));if(!from)throw Error('移動する存在を選んでください。');from.presenceOwners.splice(from.presenceOwners.indexOf(p.id),1);from.presence=from.presenceOwners.length;land.presenceOwners.push(p.id);land.presence=land.presenceOwners.length;}else if(!siAddPresence(land,p,a.track==='plays'?'plays':'energy'))throw Error('残りのある存在トラックを選ぶか、島の存在を移動してください。');}
function siPerformGrowthEffect(g,p,e,a,gainOptions={}){if(e.kind==='presence')siGrowthPresence(g,p,e,a.placement||a);else if(e.kind==='energy')p.energy+=e.amount;else if(e.kind==='cardPlay')p.extraCardPlays=(p.extraCardPlays||0)+e.amount;else if(e.kind==='reclaim'){p.discard.forEach(c=>{c.ready=false;c.used=false;delete c.playSpeed;delete c.blitzAccelerated;});p.hand.push(...p.discard);p.discard=[];}else if(e.kind==='reclaimOne'){if(!p.discard.length)return;const i=p.discard.findIndex(c=>c.id===(a.cardId||a.reclaimCardId));if(i<0)throw Error('回収する能力を選んでください。');const c=p.discard.splice(i,1)[0];c.ready=false;c.used=false;delete c.playSpeed;delete c.blitzAccelerated;p.hand.push(c);}else if(e.kind==='gain'){siBeginPowerGain(g,p,gainOptions);p.growthPending=true;}else if(['oceanGather','oceanPush'].includes(e.kind))siApplyOceanGrowth(g,p,e,a);else throw Error('未知の成長効果です。');}
function siFinishGrowthSteps(g,p){if(p.growthState?.effects.length||(g.powerGains||[]).some(t=>t.playerId===p.id))return;p.growthState=null;p.growthPending=false;if(siSetReady(g,p))siProgress(g);}
function siTrackRemaining(p){const track=SI_TRACKS[p.spirit]||{energy:[1],plays:[1]};return{energy:Math.max(0,track.energy.length-1-(p.energyTrack||0)),plays:Math.max(0,track.plays.length-1-(p.playTrack||0))};}
function siTrackAnyOptions(p){return Object.entries(SI_TRACK_ELEMENTS[p.spirit]||{}).flatMap(([track,items])=>items.filter(item=>item.element==='any'&&(track==='energy'?p.energyTrack||0:p.playTrack||0)>=item.at&&!p.trackElementChoices?.[track+':'+item.at]).map(item=>track+':'+item.at));}
function siTrackCanReclaim(p){return ['river','thunderspeaker'].includes(p.spirit)&&(p.playTrack||0)>=4&&!p.trackReclaimUsed;}
function siElementCounts(p){const out={...(p.elementGifts||{})};for(const c of p.hand||[])if(c.ready&&!c.repeatOf)for(const e of c.elements||[c.element])out[e]=(out[e]||0)+1;for(const [track,items] of Object.entries(SI_TRACK_ELEMENTS[p.spirit]||{}))for(const item of items)if((track==='energy'?p.energyTrack||0:p.playTrack||0)>=item.at){const e=item.element==='any'?p.trackElementChoices?.[track+':'+item.at]:item.element;if(e)out[e]=(out[e]||0)+1;}return out;}
function siTrackValue(p,track){const values=SI_TRACKS[p.spirit]?.[track]||[1,2,2,3,4,4,5,6];const index=track==='energy'?p.energyTrack||0:p.playTrack||0;return(values[Math.min(index,values.length-1)]??1)+(track==='plays'?p.extraCardPlays||0:0);}
function siPlayer(name){const n=cleanName(name);if(!n)throw Error('名前を入力してください。');return{id:crypto.randomUUID(),token:crypto.randomUUID(),name:n,spirit:null,energy:1,presence:12,hand:[],discard:[],played:[],ready:false,score:0,powerOffers:[]};}
function siAllNodes(g){return [...(g.lands||[]),...(g.oceans||[])];}
function siPowerLands(g){return [...(g.lands||[]),...(g.oceans||[]).filter(l=>siOceanOnBoard(g,l.board))];}
function siCreateOceans(g){g.oceans=[];const owner=g.players.find(p=>p.spirit==='ocean');if(!owner)return;for(const board of g.players){const zone={...siLand('ocean:'+board.id,'湿地',board.id,-1),coastal:true,isOcean:true};zone.neighbors=g.lands.filter(l=>l.board===board.id&&l.coastal).map(l=>l.id);for(const l of g.lands.filter(l=>zone.neighbors.includes(l.id)))l.neighbors.push(zone.id);if(board.id===owner.id){zone.presenceOwners=[owner.id];zone.presence=1;}g.oceans.push(zone);}if(g.islandMap==='thematic'){const ne=g.players.find(p=>p.islandBoard==='NE'),east=g.players.find(p=>p.islandBoard==='E'),sea=g.oceans.find(l=>l.board===ne?.id),land=g.lands.find(l=>l.board===east?.id&&l.index===0);if(sea&&land){sea.neighbors.push(land.id);land.neighbors.push(sea.id);}}}
function siLand(id,terrain,board,index){return{id,board,terrain,index,coastal:index<3,neighbors:[],explorers:0,towns:0,cities:0,invaderDamage:{explorers:[],towns:[],cities:[]},dahan:0,dahanDamage:[],presence:0,presenceOwners:[],blight:0,defend:0};}
// Balanced board facts transcribed from the A–D board references. Land numbers
// are one-based; touching at a single corner also creates adjacency.
const SI_BOARD_EDGES={"A":[[[8,0,0.44794],[6,0.44794,0.7485],[1,0.7485,1]],[[3,0,0.45251],[4,0.45251,0.75577],[5,0.75577,0.87445],[7,0.87445,1]],[[8,0,0.39063],[7,0.39063,1]]],"B":[[[8,0,0.44931],[6,0.44931,0.876],[1,0.876,1]],[[3,0,0.61014],[4,0.61014,0.88074],[7,0.88074,1]],[[8,0,0.38329],[7,0.38329,1]]],"C":[[[8,0,0.43362],[6,0.43362,0.73741],[1,0.73741,1]],[[3,0,0.45915],[4,0.45915,1]],[[8,0,0.54107],[7,0.54107,0.79593],[4,0.79593,1]]],"D":[[[8,0,0.17396],[1,0.17396,1]],[[3,0,0.31655],[4,0.31655,0.75784],[6,0.75784,1]],[[8,0,0.38476],[7,0.38476,0.80675],[6,0.80675,1]]]};
const SI_LAND_ANCHORS={"B":[[0.5781,-0.6865],[1.0824,0.2186],[1.2629,1.0175],[0.2469,0.4408],[-0.2154,-0.0627],[-0.6577,-0.6965],[-0.9025,0.471],[-1.4397,-0.9801]],"D":[[-0.0678,-0.9864],[0.9532,0.0541],[1.612,0.9362],[0.5208,0.8223],[-0.1077,-0.2454],[-0.47,0.6146],[-1.0343,-0.1381],[-1.552,-0.8906]],"C":[[0.4862,-0.7819],[1.0206,0.2669],[1.4925,1.016],[-0.001,0.8844],[-0.0258,0.0915],[-0.5369,-0.7419],[-1.0337,0.0988],[-1.5032,-0.999]],"A":[[0.4258,-0.6],[1.1837,0.139],[1.53,1.0018],[0.4108,0.5831],[-0.3297,0.4354],[-0.3288,-0.7477],[-0.9379,0.4803],[-1.2902,-0.8826]]};
const SI_STANDARD_LAYOUTS={1:[[0,0,0]],2:[[-6.57,16.92,0],[3.40,34.30,180]],3:[[-6.47,25.50,120],[8.78,34.19,240],[8.70,16.73,0]],4:[[17.54,16.10,0],[27.60,33.53,0],[7.48,33.72,180],[-2.58,16.31,180]]};
const SI_HEART_TWO_LAYOUT=[[-5.11,20.91,180],[15.08,20.79,0]];
const SI_BOARD_VERTICES=[[-2.25,-1.3],[.75,-1.3],[2.25,1.3],[-.75,1.3]],SI_EDGE_VERTICES=[[0,1],[2,3],[0,3]];
function siMapPoint(layout,point){const [x,z,rotation]=layout,c=Math.cos(rotation*Math.PI/180),s=Math.sin(rotation*Math.PI/180);return[x+6.65*(c*point[0]+s*point[1]),z+6.65*(-s*point[0]+c*point[1])];}
function siJoinBoards(players,lands,options={}){const layout=players.length===2&&options.heart?SI_HEART_TWO_LAYOUT:SI_STANDARD_LAYOUTS[players.length],near=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])<.5,connect=(a,b)=>{if(!a.neighbors.includes(b.id))a.neighbors.push(b.id);if(!b.neighbors.includes(a.id))b.neighbors.push(a.id);},own=players.map(p=>lands.filter(l=>l.board===p.id)),corners=players.map(p=>[8,1,3,{A:7,B:7,C:4,D:6}[p.islandBoard]]),vertices=layout.map(l=>SI_BOARD_VERTICES.map(v=>siMapPoint(l,v)));players.forEach((p,i)=>{p.mapLayout=layout[i];p.mapVertices=vertices[i];for(const l of own[i]){const [x,y]=siMapPoint(layout[i],SI_LAND_ANCHORS[p.islandBoard][l.index]);l.mapX=x;l.mapY=y;}});for(let i=0;i<players.length;i++)for(let j=i+1;j<players.length;j++){for(let a=0;a<4;a++)for(let b=0;b<4;b++)if(near(vertices[i][a],vertices[j][b]))connect(own[i][corners[i][a]-1],own[j][corners[j][b]-1]);for(let a=0;a<3;a++)for(let b=0;b<3;b++){const [a0,a1]=SI_EDGE_VERTICES[a],[b0,b1]=SI_EDGE_VERTICES[b],same=near(vertices[i][a0],vertices[j][b0])&&near(vertices[i][a1],vertices[j][b1]),reverse=near(vertices[i][a0],vertices[j][b1])&&near(vertices[i][a1],vertices[j][b0]);if(!same&&!reverse)continue;for(const [landA,lo,hi] of SI_BOARD_EDGES[players[i].islandBoard][a])for(const [landB,blo,bhi] of SI_BOARD_EDGES[players[j].islandBoard][b]){const low=reverse?1-bhi:blo,high=reverse?1-blo:bhi;if(Math.max(lo,low)<=Math.min(hi,high)+1e-6)connect(own[i][landA-1],own[j][landB-1]);}}}}

const SI_BOARD_LAYOUTS={
 A:{terrains:['山','湿地','ジャングル','砂漠','湿地','山','砂漠','ジャングル'],neighbors:[[2,4,5,6],[1,3,4],[2,4],[1,2,3,5],[1,4,6,7,8],[1,5,8],[5,8],[5,6,7]]},
 B:{terrains:['湿地','山','砂漠','ジャングル','砂漠','湿地','山','ジャングル'],neighbors:[[2,4,5,6],[1,3,4],[2,4],[1,2,3,5,7],[1,4,6,7],[1,5,7,8],[4,5,6,8],[6,7]]},
 C:{terrains:['ジャングル','砂漠','山','ジャングル','湿地','砂漠','山','湿地'],neighbors:[[2,5,6],[1,3,4,5],[2,4],[2,3,5,7],[1,2,4,6,7],[1,5,7,8],[4,5,6,8],[6,7]]},
 D:{terrains:['湿地','ジャングル','湿地','砂漠','山','ジャングル','砂漠','山'],neighbors:[[2,5,7,8],[1,3,4,5],[2,4],[2,3,5,6],[1,2,4,6,7],[4,5,7],[1,5,6,8],[1,7]]}
};
const SI_BOARD_SETUP=[{id:'A',dahan:[0,1,2,0,0,1,2,0],town:8,blight:4},{id:'B',dahan:[1,0,2,0,0,0,1,2],town:6,blight:4},{id:'C',dahan:[1,0,2,0,2,1,0,0],town:7,blight:5},{id:'D',dahan:[2,1,0,0,1,0,2,0],town:7,blight:5}];
// Thematic board facts, transcribed from the original board references.
// Only the recommended base-game 1–4 board sets are supported (no expansion tokens).
const SI_THEMATIC_BOARDS={"NE":{"lands":[{"number":1,"terrain":"砂漠","coastal":true,"neighbors":[2,5],"explorers":0,"towns":0,"cities":1,"dahan":0,"blight":0},{"number":2,"terrain":"ジャングル","coastal":true,"neighbors":[1,3,5,7],"explorers":0,"towns":0,"cities":0,"dahan":0,"blight":0},{"number":3,"terrain":"ジャングル","coastal":true,"neighbors":[2,4,7],"explorers":0,"towns":0,"cities":0,"dahan":1,"blight":0},{"number":4,"terrain":"湿地","coastal":true,"neighbors":[3,7],"explorers":0,"towns":0,"cities":0,"dahan":1,"blight":0},{"number":5,"terrain":"ジャングル","coastal":false,"neighbors":[1,2,7,8,9],"explorers":0,"towns":1,"cities":0,"dahan":0,"blight":0},{"number":6,"terrain":"山","coastal":false,"neighbors":[7],"explorers":0,"towns":0,"cities":0,"dahan":2,"blight":0},{"number":7,"terrain":"山","coastal":false,"neighbors":[2,3,4,5,6,8],"explorers":3,"towns":0,"cities":0,"dahan":3,"blight":0},{"number":8,"terrain":"砂漠","coastal":false,"neighbors":[5,7,9],"explorers":0,"towns":0,"cities":0,"dahan":0,"blight":0},{"number":9,"terrain":"湿地","coastal":false,"neighbors":[5,8],"explorers":0,"towns":0,"cities":0,"dahan":0,"blight":0}],"anchors":[[3.0858,-6.8145],[6.0958,-1.5849],[5.5492,2.9736],[6.8772,6.5477],[-2.8776,-4.9105],[-4.0475,6.2166],[-3.9693,2.6969],[-9.843,-2.0036],[-10.288,-6.758]]},"NW":{"lands":[{"number":1,"terrain":"砂漠","coastal":true,"neighbors":[2,6],"explorers":2,"towns":0,"cities":0,"dahan":1,"blight":0},{"number":2,"terrain":"砂漠","coastal":true,"neighbors":[1,3,4,5,6],"explorers":0,"towns":0,"cities":1,"dahan":0,"blight":0},{"number":3,"terrain":"湿地","coastal":true,"neighbors":[2,4],"explorers":0,"towns":1,"cities":0,"dahan":0,"blight":0},{"number":4,"terrain":"ジャングル","coastal":false,"neighbors":[2,3,5,7],"explorers":0,"towns":0,"cities":0,"dahan":0,"blight":0},{"number":5,"terrain":"山","coastal":false,"neighbors":[2,4,6,7,8],"explorers":0,"towns":0,"cities":0,"dahan":0,"blight":0},{"number":6,"terrain":"砂漠","coastal":false,"neighbors":[1,2,5,8,9],"explorers":0,"towns":0,"cities":0,"dahan":2,"blight":0},{"number":7,"terrain":"湿地","coastal":false,"neighbors":[4,5,8],"explorers":0,"towns":0,"cities":0,"dahan":1,"blight":0},{"number":8,"terrain":"山","coastal":false,"neighbors":[5,6,7,9],"explorers":1,"towns":0,"cities":0,"dahan":1,"blight":0},{"number":9,"terrain":"山","coastal":false,"neighbors":[6,8],"explorers":0,"towns":0,"cities":0,"dahan":1,"blight":0}],"anchors":[[-3.7389,5.3483],[-6.9494,-2.7386],[-7.9996,-7.2809],[-1.2532,-5.984],[1.1839,-0.3132],[1.6099,4.3833],[6.0156,-2.5903],[7.8547,3.1956],[8.2797,7.2951]]},"E":{"lands":[{"number":1,"terrain":"ジャングル","coastal":true,"neighbors":[2,5,6],"explorers":1,"towns":0,"cities":0,"dahan":0,"blight":0},{"number":2,"terrain":"湿地","coastal":true,"neighbors":[1,3,4,5],"explorers":0,"towns":1,"cities":0,"dahan":0,"blight":0},{"number":3,"terrain":"湿地","coastal":true,"neighbors":[2,4,7],"explorers":0,"towns":1,"cities":1,"dahan":2,"blight":1},{"number":4,"terrain":"湿地","coastal":false,"neighbors":[2,3,5,7,8,9],"explorers":1,"towns":0,"cities":0,"dahan":3,"blight":0},{"number":5,"terrain":"砂漠","coastal":false,"neighbors":[1,2,4,6,9],"explorers":0,"towns":0,"cities":0,"dahan":0,"blight":0},{"number":6,"terrain":"山","coastal":false,"neighbors":[1,5,9,10],"explorers":0,"towns":0,"cities":0,"dahan":0,"blight":0},{"number":7,"terrain":"山","coastal":false,"neighbors":[3,4,8],"explorers":0,"towns":0,"cities":0,"dahan":0,"blight":0},{"number":8,"terrain":"山","coastal":false,"neighbors":[4,7,9],"explorers":1,"towns":0,"cities":0,"dahan":0,"blight":0},{"number":9,"terrain":"湿地","coastal":false,"neighbors":[4,5,6,8,10],"explorers":0,"towns":0,"cities":0,"dahan":2,"blight":0},{"number":10,"terrain":"湿地","coastal":false,"neighbors":[6,9],"explorers":0,"towns":0,"cities":0,"dahan":2,"blight":0}],"anchors":[[3.8923,-5.7842],[6.6251,-0.3941],[9.9406,6.6876],[3.1743,3.2978],[-0.5959,-2.5248],[-4.8119,-5.8951],[-2.7201,6.6922],[-6.449,2.6771],[-4.6763,-1.3016],[-11.3329,-6.1106]]},"W":{"lands":[{"number":1,"terrain":"ジャングル","coastal":true,"neighbors":[2,5,7,8,9],"explorers":0,"towns":2,"cities":0,"dahan":2,"blight":0},{"number":2,"terrain":"砂漠","coastal":true,"neighbors":[1,3,4,5],"explorers":0,"towns":1,"cities":0,"dahan":0,"blight":0},{"number":3,"terrain":"砂漠","coastal":true,"neighbors":[2,4],"explorers":0,"towns":0,"cities":0,"dahan":0,"blight":0},{"number":4,"terrain":"砂漠","coastal":false,"neighbors":[2,3,5,6],"explorers":0,"towns":0,"cities":0,"dahan":0,"blight":0},{"number":5,"terrain":"ジャングル","coastal":false,"neighbors":[1,2,4,6,7],"explorers":1,"towns":0,"cities":0,"dahan":0,"blight":0},{"number":6,"terrain":"山","coastal":false,"neighbors":[4,5,7],"explorers":1,"towns":0,"cities":0,"dahan":1,"blight":0},{"number":7,"terrain":"湿地","coastal":false,"neighbors":[1,5,6,8],"explorers":0,"towns":0,"cities":0,"dahan":2,"blight":0},{"number":8,"terrain":"ジャングル","coastal":false,"neighbors":[1,7,9,10],"explorers":0,"towns":0,"cities":0,"dahan":2,"blight":0},{"number":9,"terrain":"砂漠","coastal":false,"neighbors":[1,8,10],"explorers":0,"towns":0,"cities":0,"dahan":0,"blight":0},{"number":10,"terrain":"山","coastal":false,"neighbors":[8,9],"explorers":0,"towns":0,"cities":0,"dahan":0,"blight":0}],"anchors":[[-1.4685,4.7764],[-7.1644,2.0824],[-9.5261,-5.6147],[-6.0334,-6.6884],[-3.4671,-1.1707],[1.582,-5.6324],[5.4195,-2.41],[4.9824,0.811],[5.1866,7.6197],[10.1202,5.9997]]}};
const SI_THEMATIC_JOINS=[["W","E",[[6,10],[7,10],[7,9],[8,9],[8,8],[10,8],[10,7]]],["NW","W",[[1,3],[6,3],[6,4],[9,4],[9,6]]],["NE","E",[[6,10],[6,6],[7,6],[4,6],[4,1]]],["NW","NE",[[7,9],[7,8],[7,7],[8,7],[9,7],[9,6]]],["W","NE",[[6,6]]],["NW","E",[[9,10]]]];
const SI_THEMATIC_SETS={1:['NE'],2:['E','W'],3:['E','W','NE'],4:['E','W','NE','NW']};
function siMakeThematicBoard(players){const selected=SI_THEMATIC_SETS[players.length],lands=[],centers={W:[0,0],E:[20,0],NE:[10,-17.32],NW:[-10,-17.32]},connect=(a,b)=>{if(!a.neighbors.includes(b.id))a.neighbors.push(b.id);if(!b.neighbors.includes(a.id))b.neighbors.push(a.id);};
 for(let b=0;b<players.length;b++){const p=players[b],name=selected[b],spec=SI_THEMATIC_BOARDS[name],[x,y]=players.length===1?[0,0]:centers[name];p.islandBoard=name;p.mapLayout=[x,y,0];p.mapVertices=[[-15,-8.65],[5,-8.65],[15,8.65],[-5,8.65]].map(([dx,dy])=>[x+dx,y+dy]);for(const entry of spec.lands){const l=siLand(`${p.id}:L${entry.number}`,entry.terrain,p.id,entry.number-1);Object.assign(l,{coastal:entry.coastal,explorers:entry.explorers,towns:entry.towns,cities:entry.cities,dahan:entry.dahan,blight:entry.blight,mapX:x+spec.anchors[l.index][0],mapY:y+spec.anchors[l.index][1]});l.neighbors=entry.neighbors.map(n=>`${p.id}:L${n}`);lands.push(l);}}
 const boardLand=(name,n)=>lands.find(l=>l.board===players.find(p=>p.islandBoard===name)?.id&&l.index===n-1);for(const [a,b,pairs] of SI_THEMATIC_JOINS)if(selected.includes(a)&&selected.includes(b))for(const [an,bn] of pairs)connect(boardLand(a,an),boardLand(b,bn));
 for(const p of players){const own=lands.filter(l=>l.board===p.id),high=terrain=>own.filter(l=>l.terrain===terrain).sort((a,b)=>b.index-a.index)[0],setup=[];if(p.spirit==='lightning'||p.spirit==='bringer')setup.push([high('砂漠'),2]);else if(p.spirit==='earth')setup.push([high('山'),2],[high('ジャングル'),1]);else if(p.spirit==='river')setup.push([high('湿地'),1]);else if(p.spirit==='shadows')setup.push([high('ジャングル'),2],[own[4],1]);else if(p.spirit==='thunderspeaker'){const ranked=[...own].sort((a,b)=>b.dahan-a.dahan||b.index-a.index);setup.push([ranked[0],1],[ranked[1],1]);}else if(p.spirit==='green')setup.push([high('湿地'),1],[own.filter(l=>l.terrain==='ジャングル'&&!l.dahan).sort((a,b)=>b.index-a.index)[0]||high('ジャングル'),1]);else if(p.spirit==='ocean'){p.oceanPresence=true;p.presence--;setup.push([own.filter(l=>l.coastal).at(-1),1]);}for(const [l,count] of setup){l.presenceOwners.push(...Array(count).fill(p.id));l.presence+=count;p.presence-=count;}}
 for(const l of lands){siSyncInvaderDamage(l);siSyncDahan(l);}return lands;}
function siMakeBoard(players,options={}){if(options.thematic)return siMakeThematicBoard(players);const lands=[],selected=shuffled(SI_BOARD_SETUP.map(board=>({...board,...SI_BOARD_LAYOUTS[board.id]}))).slice(0,players.length);players.forEach((p,b)=>{p.islandBoard=selected[b].id;selected[b].terrains.forEach((t,i)=>lands.push(siLand(`${p.id}:L${i+1}`,t,p.id,i)));});
 players.forEach((p,b)=>{const own=lands.filter(l=>l.board===p.id),spirit=SI_SPIRITS.find(s=>s.id===p.spirit);const initial=selected[b];own[1].cities=1;own[initial.town-1].towns=1;own[initial.blight-1].blight=1;own.forEach((l,i)=>l.dahan=initial.dahan[i]);const high=terrain=>own.filter(l=>l.terrain===terrain).sort((a,z)=>z.index-a.index)[0],setup=[];if(p.spirit==='lightning')setup.push([high('砂漠'),2]);else if(p.spirit==='earth')setup.push([high('山'),2],[high('ジャングル'),1]);else if(p.spirit==='river')setup.push([high('湿地'),1]);else if(p.spirit==='shadows')setup.push([high('ジャングル'),2],[own[4],1]);else if(p.spirit==='thunderspeaker'){const dahanLands=[...own].sort((a,z)=>z.dahan-a.dahan||z.index-a.index);setup.push([dahanLands[0],1],[dahanLands[1],1]);}else if(p.spirit==='green'){setup.push([high('湿地'),1],[own.filter(l=>l.terrain==='ジャングル'&&!l.dahan).sort((a,z)=>z.index-a.index)[0]||high('ジャングル'),1]);}else if(p.spirit==='bringer')setup.push([high('砂漠'),2]);else if(p.spirit==='ocean'){p.oceanPresence=true;p.presence--;setup.push([own.filter(l=>l.coastal).sort((a,z)=>z.index-a.index)[0],1]);}else{const l=own[(spirit?.setup?.[1]||0)%own.length];setup.push([l,1]);}for(const [land,count] of setup){for(let i=0;i<count;i++){land.presence++;land.presenceOwners.push(p.id);p.presence--;}}});lands.forEach(l=>{siSyncInvaderDamage(l);siSyncDahan(l);});
 const connect=(a,b)=>{a.neighbors??=[];b.neighbors??=[];if(!a.neighbors.includes(b.id))a.neighbors.push(b.id);if(!b.neighbors.includes(a.id))b.neighbors.push(a.id);};players.forEach((p,b)=>{const own=lands.filter(l=>l.board===p.id);selected[b].neighbors.forEach((ids,index)=>ids.forEach(n=>connect(own[index],own[n-1])));});siJoinBoards(players,lands,options);return lands;}
function siAdjacent(a,b){return !!a?.neighbors?.includes(b?.id);}
function siSacredSite(g,l,spiritId){return (l.presenceOwners||[]).some(id=>l.presenceOwners.filter(owner=>owner===id).length>=2)||(spiritId==='river'&&l.terrain==='湿地'&&(l.presenceOwners||[]).some(id=>g.players.some(p=>p.id===id&&p.spirit==='river')));}
function siDistance(g,from,to){if(from.id===to.id)return 0;const nodes=siPowerLands(g),seen=new Set([from.id]);let frontier=[from.id],d=0;while(frontier.length){d++;const next=[];for(const id of frontier){const l=nodes.find(x=>x.id===id);for(const nid of l?.neighbors||[]){if(nid===to.id)return d;if(!seen.has(nid)&&nodes.some(x=>x.id===nid)){seen.add(nid);next.push(nid);}}}frontier=next;}return Infinity;}
function siCanReach(g,p,target,range=1){return siPowerLands(g).some(l=>l.presenceOwners.includes(p.id)&&siDistance(g,l,target)<=range);}
function siSyncInvaderDamage(l){l.invaderIds??={explorers:[],towns:[],cities:[]};l.invaderDamage??={explorers:[],towns:[],cities:[]};for(const t of ['explorers','towns','cities']){l.invaderDamage[t]??=[];while(l.invaderDamage[t].length<l[t])l.invaderDamage[t].push(0);l.invaderDamage[t].length=l[t];l.invaderIds[t]??=[];while(l.invaderIds[t].length<l[t])l.invaderIds[t].push(crypto.randomUUID());l.invaderIds[t].length=l[t];}}
function siSyncDahan(l){l.dahanIds??=[];while(l.dahanIds.length<l.dahan)l.dahanIds.push(crypto.randomUUID());l.dahanIds.length=l.dahan;l.dahanDamage??=[];while(l.dahanDamage.length<l.dahan)l.dahanDamage.push(0);l.dahanDamage.length=l.dahan;}
function siAddInvader(l,type,count=1){siSyncInvaderDamage(l);for(let i=0;i<count;i++){l[type]++;l.invaderDamage[type].push(0);l.invaderIds[type].push(crypto.randomUUID());siCheckCapitalAt(l);}}
function siRemoveInvader(g,l,type,index=l[type]-1,destroyed=true){siSyncInvaderDamage(l);if(!l[type]||index<0)return false;l[type]--;l.invaderDamage[type].splice(index,1);l.invaderIds[type].splice(index,1);if(destroyed&&['towns','cities'].includes(type)){siRecordDeaths(g,l,1);if(siScenario(g,'insurrection'))(g.militaryResponses??=[]).push({board:l.board,fromId:l.id,type:type==='cities'?'towns':'explorers'});}if(destroyed&&type==='towns')siFear(g,1);if(destroyed&&type==='cities')siFear(g,2);return true;}
function siMoveInvader(from,to,type,g=null){siSyncInvaderDamage(from);siSyncInvaderDamage(to);if(!from[type])return false;const index=siPieceIndex(g,from,type,from[type]-1),[damage]=from.invaderDamage[type].splice(index,1),[id]=from.invaderIds[type].splice(index,1);from[type]--;to[type]++;to.invaderDamage[type].push(damage||0);to.invaderIds[type].push(id);siCheckCapitalAt(to);return true;}
function siDamageInvaders(g,l,amount,preferredType,sourceSpirit){siSyncInvaderDamage(l);let dealt=0;if(sourceSpirit==='bringer'){const seen=new Set();for(const type of (preferredType?[preferredType]:['explorers','towns','cities'])){if(amount<=0||!['explorers','towns','cities'].includes(type))continue;for(let i=0;i<l[type]&&amount>0;i++){const key=`${type}:${i}`;if(seen.has(key))continue;seen.add(key);const hp=siInvaderHealth(l)[type],needed=hp-l.invaderDamage[type][i];if(amount>=needed){const fear={explorers:0,towns:2,cities:5}[type];if(fear)siFear(g,fear);amount-=needed;dealt+=needed;}}}return dealt;}while(amount>0){let target=null;const order=[preferredType,'explorers','towns','cities'].filter((t,i,a)=>t&&a.indexOf(t)===i);for(const type of order){const hp=siInvaderHealth(l)[type];if(!hp)continue;const i=l.invaderDamage[type].findIndex(d=>d>0&&d<hp);if(i>=0){target={type,i,hp};break;}if(l[type]){target={type,i:0,hp};break;}}if(!target)break;l.invaderDamage[target.type][target.i]++;dealt++;amount--;if(l.invaderDamage[target.type][target.i]>=target.hp)siRemoveInvader(g,l,target.type,target.i,true);}return dealt;}
function siDamageDahan(l,amount,g){if(l.dahanImmune)return 0;siSyncDahan(l);let dealt=0;while(amount>0&&l.dahan){const i=l.dahanDamage.findIndex(d=>d>0&&d<2+(l.dahanHealthBonus||0)),target=i>=0?i:0;l.dahanDamage[target]++;amount--;dealt++;if(l.dahanDamage[target]>=2+(l.dahanHealthBonus||0)){l.dahan--;l.dahanDamage.splice(target,1);l.dahanIds.splice(target,1);siRecordDeaths(g,l,1);}}return dealt;}
function siAddDahan(l,n=1){siSyncDahan(l);l.dahan+=n;for(let i=0;i<n;i++){l.dahanDamage.push(0);l.dahanIds.push(crypto.randomUUID());}}
function siMoveDahan(g,from,to,owner,movePresence=false,pieceId=null){if(!from||!to||!from.dahan)return false;siSyncDahan(from);siSyncDahan(to);const pieceIndex=siPieceIndex(g,from,'dahan',from.dahan-1,pieceId),[damage]=from.dahanDamage.splice(pieceIndex,1),[id]=from.dahanIds.splice(pieceIndex,1);from.dahan--;if(!(to.isOcean&&siOceanOnBoard(g,to.board))||to.dahanImmune){if(damage<2+(to.dahanHealthBonus||0)||to.dahanImmune){to.dahan++;to.dahanDamage.push(damage);to.dahanIds.push(id);if(siScenario(g,'insurrection'))(g.raidingMovedIds??=[]).push(id);}else siRecordDeaths(g,to,1);}else siRecordDeaths(g,to,1);if(movePresence){const i=from.presenceOwners.indexOf(owner);if(i>=0){from.presenceOwners.splice(i,1);from.presence=from.presenceOwners.length;to.presenceOwners.push(owner);to.presence=to.presenceOwners.length;}}return true;}
function siAddPresence(l,p,track='energy'){l.presenceOwners??=[];if(p.presence>0&&siTrackRemaining(p)[track]>0){l.presenceOwners.push(p.id);l.presence=l.presenceOwners.length;p.presence--;if(track==='plays')p.playTrack=Math.min((p.playTrack||0)+1,(SI_TRACKS[p.spirit]?.plays.length||5)-1);else p.energyTrack=Math.min((p.energyTrack||0)+1,(SI_TRACKS[p.spirit]?.energy.length||8)-1);return true;}return false;}
function siLog(g,text,type='info'){g.log.unshift({id:crypto.randomUUID(),round:g.round||0,text,type});g.log=g.log.slice(0,80);}
function siDraw(g,spirit){return(SI_UNIQUE_POWERS[spirit]||[]).map(c=>({...c,id:crypto.randomUUID(),element:c.elements.join('・'),cardType:'unique',used:false,ready:false}));}
function siSharedCard(spec){return{...structuredClone(spec),id:crypto.randomUUID(),element:spec.elements.join('・'),used:false,ready:false};}
function siInitPowerDecks(g){g.powerDecks={minor:shuffled(SI_SHARED_POWERS.filter(c=>c.cardType==='minor').map(siSharedCard)),major:shuffled(SI_SHARED_POWERS.filter(c=>c.cardType==='major').map(siSharedCard))};g.powerDiscards={minor:[],major:[]};g.powerGains=[];g.immediateRepeats=[];g.giftChoices=[];g.vengeanceChoices=[];g.deathRecords=[];g.ravageIndex=0;g.invaderResolution=null;g.resumeFear=false;g.pendingCascades=[];g.counterattackChoices=[];g.presenceLossChoices=[];}
function siDiscardPower(g,c){c.ready=false;c.used=false;delete c.playSpeed;delete c.blitzAccelerated;if(['minor','major'].includes(c.cardType))(g.powerDiscards[c.cardType]??=[]).push(c);}
function siForgetPower(g,p,id){for(const pile of [p.hand,p.discard]){const i=pile.findIndex(c=>c.id===id);if(i>=0){const c=pile.splice(i,1)[0];siDiscardPower(g,c);return c;}}throw Error('忘れる能力を手札・捨て札・プレイ中のカードから選んでください。');}
function siBeginPowerGain(g,p,options={}){g.powerGains??=[];g.powerGains.push({id:crypto.randomUUID(),playerId:p.id,kind:options.kind||'choice',reason:options.reason||'能力を獲得',...options});}
function siPowerGain(g,p,a){const gain=g.powerGains?.[0];if(!gain||gain.playerId!==p.id)throw Error('今は能力を獲得できません。');if(a.type==='choosePowerDeck'){if(gain.deck)throw Error('引いたカードから選んでください。');const deck=a.deck;if(!['minor','major'].includes(deck)||(gain.kind!=='choice'&&deck!==gain.kind))throw Error('獲得するデッキを選んでください。');gain.deck=deck;gain.offers=[];for(let i=0;i<4;i++){if(!g.powerDecks[deck].length){g.powerDecks[deck]=shuffled(g.powerDiscards[deck]);g.powerDiscards[deck]=[];}if(!g.powerDecks[deck].length)break;gain.offers.push(g.powerDecks[deck].shift());}if(!gain.offers.length){g.powerGains.shift();siFinishPowerGain(g,p,gain);siLog(g,'獲得できる能力カードがありません。','power');}return;}
 const card=gain.offers?.find(c=>c.id===a.powerId);if(!card)throw Error('公開された能力を1枚選んでください。');p.hand.push(card);let forgotten=null;if(gain.deck==='major'&&!gain.noForget)forgotten=siForgetPower(g,p,a.forgetCardId);
 const rest=gain.offers.filter(c=>c.id!==card.id);if(gain.receiveRemainder){const receiver=g.players.find(x=>x.id===gain.receiveRemainder);g.powerGains.splice(1,0,{id:crypto.randomUUID(),playerId:receiver.id,reason:'絡み合う能力：残りから選択',kind:gain.deck,deck:gain.deck,offers:rest,noForget:false,afterGain:gain.afterGain});}else for(const c of rest)siDiscardPower(g,c);
 if(gain.noForget&&forgotten)throw Error('この獲得では忘却は不要です。');
 if(gain.midnightCardId&&forgotten?.id===gain.midnightCardId){p.energy+=gain.dahan;if(a.playImmediately){if(!p.hand.includes(card))throw Error('忘れた能力はプレイできません。');if(p.energy<siScenarioCost(g,card))throw Error('獲得した大能力を使う精霊力が足りません。');p.energy-=siScenarioCost(g,card);card.ready=true;card.used=false;card.playSpeed=siScenarioSpeed(g,card);p.ready=false;}}
 g.powerGains.shift();siLog(g,`${p.name}が「${card.name}」を獲得した。`,'power');siFinishPowerGain(g,p,gain);
}
function siFinishPowerGain(g,p,gain){if(gain.growthEffect){p.growthPending=false;siFinishGrowthSteps(g,p);}if(gain.afterGain&&!gain.receiveRemainder){const from=g.players.find(p=>p.id===gain.afterGain.sourceId),to=g.players.find(p=>p.id===gain.afterGain.targetId);if(siHasElements(from,{水:2,植物:4})){from.energy+=3;to.energy+=3;g.giftChoices??=[];for(const [giver,receiver] of [[from,to],[to,from]])g.giftChoices.push({playerId:giver.id,targetId:receiver.id,reason:'絡み合う能力'});}}if(gain.finishGrowth){if((g.powerGains||[]).some(t=>t.playerId===p.id&&t.finishGrowth))return;p.growthPending=false;if(siSetReady(g,p)&&!(g.powerGains||[]).length)siProgress(g);}}
function siHasElements(p,needs){const e=siElementCounts(p);return Object.entries(needs).every(([k,v])=>(e[k]||0)>=v);}
function siSharedConfig(g,p,c,l,a={}){if(c.program!=='shared')return c;const s={...c},k=c.sharedKey,met=needs=>siHasElements(p,needs),inTerrain=(...xs)=>l&&xs.includes(l.terrain);const mode=(id,name,props={})=>({id,name,...props}),push=(types,limit,extra={})=>({direction:'push',types,limit,...extra}),gather=(types,limit,extra={})=>({direction:'gather',types,limit,...extra});
 if(k===0){s.damage=inTerrain('ジャングル','湿地')?1:0;if(met({動物:3}))s.extraDamage=1;}
 if(k===1)s.modes=[mode('damage','2ダメージ',{damage:2}),mode('remove','荒廃1つを戻す')];
 if(k===2){s.damage=2;s.move=push(['explorers'],1,{required:1});}
 if(k===4&&l?.explorers)s.move=push(['explorers'],l.explorers,{required:l.explorers});
 if(k===6&&inTerrain('山','ジャングル'))s.move=push(['explorers','towns'],2,{limits:{explorers:1,towns:1},required:2});
 if(k===7)s.replaceTypes=met({大地:3})?['explorers','towns']:['explorers'];
 if(k===8)s.modes=[mode('damage','ダハンが異なる侵略者に各1ダメージ',{damage:l?Math.min(l.dahan,totalInvaders(l)):0,distinctDamage:true}),mode('push','ダハンを最大3つ押し出す',{move:push(['dahan'],3)})];
 if(k===9)s.chooseElements=3;
 if(k===10){s.damage=1;if(inTerrain('ジャングル','砂漠'))s.extraDamage=1;}
 if(k===12)s.range=met({風:1})?1:0;
 if(k===14)s.move=push(['explorers','towns'],l?.blight?4:2);
 if(k===15)s.modes=[mode('defend','防御6'),...(met({水:2})?[mode('remove','荒廃1つを戻す')]:[])];
 if(k===16)s.move=push(['explorers','towns'],1,{required:1});
 if(k===17){s.damage=l?.presenceOwners.includes(p.id)?1:0;if(inTerrain('砂漠','湿地'))s.extraDamage=1;}
 if(k===18)s.replaceTypes=met({月:2})?['explorers','towns']:['explorers'];
 if(k===19)s.modes=[mode('damage','ダハンの数のダメージ',{damage:l?.dahan||0}),mode('gather','ダハンを最大3つ集める',{move:gather(['dahan'],3)})];
 if(k===20)s.modes=[mode('invaders','遠征隊・町を押し出す',{move:push(['explorers','towns'],l?.dahan||0,{required:l?.dahan||0})}),mode('dahan','ダハン1つを押し出す',{move:push(['dahan'],1,{required:1})})];
 if(k===21){s.move=gather(['dahan'],3);s.secondMove=push(['dahan'],3);}
 if(k===22)s.modes=[mode('remove','荒廃1つを戻す'),mode('push','ダハンを最大3つ押し出す',{move:push(['dahan'],3)})];
 if(k===23)s.modes=[mode('damage','町・都市に各1ダメージ'),mode('defend','防御10')];
 if(k===24)s.modes=[mode('push','遠征隊1つを押し出す',{move:push(['explorers'],1,{required:1})}),mode('fear','恐怖2')];
 if(k===27)s.modes=[mode('invader','遠征隊・町1つを集める',{move:gather(['explorers','towns'],1,{required:1})}),mode('dahan','ダハンを最大2つ集める',{move:gather(['dahan'],2)})];
 if(k===28&&!totalInvaders(l||{explorers:0,towns:0,cities:0}))s.move=gather(['explorers'],2);
 if(k===31)s.move=push(['towns'],2);
 if(k===32)s.move=gather(['explorers','towns'],1,{required:1});
 if(k===33)s.modes=[mode('damage','荒廃の数のダメージ',{damage:l?.blight||0}),...(inTerrain('山','砂漠')?[mode('remove','荒廃1つを戻す')]:[])];
 if(k===36){s.damage=4;if(met({太陽:3,水:2,植物:3}))s.extraDamage=5;}
 if(k===37){s.damage=4;if(met({水:4}))s.extraDamage=10;}
 if(k===38){s.damage=5;if(met({炎:4}))s.extraDamage=5;}
 if(k===39){s.damage=7;if(met({大地:3,植物:2,動物:2}))s.extraDamage=4*((l?.blight||0)+1);}
 if(k===40)s.move=push(['explorers','towns'],4);
 if(k===41){s.damage=l?.dahan||0;if(met({太陽:2,大地:2,植物:2}))s.move=push(['dahan'],2);}
 if(k===43)s.thresholdMet=met({風:2,大地:3});
 if(k===45){s.damage=5;s.thresholdMet=met({炎:3,風:3});if(s.thresholdMet)s.range=3;}
 if(k===46)s.thresholdMet=met({月:2,植物:3});
 if(k===47)s.damage=l?l.blight*2+siPowerLands(g).filter(n=>siAdjacent(l,n)).reduce((sum,n)=>sum+n.blight,0):0;
 if(k===48){s.damage=8;if(met({水:3,大地:2}))s.areaDamage=l?g.lands.filter(n=>n.board===l.board&&n.coastal&&n.id!==l.id).map(n=>({landId:n.id,amount:4})):[];}
 if(k===49){s.damage=(l?.dahan||0)*2;if(met({太陽:3,動物:2})){s.move=push(['dahan'],2);s.movedDamage=2;}}
 if(k===51){if(met({太陽:2,風:2,動物:2}))s.move=gather(['dahan'],3);s.secondMove=push(['dahan'],5,{anyLand:true,singleDestination:true});s.defendDestination=true;}
 if(k===52){s.supportLand='any';if(met({炎:3,大地:3,植物:2}))s.extraDamage=4;}
 if(k===53)s.replaceTypes=['towns','cities'];
 if(k===54)s.presence=true;
 if(k===55){s.damage=met({月:2,風:3,水:2})?3:0;s.damageAfterEach=true;}
 if(k===56&&met({大地:4}))s.chooseBlightRemoval=true;
 if(k===57)s.thresholdMet=met({炎:2,水:2,動物:3});
 if(k===58){s.destroyTypes=[met({炎:4,風:3})?['towns','cities']:['towns']];if(met({炎:5,風:4,水:1}))s.destroyTypes.push(['towns','cities']);if(met({炎:5,風:5,水:2}))s.destroyTypes.push(['towns','cities']);}
 if(k===59){if(met({太陽:3,水:4,大地:1}))s.eachDamage=2;else if(met({太陽:2,水:3})){s.damage=2;s.move=push(['explorers','towns'],3);}else s.move=push(['explorers','towns'],1,{required:1});}
 if(k===60)s.repeatMaxCost=met({太陽:2,大地:4,植物:3})?6:met({太陽:2,大地:3,植物:2})?3:1;
 if(k===61){s.move=gather(['explorers'],1,{required:1});if(met({月:3,炎:2}))s.afterGatherDestroy=2;if(met({月:4,炎:3,風:2}))s.extraDamage=3;}
 if(k===62)s.replaceTypes=['towns','cities'];
 if(k===64){const elements=siElementCounts(p);s.move=gather(['dahan'],elements['風']||0);s.secondMove=push(['dahan'],elements['太陽']||0);}
 if(k===65){s.destroyTypes=Array.from({length:Math.floor((l?.dahan||0)/2)},()=>['towns']);if(met({太陽:4,炎:3}))s.destroyTypes.push(...Array.from({length:Math.floor((l?.dahan||0)/3)},()=>['cities']));}
 if(k===66){s.revealFear=met({月:2,風:2});s.chooseExistingElement=met({月:3});}
 if(k===69)s.destroyTypes=[met({水:3,大地:2})?['towns','cities']:['towns'],...(met({水:4,大地:3})?[['towns','cities']]:[])];
 return siProgramConfig(s,a);
}
function siReturnBlight(g,l){if(l?.blight){l.blight--;g.blightPool++;return true;}return false;}
function siDestroyDahan(g,l,count){if(l.dahanImmune)return 0;siSyncDahan(l);const n=Math.min(l.dahan,count);for(let i=0;i<n;i++){const index=siPieceIndex(g,l,'dahan',0);l.dahan--;l.dahanDamage.splice(index,1);l.dahanIds.splice(index,1);}siRecordDeaths(g,l,n);return n;}
function siPowerDestroy(g,p,l,type,count,a={}){siSyncInvaderDamage(l);const n=Math.min(count,l[type]);if(p.spirit==='bringer'){siDreamInvaders(g,p,l,[...(g.piecePreferences?.[l.id]?.[type]||[]),...l.invaderIds[type]].filter((id,i,a)=>a.indexOf(id)===i&&l.invaderIds[type].includes(id)).slice(0,n));return n;}for(let i=0;i<n;i++)siRemoveInvader(g,l,type,siPieceIndex(g,l,type,0),true);return n;}
function siPowerEachDamage(g,p,l,amount,types=['explorers','towns','cities']){siSyncInvaderDamage(l);if(p.spirit==='bringer'){const virtual=siDreamDamageLand(g,l),hits=[];for(const t of types)for(let i=0;i<l[t];i++)hits.push({type:t,index:i,amount:Math.min(amount,siInvaderHealth(l)[t]-virtual.invaderDamage[t][i])});siPowerDamage(g,p,l,hits.reduce((n,h)=>n+h.amount,0),hits);return;}for(const t of types)for(let i=l[t]-1;i>=0;i--){const hp=siInvaderHealth(l)[t];l.invaderDamage[t][i]+=amount;if(l.invaderDamage[t][i]>=hp)siRemoveInvader(g,l,t,i,true);}}
function siApplySharedPower(g,p,c,l,target,a){const k=c.sharedKey,s=siSharedConfig(g,p,c,l,a),met=needs=>siHasElements(p,needs),terrain=(...xs)=>l&&xs.includes(l.terrain),fear=n=>siPowerFear(g,l,n),damage=(n=s.damage)=>siPowerDamage(g,p,l,n,a.damagePlan,a.dreamPushes),move=spec=>siExecutePowerMoves(g,p,l,spec,a.moves),extra=()=>siPowerDamage(g,p,l,s.extraDamage,a.extraDamagePlans?.[l.id]||[],a.extraDreamPushes?.[l.id]||[]),remove=()=>siReturnBlight(g,l),replace=(toDahan=false)=>{const types=s.replaceTypes.filter(t=>l[t]);if(!types.length)return;const type=a.unitType||types[0];if(!types.includes(type))throw Error('対象のコマを選び直してください。');siRemoveInvader(g,l,type,siPieceIndex(g,l,type,0),false);if(toDahan)siAddDahan(l);};
 if(k===0){if(terrain('ジャングル','湿地'))fear(1);damage();if(s.extraDamage)extra();}
 if(k===1){if(s.id==='remove')remove();else damage();}
 if(k===2){damage();move(s.move);}
 if(k===3)target.wardDefend=(target.wardDefend||0)+2;
 if(k===4){if(l.explorers)move(s.move);else remove();}
 if(k===5){if(totalInvaders(l))fear(1);if(terrain('砂漠','湿地'))remove();}
 if(k===6){fear(2);if(s.move)move(s.move);}
 if(k===7){const types=s.replaceTypes.filter(t=>l[t]);if(types.length){const t=a.unitType||types[0];if(!types.includes(t))throw Error('破壊する侵略者を選んでください。');siPowerDestroy(g,p,l,t,1,a);}}
 if(k===8){if(s.id==='push')move(s.move);else{if((a.damagePlan||[]).some(d=>d.amount>1))throw Error('それぞれ異なる侵略者に1ダメージずつ割り振ってください。');damage();}}
 if(k===9){const es=a.elements;if(!Array.isArray(es)||es.length!==3||new Set(es).size!==3||es.some(e=>!['太陽','月','炎','風','水','大地','植物','動物'].includes(e)))throw Error('異なる元素を3種類選んでください。');for(const receiver of target===p?[p]:[p,target]){receiver.elementGifts??={};for(const e of es)receiver.elementGifts[e]=(receiver.elementGifts[e]||0)+1;}}
 if(k===10){fear(1);damage();if(p.spirit!=='bringer')siDestroyDahan(g,l,1);if(s.extraDamage)extra();}
 if(k===11){fear(2);if(terrain('山','ジャングル'))l.defend+=3;}
 if(k===12)l.defend+=5;
 if(k===13)l.defend+=terrain('ジャングル','砂漠')?4:1;
 if(k===14){fear(l.blight?4:2);move(s.move);siPlaceBlight(g,l);}
 if(k===15){if(s.id==='remove')remove();else l.defend+=6;}
 if(k===16){fear(met({炎:2})?2:1);move(s.move);}
 if(k===17){if(l.presenceOwners.includes(p.id))fear(1);damage();if(s.extraDamage)extra();}
 if(k===18)replace(true);
 if(k===19){if(s.id==='gather')move(s.move);else damage();}
 if(k===20)move(s.move);
 if(k===21){move(s.move);siExecutePowerMoves(g,p,l,s.secondMove,a.secondMoves);}
 if(k===22){if(s.id==='push')move(s.move);else remove();}
 if(k===23){if(s.id==='defend')l.defend+=10;else siPowerEachDamage(g,p,l,1,['towns','cities']);}
 if(k===24){if(s.id==='fear')fear(2);else move(s.move);}
 if(k===25){siPowerDestroy(g,p,l,'towns',3,a);siPowerEachDamage(g,p,l,1,['towns','cities']);siPlaceBlight(g,l);if(met({太陽:3}))siPowerDestroy(g,p,l,'cities',1,a);}
 if(k===26){target.energy+=2;target.constancyReclaims=(target.constancyReclaims||0)+1;if(target!==p)p.constancyReclaims=(p.constancyReclaims||0)+1;}
 if(k===27)move(s.move);
 if(k===28){l.defend+=2;if(s.move)move(s.move);}
 if(k===29)target.energy+=1+(target!==p?1:0)+(siPowerLands(g).filter(x=>siOwnSacredSite(p,x)).length>=2?1:0);
 if(k===30)siBeginPowerGain(g,target,{kind:'minor',reason:c.name});
 if(k===31||k===32)move(s.move);
 if(k===33){if(s.id==='remove')remove();else damage();}
 if(k===34)fear(l.towns+l.cities>=2?3:2);
 if(k===35)target.rangeBonus=(target.rangeBonus||0)+2;
 if(k===58){const selected=a.destroyTypes||[];for(let i=0;i<s.destroyTypes.length;i++){const types=s.destroyTypes[i],available=types.filter(t=>l[t]);if(!available.length)continue;const t=selected[i]||available[0];if(!available.includes(t))throw Error('破壊する町・都市を選び直してください。');siPowerDestroy(g,p,l,t,1);}}
 if(k===59){if(s.eachDamage)siPowerEachDamage(g,p,l,s.eachDamage);else{if(s.damage)damage();move(s.move);}}
 if(k===60){target.repeatTokens??=[];target.repeatTokens.push({remaining:1,maxCost:s.repeatMaxCost,free:true,usedCardIds:[]});target.ready=false;}
 if(k===61){move(s.move);if(s.afterGatherDestroy){const n=Math.min(s.afterGatherDestroy,l.explorers);siPowerDestroy(g,p,l,'explorers',n);fear(n);}if(s.extraDamage){const before=totalInvaders(l);extra();fear(before-totalInvaders(l));}}
 if(k===62){if(l.towns+l.cities)siDamageOneBuilding(g,p,l,a.unitType||(l.towns?'towns':'cities'),Number(a.unitIndex||0));if(met({月:2,植物:3}))siMakeRepeat(g,p,c);if(met({月:3,植物:4}))siMakeRepeat(g,p,c);}
 if(k===63){l.defend+=met({水:2,植物:4})?4:2;if(met({水:3,大地:1,植物:5}))siReturnBlight(g,l);}
 if(k===64){move(s.move);siExecutePowerMoves(g,p,l,s.secondMove,a.secondMoves);}
 if(k===65){for(const types of s.destroyTypes)siPowerDestroy(g,p,l,types[0],1);}
 if(k===66){if(s.revealFear){const options=[...(g.pendingFear||[]),...(g.fearDeck||[])].filter(c=>!(g.revealedFearIds||[]).includes(c.id));if(options.length){const card=options.find(c=>String(c.id)===String(a.fearCardId));if(!card)throw Error('公開する伏せた恐怖カードを選んでください。');g.revealedFearIds??=[];g.revealedFearIds.push(card.id);g.fearResolvedThisPhase=(g.fearResolvedThisPhase||0)+1;siLog(g,`恐怖カード「${card.name}」を公開した。解決・獲得の順序は変わらない。`,'fear');}}if(s.chooseExistingElement){const e=a.element;if(!(siElementCounts(target)[e]>0))throw Error('対象精霊が既に持つ元素を選んでください。');target.elementGifts??={};target.elementGifts[e]=(target.elementGifts[e]||0)+1;}}
 if(k===67)fear(1+(met({月:2,風:1,動物:1})?1:0)+(met({月:3,風:2,動物:1})?1:0));
 if(k===68)fear(1+(met({月:2,風:1,水:3})?1:0)+(met({月:3,風:2,水:4})?2:0));
 if(k===69){for(let i=0;i<s.destroyTypes.length;i++){const available=s.destroyTypes[i].filter(t=>l[t]);if(!available.length)continue;const type=a.destroyTypes?.[i]||available[0];if(!available.includes(type))throw Error('呑み込む建物を選び直してください。');siDrownInvader(g,l,type,p);}}
 if(k>=36&&k<58)siApplyMajorPower(g,p,c,l,target,a);
}
// Aggregate actual destruction for one action, then resolve triggered actions.
// Ancestors prevent a Vengeance use from triggering itself, even indirectly.
function siRecordDeaths(g,l,count){if(!g||count<=0||!l.vengeance?.length)return;g.deathRecords??=[];const ancestors=[...(g.vengeanceAncestors||[])],key=ancestors.join('|');const record=g.deathRecords.find(r=>r.landId===l.id&&r.key===key);if(record)record.count+=count;else g.deathRecords.push({landId:l.id,count,ancestors,key});}
function siFlushDeaths(g,prepend=false){if(g.pendingCascades?.length||g.counterattackChoices?.length||g.presenceLossChoices?.length)return;const records=g.deathRecords||[];g.deathRecords=[];const tasks=[];for(const r of records){const l=siAllNodes(g).find(l=>l.id===r.landId);for(const trigger of l?.vengeance||[])if(!r.ancestors.includes(trigger.id))tasks.push({playerId:trigger.playerId,amount:r.count,targetIds:[l.id,...(trigger.adjacent?siPowerLands(g).filter(n=>siAdjacent(l,n)).map(n=>n.id):[])],ancestors:[...r.ancestors,trigger.id]});}g.vengeanceChoices??=[];if(prepend)g.vengeanceChoices.unshift(...tasks);else g.vengeanceChoices.push(...tasks);}
function siApplyVengeance(g,p,a){const t=g.vengeanceChoices?.[0];if(!t||t.playerId!==p.id)throw Error('死者の復讐の解決順を待っています。');const nodes=siPowerLands(g).filter(l=>t.targetIds.includes(l.id)),plans=a.plans||{};let capacity=0,total=0;for(const l of nodes){siSyncInvaderDamage(l);capacity+=Object.entries(siInvaderHealth(l)).reduce((n,[type,h])=>n+l.invaderDamage[type].reduce((k,d)=>k+h-d,0),0);const plan=plans[l.id]||[],amount=plan.reduce((n,h)=>n+h.amount,0);siValidateDamagePlan(l,amount,plan);total+=amount;}if(Object.keys(plans).some(id=>!t.targetIds.includes(id))||total!==Math.min(capacity,t.amount))throw Error(`${Math.min(capacity,t.amount)}ダメージを対象地・隣接地へ割り振ってください。`);g.vengeanceChoices.shift();g.vengeanceAncestors=t.ancestors;try{for(const l of nodes){const plan=plans[l.id]||[],amount=plan.reduce((n,h)=>n+h.amount,0);if(amount)siPowerDamage(g,p,l,amount,plan,a.dreamPushes?.[l.id]||[]);}}finally{g.vengeanceAncestors=[];}siFlushDeaths(g,true);if(g.vengeanceChoices.length||siCheckEnd(g))return;if(g.resumeFear){g.resumeFear=false;siResolveFear(g);}else if(g.invaderResolution)siResolveInvaderPhase(g,true);}
function siMakeRepeat(g,p,c,adjacentTo=null){if(c.repeatOf)return;const repeat={...structuredClone(c),id:crypto.randomUUID(),repeatOf:c.id,used:false,ready:true,playSpeed:c.playSpeed||c.speed,repeatAdjacentTo:adjacentTo,repeatFree:true};p.hand.push(repeat);g.immediateRepeats??=[];g.immediateRepeats.push({playerId:p.id,cardId:repeat.id});p.ready=false;}
function siApplyMajorPower(g,p,c,l,target,a){const k=c.sharedKey,s=siSharedConfig(g,p,c,l,a),met=n=>siHasElements(p,n),fear=n=>siPowerFear(g,l,n),damage=(n=s.damage,land=l,plan=a.damagePlan)=>siPowerDamage(g,p,land,n,plan,a.dreamPushes),extra=(n,land=l)=>siPowerDamage(g,p,land,n,a.extraDamagePlans?.[land.id]||[],a.extraDreamPushes?.[land.id]||[]),move=()=>siExecutePowerMoves(g,p,l,s.move,a.moves);
 if(k===36){fear(2);damage();if(s.extraDamage){extra(s.extraDamage);siReturnBlight(g,l);}}
 if(k===37){damage();siReturnBlight(g,l);if(s.extraDamage)extra(s.extraDamage);}
 if(k===38){fear(3);damage();if(['ジャングル','湿地'].includes(l.terrain))siPlaceBlight(g,l);if(s.extraDamage){fear(2);extra(s.extraDamage);}}
 if(k===39){fear(1);damage();siPlaceBlight(g,l);if(p.spirit!=='bringer')siDestroyDahan(g,l,l.dahan);if(met({大地:3,植物:2,動物:2})){fear(l.blight);extra(l.blight*4);}}
 if(k===40){fear(met({月:4})?6:2);move();}
 if(k===41){l.defend+=l.dahan*2;damage();if(s.move){const before=l.dahan;move();l.defend-=2*(before-l.dahan);for(const m of a.moves||[]){const to=siPowerLands(g).find(n=>n.id===m.to);if(to)to.defend+=m.count*2;}}}
 if(k===42){p.entwinedIds=[...new Set([...(p.entwinedIds||[]),target.id])];target.entwinedIds=[...new Set([...(target.entwinedIds||[]),p.id])];siBeginPowerGain(g,target,{receiveRemainder:p.id,reason:c.name,afterGain:{sourceId:p.id,targetId:target.id}});}
 if(k===43){fear(s.thresholdMet?8:4);l.skipAll=true;}
 if(k===44){target.energy+=3;target.repeatTokens??=[];target.repeatTokens.push({remaining:met({太陽:2,炎:2,風:3})?3:1,usedCardIds:[]});target.ready=false;}
 if(k===45){fear(3);damage();if(s.thresholdMet)for(const n of siPowerLands(g).filter(n=>siAdjacent(l,n)))siPowerDestroy(g,p,n,'towns',1,{dreamPushes:a.areaDreamPushes?.[n.id]||[]});}
 if(k===46){siPowerDestroy(g,p,l,'explorers',l.explorers,a);siPowerDestroy(g,p,l,'towns',l.towns,a);if(s.thresholdMet)siPowerDestroy(g,p,l,'cities',1,a);else if(p.spirit!=='bringer')siDestroyDahan(g,l,l.dahan);}
 if(k===47){damage();if(met({月:3,大地:3}))siMakeRepeat(g,p,c,l.id);}
 if(k===48){fear(2);damage();if(p.spirit!=='bringer')siDestroyDahan(g,l,2);if(s.areaDamage)for(const entry of s.areaDamage){const n=g.lands.find(n=>n.id===entry.landId);siPowerFear(g,n,1);extra(4,n);if(p.spirit!=='bringer')siDestroyDahan(g,n,1);}}
 if(k===49){damage();if(s.move){move();const counts={};for(const m of a.moves||[])counts[m.to]=(counts[m.to]||0)+m.count;for(const [id,count] of Object.entries(counts))extra(count*2,siPowerLands(g).find(n=>n.id===id));}}
 if(k===50){fear(3);l.vengeance??=[];l.vengeance.push({id:crypto.randomUUID(),playerId:p.id,adjacent:met({動物:3})});}
 if(k===51){if(s.move)move();const moves=a.secondMoves||[];if(new Set(moves.map(m=>m.to)).size>1)throw Error('ダハンは1つの土地へ移動してください。');siExecutePowerMoves(g,p,l,s.secondMove,moves);const dest=siPowerLands(g).find(n=>n.id===(moves[0]?.to||a.destinationId||l.id));if(!dest)throw Error('ダハンの移動先を選んでください。');dest.defend+=5;}
 if(k===52){if(!l||target.spirit==='ocean'&&!l.coastal||!siCanReach(g,p,l,2+(p.rangeBonus||0)))throw Error('使用者の存在から距離2以内の配置先を選んでください。');const n=Math.min(2,target.destroyedPresence||0);if(n){for(let i=0;i<n;i++){l.presenceOwners.push(target.id);}l.presence=l.presenceOwners.length;target.destroyedPresence-=n;siPowerEachDamage(g,p,l,2,['towns','cities']);}if(n&&s.extraDamage)extra(s.extraDamage);}
 if(k===53){fear(1);l.defend+=6;const types=['towns','cities'].filter(t=>l[t]);if(types.length){const t=a.unitType||types[0];if(!types.includes(t))throw Error('置換する建物を選んでください。');siRemoveInvader(g,l,t,siPieceIndex(g,l,t,0),false);siAddInvader(l,t==='cities'?'towns':'explorers');}if(met({風:3,水:3,動物:2}))siMakeRepeat(g,p,c);}
 if(k===54){const oceanException=p.spirit==='ocean';if(oceanException){const original=p.spirit;p.spirit='claim';try{siPowerPlacePresence(g,p,l,a);}finally{p.spirit=original;}}else siPowerPlacePresence(g,p,l,a);l.defend+=20;if(met({太陽:2,大地:3})){if(totalInvaders(l))fear(3);l.skipAll=true;}}
 if(k===55){const before=l.towns+l.cities;siPowerEachDamage(g,p,l,1);const deaths=before-l.towns-l.cities;if(s.damage)damage();const allDeaths=before-l.towns-l.cities;if(p.spirit!=='bringer')fear(Math.min(4,Math.max(deaths,allDeaths)));}
 if(k===56){l.dahanHealthBonus=(l.dahanHealthBonus||0)+4;l.preventBlight=true;if(met({大地:4})){l.dahanImmune=true;const n=siPowerLands(g).find(n=>n.id===a.removeBlightId&&(n.id===l.id||siAdjacent(l,n)));if(a.removeBlightId&&!n)throw Error('対象または隣接地から荒廃を戻してください。');if(n)siReturnBlight(g,n);}}
 if(k===57){if(l.cities){siRemoveInvader(g,l,'cities',siPieceIndex(g,l,'cities',0),false);siAddInvader(l,'explorers',2);}if(l.towns){siRemoveInvader(g,l,'towns',siPieceIndex(g,l,'towns',0),false);siAddInvader(l,'explorers');}if(l.dahan){siSyncDahan(l);const index=siPieceIndex(g,l,'dahan',0);l.dahan--;l.dahanDamage.splice(index,1);l.dahanIds.splice(index,1);siAddInvader(l,'explorers');}if(p.spirit==='bringer'&&a.kinshipDreamPushes)siBindDreamPushes(g,l,a.kinshipDreamPushes);if(met({炎:2,水:2,動物:3})){const hits=l.explorers,back=l.towns*2+l.cities*3;siSyncInvaderDamage(l);const capacity=l.invaderDamage.towns.reduce((n,d)=>n+siInvaderHealth(l).towns-d,0)+l.invaderDamage.cities.reduce((n,d)=>n+siInvaderHealth(l).cities-d,0);if((a.buildingDamagePlan||[]).some(h=>!['towns','cities'].includes(h.type)))throw Error('遠征隊のダメージは町・都市へ割り振ってください。');siPowerDamage(g,p,l,Math.min(hits,capacity),a.buildingDamagePlan||[],a.dreamPushes);siPowerDestroy(g,p,l,'explorers',back,a);}const adjacent=siPowerLands(g).filter(n=>siAdjacent(l,n));const total=l.explorers,moves=a.moves||[];const destinations=new Set(moves.filter(m=>m.count>0).map(m=>m.to));if(destinations.size<Math.min(total,adjacent.length))throw Error('遠征隊を可能な限り異なる隣接地へ押し出してください。');siExecutePowerMoves(g,p,l,{direction:'push',types:['explorers'],limit:total,required:total},moves);}
}
function siInvaderDeck(){const singles=stage=>SI_TERRAINS.map(terrain=>({id:stage+':'+terrain,stage,terrains:[terrain],escalation:stage===2}));const pairs=[];for(let i=0;i<SI_TERRAINS.length;i++)for(let j=i+1;j<SI_TERRAINS.length;j++)pairs.push({id:'3:'+i+':'+j,stage:3,terrains:[SI_TERRAINS[i],SI_TERRAINS[j]]});return [...shuffled(singles(1)).slice(0,3),...shuffled([...singles(2),{id:'2:coastal',stage:2,terrains:[],coastal:true,escalation:false}]).slice(0,4),...shuffled(pairs).slice(0,5)];}
function siStart(g,options={}){g.interactiveSetup=!!options.interactiveSetup;if(g.players.length<1||g.players.length>4)throw Error('1〜4人で開始できます。');if(g.players.some(p=>!p.spirit))throw Error('全員が精霊を選んでください。');g.matchId=crypto.randomUUID();g.round=1;g.phase='growth';g.terror=1;g.fear=0;g.fearCards=0;g.fearPool=(4+(siAdversary(g).id==='england'&&siAdversary(g).level>=6?1:0))*g.players.length;g.fearPerCard=g.fearPool;g.fearLevelCounts=siAdversary(g).fearExtras[siAdversary(g).level].map(n=>3+n);g.fearVictoryCount=g.fearLevelCounts.reduce((n,v)=>n+v,0);g.fearDeck=shuffled(SI_FEAR_CARDS.map(c=>({...c,id:crypto.randomUUID()}))).slice(0,g.fearVictoryCount);g.escalationChoices=[];g.setupDiscard=null;g.pendingFear=[];g.fearRules={};g.activeFear=null;g.revealedFearIds=[];g.blightCard=Math.random()<0.5?'downwardSpiral':'memoryFades';g.blightPool=(siScenario(g,'blitz')?3:2)*g.players.length+1;g.blightFlipped=false;g.winner=false;siInitPowerDecks(g);g.players.forEach(p=>{p.presence=13;p.destroyedPresence=0;});g.lands=siMakeBoard(g.players,{heart:siScenario(g,'heart'),thematic:g.islandMap==='thematic'});siCreateOceans(g);siAdversarySetup(g);g.invaderDeck=siAdversaryDeck(g,siInvaderDeck());g.invaderIndex=0;g.highImmigrationActive=siAdversary(g).id==='england'&&siAdversary(g).level>=3;g.buildChoice=null;g.buildResolution=null;g.pendingExploreCard=null;g.ravageDecisions={};g.ravageTargetIds=null;g.ravageLandOrder=null;g.ravageOrderPreference=[];g.fearResolvedThisPhase=0;g.invaderSlots={ravage:null,build:null,explore:null,highImmigration:null};g.players.forEach(p=>{p.energy=0;p.blitz=siScenario(g,'blitz');p.drownedHealth=0;p.energyTrack=0;p.playTrack=0;p.hand=siDraw(g,p.spirit);p.discard=[];p.played=[];p.pendingCards=[];p.powerOffers=[];p.growthState=null;p.extraCardPlays=0;p.innateUsed=false;p.secondaryInnateUsed=false;p.fastInnate=false;p.fastInnateIds=[];p.repeatTokens=[];p.wardDefend=0;p.entwinedIds=[];p.growthPending=false;p.rangeBonus=0;p.constancyReclaims=0;p.keepPlayedIds=[];p.trackReclaimUsed=false;p.trackElementChoices={};p.ready=false;});g.cleanupChoices=[];g.scenarioTasks=[];g.raidingMovedIds=[];g.militaryResponses=[];g.ritualProposal=null;g.ritualResolution=null;g.insurrectionFinal=false;g.finalRaidQueued=false;g.blitzExplore=null;g.innerLandIds=[];g.setupState={step:0};g.setupChoices=[];if(g.interactiveSetup)siInitialSetupChoices(g);g.phase='setup';if(siScenario(g,'rituals')){g.fearDeck=shuffled(SI_FEAR_CARDS.map(c=>({...c,id:crypto.randomUUID()})));g.fearVictoryCount=15;}siContinueSetup(g);}
function siCheckEnd(g){if(g.phase==='finished')return true;if(siScenario(g,'heart')&&g.round>1&&g.lands.some(l=>g.innerLandIds?.includes(l.id)&&l.towns+l.cities>0)){g.phase='finished';g.winner=false;siLog(g,'島の心臓に建物が築かれた。','defeat');return true;}if(siScenarioPending(g))return false;const rebellionDahanLoss=siScenario(g,'insurrection')&&g.lands.reduce((n,l)=>n+l.dahan,0)<2*g.players.length;if(siAdversary(g).id==='england'&&g.lands.some(l=>l.capitalReached||l.towns+l.cities>=7)){g.phase='finished';g.winner=false;siLog(g,'イングランドの町・都市が1つの土地に7個集まり、首都が完成した。','defeat');return true;}if(g.pendingCascades?.length||g.counterattackChoices?.length||g.presenceLossChoices?.length||g.vengeanceChoices?.length||g.escalationChoices?.length)return g.phase==='finished';if(siOceanNeedsCleanup(g)){siPrepareOceanCleanup(g);return false;}const cities=g.lands.reduce((n,l)=>n+l.cities,0),towns=g.lands.reduce((n,l)=>n+l.towns,0),invaders=cities+towns+g.lands.reduce((n,l)=>n+l.explorers,0);const rebellion=siScenario(g,'insurrection'),badLands=g.lands.filter(l=>l.towns+l.cities>l.dahan).length,won=rebellion?(g.terror===2&&badLands===0||g.terror>=3&&badLands<g.players.length):(g.terror===3&&cities===0||g.terror===2&&cities+towns===0||g.terror===1&&invaders===0||g.terror>=4||!siScenario(g,'rituals')&&g.fearCards>=(g.fearVictoryCount||9));if(won){g.phase='finished';g.winner=true;siLog(g,'島から侵略者が退いた。全員の勝利！','victory');return true;}if(rebellion&&g.insurrectionFinal||rebellionDahanLoss||g.blightFlipped&&g.blightPool<=0||g.players.some(p=>!siPowerLands(g).some(l=>l.presenceOwners.includes(p.id)))){g.phase='finished';g.winner=false;siLog(g,'島が荒廃したか、精霊の存在が失われた。','defeat');return true;}return false;}
function siSetReady(g,p){p.ready=true;if(g.players.every(x=>x.ready))return true;return false;}
function siNext(g,phase){g.phase=phase;g.players.forEach(p=>p.ready=false);}
function siResolveInvaderPhase(g,skipFear=false){if(g.buildChoice||g.escalationChoices?.length||g.cleanupChoices?.length||siScenarioPending(g))return;if(g.pendingCascades?.length||g.counterattackChoices?.length||g.presenceLossChoices?.length||g.vengeanceChoices?.length)return;if(!skipFear)siResolveFear(g);if(siCheckEnd(g))return;g.invaderResolution??={step:-1};const state=g.invaderResolution;if(state.step===-1){state.highBuildRemaining??=(siAdversary(g).id==='england'&&siAdversary(g).level>=6&&!g.fearResolvedThisPhase?2:1);while(g.highImmigrationActive&&state.highBuildRemaining>0){if(!siBuildCard(g,g.invaderSlots.highImmigration,'immigration'))return;state.highBuildRemaining--;if(siCheckEnd(g))return;}state.step=0;}if(state.step===0){siInvader(g,'ravage');if(g.vengeanceChoices?.length||g.pendingCascades?.length||g.counterattackChoices?.length||g.presenceLossChoices?.length||g.escalationChoices?.length||g.buildChoice)return;if(siCheckEnd(g))return;state.step=1;}if(state.step===1){if(!siBuildCard(g,g.invaderSlots.build,'build'))return;if(siCheckEnd(g))return;state.step=2;}if(state.step===2){siInvader(g,'explore');if(g.escalationChoices?.length||g.buildChoice||siScenarioPending(g))return;state.step=3;}g.invaderResolution=null;if(g.phase==='finished'||siCheckEnd(g))return;g.greenSkipped=null;siNext(g,'slow');siLog(g,'侵略者の行動が終わりました。遅い能力を解決してください。','phase');}
function siGreenCandidates(g,kind){const card=g.invaderSlots?.[kind];if(!card)return[];const terrains=card.terrains||[card.terrain];return g.lands.filter(l=>(card.coastal?l.coastal:terrains.includes(l.terrain))&&l.presenceOwners.filter(id=>g.players.some(p=>p.id===id&&p.spirit==='green')).length>=2&&l.explorers+l.towns+l.cities>0).map(l=>l.id);}
function siStartGreen(g){g.fearResolvedThisPhase=0;if(siScenario(g,'rituals'))siAfterFear(g);else siResolveFear(g);}
function siAfterFear(g){if(g.ritualResolution){siContinueRitual(g);return;}if(siCheckEnd(g))return;if(siAdversary(g).id==='england'){siResolveInvaderPhase(g,true);return;}const options={ravage:siGreenCandidates(g,'ravage'),build:siGreenCandidates(g,'build')};if(!options.ravage.length&&!options.build.length){siResolveInvaderPhase(g,true);return;}g.greenOptions=options;g.greenSkipped={ravage:[],build:[]};g.phase='green';g.players.forEach(p=>{p.ready=p.spirit!=='green';});siLog(g,'緑の精霊は聖域の存在を犠牲にして荒廃または建設を止められます。','phase');}
function siProgress(g){
 if(g.phase==='growth'){g.players.forEach(p=>{p.energy+=siTrackValue(p,'energy');});siNext(g,'play');siLog(g,'成長完了。精霊ボードのエネルギートラックに従って精霊力を得ました。','phase');return;}
 if(g.phase==='play'){siNext(g,'fast');siLog(g,'カードの準備が完了。早い能力を解決します。','phase');return;}
 if(g.phase==='fast'){if(g.blightFlipped){siNext(g,'blight');siLog(g,'荒廃した島の効果を選んでください。','blight');return;}siStartGreen(g);return;}
 if(g.phase==='blight'){siStartGreen(g);return;}
 if(g.phase==='slow'){siNext(g,'cleanup');siLog(g,'遅い能力が完了。ラウンドを終えます。','phase');return;}
 if(g.phase==='cleanup'){siAllNodes(g).forEach(l=>{for(const type of ['explorers','towns','cities'])l.invaderDamage[type]=Array(l[type]).fill(0);l.dahanDamage=Array(l.dahan).fill(0);l.defend=0;l.skipAll=false;l.dahanRavageImmune=false;l.dahanSimultaneous=false;l.dreadApparitions=false;l.preventBlight=false;l.dahanImmune=false;l.dahanHealthBonus=0;l.vengeance=[];});g.fearRules={};g.round++;g.players.forEach(p=>{p.played=[];const played=p.hand.filter(c=>c.ready&&!(p.keepPlayedIds||[]).includes(c.id));p.hand=p.hand.filter(c=>!c.ready||(p.keepPlayedIds||[]).includes(c.id));p.constancyReclaims=0;p.keepPlayedIds=[];p.rangeBonus=0;p.wardDefend=0;p.entwinedIds=[];p.repeatTokens=[];played.forEach(c=>{c.ready=false;c.used=false;delete c.playSpeed;delete c.blitzAccelerated;});p.discard.push(...played.filter(c=>!c.repeatOf));p.hand.forEach(c=>{c.ready=false;c.used=false;delete c.playSpeed;delete c.blitzAccelerated;});p.pendingFastCards=[];p.innateUsed=false;p.secondaryInnateUsed=false;p.fastInnate=false;p.fastInnateIds=[];p.turnElements={};p.elementGifts={};p.trackReclaimUsed=false;p.trackElementChoices={};p.extraCardPlays=0;p.growthState=null;});siNext(g,'growth');siLog(g,`ラウンド${g.round}。精霊の成長を選んでください。`,'phase');siCheckEnd(g);}
}
function siFear(g,amount=1){for(let n=0;n<amount;n++){if(g.fearDeck.length===0){if(siScenario(g,'rituals'))return;if(siScenario(g,'insurrection')){if(!g.insurrectionFinal){g.insurrectionFinal=true;g.terror=4;}return;}g.phase='finished';g.winner=true;siLog(g,'恐怖カードをすべて獲得。全員の勝利！','victory');return;}g.fear++;g.fearPool=Math.max(0,g.fearPool-1);if(g.fear>=g.fearPerCard){g.fear=0;g.fearPool=g.fearPerCard;const card=g.fearDeck.shift();g.pendingFear.push(card);g.fearCards++;siLog(g,'恐怖カードを1枚獲得（解決時に公開）。','fear');const levelTwo=g.fearLevelCounts?.[0]||3,levelThree=levelTwo+(g.fearLevelCounts?.[1]||3);if(!siScenario(g,'rituals')){if(g.fearCards===levelTwo)g.terror=2;if(g.fearCards===levelThree)g.terror=3;}if(g.fearCards===levelTwo||g.fearCards===levelThree)siLog(g,`恐怖レベル${g.terror}に到達。`,'fear');if(g.fearDeck.length===0){if(siScenario(g,'rituals'))return;if(siScenario(g,'insurrection')){if(!g.insurrectionFinal){g.insurrectionFinal=true;g.terror=4;}return;}g.phase='finished';g.winner=true;siLog(g,'恐怖カードをすべて獲得。全員の勝利！','victory');return;}}}}
function siOwnSacredSite(p,l){return (l.presenceOwners||[]).filter(id=>id===p.id).length>=2||(p.spirit==='river'&&l.terrain==='湿地'&&l.presenceOwners.includes(p.id));}
function siFearFilter(g,l,spec){const total=l.explorers+l.towns+l.cities;if(spec.filter==='site'&&!siSacredSite(g,l,'river'))return false;if(spec.filter==='presence'&&!l.presence)return false;if(spec.filter==='coastal'&&!l.coastal)return false;if(spec.filter==='inland'&&l.coastal)return false;if(spec.filter==='dahan'&&!l.dahan)return false;if(spec.filter==='noCity'&&l.cities)return false;if(spec.maxInvaders&&total>spec.maxInvaders)return false;return true;}
function siFearTargets(g,active=g.activeFear){if(!active)return[];const task=active.tasks[active.index],s=task.spec;return g.lands.filter(l=>{if(task.landId&&l.id!==task.landId)return false;if(s.different&&active.usedLands.includes(l.id))return false;if(!siFearFilter(g,l,s))return false;if(s.removeCityAfter&&l.dahan>=2&&l.cities)return true;if(['remove','downgrade'].includes(s.kind))return s.types.some(t=>l[t]>0&&(!s.citySite||t!=='cities'||siSacredSite(g,l,'river')));if(s.kind==='push')return s.types.some(t=>l[t]>0)&&l.neighbors.length;if(s.kind==='seekPush')return l.explorers>0&&g.lands.some(n=>siAdjacent(l,n)&&n.towns+n.cities>l.towns+l.cities);if(s.kind==='seekGather')return g.lands.some(n=>siAdjacent(l,n)&&((l.towns+l.cities>0&&n.explorers>0)||(l.cities>0&&n.towns>0)));if(s.kind==='dahanMove')return l.explorers+l.towns+l.cities>0&&(l.dahan>0||g.lands.some(n=>siAdjacent(l,n)&&n.dahan>0));if(s.kind==='health'&&!s.different)return totalInvaders(l)>0;return true;});}
function totalInvaders(l){return l.explorers+l.towns+l.cities;}
function siFearGlobal(g,card,s,level){g.fearRules??={};const r=g.fearRules;
 if(s.kind==='guard')r.guard=[0,1,2,3][level];
 if(s.kind==='avoid')r.avoid=level;
 if(s.kind==='overseas'){r.coastalDefend=(r.coastalDefend||0)+3*level;if(level>=2)r.noCoastalCity=true;if(level===3)r.noCoastalBuild=true;}
 if(s.kind==='trade')r.noBuildWithCity=true;
 if(s.kind==='belief'){r.presenceDefend=(r.presenceDefend||0)+2;if(level===2)for(const p of g.players)p.energy+=g.lands.filter(l=>totalInvaders(l)>0&&siOwnSacredSite(p,l)).length;}
 if(s.kind==='scapegoats')for(const l of g.lands){const explorers=level===3&&(l.towns+l.cities)>0?l.explorers:Math.min(l.explorers,l.towns+(level>=2?l.cities*2:0));for(let n=0;n<explorers;n++)siRemoveInvader(g,l,'explorers',siPieceIndex(g,l,'explorers',0),true);if(level===3){const towns=Math.min(l.towns,l.cities);for(let n=0;n<towns;n++)siRemoveInvader(g,l,'towns',siPieceIndex(g,l,'towns',0),true);}}
}
function siFearTask(g){const a=g.activeFear;if(!a)return null;return a.tasks[a.index];}
function siAdvanceFear(g){while(g.activeFear){const a=g.activeFear;if(a.index>=a.tasks.length){siLog(g,`恐怖カード「${a.card.name}」を解決した。`,'fear');g.activeFear=null;break;}if(siFearTargets(g,a).length){g.phase='fear';g.players.forEach(p=>p.ready=p.id!==a.tasks[a.index].playerId);return true;}a.index++;}return false;}
function siResolveFear(g){if(g.cleanupChoices?.length||siScenarioPending(g)){g.resumeFear=true;return;}if(siAdvanceFear(g))return;while(g.pendingFear.length&&g.phase!=='finished'){const card=g.pendingFear.shift(),level=g.terror,s=card.effects[level-1];if(typeof s==='string')throw Error('旧版の恐怖デッキです。新しいゲームを開始してください。');g.fearResolvedThisPhase=(g.fearResolvedThisPhase||0)+1;siLog(g,`恐怖カード「${card.name}」を公開（恐怖${level}）。`,'fear');
 if(['guard','avoid','overseas','trade','belief','scapegoats'].includes(s.kind)){siFearGlobal(g,card,s,level);if(siCheckEnd(g))return;continue;}
 const tasks=s.kind==='tales'?g.lands.filter(l=>l.dahan&&totalInvaders(l)).map(l=>({playerId:l.board,landId:l.id,spec:{kind:'remove',types:['explorers','towns'],explorerCount:2,removeCityAfter:true}})):g.players.map(p=>({playerId:p.id,spec:s}));
 g.activeFear={card,level,tasks,index:0,usedLands:[]};if(siAdvanceFear(g))return;
 }if(g.phase!=='finished')siAfterFear(g);}
function siValidateDamagePlan(l,amount,plan){siSyncInvaderDamage(l);const hp=siInvaderHealth(l),capacity=Object.entries(hp).reduce((sum,[t,h])=>sum+l.invaderDamage[t].reduce((n,d)=>n+h-d,0),0),need=Math.min(amount,capacity),hits=Array.isArray(plan)?plan:[];let sum=0;const seen=new Set();for(const hit of hits){const {type,index,amount:n}=hit,key=type+':'+index;if(!hp[type]||!Number.isInteger(index)||index<0||index>=l[type]||!Number.isInteger(n)||n<0||n>hp[type]-l.invaderDamage[type][index]||seen.has(key))throw Error('ダメージの割り振りを確認してください。');seen.add(key);sum+=n;}if(sum!==need)throw Error(`${need}ダメージを割り振ってください。`);return hits;}
function siFearDamage(g,l,amount,plan){const hits=siValidateDamagePlan(l,amount,plan);for(const hit of hits)l.invaderDamage[hit.type][hit.index]+=hit.amount;for(const [t,h] of Object.entries(siInvaderHealth(l)))for(let i=l[t]-1;i>=0;i--)if(l.invaderDamage[t][i]>=h)siRemoveInvader(g,l,t,i,true);}
function siMoveInvaderAt(from,to,type,index){siSyncInvaderDamage(from);siSyncInvaderDamage(to);const [damage]=from.invaderDamage[type].splice(index,1),[id]=from.invaderIds[type].splice(index,1);from[type]--;to[type]++;to.invaderDamage[type].push(damage||0);to.invaderIds[type].push(id);siCheckCapitalAt(to);}
function siDreamDamageLand(g,l){siSyncInvaderDamage(l);const virtual={...l,invaderDamage:{}};for(const t of ['explorers','towns','cities'])virtual.invaderDamage[t]=l.invaderDamage[t].map((damage,i)=>damage+(g.powerContext?.dreamedIds.includes(l.invaderIds[t][i])?0:g.powerContext?.shadowDamage?.[l.invaderIds[t][i]]||0));return virtual;}
function siPowerDamage(g,p,l,amount,plan,pushes=[]){if(p.spirit!=='bringer'){siFearDamage(g,l,amount,plan);return;}if(!g.powerContext){g.powerContext=siPowerContext(g,p,l.id,{dreamPushes:pushes});try{return siPowerDamage(g,p,l,amount,plan,pushes);}finally{delete g.powerContext;}}const virtual=siDreamDamageLand(g,l),hits=siValidateDamagePlan(virtual,amount,plan),hp=siInvaderHealth(l),ids=[],context=g.powerContext;context.shadowDamage??={};for(const hit of hits){const id=l.invaderIds[hit.type][hit.index];if(context.dreamedIds.includes(id))continue;context.shadowDamage[id]=(context.shadowDamage[id]||0)+hit.amount;if(virtual.invaderDamage[hit.type][hit.index]+hit.amount>=hp[hit.type])ids.push(id);}siDreamInvaders(g,p,l,ids);for(const id of ids)delete context.shadowDamage[id];}
function siApplyFearChoice(g,p,a){const active=g.activeFear,task=siFearTask(g);if(g.phase!=='fear'||!task||task.playerId!==p.id)throw Error('恐怖カードの解決順を待っています。');const s=task.spec;if(a.skip){if(!s.optional)throw Error('この効果は省略できません。');active.index++;siResolveFear(g);return;}
 const l=siFearTargets(g).find(l=>l.id===a.landId);if(!l)throw Error('恐怖カードの対象を選び直してください。');const type=a.unitType;
 if(['remove','downgrade'].includes(s.kind)){const onlyCity=s.removeCityAfter&&!s.types.some(t=>l[t]>0);if(!onlyCity){if(!s.types.includes(type)||!l[type]||(s.citySite&&type==='cities'&&!siSacredSite(g,l,'river')))throw Error('対象の侵略者を選び直してください。');const count=Math.min(l[type],type==='explorers'?(s.explorerCount||1):1);for(let n=0;n<count;n++)siRemoveInvader(g,l,type,siPieceIndex(g,l,type,0),false);if(s.kind==='downgrade')siAddInvader(l,type==='cities'?'towns':'explorers',count);}if(s.removeCityAfter&&l.dahan>=2&&l.cities)siRemoveInvader(g,l,'cities',siPieceIndex(g,l,'cities',0),false);}
 if(s.kind==='health'){const health=s.presenceHealth?l.presence*s.presenceHealth:s.health;let cost=0;const counts=a.remove||{};for(const t of ['explorers','towns','cities']){const n=counts[t]||0;if(!Number.isInteger(n)||n<0||n>l[t])throw Error('取り除く侵略者数を確認してください。');cost+=n*siInvaderHealth(l)[t];}if(cost>health)throw Error(`合計体力${health}まで取り除けます。`);for(const t of ['explorers','towns','cities'])for(let n=0;n<(counts[t]||0);n++)siRemoveInvader(g,l,t,siPieceIndex(g,l,t,0),false);}
 if(['push','seekPush','seekGather','dahanMove','enheartened'].includes(s.kind)){const moves=Array.isArray(a.moves)?a.moves:[],limit=s.kind==='push'?s.count:s.kind==='enheartened'?2:1;let moved=0;for(const m of moves){const from=g.lands.find(x=>x.id===m.from),to=g.lands.find(x=>x.id===m.to),t=m.type,n=m.count;if(!from||!to||!siAdjacent(from,to)||!Number.isInteger(n)||n<0)throw Error('移動先と個数を確認してください。');if(s.kind==='push'&&(from!==l||!s.types.includes(t)))throw Error('押し出す侵略者を選んでください。');if(s.kind==='seekPush'&&(from!==l||t!=='explorers'||to.towns+to.cities<=from.towns+from.cities))throw Error('建物が多い隣接地へ遠征隊を移動してください。');if(s.kind==='seekGather'&&(to!==l||!((t==='explorers'&&l.towns+l.cities)||(t==='towns'&&l.cities))))throw Error('建物のある土地へ集めてください。');if(s.kind==='enheartened'&&(to!==l||t!=='dahan'))throw Error('対象地へダハンを集めてください。');if(s.kind==='dahanMove'&&(t!=='dahan'||(from!==l&&to!==l)))throw Error('対象地のダハンを移動してください。');if(!['explorers','towns','dahan'].includes(t)||n>from[t])throw Error('移動するコマが不足しています。');moved+=n;if(moved>limit)throw Error(`移動できるのは${limit}個までです。`);for(let i=0;i<n;i++)t==='dahan'?siMoveDahan(g,from,to,p.id,false):siMoveInvader(from,to,t,g);}}
 if(['raid','enheartened'].includes(s.kind)){const damage=s.kind==='raid'?(active.level===1?1:l.dahan*(active.level===3?2:1)):(active.level===2?(l.dahan?1:0):l.dahan);siFearDamage(g,l,damage,a.damagePlan);}
 active.usedLands.push(l.id);active.index++;siFlushDeaths(g);if(g.vengeanceChoices?.length){g.resumeFear=true;return;}if(siCheckEnd(g))return;siResolveFear(g);
}
function siFearDefend(g,l){const r=g.fearRules||{};return (r.guard===1?l.dahan:r.guard===2?(l.dahan?l.dahan+1:0):r.guard===3?2*l.dahan:0)+(l.presence?(r.presenceDefend||0):0)+(l.coastal?(r.coastalDefend||0):0);}
function siFearSkip(g,kind,l){if(l.skipAll)return true;const r=g.fearRules||{};return kind==='explore'?r.avoid===1&&l.dahan>=2:kind==='build'?((r.avoid===2&&l.dahan>l.towns+l.cities)||(r.avoid===3&&l.dahan>0)||(l.coastal&&r.noCoastalBuild)||(l.coastal&&r.noCoastalCity&&l.towns>l.cities)||(r.noBuildWithCity&&l.cities>0)):false;}
function siDestroyPresence(g,l,owner,count=1){let removed=0;while(removed<count){const index=l.presenceOwners.indexOf(owner);if(index<0)break;l.presenceOwners.splice(index,1);removed++;}l.presence=l.presenceOwners.length;const p=g.players.find(p=>p.id===owner);if(p)p.destroyedPresence=(p.destroyedPresence||0)+removed;return removed;}
function siPresenceLossTargets(g,t){const from=siAllNodes(g).find(l=>l.id===t.landId);return siAllNodes(g).filter(l=>l.presenceOwners.includes(t.playerId)&&siDistance(g,from,l)<=1);}
function siQueueCounterattack(g,l,amount){if(amount<=0||!totalInvaders(l))return;g.counterattackChoices??=[];g.counterattackChoices.push({playerId:g.players.find(p=>p.id===l.board)?.id||g.hostId,landId:l.id,targetIds:[l.id],amount});}
function siApplyCounterattack(g,p,a){const t=g.counterattackChoices?.[0];if(!t||t.playerId!==p.id)throw Error('ダハンの反撃を割り振る順番を待っています。');const l=g.lands.find(l=>l.id===t.landId);siFearDamage(g,l,t.amount,a.damagePlan||a.plans?.[l.id]||[]);g.counterattackChoices.shift();siFlushDeaths(g);if(g.counterattackChoices.length||siCheckEnd(g))return;if(g.invaderResolution)siResolveInvaderPhase(g,true);}
function siRavageDahanLoss(g,l,count){if(!count)return;const p=g.players.find(p=>p.spirit==='thunderspeaker');if(!p)return;const task={playerId:p.id,landId:l.id,count};if(siPresenceLossTargets(g,task).length){g.presenceLossChoices??=[];g.presenceLossChoices.push(task);}}
function siApplyPresenceLoss(g,p,a){const t=g.presenceLossChoices?.[0];if(!t||t.playerId!==p.id)throw Error('雷鳴の精霊の存在を失う処理を待っています。');const targets=siPresenceLossTargets(g,t),available=targets.reduce((sum,l)=>sum+l.presenceOwners.filter(id=>id===p.id).length,0),counts=a.counts||{};let total=0;for(const [id,n] of Object.entries(counts)){const l=targets.find(l=>l.id===id);if(!l||!Number.isInteger(n)||n<0||n>l.presenceOwners.filter(owner=>owner===p.id).length)throw Error('破壊する存在の土地と数を確認してください。');total+=n;}if(total!==Math.min(t.count,available))throw Error(`${Math.min(t.count,available)}個の存在を、ダハンが破壊された土地から距離1以内で選んでください。`);for(const [id,n] of Object.entries(counts))siDestroyPresence(g,targets.find(l=>l.id===id),p.id,n);g.presenceLossChoices.shift();siFlushDeaths(g);if(g.presenceLossChoices.length||g.pendingCascades?.length||g.vengeanceChoices?.length||siCheckEnd(g))return;if(g.invaderResolution)siResolveInvaderPhase(g,true);}
function siPlaceBlight(g,land){if(land.preventBlight)return 0;if(g.blightPool<=0){if(g.blightFlipped){g.phase='finished';g.winner=false;siLog(g,'島を覆う荒廃が限界に達した。','defeat');return 0;}siFlipBlight(g);}const cascade=land.blight>0;land.blight++;g.blightPool--;for(const owner of new Set(land.presenceOwners))siDestroyPresence(g,land,owner);if(cascade){g.pendingCascades??=[];g.pendingCascades.push({fromId:land.id,playerId:g.players.find(p=>p.id===land.board)?.id||g.hostId});}if(g.blightPool===0){if(!g.blightFlipped)siFlipBlight(g);else{g.phase='finished';g.winner=false;siLog(g,'島を覆う荒廃が限界に達した。','defeat');}}return 1;}
function siFlipBlight(g){g.blightFlipped=true;g.blightPool=((g.blightCard==='downwardSpiral'?5:4)-(siScenario(g,'blitz')?1:0))*g.players.length;siLog(g,`荒廃カード「${g.blightCard==='downwardSpiral'?'悪循環':'記憶は塵と消える'}」が裏返った。`,'blight');}
function siApplyCascade(g,p,a){const task=g.pendingCascades?.[0],from=siAllNodes(g).find(l=>l.id===task?.fromId),to=siPowerLands(g).find(l=>l.id===a.landId&&siAdjacent(from,l));if(!task||task.playerId!==p.id||!to)throw Error('荒廃を連鎖させる隣接地を選んでください。');g.pendingCascades.shift();siPlaceBlight(g,to);if(g.pendingCascades.length||g.phase==='finished')return;siFlushDeaths(g);if(g.vengeanceChoices?.length||siCheckEnd(g))return;if(g.resumeFear){g.resumeFear=false;siResolveFear(g);}else if(g.invaderResolution)siResolveInvaderPhase(g,true);}
function siDestroyPresenceAt(g,p,landId){const land=siAllNodes(g).find(l=>l.id===landId&&(l.presenceOwners||[]).includes(p.id));if(!land)throw Error('存在を取り除く土地を選んでください。');siDestroyPresence(g,land,p.id);siLog(g,`${p.name}の存在が荒廃カードの効果で破壊された。`,'blight');}
function siForgetForBlight(g,p,cardId){const card=siForgetPower(g,p,cardId);siLog(g,`${p.name}は荒廃カードの効果で能力「${card.name}」を忘れた。`,'blight');}
function siInvader(g,kind){let card=g.invaderSlots?.[kind];if(kind==='explore'){card=g.pendingExploreCard||g.invaderDeck[g.invaderIndex++]||null;if(!card){g.phase='finished';g.winner=false;siLog(g,'侵略者デッキから探索カードを引けず、島を守り切れなかった。','defeat');return;}if(!g.pendingExploreCard){g.pendingExploreCard=card;siAdversaryEscalation(g,card);}if(g.escalationChoices?.length)return;}if(!card)return;const terrains=card.terrains||[card.terrain],lands=g.lands.filter(l=>(card.coastal?l.coastal:terrains.includes(l.terrain))),terrainLabel=card.coastal?'沿岸':terrains.join('・');if(kind==='ravage'){g.ravageLandOrder??=[...(g.ravageOrderPreference||[]),...lands.map(l=>l.id)].filter((id,i,a)=>a.indexOf(id)===i);lands.sort((a,b)=>g.ravageLandOrder.indexOf(a.id)-g.ravageLandOrder.indexOf(b.id));g.ravageTargetIds??=lands.filter(l=>totalInvaders(l)>0).map(l=>l.id);let hits=0;for(let ri=g.ravageIndex||0;ri<lands.length;ri++){const l=lands[ri];if(!g.ravageTargetIds.includes(l.id)){g.ravageIndex=ri+1;continue;}const inv=siInvaderDamage(g,l);if(!inv||l.skipAll||g.greenSkipped?.ravage?.includes(l.id)){g.ravageIndex=ri+1;continue;}if(!Object.hasOwn(g.ravageDecisions||{},l.id)&&siMaybeGreenAction(g,l,'ravage')){g.ravageIndex=ri;return;}const prevented=g.ravageDecisions?.[l.id];if(g.ravageDecisions)delete g.ravageDecisions[l.id];g.ravageIndex=ri+1;if(prevented)continue;const earthDefend=(l.presenceOwners||[]).some(id=>g.players.some(p=>p.id===id&&p.spirit==='earth'))&&g.players.some(p=>p.spirit==='earth'&&l.presenceOwners.filter(id=>id===p.id).length>=2)?3:0;const damage=Math.max(0,inv-l.defend-earthDefend-siFearDefend(g,l)-g.players.filter(p=>l.presenceOwners.includes(p.id)).reduce((n,p)=>n+(p.wardDefend||0),0));l.defend=0;if(damage>=2){const placed=siPlaceBlight(g,l);hits+=placed;hits+=siAdversaryRavage(g,l,damage,placed);if(g.phase==='finished')return;}const dahanBefore=l.dahan,counter=l.dahanSimultaneous?l.dahan*2:null;if(damage>0&&l.dahan&&!l.dahanRavageImmune)siDamageDahan(l,damage,g);siQueueCounterattack(g,l,counter??l.dahan*2);siRavageDahanLoss(g,l,dahanBefore-l.dahan);siFlushDeaths(g);if(g.vengeanceChoices?.length||g.pendingCascades?.length||g.counterattackChoices?.length||g.presenceLossChoices?.length||g.escalationChoices?.length||g.buildChoice)return;}g.ravageIndex=0;g.ravageTargetIds=null;g.ravageLandOrder=null;g.ravageOrderPreference=[];siLog(g,`侵略者が${terrainLabel}で荒廃を広げた（${hits}個）。`,'invader');}
 if(kind==='build'){siBuildCard(g,card,'build');}
 if(kind==='explore'){const suppliedLands=g.blitzExplore?g.lands.filter(l=>g.blitzExplore.targetIds.includes(l.id)):lands.filter(l=>l.coastal||l.towns+l.cities>0||g.lands.some(x=>siAdjacent(x,l)&&(x.towns+x.cities)>0));if(siPrepareBlitzExplore(g,card,suppliedLands))return;for(const l of suppliedLands){if(!siFearSkip(g,'explore',l)){siAddInvader(l,'explorers',1+(g.blitzExplore?.picks[l.board]===l.id?1:0));siAdversaryExploreLand(g,l,card);}}siLog(g,`侵略者が${terrainLabel}を探索した。`,'invader');if(g.highImmigrationActive){const old=g.invaderSlots.ravage;if(siAdversary(g).level===3&&old?.stage===2){g.highImmigrationActive=false;g.invaderSlots.highImmigration=null;}else g.invaderSlots.highImmigration=old;}g.invaderSlots.ravage=g.invaderSlots.build;g.invaderSlots.build=card;g.invaderSlots.explore=null;g.pendingExploreCard=null;g.blitzExplore=null;}}
function siOceanOnBoard(g,board){return g.players.find(p=>p.spirit==='ocean'&&siAllNodes(g).some(l=>l.board===board&&l.presenceOwners.includes(p.id)));}
function siDrownInvader(g,l,type,ocean,index=null){index??=siPieceIndex(g,l,type,0);if(!ocean||!l[type])return false;siRemoveInvader(g,l,type,index,true);ocean.drownedHealth=(ocean.drownedHealth||0)+({explorers:1,towns:2,cities:3})[type];const energy=Math.floor(ocean.drownedHealth/g.players.length);ocean.energy+=energy;ocean.drownedHealth-=energy*g.players.length;return true;}

function siDrownMovedInvader(g,from,to,type,ocean,index=from[type]-1){siMoveInvaderAt(from,to,type,index);return siDrownInvader(g,to,type,ocean,to[type]-1);}
function siDreamInvaders(g,p,l,ids){siSyncInvaderDamage(l);const context=g.powerContext||{dreamedIds:[],pushPreferences:{}},hp={explorers:1,towns:2,cities:3};let fear=0;for(const id of ids){if(context.dreamedIds.includes(id))continue;let type=null,index=-1;for(const t of Object.keys(hp)){const i=l.invaderIds[t].indexOf(id);if(i>=0){type=t;index=i;break;}}if(!type)continue;context.dreamedIds.push(id);fear+=type==='towns'?2:type==='cities'?5:0;if(type==='cities')continue;const adjacent=siPowerLands(g).filter(to=>siAdjacent(l,to));if(!adjacent.length)continue;const preferred=context.pushPreferences[id],to=preferred?adjacent.find(to=>to.id===preferred):adjacent[0];if(!to)throw Error('悪夢で押し出す先は、その侵略者がいる土地の隣接地を選んでください。');if(to.isOcean)siDrownMovedInvader(g,l,to,type,siOceanOnBoard(g,to.board),index);else siMoveInvaderAt(l,to,type,index);}siPowerFear(g,l,fear);}
// Kinship creates physical pieces during resolution. Bind the post-replacement
// indices only after those pieces exist, before any simultaneous damage.
function siBindDreamPushes(g,l,moves){if(!Array.isArray(moves))throw Error('悪夢の押し出し先を確認してください。');siSyncInvaderDamage(l);const context=g.powerContext;if(!context)throw Error('能力の解決状態を確認してください。');const seen=new Set();for(const m of moves){if(!m||!['explorers','towns'].includes(m.type)||!Number.isInteger(m.index)||m.index<0||m.index>=l[m.type]||!siPowerLands(g).some(to=>to.id===m.to&&siAdjacent(l,to)))throw Error('置換後の侵略者と隣接する押し出し先を選び直してください。');const id=l.invaderIds[m.type][m.index];if(seen.has(id)||context.pushPreferences[id]&&context.pushPreferences[id]!==m.to)throw Error('同じ侵略者の押し出し先が重複しています。');seen.add(id);context.pushPreferences[id]=m.to;}}
function siPowerContext(g,p,targetId,payload){const pushPreferences={};for(const [landId,moves] of [[targetId,payload.dreamPushes||[]],...Object.entries(payload.extraDreamPushes||{}),...Object.entries(payload.areaDreamPushes||{})]){const l=siAllNodes(g).find(l=>l.id===landId);if(!l)continue;siSyncInvaderDamage(l);for(const m of moves){if(!['explorers','towns'].includes(m.type)||!Number.isInteger(m.index)||m.index<0||m.index>=l[m.type])throw Error('悪夢で押し出す侵略者の指定を確認してください。');const id=l.invaderIds[m.type][m.index];if(pushPreferences[id]&&pushPreferences[id]!==m.to)throw Error('同じ侵略者の押し出し先が重複しています。');pushPreferences[id]=m.to;}}return{dreamedIds:[],shadowDamage:{},pushPreferences};}
function siPowerReach(g,p,l,card,ignoreShadows=false){card=siSharedConfig(g,p,card,l);const range=(card.range??1)+(p.rangeBonus||0);if(card.repeatAdjacentTo&&!siAllNodes(g).find(n=>n.id===card.repeatAdjacentTo)?.neighbors.includes(l.id))return false;const owners=[p,...g.players.filter(x=>(p.entwinedIds||[]).includes(x.id))],sources=siPowerLands(g).filter(source=>owners.some(owner=>source.presenceOwners.includes(owner.id)&&(!card.sourceSacred||siOwnSacredSite(owner,source)))&&(!card.sourceTerrain||card.sourceTerrain.includes(source.terrain)));return sources.some(source=>siDistance(g,source,l)<=range)||(!ignoreShadows&&p.spirit==='shadows'&&p.energy>=1&&l.dahan>0&&sources.length>0);}
function siProgramConfig(c,a){if(!c.modes)return c;const mode=c.modes.find(m=>m.id===(a.mode||c.modes[0].id));if(!mode)throw Error('能力の使い方を選び直してください。');return{...c,...mode};}
function siSupportLands(g,target,c){if(!target)return[];return siPowerLands(g).filter(l=>c.supportLand==='any'?true:c.supportLand==='range1'?siCanReach(g,target,l,1):l.presenceOwners.includes(target.id));}
function siPowerFear(g,l,n){if(!n)return;siFear(g,n);if(l?.dreadApparitions)l.defend+=n*l.dreadApparitions;}
function siExecutePowerMoves(g,p,l,spec,moves){const counts={},limit=spec.limit??Infinity;let total=0;if(!Array.isArray(moves))moves=[];const available=!l?0:spec.direction==='gather'?siPowerLands(g).filter(n=>siAdjacent(n,l)).reduce((sum,n)=>sum+spec.types.reduce((k,t)=>k+Math.min(n[t],spec.limits?.[t]??Infinity),0),0):spec.types.reduce((k,t)=>k+Math.min(l[t],spec.limits?.[t]??Infinity),0);for(const m of moves){const from=siAllNodes(g).find(x=>x.id===m.from),to=siAllNodes(g).find(x=>x.id===m.to),t=m.type,n=m.count,pc=m.presenceCount||0,ocean=to?.isOcean?siOceanOnBoard(g,to.board):null,sea=!!ocean&&to?.isOcean,rescue=!!(spec.rescueOcean&&t==='dahan'&&m.viaOcean&&from?.coastal&&!from.isOcean&&to?.coastal&&!to.isOcean&&(g.oceans||[]).some(sea=>siAdjacent(from,sea)&&siOceanOnBoard(g,sea.board)?.id===spec.oceanOwnerId));if(!l||!from||!to||!spec.types.includes(t)||!Number.isInteger(n)||n<0||n>from[t]||(!spec.anyLand&&!rescue&&!siAdjacent(from,to))||(to.isOcean&&!sea))throw Error('移動するコマ・隣接地・個数を確認してください。');if((spec.direction==='gather'&&to!==l)||(spec.direction==='push'&&from!==l))throw Error('能力の対象地からの押し出し、または対象地への集合を選んでください。');counts[t]=(counts[t]||0)+n;total+=n;if(total>limit||(spec.limits&&counts[t]>(spec.limits[t]||0)))throw Error('移動できるコマの数を超えています。');if(!Number.isInteger(pc)||pc<0||pc>n||(pc&&(p.spirit!=='thunderspeaker'||t!=='dahan'))||pc>from.presenceOwners.filter(id=>id===p.id).length)throw Error('ダハンと同行する存在数を確認してください。');for(let i=0;i<n;i++){if(sea&&t!=='dahan')siDrownMovedInvader(g,from,to,t,ocean,siPieceIndex(g,from,t,from[t]-1,m.pieceIds?.[i]));else if(t==='dahan')siMoveDahan(g,from,to,p.id,false,m.pieceIds?.[i]);else siMoveInvaderAt(from,to,t,siPieceIndex(g,from,t,from[t]-1,m.pieceIds?.[i]));}for(let i=0;i<pc;i++){from.presenceOwners.splice(from.presenceOwners.indexOf(p.id),1);to.presenceOwners.push(p.id);}from.presence=from.presenceOwners.length;to.presence=to.presenceOwners.length;}if(total<Math.min(spec.required||0,available))throw Error('可能な範囲で必須の集合・押し出しを行ってください。');return counts;}
function siPowerPlacePresence(g,p,l,a){if(!l)throw Error('存在を配置する土地を選んでください。');if(p.spirit==='ocean'&&!l.coastal)throw Error('海の精霊の存在は海か沿岸に配置してください。');if(a.presenceFrom){const from=siAllNodes(g).find(x=>x.id===a.presenceFrom&&x.presenceOwners.includes(p.id));if(!from)throw Error('移動する自分の存在を選んでください。');from.presenceOwners.splice(from.presenceOwners.indexOf(p.id),1);from.presence=from.presenceOwners.length;l.presenceOwners.push(p.id);l.presence=l.presenceOwners.length;}else if(!siAddPresence(l,p,a.track==='plays'?'plays':'energy'))throw Error('配置できる存在がありません。');}
function siDamageOneBuilding(g,p,l,type,index=0){siSyncInvaderDamage(l);if(!['towns','cities'].includes(type)||!Number.isInteger(index)||index<0||index>=l[type])throw Error('ダメージを与える建物を選んでください。');siPowerDamage(g,p,l,1,[{type,index,amount:1}]);}
function siExtraProgram(g,p,c,l,target,a){if(!['concealing','favors','mantle','crops','overgrow','proliferation','fields','stem','manifestation','warning','ambush','voice','deeps','grasping','swallow','tidal','predatory','dread','dreams','midnight'].includes(c.program))return false;const s=siProgramConfig(c,a);
 if(c.program==='concealing'){siPowerFear(g,l,1);l.dahanRavageImmune=true;}
 if(c.program==='favors'){siExecutePowerMoves(g,p,l,s.move,a.moves);if(totalInvaders(l)&&l.dahan>totalInvaders(l))siPowerFear(g,l,3);}
 if(c.program==='mantle'){siPowerFear(g,null,2);if(l)siExecutePowerMoves(g,target,l,s.move,a.moves);else if(a.moves?.length)throw Error('対象精霊の存在がある土地を選んでください。');}
 if(c.program==='crops'){siPowerFear(g,l,2);const types=['towns','cities'].filter(t=>l[t]>0);if(types.length){const type=a.unitType||types[0];if(!types.includes(type))throw Error('置き換える建物を選んでください。');siRemoveInvader(g,l,type,siPieceIndex(g,l,type,0),false);siAddInvader(l,type==='cities'?'towns':'explorers');}}
 if(c.program==='overgrow'){if(s.id==='fear'){if(!l.presenceOwners.includes(p.id)||!totalInvaders(l))throw Error('自分の存在と侵略者のいる土地が必要です。');siPowerFear(g,l,3);}else siPowerPlacePresence(g,p,l,a);}
 if(c.program==='proliferation'){if(l)siPowerPlacePresence(g,target,l,a);}
 if(c.program==='fields')siExecutePowerMoves(g,p,l,s.move,a.moves);
 if(c.program==='stem'){if(['山','砂漠'].includes(l.terrain)){for(const t of ['towns','cities'])for(let i=l[t]-1;i>=0;i--)siDamageOneBuilding(g,p,l,t,i);}else if(l.towns+l.cities)siDamageOneBuilding(g,p,l,a.unitType||(l.towns?'towns':'cities'),Number(a.unitIndex||0));}
 if(c.program==='manifestation'){siPowerFear(g,l,1);siPowerDamage(g,p,l,l.dahan*l.presenceOwners.filter(id=>id===p.id).length,a.damagePlan,a.dreamPushes);}
 if(c.program==='warning'){l.defend+=3;l.dahanSimultaneous=true;}
 if(c.program==='ambush'){siExecutePowerMoves(g,p,l,s.move,a.moves);const count=Math.min(l.explorers,l.dahan);siPowerDestroy(g,p,l,'explorers',count,a);}
 if(c.program==='voice'){if(s.id==='fear'){if(!totalInvaders(l))throw Error('侵略者のいる土地を選んでください。');siPowerFear(g,l,2);}else siExecutePowerMoves(g,p,l,s.move,a.moves);}
 if(c.program==='deeps')siExecutePowerMoves(g,p,l,{...s.move,limit:l.isOcean?2:1},a.moves);
 if(c.program==='grasping'){siPowerFear(g,l,2);l.defend+=4;}
 if(c.program==='swallow'){const ocean=g.players.find(x=>x.spirit==='ocean');for(const t of ['explorers','towns'])if(l[t]){if(p.spirit==='bringer')siPowerDestroy(g,p,l,t,1,a);else if(ocean)siDrownInvader(g,l,t,ocean);else siPowerDestroy(g,p,l,t,1,a);}if(p.spirit!=='bringer')siDestroyDahan(g,l,1);}
 if(c.program==='tidal'){target.energy+=2;if(l)siExecutePowerMoves(g,target,l,{...s.move,oceanOwnerId:p.id},a.moves);else if(a.moves?.length)throw Error('対象精霊の土地を選んでください。');}
 if(c.program==='predatory'){siPowerDamage(g,p,l,2,a.damagePlan,a.dreamPushes);siExecutePowerMoves(g,p,l,s.move,a.moves);}
 if(c.program==='dread'){l.dreadApparitions=(l.dreadApparitions||0)+1;siPowerFear(g,l,1);}
 if(c.program==='dreams'){if(s.id==='fear'){if(!l.towns&&!l.cities)throw Error('建物のある土地を選んでください。');siPowerFear(g,l,Math.min(3,l.dahan));}else siExecutePowerMoves(g,p,l,s.move,a.moves);}
 if(c.program==='midnight'){if(s.id==='major'){if(!l.dahan)throw Error('ダハンのいる土地を選んでください。');siBeginPowerGain(g,p,{kind:'major',reason:c.name,midnightCardId:c.id,dahan:l.dahan});}else{if(!totalInvaders(l))throw Error('侵略者のいる土地を選んでください。');siPowerFear(g,l,2);}}
 return true;
}
function siApplyProgram(g,p,c,a){const target=c.targetSpirit?g.players.find(x=>x.id===a.spiritId):null,l=c.targetSpirit?(c.supportLand?siSupportLands(g,target,c).find(x=>x.id===a.landId):null):siLegalTarget(g,p,c).find(x=>x.id===a.landId);if(c.targetSpirit&&(!target||(c.targetAnother&&g.players.length>1&&target.id===p.id)))throw Error('対象の精霊を選んでください。');if(!c.targetSpirit&&!l)throw Error('能力の対象地を選び直してください。');if(c.supportLand&&!l&&siSupportLands(g,target,c).length)throw Error('対象精霊の土地を選んでください。');siPayShadowRange(g,p,c,l);if(c.program==='shared'){siApplySharedPower(g,p,c,l,target,a);c.used=true;p.played.push(c.id);siLog(g,`${p.name}使用：${c.name}。`,'power');siCheckEnd(g);return;}if(siExtraProgram(g,p,c,l,target,a)){c.used=true;p.played.push(c.id);siLog(g,`${p.name}使用：${c.name}。`,'power');siCheckEnd(g);return;}
 if(c.program==='shatter'){siPowerFear(g,l,1);if(l.towns)siPowerDestroy(g,p,l,'towns',1,a);}
 if(c.program==='storm')siPowerEachDamage(g,p,l,1);
 if(c.program==='healingLand'){if(l.blight){l.blight--;g.blightPool++;}l.defend+=4;}
 if(c.program==='stillness')l.skipAll=true;
 if(c.program==='rituals'){const damage=l.dahan>=3?5:2;if(l.dahan>=3)siPowerFear(g,l,2);siPowerDamage(g,p,l,damage,a.damagePlan,a.dreamPushes);}
 if(c.program==='fruitful')siExecutePowerMoves(g,p,l,{direction:'gather',types:['explorers','dahan'],limits:{explorers:2,dahan:2}},a.moves);
 if(c.program==='flashFloods')siPowerDamage(g,p,l,l.coastal?2:1,a.damagePlan,a.dreamPushes);
 if(c.program==='vigor')target.energy+=target.id===p.id?1:target.hand.filter(x=>x.ready).length;
 if(c.program==='lightningBoon'){const ids=Array.isArray(a.fastCards)?a.fastCards:[];if(new Set(ids).size!==ids.length||ids.length>2)throw Error('早くする能力は最大2つです。');const cards=ids.map(id=>['innate','innate2'].includes(id)?siInnateCard(target,id):target.hand.find(x=>x.id===id&&x.ready&&!x.used));if(cards.some(x=>!x||x.speed!=='slow'||(siScenario(g,'blitz')?x.blitzAccelerated:x.playSpeed==='fast')))throw Error('未解決の遅い能力を選んでください。');for(const card of cards){if(['innate','innate2'].includes(card.id)){target.fastInnateIds??=[];target.fastInnateIds.push(card.id);}else{if(siScenario(g,'blitz')&&!card.blitzAccelerated)target.energy++;card.blitzAccelerated=true;card.playSpeed='fast';}}if(cards.length)target.ready=false;}
 if(['harbingers','washAway','bounty'].includes(c.program)){const spec=c.program==='bounty'?{direction:'gather',types:['dahan'],limit:2}:c.program==='washAway'?{direction:'push',types:['explorers','towns'],limit:3}:{direction:'push',types:['dahan'],limit:2};siExecutePowerMoves(g,p,l,spec,a.moves);if(c.program==='harbingers'&&(a.moves||[]).some(m=>m.count&&siAllNodes(g).some(to=>to.id===m.to&&to.towns+to.cities>0)))siPowerFear(g,l,1);if(c.program==='bounty'&&l.dahan>=2){siAddDahan(l,1);p.energy++;}}
 c.used=true;p.played.push(c.id);siLog(g,`${p.name}使用：${c.name}。`,'power');siCheckEnd(g);
}
function siLegalTarget(g,p,card){if(card.targetSpirit)return[];return siPowerLands(g).filter(l=>siPowerReach(g,p,l,card)&&(!card.requiresCoastal||l.coastal)&&(!card.requiresInvaders||totalInvaders(l)>0)&&(!card.requiresDahan||l.dahan>0)&&(!card.requiresDahanOrInvaders||l.dahan+totalInvaders(l)>0)&&(!card.requiresNoBlight||!l.blight)&&(!card.requiresNoInvaders||!totalInvaders(l))&&(!card.requiresBlight||l.blight>0)&&(!card.targetTerrains||card.targetTerrains.includes(l.terrain))&&(()=>{if(card.effect==='damage')return l.explorers+l.towns+l.cities>0;if(card.effect==='push')return l.explorers+l.towns+l.cities>0&&(g.lands.some(x=>siAdjacent(x,l))||(l.coastal&&g.players.some(x=>x.spirit==='ocean')));if(card.effect==='defend')return true;if(card.effect==='presence')return p.presence>0;if(card.effect==='gather')return g.lands.some(x=>siAdjacent(x,l)&&x.dahan>0);if(card.effect==='pushDahan')return l.dahan>0;return true;})());}
function siPayShadowRange(g,p,card,l){if(l&&p.spirit==='shadows'&&!card.targetSpirit&&!siPowerReach(g,p,l,card,true)){p.energy--;siLog(g,`${p.name}が精霊力1でダハンのいる土地への射程を無視した。`,'power');}}
function siApply(g,p,card,targetId,choice,destinationId,sourceId,track,payload={}){g.powerContext=siPowerContext(g,p,targetId,payload);try{return siApplyCore(g,p,card,targetId,choice,destinationId,sourceId,track,payload);}finally{delete g.powerContext;}}
function siApplyCore(g,p,card,targetId,choice,destinationId,sourceId,track,payload={}){if(card.program){siApplyProgram(g,p,card,payload);return;}const l=g.lands.find(x=>x.id===targetId),legal=card.effect==='fear'?[]:siLegalTarget(g,p,card);if(card.effect!=='fear'&&((targetId&&!legal.some(x=>x.id===targetId))||(!targetId&&legal.length)))throw Error('対象の土地を選び直してください。');siPayShadowRange(g,p,card,l);if(card.effect==='damage'&&l){const dmg=card.label.includes('2ダメージ')?2:1;siDamageInvaders(g,l,dmg,choice,p.spirit);}
 if(card.effect==='push'&&l){const type=['explorers','towns','cities'].includes(choice)&&l[choice]>0?choice:null,dest=g.lands.find(x=>x.id===destinationId&&siAdjacent(x,l));if(!type)throw Error('押し出す侵略者を選び直してください。');if(dest)siMoveInvader(l,dest,type,g);else{const ocean=siOceanOnBoard(g,l.board);if(!ocean||destinationId!==`ocean:${l.board}`||!l.coastal)throw Error('隣接先か海を選び直してください。');siDrownInvader(g,l,choice,ocean);siLog(g,`海の貪り手が${choice==='explorers'?'遠征隊':choice==='towns'?'町':'都市'}を呑み込み、精霊力を得た。`,'power');}}
 if(card.effect==='defend'&&l)l.defend+=2;
 if(card.effect==='fear')siFear(g,Number(card.label.match(/恐怖を(\d+)/)?.[1]||1));
 if(card.effect==='presence'&&l&&p.presence>0&&!siAddPresence(l,p,track==='plays'?'plays':'energy'))throw Error('残りのある存在トラックを選んでください。');
 if(card.effect==='gather'&&l){const source=g.lands.find(x=>x.id===sourceId&&siAdjacent(x,l)&&x.dahan>0);if(source){if(choice==='movePresence'&&!source.presenceOwners.includes(p.id))throw Error('この土地にあなたの存在がありません。');siMoveDahan(g,source,l,p.id,!!(p.spirit==='thunderspeaker'&&choice==='movePresence'));}}
 if(card.effect==='pushDahan'&&l&&l.dahan){const dest=siPowerLands(g).find(x=>x.id===destinationId&&siAdjacent(x,l));if(!dest)throw Error('ダハンの移動先を選び直してください。');if(choice==='movePresence'&&!l.presenceOwners.includes(p.id))throw Error('この土地にあなたの存在がありません。');siMoveDahan(g,l,dest,p.id,!!(p.spirit==='thunderspeaker'&&choice==='movePresence'));}
 card.used=true;p.played.push(card.id);siLog(g,`${p.name}使用：${card.name}${l?`（${l.terrain}）`:''}。`,'power');siCheckEnd(g);}
function siAction(g,p,a){siValidatePiecePreferences(g,a.piecePreferences);g.piecePreferences=a.piecePreferences||{};try{const result=siActionCore(g,p,a);siFinishScenarioAction(g);siFlushDeaths(g);siPrepareOceanCleanup(g);if(siScenario(g,'insurrection')&&!['lobby','setup','finished'].includes(g.phase))siCheckEnd(g);return result;}finally{delete g.piecePreferences;}}
function siActionCore(g,p,a){if(a.type==='chat'){const text=String(a.message||'').trim().slice(0,180);if(!text)throw Error('メッセージを入力してください。');g.messages.push({id:crypto.randomUUID(),name:p.name,text});g.messages=g.messages.slice(-50);return;}
 if(a.type==='spirit'){if(g.phase!=='lobby')throw Error('精霊を選べるのは開始前だけです。');if(!SI_SPIRITS.some(s=>s.id===a.spirit))throw Error('精霊を選び直してください。');if(g.players.some(x=>x.id!==p.id&&x.spirit===a.spirit))throw Error('その精霊はほかの参加者が選んでいます。');p.spirit=a.spirit;return;}
 if(a.type==='map'){if(g.phase!=='lobby'||p.id!==g.hostId||!['balanced','thematic'].includes(a.map))throw Error('開始前のホストがマップを選んでください。');g.islandMap=a.map;return;}
 if(a.type==='scenario'){if(g.phase!=='lobby'||p.id!==g.hostId||!SI_SCENARIOS.some(s=>s.id===a.scenario))throw Error('開始前のホストがシナリオを選んでください。');g.scenario=a.scenario;return;}
 if(a.type==='adversary'){if(g.phase!=='lobby'||p.id!==g.hostId)throw Error('敵対国を変更できるのは開始前のホストだけです。');const info=SI_ADVERSARIES.find(x=>x.id===a.adversaryId),level=Number(a.level);if(!info||!Number.isInteger(level)||level<0||level>=info.difficulty.length)throw Error('敵対国とレベルを選び直してください。');g.adversary={id:info.id,level};return;}
 if(a.type==='start'){if(p.id!==g.hostId||!['lobby','finished'].includes(g.phase))throw Error('ホストだけが開始できます。');siStart(g,{interactiveSetup:true});return;}
 if(a.matchId!==g.matchId)throw Error('ゲームの状態が更新されました。画面を読み直してください。');
 if(g.cleanupChoices?.length){if(a.type!=='oceanCleanup')throw Error('海域のコマを沿岸へ整理してください。');siApplyOceanCleanup(g,p,a);return;}
 if(g.setupChoices?.length){if(a.type!=='setupChoice')throw Error('準備中の配置を先に完了してください。');siApplySetupChoice(g,p,a);return;}
 if(g.pendingCascades?.length){if(a.type!=='cascadeChoice')throw Error('荒廃の連鎖先を先に選んでください。');siApplyCascade(g,p,a);return;}
 if(g.counterattackChoices?.length){if(a.type!=='counterattack')throw Error('ダハンの反撃ダメージを先に割り振ってください。');siApplyCounterattack(g,p,a);return;}
 if(g.presenceLossChoices?.length){if(a.type!=='presenceLoss')throw Error('雷鳴の精霊が失う存在を先に選んでください。');siApplyPresenceLoss(g,p,a);return;}
 if(g.vengeanceChoices?.length){if(a.type!=='vengeanceDamage')throw Error('死者の復讐のダメージを先に解決してください。');siApplyVengeance(g,p,a);return;}
 if(g.scenarioTasks?.length){if(a.type!=='scenarioChoice')throw Error('シナリオの追加効果を先に解決してください。');siApplyScenarioChoice(g,p,a);return;}
 if(['proposeRitual','ritualContribute','cancelRitual','performRitual'].includes(a.type)){siRitualAction(g,p,a);return;}
 if(g.ritualProposal)throw Error('儀式への負担を決めるか、儀式を中止してください。');
 if(g.buildChoice){if(a.type!=='invaderChoice')throw Error('緑の精霊が今回の侵略者行動を止めるか選んでください。');siApplyInvaderChoice(g,p,a);return;}
 if(g.escalationChoices?.length){if(a.type!=='escalationChoice')throw Error('敵対国の追加配置を先に解決してください。');siApplyEscalation(g,p,a);return;}
 if(['choosePowerDeck','pickPower'].includes(a.type)){siPowerGain(g,p,a);return;}
 if(g.powerGains?.length)throw Error('能力の獲得が完了するまでお待ちください。');
  if(g.immediateRepeats?.length){const r=g.immediateRepeats[0],card=p.hand.find(c=>c.id===r.cardId);if(a.type==='skipRepeat'&&r.playerId===p.id&&card&&!siLegalTarget(g,p,card).length&&!card.targetSpirit){p.hand=p.hand.filter(c=>c.id!==card.id);g.immediateRepeats.shift();return;}if(a.type!=='resolve'||r.playerId!==p.id||a.cardId!==r.cardId)throw Error('直ちに繰り返す能力を先に解決してください。');}
 if(a.type==='planRavage'){if(g.phase!=='fast'||g.invaderResolution)throw Error('荒廃の順番は侵略者フェイズ前に決めてください。');const ids=a.landIds;if(!Array.isArray(ids)||new Set(ids).size!==ids.length||ids.some(id=>!g.lands.some(l=>l.id===id)))throw Error('土地の順番を重複なく選んでください。');g.ravageOrderPreference=ids;return;}
 if(a.type==='chooseTrackElements'){const available=siTrackAnyOptions(p),choices=a.choices||{};if(!Object.keys(choices).length||Object.entries(choices).some(([key,e])=>!available.includes(key)||!['太陽','月','炎','風','水','大地','植物','動物'].includes(e)))throw Error('未選択のトラック元素を選んでください。このターンは変更できません。');p.trackElementChoices={...(p.trackElementChoices||{}),...choices};return;}
 if(a.type==='trackReclaimOne'){if(!['growth','play'].includes(g.phase)||!siTrackCanReclaim(p))throw Error('今はトラックの1枚回収を使えません。');const i=p.discard.findIndex(c=>c.id===a.cardId);if(i<0)throw Error('回収する捨て札を1枚選んでください。');const c=p.discard.splice(i,1)[0];c.ready=false;c.used=false;delete c.playSpeed;delete c.blitzAccelerated;p.hand.push(c);p.trackReclaimUsed=true;return;}
 if(a.type==='accelerateInnate'){const id=a.cardId||'innate',innate=siInnateCard(p,id);if(g.phase!=='fast'||!innate||innate.speed!=='slow'||innate.playSpeed==='fast'||!(p.spirit==='lightning'&&(p.pendingFastCards||[]).length+1<=(siElementCounts(p)['風']||0)||p.spirit==='thunderspeaker'&&(siElementCounts(p)['風']||0)>=4))throw Error('今は固有能力を早くできません。');p.fastInnateIds??=[];p.fastInnateIds.push(id);if(p.spirit==='lightning')p.fastInnate=true;p.ready=false;return;}
 if(a.type==='giftPower'){const gift=g.giftChoices?.[0];if(!gift||gift.playerId!==p.id)throw Error('今は能力を渡せません。');if(a.cardId){const i=p.hand.findIndex(c=>c.id===a.cardId&&!c.ready);if(i<0)throw Error('プレイ中でない手札の能力を選んでください。');g.players.find(x=>x.id===gift.targetId).hand.push(p.hand.splice(i,1)[0]);}g.giftChoices.shift();return;}
 if(a.type==='repeatPower'){if(!['fast','slow'].includes(g.phase)||p.ready)throw Error('今は能力を繰り返せません。');const card=p.hand.find(c=>c.id===a.cardId&&c.ready&&c.used&&!c.repeatOf&&siScenarioSpeed(g,c)===g.phase);const grant=(p.repeatTokens||[]).find(t=>t.remaining>0&&!t.usedCardIds.includes(card?.id)&&siPrintedPowerCost(g,card)<=(t.maxCost??Infinity)&&(t.free||p.energy>=siPrintedPowerCost(g,card)));if(!card||!grant||!grant.free&&p.energy<siPrintedPowerCost(g,card))throw Error('この能力を繰り返す権利か精霊力がありません。');if(!grant.free)p.energy-=siPrintedPowerCost(g,card);grant.remaining--;grant.usedCardIds.push(card.id);siMakeRepeat(g,p,card);return;}

 if(g.giftChoices?.length)throw Error('能力を渡すか見送るか選んでください。');
 if(a.type==='blightChoice'){if(g.phase!=='blight'||p.ready)throw Error('荒廃カードの選択を行えません。');const lands=siAllNodes(g).filter(l=>(l.presenceOwners||[]).includes(p.id));if(!lands.length)throw Error('取り除ける存在がありません。');if(g.blightCard==='downwardSpiral'||a.choice==='presence'){siDestroyPresenceAt(g,p,a.landId);}else if(a.choice==='forget'){siForgetForBlight(g,p,a.cardId);}else throw Error('荒廃カードの効果を選び直してください。');if(siCheckEnd(g))return;p.ready=true;if(g.players.every(x=>x.ready))siProgress(g);return;}
 if(a.type==='fearChoice'){siApplyFearChoice(g,p,a);return;}
 if(a.type==='greenChoice'){if(g.phase!=='green'||p.ready||p.spirit!=='green')throw Error('緑の精霊の選択を行えません。');const ravage=Array.isArray(a.ravage)?[...new Set(a.ravage)]:[],build=Array.isArray(a.build)?[...new Set(a.build)]:[],ids=[...ravage,...build],allowed=new Set([...(g.greenOptions?.ravage||[]),...(g.greenOptions?.build||[])]);if(ids.some(id=>!allowed.has(id))||ravage.some(id=>!(g.greenOptions?.ravage||[]).includes(id))||build.some(id=>!(g.greenOptions?.build||[]).includes(id)))throw Error('建設または荒廃を止める土地を選び直してください。');const totals=new Map();for(const id of ids)totals.set(id,(totals.get(id)||0)+1);for(const [id,count] of totals){const l=g.lands.find(x=>x.id===id),owned=l.presenceOwners.filter(owner=>owner===p.id).length;if(count>Math.max(0,owned-1))throw Error('聖域を保てる数まで存在を選んでください。');}for(const [id,count] of totals){const l=g.lands.find(x=>x.id===id);siDestroyPresence(g,l,p.id,count);siLog(g,`${p.name}が聖域の存在を犠牲にし、侵略者の行動を止めた。`,'power');}g.greenSkipped.ravage.push(...ravage);g.greenSkipped.build.push(...build);p.ready=true;if(g.players.every(x=>x.ready))siResolveInvaderPhase(g,true);return;}
 if(a.type==='beginGrowth'){if(g.phase!=='growth'||p.ready||p.growthState||p.growthPending)throw Error('今は成長を選べません。');const bundle=SI_GROWTH[p.spirit]?.[Number(a.growthIndex)];if(!bundle)throw Error('成長を選び直してください。');p.growthState={name:bundle.name,effects:structuredClone(bundle.effects)};return;}
 if(a.type==='growthEffect'){if(g.phase!=='growth'||p.ready||!p.growthState||p.growthPending)throw Error('今は成長効果を解決できません。');const i=Number(a.effectIndex),effect=p.growthState.effects[i];if(!Number.isInteger(i)||!effect)throw Error('未解決の成長効果を選んでください。');siPerformGrowthEffect(g,p,effect,a,{growthEffect:true,reason:'成長：能力を獲得'});p.growthState.effects.splice(i,1);if(!p.growthPending)siFinishGrowthSteps(g,p);return;}
 if(a.type==='growth'){if(g.phase!=='growth'||p.ready||p.growthPending||p.growthState)throw Error('今は成長を選べません。');const bundle=SI_GROWTH[p.spirit]?.[Number(a.growthIndex)];if(!bundle)throw Error('成長を選び直してください。');const placements=Array.isArray(a.placements)?a.placements:[],need=bundle.effects.filter(e=>e.kind==='presence').length;if(placements.length!==need)throw Error('存在の配置先をすべて選んでください。');let pi=0,gains=0;for(const effect of bundle.effects){siPerformGrowthEffect(g,p,effect,effect.kind==='presence'?{...a,placement:placements[pi++]}:a,{finishGrowth:true});if(effect.kind==='gain')gains++;}if(!gains&&siSetReady(g,p))siProgress(g);return;}

 if(a.type==='play'){if(g.phase!=='play'||p.ready)throw Error('今は能力カードを選べません。');const ids=Array.isArray(a.cardIds)?a.cardIds:[],max=siTrackValue(p,'plays');if(ids.length>max)throw Error(`このラウンドに使える能力カードは最大${max}枚です（カードプレイトラック）。`);if(new Set(ids).size!==ids.length)throw Error('同じ能力カードを重複して選べません。');const cards=ids.map(id=>p.hand.find(c=>c.id===id&&!c.used));if(cards.some(x=>!x))throw Error('手札からカードを選び直してください。');const cost=cards.reduce((n,c)=>n+siScenarioCost(g,c),0);if(cost>p.energy)throw Error('精霊力が足りません。');const fastIds=Array.isArray(a.fastCards)?a.fastCards:[],fastCards=fastIds.map(id=>cards.find(c=>c.id===id));if(new Set(fastIds).size!==fastIds.length||fastCards.some(c=>!c||c.speed!=='slow')||(fastIds.length&&p.spirit!=='lightning')||fastIds.length>cards.filter(c=>(c.elements||[c.element]).includes('風')).length)throw Error('雷の申し子は、このラウンドに得た風の数まで遅い能力を早くできます。');p.energy-=cost;p.pendingCards=ids;p.pendingFastCards=fastIds;if(siSetReady(g,p)){g.players.forEach(x=>{x.turnElements={};x.innateUsed=false;for(const id of x.pendingCards||[]){const c=x.hand.find(y=>y.id===id);if(c){c.ready=true;c.blitzAccelerated=(x.pendingFastCards||[]).includes(id);if(siScenario(g,'blitz')&&c.blitzAccelerated&&c.speed==='slow')x.energy++;c.playSpeed=siScenario(g,'blitz')?'fast':c.blitzAccelerated?'fast':c.speed;for(const e of c.elements||[c.element])x.turnElements[e]=(x.turnElements[e]||0)+1;}}});siProgress(g);}return;}
 if(a.type==='resolve'){if(!['fast','slow'].includes(g.phase)||p.ready)throw Error('能力を使えるフェーズではありません。');const c=['innate','innate2'].includes(a.cardId)?siInnateCard(p,a.cardId):p.hand.find(x=>x.id===a.cardId&&x.ready&&!x.used&&siScenarioSpeed(g,x)===g.phase);if(!c||(siScenarioSpeed(g,c)!==g.phase))throw Error('解決する能力を選び直してください。');if(c.cardType==='innate'&&siScenario(g,'blitz')&&(c.speed==='fast'||(p.fastInnateIds||[]).includes(c.id)||p.spirit==='thunderspeaker'&&(siElementCounts(p)['風']||0)>=4))p.energy++;const choice=a.movePresence&&p.spirit==='thunderspeaker'?'movePresence':a.choice;siApply(g,p,c,a.landId,choice,a.destinationId,a.sourceId,a.track,a);if(c.cardType==='innate'&&!c.repeatOf){if(c.id==='innate2')p.secondaryInnateUsed=true;else p.innateUsed=true;}if(g.immediateRepeats?.[0]?.cardId===c.id)g.immediateRepeats.shift();return;}
 if(a.type==='done'){if(g.phase==='cleanup'){const ids=a.reclaimCardIds||[];if(!Array.isArray(ids)||new Set(ids).size!==ids.length||ids.length>(p.constancyReclaims||0)||ids.some(id=>!p.hand.some(c=>c.id===id&&c.ready)))throw Error('ラウンド末に回収するカードを選び直してください。');p.keepPlayedIds=ids;}if(!['fast','slow','cleanup'].includes(g.phase))throw Error('このフェーズは完了できません。');if(p.ready)throw Error('すでに完了しています。');p.ready=true;if(g.players.every(x=>x.ready))siProgress(g);return;}
 if(a.type==='next'){if(p.id!==g.hostId||g.phase!=='finished')throw Error('ホストだけが再戦を開始できます。');g.phase='lobby';g.players.forEach(x=>{x.spirit=null;x.ready=false;x.hand=[];});g.lands=[];g.log=[];return;}
 throw Error('操作が正しくありません。');}
function siView(g,p){const viewCards=p?[...p.hand.filter(c=>c.ready&&!c.used),...siInnateCards(p)]:[];const legalTargets=p?Object.fromEntries(viewCards.map(c=>[c.id,siLegalTarget(g,p,c).map(l=>l.id)])):{};const growthTargets=p?(g.lands||[]).filter(l=>siCanReach(g,p,l,3)).map(l=>l.id):[],lands=siAllNodes(g).map(l=>({...l,defend:l.defend+g.players.filter(p=>l.presenceOwners.includes(p.id)).reduce((n,p)=>n+(p.wardDefend||0),0),oceanActive:l.isOcean?!!siOceanOnBoard(g,l.board):undefined,sacredSite:siSacredSite(g,l)||siSacredSite(g,l,'river')}));return{islandMap:g.islandMap||'balanced',oceanCleanup:g.cleanupChoices?.[0]||null,ravageOrderPreference:g.ravageOrderPreference||[],invaderResolutionActive:!!g.invaderResolution,scenario:SI_SCENARIOS.find(s=>s.id===(g.scenario||'none')),scenarioOptions:SI_SCENARIOS,setupChoice:g.setupChoices?.[0]?{...g.setupChoices[0],targetIds:siSetupTargets(g,g.setupChoices[0]).map(l=>l.id)}:null,scenarioChoice:g.scenarioTasks?.[0]?{...g.scenarioTasks[0],targetIds:siScenarioTaskTargets(g,g.scenarioTasks[0]).map(l=>l.id)}:null,ritualProposal:g.ritualProposal||null,ritualTargets:siScenario(g,'rituals')?siRitualTargets(g).map(l=>l.id):[],innerLandIds:g.innerLandIds||[],buildChoice:g.buildChoice||null,highImmigrationActive:!!g.highImmigrationActive,pendingExploreCard:g.pendingExploreCard||null,adversary:{id:siAdversary(g).id,level:siAdversary(g).level,name:siAdversary(g).name,difficulty:siAdversary(g).difficulty[siAdversary(g).level]},adversaryOptions:SI_ADVERSARIES.map(x=>({id:x.id,name:x.name,difficulty:x.difficulty})),escalationChoice:g.escalationChoices?.[0]?{...g.escalationChoices[0],targetIds:siEscalationTargets(g,g.escalationChoices[0]).map(l=>l.id)}:null,fearLevelCounts:g.fearLevelCounts||[3,3,3],code:g.code,revision:g.revision,phase:g.phase,hostId:g.hostId,matchId:g.matchId,round:g.round||0,terror:g.terror||1,fear:g.fear||0,fearPerCard:g.fearPerCard||0,fearPool:g.fearPool||0,fearCards:g.fearCards||0,fearDeckCount:g.fearDeck?.length||0,blightPool:g.blightPool||0,blightFlipped:!!g.blightFlipped,blightCard:g.blightFlipped?g.blightCard:null,invaderSlots:g.invaderSlots||{},invaderDeckRemaining:Math.max(0,(g.invaderDeck?.length||0)-(g.invaderIndex||0)),invaderCard:g.invaderSlots?.explore||null,legalTargets,powerSupportTargets:p?Object.fromEntries(p.hand.filter(c=>c.supportLand).map(c=>[c.id,Object.fromEntries(g.players.map(target=>[target.id,siSupportLands(g,target,c).map(l=>l.id)]))])):{},faceDownFearOptions:[...(g.pendingFear||[]).map((c,i)=>({id:c.id,zone:'獲得済み',position:i+1})),...(g.fearDeck||[]).map((c,i)=>({id:c.id,zone:'山札',position:i+1}))].filter(c=>!(g.revealedFearIds||[]).includes(c.id)),revealedFearCards:[...(g.pendingFear||[]),...(g.fearDeck||[])].filter(c=>(g.revealedFearIds||[]).includes(c.id)).map(c=>({id:c.id,name:c.name})),fearResolution:g.phase==='fear'&&g.activeFear?{name:g.activeFear.card.name,level:g.activeFear.level,playerId:siFearTask(g)?.playerId,spec:siFearTask(g)?.spec,targetIds:siFearTargets(g).map(l=>l.id)}:null,greenOptions:p?.spirit==='green'?(g.greenOptions||{ravage:[],build:[]}):null,counterattackChoice:g.counterattackChoices?.[0]||null,presenceLoss:g.presenceLossChoices?.[0]?{...g.presenceLossChoices[0],targetIds:siPresenceLossTargets(g,g.presenceLossChoices[0]).map(l=>l.id)}:null,cascadeChoice:g.pendingCascades?.[0]?{...g.pendingCascades[0],targetIds:siPowerLands(g).filter(l=>siAdjacent(siAllNodes(g).find(n=>n.id===g.pendingCascades[0].fromId),l)).map(l=>l.id)}:null,vengeanceChoice:g.vengeanceChoices?.[0]||null,immediateRepeat:g.immediateRepeats?.[0]||null,giftChoice:g.giftChoices?.length?{playerId:g.giftChoices[0].playerId}:null,powerGain:g.powerGains?.length?{playerId:g.powerGains[0].playerId,reason:g.powerGains[0].reason}:null,powerDeckCounts:g.powerDecks?Object.fromEntries(Object.entries(g.powerDecks).map(([k,v])=>[k,v.length])):{},growthTargets,growthOptions:p?(SI_GROWTH[p.spirit]||[]):[],players:g.players.map(x=>({id:x.id,name:x.name,spirit:x.spirit,elements:siElementCounts(x),islandBoard:x.islandBoard||null,energy:x.energy,presence:x.presence,destroyedPresence:x.destroyedPresence||0,oceanPresence:(g.oceans||[]).some(l=>l.presenceOwners.includes(x.id)),playedPowers:[...x.hand.filter(c=>c.ready).map(c=>({id:c.id,name:c.name,speed:c.speed,playSpeed:c.playSpeed,blitzAccelerated:!!c.blitzAccelerated,used:c.used})),...siInnateCards(x)],ready:x.ready,handCount:x.hand?.filter(c=>!c.used).length||0,boardId:x.id,mapLayout:x.mapLayout,mapVertices:x.mapVertices,trackRemaining:siTrackRemaining(x),cardPlayLimit:siTrackValue(x,'plays'),energyIncome:siTrackValue(x,'energy')})),lands,log:g.log||[],messages:g.messages||[],me:p?{id:p.id,thunderAccelerations:p.spirit==='thunderspeaker'&&g.phase==='fast'&&(siElementCounts(p)['風']||0)>=4?siInnateCards(p).filter(c=>c.playSpeed!=='fast').map(c=>({id:c.id,name:c.name})):[],growthState:p.growthState||null,growthEffectTargets:p.growthState?.effects.map(e=>({landIds:e.kind==='presence'?siGrowthTargets(g,p,e).map(l=>l.id):[],oceans:siGrowthOceanOptions(g,p,e)}))||[],trackAnyOptions:siTrackAnyOptions(p),canTrackReclaim:['growth','play'].includes(g.phase)&&siTrackCanReclaim(p),canAccelerateInnate:p.spirit==='lightning'&&g.phase==='fast'&&!!siInnateCard(p)&&!p.fastInnate&&(p.pendingFastCards||[]).length<(siElementCounts(p)['風']||0),shadowRangeCosts:Object.fromEntries(viewCards.map(c=>[c.id,siLegalTarget(g,p,c).filter(l=>p.spirit==='shadows'&&!siPowerReach(g,p,l,c,true)).map(l=>l.id)])),powerConfigs:Object.fromEntries(viewCards.filter(c=>c.program==='shared').map(c=>[c.id,Object.fromEntries((c.targetSpirit?[null]:siPowerLands(g)).map(l=>[l?.id||'spirit',siSharedConfig(g,p,c,l)]))])),powerGain:g.powerGains?.[0]?.playerId===p.id?g.powerGains[0]:null,constancyReclaims:p.constancyReclaims||0,repeatOptions:p.hand.filter(c=>c.ready&&c.used&&!c.repeatOf&&siScenarioSpeed(g,c)===g.phase&&(p.repeatTokens||[]).some(t=>t.remaining>0&&!t.usedCardIds.includes(c.id)&&siPrintedPowerCost(g,c)<=(t.maxCost??Infinity))).map(c=>({id:c.id,name:c.name,cost:(p.repeatTokens||[]).some(t=>t.remaining>0&&t.free&&!t.usedCardIds.includes(c.id)&&siPrintedPowerCost(g,c)<=(t.maxCost??Infinity))?0:siPrintedPowerCost(g,c)})),giftChoice:g.giftChoices?.[0]?.playerId===p.id?g.giftChoices[0]:null,trackRemaining:siTrackRemaining(p),elements:siElementCounts(p),growthOptions:SI_GROWTH[p.spirit]||[],hand:[...(p.hand||[]).map(c=>siScenarioCardView(g,c.program==='shared'?{...siSharedConfig(g,p,c,null),id:c.id}:c)),...siInnateCards(p)],discard:p.discard||[],powerOffers:p.powerOffers||[],discardCount:p.discard?.length||0,ready:p.ready,cardPlayLimit:siTrackValue(p,'plays'),energyIncome:siTrackValue(p,'energy'),energyTrack:p.energyTrack||0,playTrack:p.playTrack||0,oceanPresence:(g.oceans||[]).some(l=>l.presenceOwners.includes(p.id))}:null,spectator:!p,finished:g.phase==='finished',winner:g.winner};}
async function handleSpiritIsland(storage,request){const url=new URL(request.url),route=url.pathname.split('/').pop();try{let g=await storage.get('spirit');const a=request.method==='POST'?await request.json():{};
 if(route==='create'){if(g)return json({error:'この部屋コードは使用中です。'},409);const p=siPlayer(a.name);g={code:a.code,hostId:p.id,players:[p],phase:'lobby',revision:1,log:[{id:crypto.randomUUID(),text:'島の精霊たちを待っています。',type:'info'}],messages:[]};await storage.put('spirit',g);return json({game:siView(g,p),token:p.token});}
 if(!g)return json({error:'部屋が見つかりません。'},404);
 if(route==='join'){const name=cleanName(a.name),old=g.players.find(x=>x.name===name);if(old){if(!a.token||a.token!==old.token)return json({error:'同じ名前の参加者がいます。参加時に使ったブラウザーから再接続してください。'},403);return json({game:siView(g,old),token:old.token,rejoined:true});}if(g.phase!=='lobby'||g.players.length>=4)return json({error:'開始済み、または満員です。'},409);const p=siPlayer(a.name);g.players.push(p);g.revision++;siLog(g,`${p.name}が参加しました。`);await storage.put('spirit',g);return json({game:siView(g,p),token:p.token});}
 const token=a.token||url.searchParams.get('token'),p=g.players.find(x=>x.token===token);if(route==='state'&&request.method==='GET'){if(!p&&url.searchParams.get('spectate')!=='1')return json({error:'参加者情報が確認できません。'},403);return json({game:siView(g,p)});}
 if(route!=='action'||request.method!=='POST'||!p)return json({error:'操作できません。'},403);const next=structuredClone(g),actor=next.players.find(x=>x.id===p.id);siAction(next,actor,a);next.revision++;await storage.put('spirit',next);return json({game:siView(next,actor)});
 }catch(e){return json({error:e.message||'処理に失敗しました。'},400);}}
