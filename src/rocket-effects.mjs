// Rules transcribed from the supplied Lv.1/Lv.2 card faces.
// No TCG status rules are assumed here. Pending effects are surfaced in the UI.
export const SUPPORTED_ABILITIES = new Set(['じゅうなん','はやおき','あめうけざら','せいでんき','どくのトゲ','もうか','するどいめ','どんかん','スキルリンク','ふゆう','こんじょう','びびり','じしんかじょう','アナライズ','すてみ','しゅうかく','はっこう','ものひろい','くいしんぼう']);
export const OPTIONAL_ABILITIES = new Set(['アナライズ','すてみ']);
export const ABILITY_TEXT = {
 じゅうなん:'まひにならない。各わざを自分の番に1回ずつ使える。',
 はやおき:'プリンのライブとバリヤードのトリックの対象にならない。',
 あめうけざら:'番の終了時におてんきチェック。雨・雷雨ならHPを1回復し、特殊状態を回復する。',
 せいでんき:'ダメージを受けたとき、晴れ以外なら攻撃したポケモンをまひにする。',
 どくのトゲ:'ダメージを受けたとき、晴れ以外なら攻撃したポケモンをどくにする。',
 もうか:'HPが半分以下なら、技のダメージを2増やす。',
 するどいめ:'技はよけられない。相手が「よけて！」を使った場合、ダメージを1減らす。',
 どんかん:'自分の番以外にダメージを受けた後、その番は追加のダメージを受けない。',
 スキルリンク:'自分の番に「くらえ！」とこのポケモンの技を何度でも使える。',
 ふゆう:'雨・雷雨の手札を「よけて！」の代わりに使える。',
 こんじょう:'やけどによるダメージ減少を受けず、特殊状態なら技のダメージを1増やす。',
 びびり:'自分の番のトラッシュステップをスキップする。',
 じしんかじょう:'自分が「くらえ！」の効果を選んだ後、山札から1枚引く。',
 アナライズ:'自分の番に1回、残りHP以下の枚数の手札を捨て、同じ枚数を引く。',
 すてみ:'自分の番に1回、HPを減らし、同じ枚数を引く。HPが0になる場合は引けない。',
 しゅうかく:'番の終了時、山札から1枚引くことができる。',
 はっこう:'ドローステップで山札から引くとき、追加で1枚引くことができる。',
 ものひろい:'ドローステップ以外で山札から引くとき、追加で1枚引く（各トレーナーの番に1回）。',
 くいしんぼう:'もちものの効果が、番の終了時にHPが満タンでなければ1回復する効果になる。'
};
const rain=['rain','thunderstorm'],sun=['sunny','partly-cloudy'];
export function enrichPrinted(row){
 const copy=structuredClone(row);
 copy.abilityText=ABILITY_TEXT[row.ability]||'特性の自動処理は未対応です。カード画像の効果を確認してください。';
 copy.abilityStatus=SUPPORTED_ABILITIES.has(row.ability)?'implemented':'pending';
 copy.attacks=copy.attacks.map(move=>{
  const m={...move,trigger:move.damage>0||move.name==='はねる'?'attack':'weather',effect:{id:'none'},effectStatus:'implemented'};
  const n=move.name;
  if(['やどりぎのタネ','メガドレイン'].includes(n)){m.effect={id:'drain',amount:1};m.text='ダメージを与えたとき、自分のHPを1回復。';}
  else if(n==='にどげり'){m.effect={id:'double-hit'};m.text='同じポケモンに2回攻撃。回避は各攻撃に1枚必要。';}
  else if(['いわくだき','かわらわり'].includes(n)){m.effect={id:'remove-marker-before'};m.text='先に相手の強化マーカーを1つ取り除いてから攻撃。';}
  else if(n==='あわ'){m.effect={id:'remove-marker-after',markers:['plusPower','speeder']};m.text='ダメージ後、相手のプラスパワーまたはスピーダーを1つ取り除く。';}
  else if(['つのでつく','メガホーン'].includes(n)){m.effect={id:'full-hp-bonus'};m.text='自分のHPが満タンならダメージを1増やす。';}
  else if(n==='すてみタックル'){m.effect={id:'optional-recoil'};m.text='ダメージを1増やせる。その場合、自分のHPを1減らす。';}
  else if(n==='ボーンラッシュ'){m.effect={id:'repeat-lock'};m.text='何度でも使用できる。使用後、この番はこの技だけを使用できる。';}
  else if(n==='はたきおとす'){m.effect={id:'discard-random'};m.text='ダメージを与えたとき、相手の手札を裏のまま1枚捨てる。';}
  else if(n==='とげキャノン'){m.effect={id:'cycle-after-hit'};m.text='ダメージを与えたとき、手札を1枚捨てて1枚引くことができる。';}
  else if(n==='ネコにこばん'){m.effect={id:'gift-two'};m.text='ダメージを与えたとき2枚引き、他のトレーナーへ1枚ずつ渡す（同じ相手可）。';}
  else if(n==='まもる'){m.costWeather=sun;m.effect={id:'defender'};m.text='ディフェンダーがなければ1つ置く。';}
  else if(n==='あまえる'){m.costWeather=rain;m.effect={id:'discard-random'};m.text='選んだトレーナーの手札を裏のまま1枚捨てる。';}
  else if(n==='かなしばり'){m.costWeather=rain;m.effect={id:'lock-two'};m.text='相手の手札を裏のまま2枚、相手の次の番まで除外する。';}
  else if(n==='いのちのしずく'){m.costWeather=sun;m.effect={id:'heal-many'};m.text='好きな数のバトルポケモンを選び、HPを1回復する。';}
  else if(n==='アクアテール'){m.effect={id:'ignore-held'};m.text='この技の使用中、相手のもちものの効果を受けない。';m.effectStatus='partial';}
  else if(['いわおとし','いわなだれ','ストーンエッジ'].includes(n)){m.effect={id:'self-rescue-only'};m.text='この技でHPが0になったポケモンには、そのトレーナーだけがキズぐすりを使える。';}
  else if(['ひのこ','かえんほうしゃ','だいもんじ'].includes(n)){m.effect={id:'weather-status',weather:['sunny'],status:'やけど'};m.text='ダメージ後のおてんきチェックが晴れなら、やけど。';}
  else if(n==='おにび'){
   m.costWeather=sun;
   m.effect={id:'weather-status',weather:['sunny','partly-cloudy','thunderstorm'],status:'やけど'};
   m.text='おてんきチェックが雨以外なら、対象をやけどにする。';
   m.effectStatus='partial'; // Global weather replacement is pending.
  }
  else if(n==='トライアタック'){
   m.effect={id:'weather-status',weather:['sunny','thunderstorm'],status:'やけど',statusByWeather:{thunderstorm:'まひ'}};
   m.text='ダメージ後、晴れならやけど、雷雨ならまひ。';
  }
  else if(n==='シャドーボール'){
   m.effect={id:'weather-discard',weather:['rain']};
   m.text='ダメージ後、雨なら相手の手札を裏のまま1枚捨てる。';
  }
  else if(['ねんりき','たきのぼり','１０まんボルト'].includes(n)){
   const effects={
    ねんりき:{weather:['sunny'],status:'こんらん'},
    たきのぼり:{weather:['thunderstorm'],status:'ひるみ'},
    '１０まんボルト':{weather:['thunderstorm'],status:'まひ'},
   };
   m.effect={id:'weather-status',...effects[n]};
   m.text='ダメージ後、'+(n==='ねんりき'?'晴れ':'雷雨')+'なら'+m.effect.status+'。';
  }
  else if(n==='でんじは'){
   m.costWeather=rain;
   m.effect={id:'weather-status',weather:['partly-cloudy',...rain],status:'まひ'};
   m.text='おてんきチェックが晴れ以外なら対象をまひにする。';
  }
  else if(n==='かみつく'||n==='しねんのずつき'){
   m.effect={id:'weather-status',weather:n==='かみつく'?rain:['thunderstorm'],status:'ひるみ'};
   m.text='ダメージ後、'+(n==='かみつく'?'雨・雷雨':'雷雨')+'ならひるみ。';
  }
  else if(['どくどく','サイコキネシス','エアスラッシュ','かみなり','のしかかり','みずのはどう'].includes(n)){
   const effects={
    どくどく:[rain,'どく'],サイコキネシス:[['sunny'],'こんらん'],
    エアスラッシュ:[['thunderstorm'],'ひるみ'],かみなり:[['thunderstorm'],'まひ'],
    のしかかり:[sun,'まひ'],みずのはどう:[rain,'こんらん'],
   };
   const [weather,status]=effects[n];
   m.effect={id:'weather-status',weather,status};
  }
  else if(n==='ばくれつパンチ')m.effect={id:'apply-status',status:'こんらん'};
  else if(n==='ギガドレイン')m.effect={id:'drain',draw:1};
  else if(n==='どろぼう')m.effect={id:'steal-random'};
  else if(n==='つららばり')m.effect={id:'weather-draw',weather:rain};
  else if(n==='たたりめ')m.effect={id:'target-status-bonus'};
  else if(n==='きしかいせい')m.effect={id:'target-hp-bonus'};
  else if(['ヘドロウェーブ','サイケこうせん','エレキネット','ねっぷう'].includes(n)){
   const effects={
    ヘドロウェーブ:[['rain'],'どく'],サイケこうせん:[['sunny'],'こんらん'],
    エレキネット:[['thunderstorm'],'まひ'],ねっぷう:[['sunny'],'やけど'],
   };
   const [weather,status]=effects[n];
   m.maxTargets=2;
   m.effect={id:'weather-status',weather,status};
  }
  else if(n==='なみのり'||n==='インファイト'){
   m.maxTargets=2;
   m.effect={id:n==='なみのり'?'ignore-held':'remove-marker-before'};
   if(n==='なみのり')m.effectStatus='partial';
  }
  else if(n==='はかいこうせん')m.effect={id:'paid-bonus'};
  else if(n==='ホネブーメラン')m.effect={id:'paid-second-hit'};
  else if(n==='ロックオン'){
   m.costWeather=sun;
   m.effect={id:'lock-on'};
  }
  else if(n==='みらいよち'){
   m.effect={id:'pending'};m.effectStatus='pending';
   m.text='山札の並べ替えは未実装です。';
  }
  else m.text='記載されたダメージを与える。';
  return m;
 });
 copy.effectStatus=copy.abilityStatus==='implemented'&&copy.attacks.every(x=>x.effectStatus==='implemented')?'implemented':'partial';
 return copy;
}
export const active=p=>p.team?.[p.activeIndex||0]||p.pokemon;
export const ability=(g,p,name)=>active(p)?.ability===name&&active(p)?.abilityStatus==='implemented'&&p.abilitySuppressedTurn!==g.turnNumber;
export function attackDamage(g,p,move,{recoil=false,target=null}={}){
 const mon=active(p);let n=move.damage||0;if(n===0)return 0;
 if(ability(g,p,'もうか')&&mon.hp<=Math.floor(mon.maxHp/2))n+=2;
 if(ability(g,p,'こんじょう')&&mon.status)n++;
 if(move.effect?.id==='target-status-bonus'&&target?.status)n++;
 if(move.effect?.id==='target-hp-bonus'&&target?.hp>mon.hp)n++;
 if(move.effect?.id==='full-hp-bonus'&&mon.hp===mon.maxHp)n++;
 if(move.effect?.id==='optional-recoil'&&recoil)n++;
 if(mon.markers?.plusPower&&mon.status!=='まひ')n++;
 if(mon.status==='やけど'&&!ability(g,p,'こんじょう'))n=1;
 return n;
}
export function receivedDamage(g,p,n,{defender=false}={}){
 if(ability(g,p,'どんかん')&&g.players[g.turn]?.id!==p.id&&active(p).damagedTurn===g.turnNumber)return 0;
 return Math.max(0,defender?Math.min(1,n):n);
}
export function canDodge(g,p,card){return card?.type==='dodge'||(ability(g,p,'ふゆう')&&rain.includes(card?.weather));}
export function handLimitExempt(g,p){return ability(g,p,'びびり')||p.noDiscardTurn===g.turnNumber;}
