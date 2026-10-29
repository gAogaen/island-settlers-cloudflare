'use strict';
function createActionGuide(getGuide,onGo){
 let seen=null,shown=null;
 const el=id=>document.getElementById(id),dialog=el('actionGuideDialog');
 function sync(force=false){
  const guide=getGuide();
  if(!guide){if(dialog.open)dialog.close();shown=null;return;}
  if(dialog.open&&shown!==guide.key){dialog.close();shown=null;}
  if(!force&&(guide.auto===false||seen===guide.key))return;
  if([...document.querySelectorAll('dialog[open]')].some(d=>d!==dialog))return;
  el('actionGuideTitle').textContent=guide.title;el('actionGuideDescription').textContent=guide.body;
  const steps=el('actionGuideSteps');steps.innerHTML='';
  for(const text of guide.steps||[]){const li=document.createElement('li');li.textContent=text;steps.appendChild(li);}
  el('actionGuideGo').textContent=guide.button||'わかった！';
  shown=guide.key;seen=guide.key;if(!dialog.open)dialog.showModal();
 }
 el('showActionGuide').onclick=()=>sync(true);
 el('actionGuideGo').onclick=()=>{const guide=getGuide();dialog.close();if(guide)onGo(guide.action);};
 el('actionGuideLater').onclick=()=>dialog.close();
 document.querySelectorAll('dialog').forEach(d=>{if(d!==dialog)d.addEventListener('close',()=>setTimeout(()=>sync(),0));});
 return {sync,reset(){seen=null;shown=null;if(dialog.open)dialog.close();}};
}
