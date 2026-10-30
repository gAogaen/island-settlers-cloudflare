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
const SI_POWER_NAMES=['風の押し波','大地の盾','火花を散らす','水の誘い','恐怖のささやき','存在の芽吹き','ダハンを導く','炎の一撃'];
const SI_POWER_EFFECTS=[
 {kind:'push',label:'侵略者を1つ押し出す',cost:0,element:'風'},
 {kind:'defend',label:'対象地域を防御2',cost:1,element:'大地'},
 {kind:'damage',label:'侵略者に1ダメージ',cost:1,element:'炎'},
 {kind:'gather',label:'隣接するダハンを1つ集める',cost:0,element:'水'},
 {kind:'fear',label:'恐怖を1与える',cost:1,element:'月'},
 {kind:'presence',label:'精霊の存在を1つ置く',cost:2,element:'植物'},
 {kind:'pushDahan',label:'ダハンを1つ押し出す',cost:0,element:'風'},
 {kind:'damage',label:'侵略者に2ダメージ',cost:2,element:'炎'}
];
function siPlayer(name){const n=cleanName(name);if(!n)throw Error('名前を入力してください。');return{id:crypto.randomUUID(),token:crypto.randomUUID(),name:n,spirit:null,energy:1,presence:12,hand:[],discard:[],played:[],ready:false,score:0,powerOffers:[]};}
function siLand(id,terrain,board,index){return{id,board,terrain,index,coastal:[0,3,4,7].includes(index),neighbors:[],explorers:0,towns:0,cities:0,dahan:0,presence:0,blight:0,defend:0};}
function siMakeBoard(players){const lands=[];const layouts=[['山','ジャングル','湿地','砂漠','山','湿地','ジャングル','砂漠'],['ジャングル','湿地','山','砂漠','湿地','ジャングル','砂漠','山'],['湿地','砂漠','ジャングル','山','砂漠','山','湿地','ジャングル'],['砂漠','山','湿地','ジャングル','山','砂漠','ジャングル','湿地']];players.forEach((p,b)=>{layouts[b%4].forEach((t,i)=>lands.push(siLand(`${p.id}:L${i+1}`,t,p.id,i)));});
 players.forEach((p,b)=>{const own=lands.filter(l=>l.board===p.id),spirit=SI_SPIRITS.find(s=>s.id===p.spirit),setup=spirit?.setup||[0,1];own[setup[0]].cities=1;own[(setup[0]+1)%8].towns=1;own[2].dahan=2;own[4].dahan=1;own[(b+3)%8].explorers=1;own[(b+5)%8].explorers=1;own[(b+6)%8].blight=1;own[setup[1]].presence=1;p.presence--;});
 const connect=(a,b)=>{a.neighbors??=[];b.neighbors??=[];if(!a.neighbors.includes(b.id))a.neighbors.push(b.id);if(!b.neighbors.includes(a.id))b.neighbors.push(a.id);};players.forEach(p=>{const own=lands.filter(l=>l.board===p.id);for(let i=0;i<8;i++){if(i%4<3)connect(own[i],own[i+1]);if(i<4)connect(own[i],own[i+4]);}});for(let i=0;i<players.length-1;i++){const left=lands.filter(l=>l.board===players[i].id),right=lands.filter(l=>l.board===players[i+1].id);connect(left[3],right[0]);connect(left[7],right[4]);}return lands;}
