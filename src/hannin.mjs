// 犯人は踊る — server-authoritative room implementation.
// Card composition and effects are provisional pending edition-by-edition rule verification.
const COUNTS={culprit:1,detective:4,alibi:5,rumor:4,trade:3,information:3,witness:2,dog:2,boy:2,plot:2,citizen:3,first:1};
const NAME={culprit:'犯人',detective:'探偵',alibi:'アリバイ',rumor:'うわさ',trade:'取引',information:'情報操作',witness:'目撃者',dog:'いぬ',boy:'少年',plot:'たくらみ',citizen:'一般人',first:'第一発見者'};
const response=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const n=crypto.getRandomValues(new Uint32Array(1))[0]%(i+1);[a[i],a[n]]=[a[n],a[i]];}return a};
const id=()=>crypto.randomUUID();
const safeName=s=>String(s||'').trim().slice(0,16);
function view(g,p){return {code:g.code,phase:g.phase,hostId:g.hostId,turn:g.turn,revision:g.revision,winner:g.winner||null,reason:g.reason||'',pending:g.pending?{type:g.pending.type,actor:g.pending.actor}:null,players:g.players.map(x=>({id:x.id,name:x.name,count:x.hand.length,ready:!!x.ready})),me:p?{id:p.id,hand:p.hand.map(c=>({id:c.id,type:c.type,name:NAME[c.type]}))}:null,log:g.log.slice(-40)};}
function addLog(g,s){g.log.push(s);if(g.log.length>100)g.log.shift();}
function current(g){return g.players[g.turn];}
function card(g,p,cid){const i=p.hand.findIndex(c=>c.id===cid);if(i<0)throw Error('そのカードは手札にありません。');return p.hand[i];}
function target(g,a,actor,required=true){const t=g.players.find(x=>x.id===a.targetId);if(required&&(!t||t.id===actor.id))throw Error('別のプレイヤーを選択してください。');return t;}
function takeRandom(p){return p.hand.splice(crypto.getRandomValues(new Uint32Array(1))[0]%p.hand.length,1)[0];}
function finish(g,winner,reason){g.phase='finished';g.winner=winner;g.reason=reason;addLog(g,reason);}
function next(g){g.pending=null;g.turn=(g.turn+1)%g.players.length;const alive=g.players.some(p=>p.hand.some(c=>c.type==='culprit'));if(!alive)finish(g,'unknown','犯人カードが手札からなくなりました。');}
function play(g,p,a){
 if(g.phase!=='playing'||current(g).id!==p.id)throw Error('現在あなたの手番ではありません。');
 if(g.pending)throw Error('未完了の効果があります。');
 const c=card(g,p,a.cardId),type=c.type;
 const t=['detective','rumor','trade','information','witness','dog','boy','plot'].includes(type)?target(g,a,p):null;
 if(type==='detective'&&t.hand.some(x=>x.type==='culprit')&&!t.hand.some(x=>x.type==='alibi')){p.hand.splice(p.hand.indexOf(c),1);finish(g,p.name+'（探偵）',p.name+'が犯人を見つけました。');return;}
 if(type==='culprit'){
   if(g.players.some(x=>x.id!==p.id&&x.hand.length===0))throw Error('この状態では犯人カードを出せません。');
   p.hand.splice(p.hand.indexOf(c),1);finish(g,p.name+'（犯人）',p.name+'が犯人カードを出しました。');return;
 }
 p.hand.splice(p.hand.indexOf(c),1);addLog(g,p.name+'：'+NAME[type]);
 if(type==='rumor'||type==='trade'){if(!t.hand.length)throw Error('対象に手札がありません。');const stolen=takeRandom(t);if(type==='trade'){const mine=p.hand.length?takeRandom(p):null;t.hand.push(mine||c);}p.hand.push(stolen);}
 if(type==='information'){if(!t.hand.length)throw Error('対象に手札がありません。');const stolen=takeRandom(t);t.hand.push(c);p.hand.push(stolen);}
 if(type==='witness'||type==='boy'){g.pending={type:'privatePeek',actor:p.id,target:t.id,cardTypes:t.hand.map(x=>x.type)};}
 if(type==='dog'&&t.hand.some(x=>x.type==='culprit')){finish(g,p.name+'（いぬ）',p.name+'のいぬが犯人を見つけました。');return;}
 if(type==='plot'){g.pending={type:'plot',actor:p.id,target:t.id};}
 next(g);
}
export async function handleHannin(storage,request){
 try{
  const u=new URL(request.url),route=u.pathname.split('/').pop(),a=request.method==='POST'?await request.json():{};
  let g=await storage.get('hannin');
  if(route==='create'){if(g)return response({error:'この部屋は使用中です。'},409);const name=safeName(a.name);if(!name)throw Error('名前を入力してください。');const p={id:id(),token:id(),name,hand:[]};g={code:a.code,hostId:p.id,players:[p],phase:'lobby',turn:0,revision:1,log:['部屋を作成しました。']};await storage.put('hannin',g);return response({game:view(g,p),token:p.token});}
  if(!g)return response({error:'部屋がありません。'},404);
  if(route==='join'){const name=safeName(a.name);if(!name)throw Error('名前を入力してください。');if(g.phase!=='lobby'||g.players.length>=8)throw Error('参加できません。');if(g.players.some(p=>p.name===name))throw Error('同じ名前が使用されています。');const p={id:id(),token:id(),name,hand:[]};g.players.push(p);g.revision++;await storage.put('hannin',g);return response({game:view(g,p),token:p.token});}
  if(u.searchParams.get('spectate')==='1'&&route==='state')return response({game:view(g,null)});
  const token=route==='state'?u.searchParams.get('token'):a.token,p=g.players.find(x=>x.token===token);
  if(!p)return response({error:'参加情報を確認できません。'},403);
  if(route==='state')return response({game:view(g,p)});
  if(route!=='action')return response({error:'操作がありません。'},404);
  if(a.type==='start'){
    if(p.id!==g.hostId)throw Error('ホストのみ開始できます。');
    if(g.players.length<3||g.players.length>8)throw Error('3〜8人で開始してください。');
    const deck=shuffle(Object.entries(COUNTS).flatMap(([type,n])=>Array.from({length:n},()=>({id:id(),type}))));
    // 4 cards per player. Extra cards are not used at low player counts.
    g.players.forEach(x=>{x.hand=deck.splice(0,4);});g.phase='playing';g.turn=0;g.winner=null;g.reason='';g.pending=null;addLog(g,'ゲームを開始しました。');
  }else if(a.type==='play')play(g,p,a);
  else if(a.type==='rematch'){if(p.id!==g.hostId||g.phase!=='finished')throw Error('再戦できません。');g.phase='lobby';g.players.forEach(x=>x.hand=[]);g.turn=0;g.winner=null;g.pending=null;}
  else throw Error('未対応の操作です。');
  g.revision++;await storage.put('hannin',g);return response({game:view(g,p)});
 }catch(e){return response({error:e.message||'操作に失敗しました。'},400);}
}
