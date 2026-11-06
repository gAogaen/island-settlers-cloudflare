// 犯人は踊る: server-authoritative multiplayer prototype.
// Card distribution/effects are a playable adaptation; edition-specific verification remains necessary.
const COUNTS={culprit:1,detective:4,alibi:5,rumor:4,trade:3,information:3,witness:2,dog:2,boy:2,plot:2,citizen:3,first:1};
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
function view(g,p){
 const pending=g.pending;
 return {code:g.code,phase:g.phase,hostId:g.hostId,turn:g.turn,revision:g.revision,winner:g.winner||null,reason:g.reason||'',players:g.players.map(x=>({id:x.id,name:x.name,count:x.hand.length})),me:p?{id:p.id,hand:p.hand.map(c=>({...c,name:NAMES[c.type]}))}:null,
 pending:pending?{type:pending.type,actor:pending.actor,needsAction:p?.id===pending.actor,description:pending.description||'',options:p?.id===pending.actor?(pending.options||[]):[],peek:p?.id===pending.actor?(pending.peek||[]):[]}:null,discard:g.discard.map(c=>c.type),log:g.log.slice(-40)};
}
function finish(g,winner,reason){g.phase='finished';g.winner=winner;g.reason=reason;g.pending=null;log(g,reason)}
function advance(g){g.pending=null;g.turn=(g.turn+1)%g.players.length;if(g.players.every(p=>!p.hand.length))finish(g,'draw','手札がなくなったため終了しました。')}
function requireTarget(g,p,id){const t=find(g,id);if(!t||t.id===p.id)throw Error('対象プレイヤーを選択してください。');return t}
function play(g,p,a){
 if(g.phase!=='playing'||current(g).id!==p.id||g.pending)throw Error('現在はカードを使えません。');
 const c=p.hand.find(c=>c.id===a.cardId);if(!c)throw Error('そのカードは手札にありません。');
 const type=c.type;
 const requires=['detective','rumor','trade','information','witness','dog','boy','plot'].includes(type);
 const t=requires?requireTarget(g,p,a.targetId):null;
 if(t&&['rumor','trade','information','witness','dog','boy','plot'].includes(type)&&!t.hand.length)throw Error('対象の手札がありません。');
 if(type==='trade'&&p.hand.length<2)throw Error('交換する手札がありません。');
 if(type==='culprit'){
  if(g.players.some(x=>x.id!==p.id&&x.hand.length===0))throw Error('この状態では犯人カードを出せません。');
  pop(p,c.id);g.discard.push(c);finish(g,p.name+'（犯人）',p.name+'が犯人カードを出しました。');return;
 }
 pop(p,c.id);g.discard.push(c);log(g,p.name+'が「'+NAMES[type]+'」を使用しました。');
 if(type==='detective'){
   const caught=t.hand.some(x=>x.type==='culprit'),alibi=t.hand.some(x=>x.type==='alibi');
   if(caught&&!alibi){finish(g,p.name+'（探偵）',p.name+'が'+t.name+'の犯人カードを見つけました。');return}
   log(g,t.name+'への推理は外れました'+(caught&&alibi?'（アリバイ）':'')+'。');
 }else if(type==='rumor'){
   p.hand.push(randomCard(t));log(g,t.name+'からカードを1枚受け取りました。');
 }else if(type==='trade'){
   const mine=randomCard(p),theirs=randomCard(t);p.hand.push(theirs);t.hand.push(mine);log(g,p.name+'と'+t.name+'がカードを交換しました。');
 }else if(type==='information'){
   const theirs=randomCard(t);p.hand.push(theirs);t.hand.push(c);g.discard.pop();log(g,t.name+'とカードを交換しました。');
 }else if(type==='witness'||type==='boy'){
   g.pending={type:'peek',actor:p.id,description:t.name+'の手札を確認しました。',peek:peek(t)};return;
 }else if(type==='dog'){
   if(t.hand.some(x=>x.type==='culprit')){finish(g,p.name+'（いぬ）',p.name+'のいぬが犯人を見つけました。');return}
   log(g,t.name+'は犯人カードを持っていません。');
 }else if(type==='plot'){
   g.pending={type:'plot',actor:p.id,description:'相手の手札から1枚を選んで交換します。',options:t.hand.map(x=>x.id),target:t.id};return;
 }else if(type==='first'){
   log(g,'第一発見者が事件を知らせました。');
 }
 advance(g);
}
function resolve(g,p,a){
 if(!g.pending||g.pending.actor!==p.id)throw Error('あなたが選択する効果はありません。');
 if(g.pending.type==='plot'){
  const t=find(g,g.pending.target);const chosen=t.hand.find(c=>c.id===a.cardId);
  if(!chosen)throw Error('対象のカードを選択してください。');
  if(!p.hand.length)throw Error('交換する手札がありません。');
  const mine=randomCard(p);t.hand=t.hand.filter(c=>c.id!==chosen.id);t.hand.push(mine);p.hand.push(chosen);
  log(g,p.name+'がカードを交換しました。');
 }
 advance(g);
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
   const deck=shuffle(Object.entries(COUNTS).flatMap(([type,n])=>Array.from({length:n},()=>({id:uid(),type}))));
   if(deck.length<g.players.length*4)throw Error('カードが足りません。');
   g.players.forEach(x=>x.hand=deck.splice(0,4));g.discard=[];g.phase='playing';g.turn=0;g.pending=null;g.winner=null;g.reason='';log(g,'ゲームを開始しました。');
  }else if(a.type==='play')play(g,p,a);
  else if(a.type==='resolve')resolve(g,p,a);
  else if(a.type==='rematch'){
   if(p.id!==g.hostId||g.phase!=='finished')throw Error('再戦できません。');
   g.phase='lobby';g.players.forEach(x=>x.hand=[]);g.turn=0;g.winner=null;g.reason='';g.pending=null;g.discard=[];log(g,'再戦の準備をしました。');
  }else throw Error('未対応の操作です。');
  g.revision++;await storage.put('hannin',g);return json({game:view(g,p)});
 }catch(e){return json({error:e.message||'操作に失敗しました。'},400)}
}