(()=>{
'use strict';
const key='boardgame-theme',root=document.documentElement,media=window.matchMedia('(prefers-color-scheme: dark)'),modes=['light','dark','system'];
const labels={light:'ライト',dark:'ダーク',system:'端末に合わせる'};
const icons={
 light:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
 dark:'<path d="M20.5 13.1A8.7 8.7 0 0 1 10.9 3.5a8.8 8.8 0 1 0 9.6 9.6Z"/>',
 system:'<rect x="3" y="3" width="18" height="13" rx="2"/><path d="M8 21h8m-4-5v5"/>'
};
let preference='system';
try{preference=localStorage.getItem(key)||'system';}catch{}
if(!modes.includes(preference))preference='system';
function apply(){
 root.dataset.theme=preference==='system'?(media.matches?'dark':'light'):preference;
 root.style.colorScheme=root.dataset.theme;
 document.querySelectorAll('[data-theme-toggle]').forEach(button=>{
  const next=modes[(modes.indexOf(preference)+1)%modes.length];
  button.dataset.themeMode=preference;
  button.title=`表示：${labels[preference]}（押すと${labels[next]}）`;
  button.setAttribute('aria-label',button.title);
  button.innerHTML=`<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[preference]}</svg>`;
 });
}
function compactHeader(host){
 if(host.dataset.compactHeader)return;host.dataset.compactHeader='true';
 const sound=host.querySelector('#sound,#soundToggle');
 if(sound){
  const sync=()=>{const pressed=sound.getAttribute('aria-pressed'),off=pressed==='false'||(pressed===null&&/OFF|オフ|×/.test(sound.textContent));sound.dataset.soundState=off?'off':'on';sound.setAttribute('aria-label',off?'音をオンにする':'音をオフにする');sound.title=off?'音をオンにする':'音をオフにする';};
  sync();if(typeof MutationObserver!=='undefined')new MutationObserver(sync).observe(sound,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['aria-pressed']});
 }
 const actions=[...host.querySelectorAll('.site-tools-rules,.site-tools-guide')];if(!actions.length)return;
 const original=[...host.childNodes],wrap=document.createElement('div'),trigger=document.createElement('button'),panel=document.createElement('div');
 wrap.className='site-header-overflow';wrap.hidden=true;trigger.type='button';trigger.className='site-header-more';trigger.textContent='⋯';trigger.title='メニュー';trigger.setAttribute('aria-label','その他のメニュー');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls','siteHeaderMenu');
 panel.id='siteHeaderMenu';panel.className='site-header-menu';panel.hidden=true;panel.setAttribute('role','group');panel.setAttribute('aria-label','ゲームのメニュー');wrap.append(trigger,panel);host.append(wrap);
 const close=()=>{panel.hidden=true;trigger.setAttribute('aria-expanded','false');};
 trigger.addEventListener('click',()=>{const opening=panel.hidden;panel.hidden=!opening;trigger.setAttribute('aria-expanded',String(opening));if(opening)actions[0].focus?.();});
 panel.addEventListener('click',e=>{if(e.target.closest('button'))close();});
 document.addEventListener('click',e=>{if(!wrap.contains(e.target))close();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){close();trigger.focus?.();}});
 const narrow=window.matchMedia('(max-width: 650px)');
 const update=()=>{close();if(narrow.matches){for(const action of actions)panel.append(action);wrap.hidden=false;}else{for(const node of original)host.append(node);host.append(wrap);wrap.hidden=true;}};
 narrow.addEventListener('change',update);update();
}
apply();
media.addEventListener('change',apply);
window.addEventListener('storage',e=>{if(e.key===key){preference=modes.includes(e.newValue)?e.newValue:'system';apply();}});
document.addEventListener('DOMContentLoaded',()=>{
 const host=document.querySelector('header nav,header .top-meta')||document.querySelector('header');
 if(!host||document.querySelector('[data-theme-toggle]'))return;
 const button=document.createElement('button');button.type='button';button.className='theme-toggle';button.setAttribute('data-theme-toggle','');
 host.append(button);
 button.addEventListener('click',()=>{preference=modes[(modes.indexOf(preference)+1)%modes.length];try{localStorage.setItem(key,preference);}catch{}apply();});
 apply();
 compactHeader(host);
});
})();

