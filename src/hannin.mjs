// 犯人は踊る: server-authoritative multiplayer prototype.
// Card distribution/effects are a playable adaptation; edition-specific verification remains necessary.
const COUNTS={culprit:1,detective:4,alibi:5,rumor:4,trade:5,information:3,witness:3,dog:1,boy:1,plot:2,citizen:2,first:1};
const REQUIRED={3:{first:1,culprit:1,detective:1,alibi:1},4:{first:1,culprit:1,detective:1,alibi:1,plot:1},5:{first:1,culprit:1,detective:1,alibi:2,plot:1},6:{first:1,culprit:1,detective:2,alibi:2,plot:2},7:{first:1,culprit:1,detective:2,alibi:3,plot:2},8:{...COUNTS}};
const NAMES={culprit:'犯人',detective:'探偵',alibi:'アリバイ',rumor:'うわさ',trade:'取引',information:'情報操作',witness:'目撃者',dog:'いぬ',boy:'少年',plot:'たくらみ',citizen:'一般人',first:'第一発見者'};
const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const uid=()=>crypto.randomUUID(),name=s=>String(s||'').trim().slice(0,16);
const rnd=n=>{const x=new Uint32Array(1);crypto.getRandomValues(x);return x[0]%n};
const shuffle=a=>{for(let i=a.length-1;i>0;i--){let j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]]}return a};
const log=(g,s)=>{g.log.push(s);g.log=g.log.slice(-80)};
const current=g=>g.players[g.turn];
const find=(g,id)=>g.players.find(p=>p.id===id);
const pop=(p,id)=>{const i=p.hand.findIndex(c=>c.id===id);if(i<0)throw Error('カードが見つかりません。');return p.hand.splice(i,1)[0]};
const peek=p=>p.hand.map(c=>c.type);
const randomCard=p=>p.hand.splice(rnd(p.hand.length),1)[0];
const allHands=g=>g.players.flatMap(p=>p.hand);
const countDetectives=g=>allHands(g).filter(c=>c.type==='detective').length;
const nextPlayer=(g,i)=>g.players[(i+1)%g.players.length];
const criminal=g=>g.players.find(p=>p.hand.some(c=>c.type==='culprit'));
function startDeck(n){const deck=Object.entries(COUNTS).flatMap(([type,k])=>Array.from({length:k},()=>({id:uid(),type})));const required=REQUIRED[n];const selected=[];for(const [type,k] of Object.entries(required)){for(let i=0;i<k;i++){const ix=deck.findIndex(c=>c.type===type);if(ix<0)throw Error('カード構成エラー');selected.push(...deck.splice(ix,1));}}return shuffle([...selected,...shuffle(deck).slice(0,n*4-selected.length)]);}
function checkDetectives(g){if(g.phase==='playing'&&!countDetectives(g)){const c=criminal(g);if(c)finish(g,c.name+'（犯人）','探偵カードがなくなり犯人側の勝利です。');}}
function win(g,p,role){const conspirators=g.players.filter(x=>x.plotUsed).map(x=>x.name);finish(g,p.name+'（'+role+'）'+(role==='犯人'&&conspirators.length?'＋'+conspirators.join('・')+'（たくらみ）':''),p.name+'が'+(role==='犯人'?'逃げ切りました。':'犯人を見つけました。'));}

