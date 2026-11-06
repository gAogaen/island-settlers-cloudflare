const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{parseHTML}=require('linkedom');

(async()=>{
 const {handleHannin}=await import('../src/hannin.mjs');
 const stores=new Map();
 async function route(url,options={}){
  const parsed=new URL(url,'https://test');
  const parts=parsed.pathname.split('/').filter(Boolean).slice(2);
  const code=parts[0]||'UI1234',action=parts[1]|| (parts[0]?'state':'create');
  if(!stores.has(code))stores.set(code,new Map());
  const data=stores.get(code),storage={get:async key=>data.get(key),put:async(key,value)=>data.set(key,structuredClone(value))},body=options.method==='POST'?{...JSON.parse(options.body||'{}'),code}:undefined,request=new Request('https://room/hn/'+action+parsed.search,body?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}:options);
  const response=await handleHannin(storage,request);
  return new Response(await response.text(),{status:response.status,headers:response.headers});
 }
 function client(name){
  const {document}=parseHTML(fs.readFileSync('public/hannin.html','utf8'));
  const dialog=document.getElementById('rulesDialog');dialog.showModal=()=>dialog.setAttribute('open','');dialog.close=()=>dialog.removeAttribute('open');
  Object.defineProperty(dialog,'open',{get:()=>dialog.hasAttribute('open')});
  const memory=new Map(),timers=[],ctx={document,URL,URLSearchParams,location:{origin:'https://test',search:''},history:{replaceState(){}},localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,String(v))},navigator:{},fetch:route,setTimeout:()=>1,clearTimeout(){},setInterval:fn=>(timers.push(fn),timers.length),clearInterval(){},console};
  vm.createContext(ctx);vm.runInContext(fs.readFileSync('public/hannin.js','utf8'),ctx);document.getElementById('name').value=name;
  return{document,storage:ctx.localStorage,el:id=>document.getElementById(id),run:s=>vm.runInContext(s,ctx),poll:()=>timers.at(-1)?.()};
 }
 const players=[client('Aoi'),client('Ren'),client('Mio')];
 await players[0].el('create').onclick();
 const code=players[0].el('roomCode').textContent;
 for(const p of players.slice(1)){p.el('name').value=p.el('name').value;p.el('code').value=code;await p.el('join').onclick();}
 for(const p of players)await p.poll();
 assert.equal(players[0].el('players').querySelectorAll('.seat').length,3);
 assert.equal(players[0].el('start').disabled,false);
 await players[0].el('start').onclick();
 for(const p of players)await p.poll();
 let state=stores.get(code).get('hannin');
 assert.equal(state.phase,'playing');assert.equal(state.discard[0].type,'first');
 assert.equal(state.players.reduce((n,p)=>n+p.hand.length,0),11);
 assert(players.every(p=>p.el('hand').querySelectorAll('[data-card]').length>=3));

 // Exercise the complete private Boy-card UI flow and ensure other seats cannot see its result.
 state=stores.get(code).get('hannin');const actor=state.players[state.turn],target=state.players.find(p=>p.id!==actor.id);
 const actorPage=players.find(p=>{
  const own=p.el('players').querySelectorAll('.seat');
  return [...own].some(seat=>seat.textContent.includes(actor.name+'（あなた）'));
 });
 assert(actorPage,'active player view is available');
 const actorToken=actorPage.storage.getItem('hannin-token-'+code);
 state.players.find(p=>p.id===actor.id).hand=[{id:'boy-ui',type:'boy'},{id:'citizen-ui',type:'citizen'}];
 state.players.find(p=>p.id===target.id).hand=[{id:'culprit-ui',type:'culprit'}];
 state.rounds=1;state.pending=null;state.turn=state.players.findIndex(p=>p.id===actor.id);const initialSteps=state.turnSteps;state.revision++;
 stores.get(code).set('hannin',state);
 for(const p of players)await p.poll();
 actorPage.el('hand').querySelector('[data-card]').onclick();
 await actorPage.el('play').onclick();
 for(const p of players)await p.poll();
 assert.equal(stores.get(code).get('hannin').pending.type,'peek');
 assert.match(actorPage.el('controls').textContent,new RegExp(target.name));
 const otherPage=players.find(p=>p!==actorPage);
 assert.match(otherPage.el('status').textContent,/選択待ち/);
 assert(!otherPage.el('controls').textContent.includes(target.name));
 await actorPage.el('resolve').onclick();
 assert.equal(stores.get(code).get('hannin').pending,null);
 assert.equal(stores.get(code).get('hannin').turnSteps,initialSteps+1);
 assert(actorToken);
 console.log('PASS Hannin UI: create/join/start, hand rendering, private Boy reveal, waiting status and turn advance');
})().catch(e=>{console.error(e);process.exitCode=1;});