function siAdjacent(a,b){return !!a?.neighbors?.includes(b?.id);}
function siDistance(g,from,to){if(from.id===to.id)return 0;const seen=new Set([from.id]);let frontier=[from.id];for(let d=1;d<=8;d++){const next=[];for(const id of frontier){const l=g.lands.find(x=>x.id===id);for(const nid of l?.neighbors||[]){if(nid===to.id)return d;if(!seen.has(nid)){seen.add(nid);next.push(nid);}}}frontier=next;}return Infinity;}
function siCanReach(g,p,target,range=1){return g.lands.some(l=>l.board===p.id&&l.presence>0&&siDistance(g,l,target)<=range);}
function siLog(g,text,type='info'){g.log.unshift({id:crypto.randomUUID(),round:g.round||0,text,type});g.log=g.log.slice(0,80);}
function siDraw(g,spirit){const idx=SI_SPIRITS.findIndex(s=>s.id===spirit),offset=(Math.max(0,idx)+Math.max(0,g.round-1))%SI_POWER_NAMES.length;return Array.from({length:4},(_,n)=>{const j=(offset+n)%SI_POWER_NAMES.length,e=SI_POWER_EFFECTS[j];return{id:crypto.randomUUID(),name:SI_POWER_NAMES[j],effect:e.kind,label:e.label,cost:e.cost,element:e.element,range:1+(j%2),speed:j%2?'slow':'fast',used:false,ready:false};});}
function siNewPower(){const i=Math.floor(Math.random()*SI_POWER_NAMES.length),e=SI_POWER_EFFECTS[i];return{id:crypto.randomUUID(),name:SI_POWER_NAMES[i],effect:e.kind,label:e.label,cost:e.cost,element:e.element,range:1+(i%2),speed:i%2?'slow':'fast',used:false,ready:false};}
function siStart(g){if(g.players.length<1||g.players.length>4)throw Error('1〜4人で開始できます。');if(g.players.some(p=>!p.spirit))throw Error('全員が精霊を選んでください。');g.matchId=crypto.randomUUID();g.round=1;g.phase='growth';g.terror=1;g.fear=0;g.fearCards=0;g.fearPool=4*g.players.length;g.blightPool=5*g.players.length;g.winner=false;g.finalInvaderTurn=false;g.lands=siMakeBoard(g.players);g.invaderDeck=[];for(let stage=1;stage<=3;stage++){const count=[0,3,4,5][stage],cards=Array.from({length:count},(_,i)=>({stage,terrain:SI_TERRAINS[(i+Math.floor(Math.random()*4))%4]}));g.invaderDeck.push(...cards);}g.invaderIndex=1;g.invaderSlots={ravage:null,build:null,explore:g.invaderDeck[0]||null};g.players.forEach(p=>{p.energy=1;p.presence=11;p.hand=siDraw(g,p.spirit);p.discard=[];p.played=[];p.pendingCards=[];p.powerOffers=Array.from({length:3},()=>siNewPower());p.ready=false;});siInvader(g,'explore');siLog(g,'島に侵略者が上陸した。各精霊は成長を選んでください。','start');}
function siCheckEnd(g){const cities=g.lands.reduce((n,l)=>n+l.cities,0),towns=g.lands.reduce((n,l)=>n+l.towns,0),invaders=cities+towns+g.lands.reduce((n,l)=>n+l.explorers,0);if((g.terror>=4)||(g.terror===3&&cities+towns===0)||(g.terror===2&&cities===0)||(g.terror===1&&invaders===0)){g.phase='finished';g.winner=true;siLog(g,'島から侵略者が退いた。全員の勝利！','victory');return true;}if(g.blightPool<=0){g.phase='finished';g.winner=false;siLog(g,'島は荒廃し、侵略者の波を止められなかった。','defeat');return true;}return false;}
function siSetReady(g,p){p.ready=true;if(g.players.every(x=>x.ready))return true;return false;}
function siNext(g,phase){g.phase=phase;g.players.forEach(p=>p.ready=false);}
function siProgress(g){
 if(g.phase==='growth'){siNext(g,'play');siLog(g,'成長完了。精霊力を得て、能力カードを選んでください。','phase');return;}
 if(g.phase==='play'){siNext(g,'fast');siLog(g,'カードの準備が完了。早い能力を解決します。','phase');return;}
 if(g.phase==='fast'){siFear(g);if(siCheckEnd(g))return;siInvader(g,'ravage');if(siCheckEnd(g))return;siInvader(g,'build');siInvader(g,'explore');siNext(g,'slow');siLog(g,'侵略者の行動が終わりました。遅い能力を解決してください。','phase');return;}
 if(g.phase==='slow'){siNext(g,'cleanup');siLog(g,'遅い能力が完了。ラウンドを終えます。','phase');return;}
 if(g.phase==='cleanup'){if(g.finalInvaderTurn){g.phase='finished';g.winner=false;siLog(g,'最後の侵略者カードまで解決した。島を守り切れなかった。','defeat');return;}g.round++;g.players.forEach(p=>{p.played=[];p.energy+=1;p.discard.push(...p.hand.filter(c=>c.used));p.hand=p.hand.filter(c=>!c.used);});siNext(g,'growth');siLog(g,`ラウンド${g.round}。精霊の成長を選んでください。`,'phase');siCheckEnd(g);}
}
function siFear(g){const need=g.players.length;while(g.fear>=need&&g.terror<4){g.fear-=need;g.fearCards++;siLog(g,'恐怖カードを1枚獲得。','fear');if(g.fearCards%3===0){g.terror++;siLog(g,`恐怖レベル${g.terror}に到達。`,'fear');}if(g.terror===4){g.phase='finished';g.winner=true;siLog(g,'恐怖カードをすべて獲得。全員の勝利！','victory');return;}}}
function siPlaceBlight(g,land){const queue=[land];let placed=0;while(queue.length&&g.blightPool>0){const target=queue.shift();if(target.blight){const cascade=g.lands.find(x=>siAdjacent(x,target)&&x.blight===0);if(cascade)queue.push(cascade);continue;}target.blight++;g.blightPool--;placed++;}return placed;}
function siInvader(g,kind){const card=g.invaderSlots?.[kind];if(!card)return;const targetTerrain=card.terrain,lands=g.lands.filter(l=>l.terrain===targetTerrain);if(kind==='ravage'){let hits=0;for(const l of lands){const inv=l.explorers+l.towns*2+l.cities*3;if(!inv)continue;const damage=Math.max(0,inv-l.defend);l.defend=0;if(damage>=2){hits+=siPlaceBlight(g,l);}if(damage>0&&l.dahan){const losses=Math.min(l.dahan,Math.ceil(damage/2));l.dahan-=losses;let counter=l.dahan*2;while(counter>0){if(l.explorers){l.explorers--;counter--;}else if(l.towns&&counter>=2){l.towns--;counter-=2;g.fear++;g.fearPool=Math.max(0,g.fearPool-1);}else if(l.cities&&counter>=3){l.cities--;counter-=3;g.fear+=2;g.fearPool=Math.max(0,g.fearPool-2);}else break;}}}siLog(g,`侵略者が${targetTerrain}で荒廃を広げた（${hits}個）。`,'invader');}
 if(kind==='build'){let count=0;for(const l of lands){if(l.explorers+l.towns+l.cities===0)continue;if(l.towns>=2){l.towns-=2;l.cities++;}else if(l.towns||l.cities)l.towns++;else l.towns=1;count++;}siLog(g,`侵略者が${targetTerrain}に建設（${count}地域）。`,'invader');}
 if(kind==='explore'){for(const l of lands){if(l.explorers+l.towns+l.cities>0)continue;const supplied=l.coastal||g.lands.some(x=>siAdjacent(x,l)&&(x.towns+x.cities)>0);if(supplied)l.explorers=1;}siLog(g,`侵略者が${targetTerrain}を探索した。`,'invader');g.invaderSlots.ravage=g.invaderSlots.build;g.invaderSlots.build=g.invaderSlots.explore;g.invaderSlots.explore=g.invaderDeck[g.invaderIndex++]||null;if(!g.invaderSlots.explore)g.finalInvaderTurn=true;}}
