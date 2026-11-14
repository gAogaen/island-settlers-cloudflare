const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{parseHTML}=require('linkedom');
function client(search='',remembered=false){const {document,MutationObserver}=parseHTML(fs.readFileSync('public/index.html','utf8')),timers=new Map();let seq=0;const root=document.getElementById('developmentScene');root.showPopover=()=>root.dataset.popover='open';root.hidePopover=()=>delete root.dataset.popover;const ctx={document,MutationObserver,window:{},localStorage:{getItem:key=>remembered&&key==='island-room-BOOT12'?'saved-player':null,setItem(){},removeItem(){}},sessionStorage:{getItem:()=>null,setItem(){},removeItem(){}},location:{search},history:{replaceState(){}},URLSearchParams,Date,console,structuredClone,setTimeout:(f)=>{timers.set(++seq,f);return seq;},clearTimeout:id=>timers.delete(id),setInterval:()=>1,clearInterval(){},fetch:async()=>{throw Error('no request expected');}};vm.createContext(ctx);vm.runInContext(fs.readFileSync('public/app.js','utf8'),ctx);return {ctx,document,root,run:s=>vm.runInContext(s,ctx),timers};}
for(const spectator of [false,true]){const c=client();c.run('spectating='+spectator+';playerId="unaffected";');c.ctx.g={code:'SCENES',matchId:'m1',revision:1,actionEvents:[]};c.run('syncDevelopmentScenes(g)');assert(c.root.hidden);c.ctx.g.revision=3;c.ctx.g.actionEvents=[{revision:2,actorId:'someone',development:{card:'monopoly',playerName:'みどり',resource:'ore',total:0}},{revision:3,actorId:'someone',development:{card:'plenty',playerName:'モカ',resources:{wood:1,wheat:1}}}];c.run('syncDevelopmentScenes(g)');assert(!c.root.hidden);assert.equal(c.document.getElementById('developmentSceneTitle').textContent,'独占');assert(c.document.getElementById('developmentSceneDetail').textContent.includes('0枚'));assert.equal(c.run('developmentSceneQueue.length'),1);c.run('syncDevelopmentScenes(g)');assert.equal(c.run('developmentSceneQueue.length'),1);c.run('closeDevelopmentScene()');assert.equal(c.document.getElementById('developmentSceneTitle').textContent,'豊作');assert(c.document.getElementById('developmentSceneResources').textContent.includes('木材 ×1'));const id=c.run('developmentSceneTimer');c.timers.get(id)();assert(c.root.hidden);c.run('syncDevelopmentScenes(g)');assert(c.root.hidden);c.ctx.g.matchId='m2';c.ctx.g.revision=4;c.run('syncDevelopmentScenes(g)');assert(c.root.hidden);c.ctx.g.revision=5;c.ctx.g.actionEvents=[{revision:5,actorId:'unaffected',development:{card:'knight',playerName:'あなた'}}];c.run('syncDevelopmentScenes(g)');assert.equal(c.document.getElementById('developmentSceneTitle').textContent,'騎士');c.run('resetDevelopmentScenes()');assert(c.root.hidden);assert.equal(c.run('developmentSceneQueue.length'),0);}
console.log('PASS development scene UI: unaffected viewers and spectators, zero-card results, queued order, no duplicate/rejoin replay, auto-dismiss and room reset');
{
 const c=client(),modal=c.document.getElementById('tradeDialog');
 modal.setAttribute('open','');
 c.ctx.g={code:'OVERLAY',matchId:'m',revision:1,actionEvents:[]};
 c.run('syncDevelopmentScenes(g)');
 c.ctx.g.revision=2;
 c.ctx.g.actionEvents=[{revision:2,development:{card:'monopoly',playerName:'みどり',resource:'wood',total:4}}];
 c.run('syncDevelopmentScenes(g)');
 assert(c.root.hidden);
 assert.equal(c.run('developmentSceneQueue.length'),1);
 assert(modal.hasAttribute('open'));
 modal.removeAttribute('open');
 modal.dispatchEvent(new c.document.defaultView.Event('close'));
 assert(c.root.parentElement===c.document.body);
 assert(!c.root.hidden);
 assert.equal(c.root.dataset.popover,'open');
 assert.equal(c.run('developmentSceneQueue.length'),0);
 console.log('PASS development scene waits for the active modal to close before playing');
}

assert.doesNotThrow(()=>client('?room=BOOT12&spectate=1'));assert.doesNotThrow(()=>client('?room=BOOT12',true));console.log('PASS direct spectator and remembered-player URLs initialize scene state before synchronous room entry');
