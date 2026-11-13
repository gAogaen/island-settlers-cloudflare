(()=>{
'use strict';
const root=document.documentElement,cards=[...document.querySelectorAll('#gamePicker .game-choice')],buttons=[...document.querySelectorAll('[data-catalog-art]')];
const artFiles={
 catan:'catan-photo.webp?v=20261111-closeup',timebomb:'timebomb-photo.webp?v=20261109',penguin:'penguin-photo.webp?v=20261109',
 reddoor:'reddoor-photo.webp?v=20261109',daifugo:'daifugo-photo.webp',spirit:'spirit-photo.webp?v=20261109',
 bahamut:'bahamut-photo.webp?v=b2b64e55',coyote:'coyote-photo.webp?v=fba5d0be',hannin:'hannin-photo.webp?v=7fb98a82',chao:'chao-photo.webp?v=20261111-closeup'
};
function gameKey(card){const title=card.querySelector('.game-choice-copy h2')?.textContent.trim();return ({'カタン':'catan','タイムボム':'timebomb','ペンギンパーティ':'penguin','赤い扉と殺人鬼の鍵':'reddoor','大富豪':'daifugo','スピリット・アイランド':'spirit','はらぺこバハムート':'bahamut','コヨーテ':'coyote','犯人は踊る':'hannin','チャオチャオ':'chao'})[title]||'';}
for(const card of cards){const key=gameKey(card),art=card.querySelector('.game-choice-art');if(!key||!art||art.dataset.photoReady)continue;const original=document.createElement('div');original.className='catalog-art-original';original.style.gap=getComputedStyle(art).gap;while(art.firstChild)original.append(art.firstChild);const photo=document.createElement('img');photo.className='catalog-art-photo';photo.src='/assets/catalog/'+artFiles[key];photo.alt='';photo.setAttribute('aria-hidden','true');photo.decoding='async';if(key==='catan'){photo.fetchPriority='high';}else photo.loading='lazy';art.append(photo,original);art.dataset.photoReady='true';}
const storageKey='boardgame-catalog-art';let saved='photo';try{saved=localStorage.getItem(storageKey)||'photo';}catch{}
function apply(value){const mode=value==='illustration'?'illustration':'photo';root.dataset.catalogArt=mode;buttons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.catalogArt===mode)));return mode;}
apply(saved);buttons.forEach(button=>button.addEventListener('click',()=>{const mode=apply(button.dataset.catalogArt);try{localStorage.setItem(storageKey,mode);}catch{}}));
})();
