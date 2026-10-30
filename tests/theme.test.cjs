const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),{parseHTML}=require('linkedom');
for(const page of ['index','timebomb','penguin','reddoor','daifugo'])for(const [saved,system] of [['light',true],['dark',false],['system',true],['system',false]]){
 const {document}=parseHTML(fs.readFileSync('public/'+page+'.html','utf8'));
 assert(document.querySelector('script[src="/theme.js"]'));assert(document.querySelector('link[href="/theme.css"]'));
 let value=saved,listener,storageListener;const media={matches:system,addEventListener:(t,f)=>listener=f};
 const ctx={document,window:{matchMedia:()=>media,addEventListener:(t,f)=>storageListener=f},localStorage:{getItem:()=>value,setItem:(k,v)=>value=v}};
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
}console.log('PASS shared theme: five pages, accessible icon cycle, persisted light/dark/system, live OS changes, cross-tab sync and no duplicate controls');