function view(g,p){
 const pending=g.pending;
 return {code:g.code,phase:g.phase,hostId:g.hostId,turn:g.turn,revision:g.revision,winner:g.winner||null,reason:g.reason||'',players:g.players.map(x=>({id:x.id,name:x.name,count:x.hand.length})),me:p?{id:p.id,hand:p.hand.map(c=>({...c,name:NAMES[c.type]}))}:null,
 pending:pending?{type:pending.type,actor:pending.actor,needsAction:p?.id===pending.actor,description:pending.description||'',options:p?.id===pending.actor?(pending.options||(['rumor','information'].includes(pending.type)?p.hand.map(c=>c.id):[])):[],peek:p?.id===pending.actor?(pending.peek||[]):[]}:null,discard:g.discard.map(c=>c.type),log:g.log.slice(-40)};
}
function finish(g,winner,reason){g.phase='finished';g.winner=winner;g.reason=reason;g.pending=null;log(g,reason)}
function advance(g){g.pending=null;g.turn=(g.turn+1)%g.players.length;g.turnSteps=(g.turnSteps||0)+1;if(g.turnSteps>=g.players.length)g.rounds=1;checkDetectives(g);if(g.phase==='playing'&&g.players.every(p=>!p.hand.length))finish(g,'draw','手札がなくなったため終了しました。')}
function requireTarget(g,p,id){const t=find(g,id);if(!t||t.id===p.id)throw Error('対象プレイヤーを選択してください。');return t}
function queue(g,type,players,description){g.pending={type,queue:players.map(p=>p.id),actor:players[0]?.id,description};if(!players.length)advance(g)}
function play(g,p,a){
 if(g.phase!=='playing'||current(g).id!==p.id||g.pending)throw Error('現在はカードを使えません。');
 const c=p.hand.find(c=>c.id===a.cardId);if(!c)throw Error('そのカードは手札にありません。');
 const type=c.type;
 if(type==='first')throw Error('第一発見者は開始時に使用済みです。');
 if(type==='culprit'&&p.hand.length!==1)throw Error('犯人は最後の1枚のときだけ出せます。');
 if(type==='detective'&&g.rounds<1)throw Error('探偵は最初の1周目には使えません。');
 const requires=['detective','trade','witness','dog'].includes(type);
 const t=requires?requireTarget(g,p,a.targetId):null;
 
 if(type==='witness'&&!t.hand.length)throw Error('相手に手札がありません。');
 if(type==='dog'&&!t.hand.length)throw Error('相手に手札がありません。');
 pop(p,c.id);g.discard.push(c);log(g,p.name+'が「'+NAMES[type]+'」を使用しました。');
 if(type==='culprit'){win(g,p,'犯人');return}
 if(type==='detective'){
  if(t.hand.some(x=>x.type==='culprit')&&!t.hand.some(x=>x.type==='alibi')){win(g,p,'探偵');return}
  log(g,t.name+'は「犯人ではありません」と回答しました。');
 }else if(type==='witness'){
  g.pending={type:'peek',actor:p.id,description:t.name+'の手札を確認',peek:t.hand.map(c=>c.type)};return;
 }else if(type==='boy'){
  g.pending={type:'peek',actor:p.id,description:'犯人カードの持ち主を確認',peek:[criminal(g)?.name||'不明']};return;
 }else if(type==='dog'){
  g.pending={type:'dog',actor:p.id,target:t.id,description:t.name+'のカードを1枚選んで公開',options:t.hand.map((_,i)=>String(i))};return;
 }else if(type==='trade'){
  if(!p.hand.length||!t.hand.length){log(g,'交換できる手札がないため取引は行われませんでした。');advance(g);return;}
  g.pending={type:'trade',actor:p.id,target:t.id,description:'交換する自分のカードを選択',options:p.hand.map(c=>c.id)};return;
 }else if(type==='rumor'){
  const moves=g.players.filter(x=>x.hand.length).map(x=>({from:x.id,cardId:x.hand[rnd(x.hand.length)].id}));for(const m of moves){const from=find(g,m.from),idx=g.players.findIndex(x=>x.id===from.id),to=nextPlayer(g,idx);to.hand.push(pop(from,m.cardId));}log(g,'全員が右隣からカードを1枚引きました。');
 }else if(type==='information'){
  queue(g,'information',g.players.filter(x=>x.hand.length),'左隣へ渡すカードを1枚選択');return;
 }else if(type==='plot'){
  p.plotUsed=true;
 }
 advance(g);
}
function resolve(g,p,a){
 const pending=g.pending;
 if(!pending||pending.actor!==p.id)throw Error('あなたが選択する効果はありません。');
 if(pending.type==='peek'){advance(g);return;}
 if(pending.type==='dog'){
  const t=find(g,pending.target),i=Number(a.cardId);
  if(!Number.isInteger(i)||i<0||i>=t.hand.length)throw Error('カードを選択してください。');
  const c=t.hand[i];log(g,t.name+'のカードは「'+NAMES[c.type]+'」でした。');
  if(c.type==='culprit'){win(g,p,'いぬ');return}
  advance(g);return;
 }
 if(pending.type==='trade'){
  const t=find(g,pending.target),mine=p.hand.find(c=>c.id===a.cardId);
  if(!mine)throw Error('自分のカードを選択してください。');
  g.pending={type:'tradeReceive',actor:t.id,target:p.id,chosen:a.cardId,description:p.name+'と交換するカードを選択',options:t.hand.map(c=>c.id)};return;
 }
 if(pending.type==='tradeReceive'){
  const t=find(g,pending.target),mine=p.hand.find(c=>c.id===a.cardId),theirs=t.hand.find(c=>c.id===pending.chosen);
  if(!mine||!theirs)throw Error('交換するカードを選択してください。');
  pop(p,mine.id);pop(t,theirs.id);p.hand.push(theirs);t.hand.push(mine);log(g,p.name+'と'+t.name+'がカードを交換しました。');advance(g);return;
 }
 if(pending.type==='information'){
  if(!p.hand.length)throw Error('手札がありません。');
  if(!p.hand.some(c=>c.id===a.cardId))throw Error('手札から1枚選択してください。');
  (pending.moves??=[]).push({player:p.id,cardId:a.cardId});
  pending.queue.shift();pending.actor=pending.queue[0]||null;
  if(pending.actor)return;
  const moves=pending.moves;
  for(const move of moves){const from=find(g,move.player);const card=pop(from,move.cardId);const index=g.players.findIndex(x=>x.id===from.id);nextPlayer(g,index).hand.push(card);}
  log(g,'全員が左隣に1枚渡しました。');
  advance(g);return;
 }
 throw Error('未対応の効果です。');
}
export async function handleHannin(storage,request){
 try{
  const url=new URL(request.url),route=url.pathname.split('/').pop(),a=request.method==='POST'?await request.json():{};
  let g=await storage.get('hannin');
  if(route==='create'){
   if(g)return json({error:'この部屋は使用中です。'},409);
   const n=name(a.name);if(!n)throw Error('名前を入力してください。');
   const p={id:uid(),token:uid(),name:n,hand:[]};
   g={code:a.code,hostId:p.id,players:[p],phase:'lobby',turn:0,revision:1,discard:[],log:['部屋を作成しました。'],pending:null};
   await storage.put('hannin',g);return json({game:view(g,p),token:p.token});
  }
  if(!g)return json({error:'部屋がありません。'},404);
  if(route==='join'){
   if(g.phase!=='lobby'||g.players.length>=8)throw Error('参加できません。');
   const n=name(a.name);if(!n||g.players.some(p=>p.name===n))throw Error('別の名前を入力してください。');
   const p={id:uid(),token:uid(),name:n,hand:[]};g.players.push(p);g.revision++;
   await storage.put('hannin',g);return json({game:view(g,p),token:p.token});
  }
  if(route==='state'&&url.searchParams.get('spectate')==='1')return json({game:view(g,null)});
  const token=route==='state'?url.searchParams.get('token'):a.token,p=g.players.find(x=>x.token===token);
  if(!p)return json({error:'参加情報を確認できません。'},403);
  if(route==='state')return json({game:view(g,p)});
  if(route!=='action')return json({error:'操作がありません。'},404);
  if(a.revision!=null&&a.revision!==g.revision)throw Error('画面が更新されました。もう一度操作してください。');
  if(a.type==='start'){
   if(p.id!==g.hostId||g.phase!=='lobby')throw Error('ホストのみ開始できます。');
   if(g.players.length<3||g.players.length>8)throw Error('3〜8人で開始してください。');
   const deck=startDeck(g.players.length);
   if(deck.length<g.players.length*4)throw Error('カードが足りません。');
   g.players.forEach(x=>{x.hand=deck.splice(0,4);x.plotUsed=false});g.discard=[];g.phase='playing';g.rounds=0;g.turnSteps=0;g.turn=g.players.findIndex(x=>x.hand.some(c=>c.type==='first'));const starter=g.players[g.turn];g.discard.push(pop(starter,starter.hand.find(c=>c.type==='first').id));log(g,starter.name+'が「第一発見者」を出しました。');g.turn=(g.turn+1)%g.players.length;g.pending=null;g.winner=null;g.reason='';log(g,'ゲームを開始しました。');
  }else if(a.type==='play')play(g,p,a);
  else if(a.type==='resolve')resolve(g,p,a);
  else if(a.type==='rematch'){
   if(p.id!==g.hostId||g.phase!=='finished')throw Error('再戦できません。');
   g.phase='lobby';g.players.forEach(x=>{x.hand=[];x.plotUsed=false});g.turn=0;g.winner=null;g.reason='';g.pending=null;g.discard=[];log(g,'再戦の準備をしました。');
  }else throw Error('未対応の操作です。');
  g.revision++;await storage.put('hannin',g);return json({game:view(g,p)});
 }catch(e){return json({error:e.message||'操作に失敗しました。'},400)}
}