function siLegalTarget(g,p,card){return g.lands.filter(l=>siCanReach(g,p,l,card.range||1)&&(()=>{if(card.effect==='damage'||card.effect==='push')return l.explorers+l.towns+l.cities>0;if(card.effect==='defend')return true;if(card.effect==='presence')return p.presence>0;if(card.effect==='gather')return g.lands.some(x=>siAdjacent(x,l)&&x.dahan>0);if(card.effect==='pushDahan')return l.dahan>0;return true;})());}
function siApply(g,p,card,targetId,choice){const l=g.lands.find(x=>x.id===targetId);if(card.effect!=='fear'&&(!l||!siLegalTarget(g,p,card).some(x=>x.id===l.id)))throw Error('対象の土地を選び直してください。');if(card.effect==='damage'){let dmg=card.label.includes('2ダメージ')?2:1;while(dmg>0){if(l.cities){l.cities--;g.fear+=2;g.fearPool=Math.max(0,g.fearPool-2);}else if(l.towns){l.towns--;g.fear++;g.fearPool=Math.max(0,g.fearPool-1);}else if(l.explorers)l.explorers--;else break;dmg--;}}
 if(card.effect==='push'){if(l.cities)l.cities--;else if(l.towns)l.towns--;else if(l.explorers)l.explorers--;const dest=g.lands.find(x=>siAdjacent(x,l)&&x.explorers+x.towns+x.cities===0);if(dest)dest.explorers=1;}
 if(card.effect==='defend')l.defend+=2;
 if(card.effect==='fear'){g.fear++;g.fearPool=Math.max(0,g.fearPool-1);}
 if(card.effect==='presence'&&p.presence>0){l.presence++;p.presence--;}
 if(card.effect==='gather'){const source=g.lands.find(x=>siAdjacent(x,l)&&x.dahan>0);if(source&&l.dahan<4){source.dahan--;l.dahan++;}}
 if(card.effect==='pushDahan'&&l.dahan){l.dahan--;const dest=g.lands.find(x=>x.board===l.board&&siAdjacent(x,l)&&x.dahan<4);if(dest)dest.dahan++;}
 card.used=true;p.played.push(card.id);siLog(g,`${p.name}使用：${card.name}${l?`（${l.terrain}）`:''}。`,'power');siFear(g);siCheckEnd(g);}
