(()=>{
'use strict';
const rules={
 catan:['カタン','資源を集めて島を開拓し、最初に10点を目指します。',['サイコロで資源を獲得。自分の街に隣接する土地の数字が出ると資源が手に入ります。','資源を交換し、道・開拓地・都市を建設。発展カードも活用しましょう。','7が出ると盗賊が動きます。手札整理など、必要な操作は画面の案内に従ってください。']],
 timebomb:['タイムボム','正体を隠して会話し、導線を切り合うチーム戦です。',['自分の正体とカードを確認。何を持っているか、相手に伝える内容は自由です。','ニッパーを持つ人が、他の人の伏せたカードを1枚選んで切ります。','解除カードをすべて見つければ解除側の勝利。爆弾を切るか、時間切れになると爆弾側が勝ちます。']],
 penguin:['ペンギンパーティ','色の条件を守ってカードを置き、手札をできるだけ減らします。',['下段に並べるか、下の2枚に支えられる位置へ置きます。','上に置くカードは、支える2枚のどちらかと同じ色にします。','置けなくなるとそのラウンドは脱落。残った手札が失点につながり、全ラウンドの失点が少ない人が勝ちます。']],
 reddoor:['赤い扉と殺人鬼の鍵','部屋を探索して鍵を集め、殺人鬼の潜む屋敷から脱出します。',['自分の番に赤い扉を選び、部屋のカードを確認して効果を処理します。','一般人は銀の鍵3本をそろえて脱出口へ。殺人鬼は他の人の脱出を阻止します。','鍵やアイテム、追加カードで状況が変化します。秘密の情報を守りながら、表示される選択肢を選びましょう。']],
 daifugo:['大富豪','場より強いカードを出し、誰よりも早く手札をなくします。',['場と同じ枚数・形で、より強いカードを出します。出せないときはパスできます。','場が流れたら、新しくカードを出せます。革命などで強さが変わることもあります。','採用ルールは卓の設定で変わります。ゲーム間の順位やカード交換にも注目しましょう。']],
 spirit:['スピリット・アイランド','精霊たちが協力し、侵略者から島を守ります。',['成長を選び、存在を広げ、精霊力を使って能力カードを準備します。','早い能力 → 恐怖・侵略者の行動 → 遅い能力の順で進みます。仲間と相談して対処しましょう。','恐怖を生むと勝利条件が緩和されます。荒廃の増加や存在の全滅に注意し、画面の勝利条件を満たしましょう。']],
 bahamut:['はらぺこバハムート','まものと呪文を使い、相手のライフを0にする2人対戦です。',['ライフ4・打ち消し2個・手札5枚で開始。通常は1枚引き、カードを2枚まで使えます（先手の初手は引かず1枚まで）。','まものは自分の手番開始時に攻撃します。カードをタップすると効果と使える条件を確認できます。','相手のプレイは打ち消し1個で妨害でき、2個で打ち消し返し。手番終了時の手札は5枚までです。']],
 coyote:['コヨーテ','自分のカードだけ見えない状態で、全員の合計を推理します。',['席順に、直前より大きな数を宣言するか「コヨーテ！」で挑戦します。','宣言が実際の合計を超えていれば宣言した人が、超えていなければ挑戦した人がライフを失います。','特殊カードで合計が変わります。カード構成と捨て札も参考にし、最後まで生き残りましょう。']]
};
let pending=null,timer=0,bypass=false,restore=null,active='';
const seen=new Set(),key=g=>'boardgame-first-rules-v1:'+g;
function hasSeen(g){try{return seen.has(g)||localStorage.getItem(key(g))==='seen';}catch{return seen.has(g);}}
function remember(g){seen.add(g);try{localStorage.setItem(key(g),'seen');}catch{}}
const dialog=document.createElement('dialog');dialog.id='firstPlayRules';dialog.className='first-play-rules';dialog.setAttribute('aria-labelledby','firstPlayTitle');dialog.setAttribute('aria-describedby','firstPlayGoal');
document.body.append(dialog);
function finish(){remember(active);pending=null;clearTimeout(timer);dialog.close();restore?.focus?.({preventScroll:true});}
function show(g,auto=false){if(!rules[g])return;active=g;restore=document.activeElement;const [name,goal,steps]=rules[g];dialog.innerHTML=`<header><small>${auto?'はじめてのプレイ':'かんたんルール'}</small><h2 id="firstPlayTitle">${name}</h2></header><div class="first-play-body"><p id="firstPlayGoal">${goal}</p><ol>${steps.map(s=>`<li>${s}</li>`).join('')}</ol><p class="first-play-hint">あとからヘッダーの「遊び方」でも見返せます。スマホでは「⋯」メニューを開いてください。</p></div><footer><button type="button" id="firstPlayDetails" ${original?'':'hidden'}>詳しいルール</button><button type="button" id="firstPlayDone">${auto?'わかった・プレイへ':'閉じる'}</button></footer>`;dialog.querySelector('#firstPlayDone').onclick=finish;dialog.querySelector('#firstPlayDetails').onclick=()=>{finish();bypass=true;try{original.click();}finally{bypass=false;}};dialog.showModal();dialog.querySelector('#firstPlayDone').focus();}
dialog.addEventListener('cancel',e=>{e.preventDefault();finish();});
function attempt(){clearTimeout(timer);if(!pending||hasSeen(pending)){pending=null;return;}if(document.querySelector('dialog[open]')){timer=setTimeout(attempt,400);return;}const g=pending;pending=null;show(g,true);}
globalThis.BoardgameIntro={check({game,playing,participant}){if(!playing||!participant){if(pending===game){pending=null;clearTimeout(timer);}return;}if(hasSeen(game)||dialog.open)return;if(pending!==game){pending=game;timer=setTimeout(attempt,250);}}};
const page=document.documentElement.dataset.game;
const game=page==='index'?'catan':page;
let original=document.getElementById('rules')||document.getElementById('showRules');
if(!original&&rules[game]){original=null;const button=document.createElement('button');button.type='button';button.textContent='遊び方';button.className='site-tools-rules';button.id='firstPlayOpen';document.querySelector('header .site-tools')?.append(button);button.onclick=()=>show(game);}
if(original)original.addEventListener('click',e=>{if(bypass)return;e.preventDefault();e.stopImmediatePropagation();if(!dialog.open)show(game);},true);
})();
