(() => {
 const catalog=document.querySelector('#gamePicker .game-catalog');
 const buttons=[...document.querySelectorAll('[data-catalog-columns]')];
 if(!catalog||!buttons.length)return;
 const key='boardgame-catalog-columns';
 function apply(value){const columns=['1','2','3'].includes(value)?value:'1';catalog.dataset.columns=columns;buttons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.catalogColumns===columns)));return columns;}
 let saved;try{saved=localStorage.getItem(key);}catch{}
 apply(saved);
 buttons.forEach(button=>button.addEventListener('click',()=>{const columns=apply(button.dataset.catalogColumns);try{localStorage.setItem(key,columns);}catch{}}));
})();