const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),{parseHTML}=require('linkedom');
for(const page of ['index','timebomb','penguin','reddoor','daifugo','spirit','bahamut','coyote'])for(const [saved,system] of [['light',true],['dark',false],['system',true],['system',false]]){
 const {document}=parseHTML(fs.readFileSync('public/'+page+'.html','utf8'));
 assert(document.querySelector('script[src="/theme.js"]'));assert(document.querySelector('link[href="/theme.css"]'));
 let value=saved,listener,storageListener;const media={matches:system,addEventListener:(t,f)=>listener=f};
 const ctx={document,window:{matchMedia:q=>q.includes('prefers-color-scheme')?media:{matches:false,addEventListener(){}},addEventListener:(t,f)=>storageListener=f},localStorage:{getItem:()=>value,setItem:(k,v)=>value=v}};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync('public/theme.js','utf8'),ctx);
 const expected=(pref)=>pref==='system'?(media.matches?'dark':'light'):pref;
 assert.equal(document.documentElement.dataset.theme,expected(saved));
 document.dispatchEvent(new document.defaultView.Event('DOMContentLoaded'));
 assert.equal(document.querySelectorAll('[data-theme-toggle]').length,1);assert.equal(document.querySelectorAll('[data-theme-select]').length,0);
 const button=document.querySelector('[data-theme-toggle]'),modes=['light','dark','system'];
 assert.equal(button.type,'button');assert(button.querySelector('svg[aria-hidden="true"]'));
 for(let i=1;i<=3;i++){
  button.click();const pref=modes[(modes.indexOf(saved)+i)%3];assert.equal(value,pref);assert.equal(button.dataset.themeMode,pref);assert.equal(document.documentElement.dataset.theme,expected(pref));assert(button.getAttribute('aria-label').includes('押すと'));assert(button.title.includes('表示：'));
 }
 storageListener({key:'boardgame-theme',newValue:'system'});media.matches=!system;listener();assert.equal(document.documentElement.dataset.theme,system?'light':'dark');assert.equal(button.dataset.themeMode,'system');
 storageListener({key:'boardgame-theme',newValue:'dark'});assert.equal(document.documentElement.dataset.theme,'dark');media.matches=!media.matches;listener();assert.equal(document.documentElement.dataset.theme,'dark');assert.equal(button.dataset.themeMode,'dark');
 document.dispatchEvent(new document.defaultView.Event('DOMContentLoaded'));assert.equal(document.querySelectorAll('[data-theme-toggle]').length,1);
}console.log('PASS shared theme: eight pages, accessible icon cycle, persisted light/dark/system, live OS changes, cross-tab sync and no duplicate controls');


for(const page of ['index','timebomb','penguin','reddoor','daifugo','spirit','bahamut','coyote']){
 const {document}=parseHTML(fs.readFileSync('public/'+page+'.html','utf8')),listeners={},observerCallbacks=[];let narrow=true;
 const mobile={get matches(){return narrow;},addEventListener:(t,f)=>listeners.mobile=f},color={matches:false,addEventListener:(t,f)=>listeners.color=f};
 const host=document.querySelector('header nav,header .top-meta'),actions=[...host.querySelectorAll('.site-tools-rules,.site-tools-guide')];let clicks=0;
 actions.forEach(b=>b.addEventListener('click',()=>clicks++));
 class Observer{constructor(f){this.callback=f;observerCallbacks.push(f);}observe(){}}
 const ctx={document,window:{matchMedia:q=>q.includes('prefers-color-scheme')?color:mobile,addEventListener(){}},localStorage:{getItem:()=>null,setItem(){}},MutationObserver:Observer};vm.createContext(ctx);vm.runInContext(fs.readFileSync('public/theme.js','utf8'),ctx);
 const E=document.defaultView.Event;document.dispatchEvent(new E('DOMContentLoaded'));
 const sound=host.querySelector('#sound,#soundToggle');if(sound){sound.textContent='× 音OFF';sound.setAttribute('aria-pressed','false');observerCallbacks.forEach(f=>f());assert.equal(sound.dataset.soundState,'off');assert.equal(sound.getAttribute('aria-label'),'音をオンにする');}
 const trigger=host.querySelector('.site-header-more'),panel=host.querySelector('.site-header-menu');
 if(actions.length){assert(trigger);assert.equal(panel.hidden,true);assert(actions.every(b=>b.parentElement===panel));trigger.click();assert.equal(panel.hidden,false);assert.equal(trigger.getAttribute('aria-expanded'),'true');actions[0].click();assert.equal(clicks,1);assert.equal(panel.hidden,true);
  trigger.click();document.body.dispatchEvent(new E('click',{bubbles:true}));assert.equal(panel.hidden,true);trigger.click();const escape=new E('keydown');escape.key='Escape';document.dispatchEvent(escape);assert.equal(panel.hidden,true);
  narrow=false;listeners.mobile();assert(actions.every(b=>b.parentElement===host));assert.equal(host.querySelector('.site-header-overflow').hidden,true);actions[0].click();assert.equal(clicks,2);
  narrow=true;listeners.mobile();assert(actions.every(b=>b.parentElement===panel));document.dispatchEvent(new E('DOMContentLoaded'));assert.equal(host.querySelectorAll('.site-header-more').length,1);assert.equal(document.querySelectorAll('#siteHeaderMenu').length,1);
 }else assert.equal(trigger,null);
 assert.equal(document.querySelectorAll('[data-theme-toggle]').length,1);
 color.matches=true;listeners.color();assert.equal(document.documentElement.dataset.theme,'dark');
}
console.log('PASS eight compact mobile headers: preserved action handlers, menu toggle/outside/Escape close, audio state, desktop restoration and resize without duplicates');