function siAction(g,p,a){if(a.type==='chat'){const text=String(a.message||'').trim().slice(0,180);if(!text)throw Error('メッセージを入力してください。');g.messages.push({id:crypto.randomUUID(),name:p.name,text});g.messages=g.messages.slice(-50);return;}
 if(a.type==='spirit'){if(p.id!==g.hostId||g.phase!=='lobby')throw Error('ロビーで自分の精霊を選んでください。');if(!SI_SPIRITS.some(s=>s.id===a.spirit))throw Error('精霊を選び直してください。');p.spirit=a.spirit;return;}
 if(a.type==='start'){if(p.id!==g.hostId||!['lobby','finished'].includes(g.phase))throw Error('ホストだけが開始できます。');siStart(g);return;}
 if(a.matchId!==g.matchId)throw Error('ゲームの状態が更新されました。画面を読み直してください。');
 if(a.type==='growth'){if(g.phase!=='growth'||p.ready)throw Error('今は成長を選べません。');const land=g.lands.find(l=>l.id===a.landId);if(a.growth==='presence'){if(!land||!p.presence||!siCanReach(g,p,land,1))throw Error('存在を置く土地を選んでください。');land.presence++;p.presence--;}else if(a.growth==='energy'){p.energy+=2;}else if(a.growth==='reclaim'){p.hand.push(...p.discard);p.discard=[];}else if(a.growth==='gain'){const i=p.powerOffers.findIndex(c=>c.id===a.powerId);if(i<0)throw Error('獲得する能力を選び直してください。');const [card]=p.powerOffers.splice(i,1);p.hand.push(card);p.powerOffers.push(siNewPower());siLog(g,`${p.name}が新たな能力「${card.name}」を得た。`,'power');}else throw Error('成長方法を選んでください。');if(siSetReady(g,p))siProgress(g);return;}
 if(a.type==='play'){if(g.phase!=='play'||p.ready)throw Error('今は能力カードを選べません。');const ids=Array.isArray(a.cardIds)?a.cardIds:[];if(ids.length>4)throw Error('能力カードは最大4枚まで選べます。');const cards=ids.map(id=>p.hand.find(c=>c.id===id&&!c.used));if(cards.some(x=>!x))throw Error('手札からカードを選び直してください。');const cost=cards.reduce((n,c)=>n+c.cost,0);if(cost>p.energy)throw Error('精霊力が足りません。');p.energy-=cost;p.pendingCards=ids;if(siSetReady(g,p)){g.players.forEach(x=>{for(const id of x.pendingCards||[]){const c=x.hand.find(y=>y.id===id);if(c)c.ready=true;}});siProgress(g);}return;}
 if(a.type==='resolve'){if(!['fast','slow'].includes(g.phase)||p.ready)throw Error('能力を使えるフェーズではありません。');const c=p.hand.find(x=>x.id===a.cardId&&x.ready&&!x.used&&x.speed===g.phase);if(!c)throw Error('解決する能力カードを選び直してください。');siApply(g,p,c,a.landId,a.choice);return;}
 if(a.type==='done'){if(!['fast','slow','cleanup'].includes(g.phase))throw Error('このフェーズは完了できません。');if(p.ready)throw Error('すでに完了しています。');p.ready=true;if(g.players.every(x=>x.ready))siProgress(g);return;}
 if(a.type==='next'){if(p.id!==g.hostId||g.phase!=='finished')throw Error('ホストだけが再戦を開始できます。');g.phase='lobby';g.players.forEach(x=>{x.spirit=null;x.ready=false;x.hand=[];});g.lands=[];g.log=[];return;}
 throw Error('操作が正しくありません。');}
function siView(g,p){const legalTargets=p?Object.fromEntries(p.hand.filter(c=>c.ready&&!c.used).map(c=>[c.id,siLegalTarget(g,p,c).map(l=>l.id)])):{};const growthTargets=p?g.lands.filter(l=>siCanReach(g,p,l,1)).map(l=>l.id):[];return{code:g.code,revision:g.revision,phase:g.phase,hostId:g.hostId,matchId:g.matchId,round:g.round||0,terror:g.terror||1,fear:g.fear||0,fearPool:g.fearPool||0,fearCards:g.fearCards||0,blightPool:g.blightPool||0,invaderCard:g.invaderSlots?.explore||null,legalTargets,growthTargets,players:g.players.map(x=>({id:x.id,name:x.name,spirit:x.spirit,energy:x.energy,presence:x.presence,ready:x.ready,handCount:x.hand?.filter(c=>!c.used).length||0,boardId:x.id})),lands:g.lands||[],log:g.log||[],messages:g.messages||[],me:p?{id:p.id,hand:p.hand||[],powerOffers:p.powerOffers||[],discardCount:p.discard?.length||0,ready:p.ready}:null,spectator:!p,finished:g.phase==='finished',winner:g.winner};}
async function handleSpiritIsland(storage,request){const url=new URL(request.url),route=url.pathname.split('/').pop();try{let g=await storage.get('spirit');const a=request.method==='POST'?await request.json():{};
 if(route==='create'){if(g)return json({error:'この部屋コードは使用中です。'},409);const p=siPlayer(a.name);g={code:a.code,hostId:p.id,players:[p],phase:'lobby',revision:1,log:[{id:crypto.randomUUID(),text:'島の精霊たちを待っています。',type:'info'}],messages:[]};await storage.put('spirit',g);return json({game:siView(g,p),token:p.token});}
 if(!g)return json({error:'部屋が見つかりません。'},404);
 if(route==='join'){const name=cleanName(a.name),old=g.players.find(x=>x.name===name);if(old)return json({game:siView(g,old),token:old.token,rejoined:true});if(g.phase!=='lobby'||g.players.length>=4)return json({error:'開始済み、または満員です。'},409);const p=siPlayer(a.name);g.players.push(p);g.revision++;siLog(g,`${p.name}が参加しました。`);await storage.put('spirit',g);return json({game:siView(g,p),token:p.token});}
 const token=a.token||url.searchParams.get('token'),p=g.players.find(x=>x.token===token);if(route==='state'&&request.method==='GET'){if(!p&&url.searchParams.get('spectate')!=='1')return json({error:'参加者情報が確認できません。'},403);return json({game:siView(g,p)});}
 if(route!=='action'||request.method!=='POST'||!p)return json({error:'操作できません。'},403);const next=structuredClone(g),actor=next.players.find(x=>x.id===p.id);siAction(next,actor,a);next.revision++;await storage.put('spirit',next);return json({game:siView(next,actor)});
 }catch(e){return json({error:e.message||'処理に失敗しました。'},400);}}
