// Data registry for the Rocket game. Current records are provisional playtest placeholders.
// Replace these rows with verified card data when the user supplies the card list/images.
export const ROCKET_CARD_DATA_VERSION = 6;

export const ROCKET_ROLE_CARDS = [
  { id: 'leader', role: 'leader', name: 'ジムリーダー', copies: 1, public: true, image: '/assets/rocket/cards/card_055.webp', provisional: false },
  { id: 'trainer', role: 'trainer', name: 'ジムトレーナー', copies: 1, public: false, image: '/assets/rocket/cards/card_056.webp', provisional: false },
  { id: 'challenger', role: 'challenger', name: '挑戦者', copies: 3, public: false, image: '/assets/rocket/cards/card_057.webp', provisional: false },
  { id: 'rocket', role: 'rocket', name: 'ロケット団員', copies: 1, public: false, image: '/assets/rocket/cards/card_058.webp', provisional: false }
];

// kind is the broad rules family; effect.id maps to a server-side resolver.
// copies, text, and numeric values below are placeholders, not verified official data.
export const ROCKET_PLAY_CARDS = [
  { id: 'placeholder-attack', name: 'くらえ！', kind: 'attack', action: 'attack', copies: 30, text: '相手に攻撃する。', effect: { id: 'attack', damage: 2 }, weather: null, timing: '自分の番', target: '相手1人', targetMode: 'opponent', image: '/assets/rocket/cards/card_kurae.webp', provisional: true },
  { id: 'placeholder-dodge', name: 'よけて！', kind: 'dodge', action: 'dodge', copies: 20, text: '攻撃を回避する。', effect: { id: 'dodge' }, weather: null, timing: '攻撃されたとき', target: '自分', targetMode: 'self', image: '/assets/rocket/cards/card_yokete.webp', provisional: true },
  { id: 'placeholder-potion', name: 'キズぐすり', kind: 'tool', action: 'potion', copies: 18, text: '選んだトレーナーのHPを3回復。', effect: { id: 'heal', amount: 3 }, weather: null, timing: '仮設定', target: '生存中のトレーナー', targetMode: 'any-trainer', image: null, provisional: true },
  { id: 'placeholder-item', name: 'どうぐ', kind: 'tool', action: 'item', copies: 14, text: 'カードを1枚引く。', effect: { id: 'draw', amount: 1 }, weather: null, timing: '自分の番', target: '自分', targetMode: 'self', image: null, provisional: true },
  { id: 'placeholder-scout', name: 'さぐる', kind: 'event', action: 'scout', copies: 10, text: '選んだ相手の役割を自分だけ確認。', effect: { id: 'revealRole' }, weather: null, timing: '自分の番', target: '相手1人', targetMode: 'opponent', image: null, provisional: true },
  { id: 'placeholder-boost', name: 'きあい', kind: 'tool', action: 'boost', copies: 10, text: '自分のHPを1回復。', effect: { id: 'heal', amount: 1 }, weather: null, timing: '自分の番', target: '自分', targetMode: 'self', image: null, provisional: true }
];

// Provisional, simplified Pokémon roster. Official levels, abilities, moves and card images are not entered yet.
export const ROCKET_POKEMON_CARDS = [
  ['pikachu','ピカチュウ','でんき',8,'でんこうせっか'],['bulbasaur','フシギダネ','くさ',9,'つるのムチ'],
  ['charmander','ヒトカゲ','ほのお',8,'ひっかく'],['squirtle','ゼニガメ','みず',10,'みずでっぽう'],
  ['rattata','コラッタ','ノーマル',8,'たいあたり'],['growlithe','ガーディ','ほのお',9,'かみつく'],
  ['meowth','ニャース','ノーマル',8,'ひっかく'],['koffing','ドガース','どく',9,'たいあたり'],
  ['geodude','イシツブテ','いわ',10,'いわおとし'],['psyduck','コダック','みず',9,'みずでっぽう'],
  ['abra','ケーシィ','エスパー',8,'ねんりき'],['sandshrew','サンド','じめん',10,'ひっかく']
].map(([id,name,type,hp,move])=>{
  const pokedexNumber={pikachu:'025',bulbasaur:'001',charmander:'004',squirtle:'007',rattata:'019',growlithe:'058',meowth:'052',koffing:'109',geodude:'074',psyduck:'054',abra:'063',sandshrew:'027'}[id];
  const attacks=[{name:move,damage:2,weather:null,effect:null}];
  // Provisional stages keep the expert mode playable until verified card stats arrive.
  // Replace each family's stage rows with the printed red-heart HP and attack data.
  const levels=[1,2,3].map(level=>({level,hp,attacks:attacks.map(attack=>({...attack}))}));
  return {id:'placeholder-'+id,familyId:'placeholder-'+id,name,species:name,type,cardType:null,level:3,hp,greenHp:null,redHp:null,move,attacks,levels,ability:null,abilityText:'',image:`/assets/rocket/pokemon/${pokedexNumber}.png`,cardImage:null,provisional:true};
});

// First supplied Pokémon card. Its printed card text and both heart values are visible in the scan;
// expert level 1/2 progression still awaits the complete card data.
ROCKET_POKEMON_CARDS.push({
  id:'official-card-001', cardId:'card_001', familyId:'muk', name:'ベトベトン', species:'ベトベトン',
  type:'どく', cardType:'ぼうがい型', level:3, hp:10, greenHp:10, redHp:5, move:'どくどく',
  attacks:[{name:'どくどく',damage:2,text:'ダメージを与えた後、おてんきチェック。カード記載の天気なら、相手を「どく」にする。',weather:null,effect:{id:'poison-on-weather'}}],
  levels:[{level:3,hp:10,attacks:[{name:'どくどく',damage:2,text:'ダメージを与えた後、おてんきチェック。カード記載の天気なら、相手を「どく」にする。',weather:null,effect:{id:'poison-on-weather'}}]}],
  ability:'どくしゅ', abilityText:'バトルエリアの好きなポケモンが特殊状態になるとき、その特殊状態を「どく」に変更できる。どくでHPを失うとき、ダメージを2にできる。',
  image:'/assets/rocket/pokemon/089.png', cardImage:'/assets/rocket/cards/card_001.webp', provisional:true
});

// Dragonite evolution-line promo scans, rectified from the user-provided photos.
// The printed names and values are legible; complex move effects remain provisional.
ROCKET_POKEMON_CARDS.push({
  id:'promo-dragonite', cardId:'promo-dragonite', familyId:'dratini-line',
  name:'カイリュー', species:'カイリュー', type:'ドラゴン', cardType:'バランス型', level:3,
  hp:8, greenHp:8, redHp:4, move:'りゅうせいぐん',
  attacks:[{name:'りゅうせいぐん',damage:2,text:'左右のバトルエリアにいるポケモンが対象。追加効果の処理は未登録です。',weather:null,effect:null}],
  levels:[
    {level:1,name:'ミニリュウ',cardType:'バランス型',hp:3,greenHp:null,redHp:3,cardImage:'/assets/rocket/cards/evolution/dratini.webp',ability:'ふしぎなうろこ',abilityText:'相手の番でも使える。特殊状態のこのポケモンが2以上のダメージを受けたとき、そのダメージを1減らすことができる。',attacks:[{name:'たつまき',damage:1,text:'技の追加効果はカード画像を確認してください。',weather:null,effect:null}]},
    {level:2,name:'ハクリュー',cardType:'バランス型',hp:3,greenHp:null,redHp:3,cardImage:'/assets/rocket/cards/evolution/dragonair.webp',ability:'ふしぎなうろこ',abilityText:'相手の番でも使える。特殊状態のこのポケモンが2以上のダメージを受けたとき、そのダメージを1減らすことができる。',attacks:[{name:'りゅうのいかり',damage:2,text:'対象・どうぐ・回避に関する追加効果があります。正確な効果処理は未登録です。',weather:null,effect:null}]},
    {level:3,name:'カイリュー',cardType:'バランス型',hp:4,basicHp:8,greenHp:8,redHp:4,cardImage:'/assets/rocket/cards/evolution/dragonite.webp',ability:'マルチスケイル',abilityText:'バトルエリアにいる間続く。HPが満タンのこのポケモンがダメージを受けたとき、そのダメージを1にする。',attacks:[{name:'りゅうせいぐん',damage:2,text:'左右のバトルエリアにいるポケモンが対象。追加効果の処理は未登録です。',weather:null,effect:null}]}
  ],
  ability:'マルチスケイル', abilityText:'バトルエリアにいる間続く。HPが満タンのこのポケモンがダメージを受けたとき、そのダメージを1にする。',
  image:'/assets/rocket/pokemon/149.png', cardImage:'/assets/rocket/cards/evolution/dragonite.webp',
  provisional:true
});

export const ROCKET_ROLE_LABELS = Object.fromEntries(ROCKET_ROLE_CARDS.map(card=>[card.role,card.name]));

// Every official-site image from the supplied ZIP is registered here. Names and
// gameplay effects are kept in their card records and are not inferred from IDs.
export const ROCKET_CARD_IMAGE_ASSETS = [
  ...Array.from({length:58},(_,index)=>{
    const n=String(index+1).padStart(3,'0');
    const known={3:'ゲンガー',10:'スターミー',12:'ギャラドス',15:'カビゴン',17:'リザードン',20:'ライチュウ'};
    return {id:`card_${n}`,name:known[index+1]||null,level:index<30?3:null,category:index<30?'pokemon':index<54?'play': 'role',image:`/assets/rocket/cards/card_${n}.webp`};
  }),
  {id:'card_kurae',category:'play',image:'/assets/rocket/cards/card_kurae.webp'},
  {id:'card_yokete',category:'play',image:'/assets/rocket/cards/card_yokete.webp'},
  {id:'card_mew',category:'special',image:'/assets/rocket/cards/card_mew.webp'},
  {id:'card_mewtwo',category:'special',image:'/assets/rocket/cards/card_mewtwo.webp'},
  {id:'bulbasaur-lv1',name:'フシギダネ',level:1,category:'pokemon',image:'/assets/rocket/cards/evolution/bulbasaur-lv1.webp'},
  {id:'pikachu-lv1',name:'ピカチュウ',level:1,category:'pokemon',image:'/assets/rocket/cards/evolution/pikachu-lv1.webp'},
  {id:'meowth-lv1',name:'ニャース',level:1,category:'pokemon',image:'/assets/rocket/cards/evolution/meowth-lv1.webp'},
  {id:'slowpoke-lv1',name:'ヤドン',level:1,category:'pokemon',image:'/assets/rocket/cards/evolution/slowpoke-lv1.webp'},
  {id:'gyarados-lv2',name:'ギャラドス',level:2,category:'pokemon',image:'/assets/rocket/cards/evolution/gyarados-lv2.webp'},
  {id:'haunter-lv2',name:'ゴースト',level:2,category:'pokemon',image:'/assets/rocket/cards/evolution/haunter-lv2.webp'},
  {id:'pikachu-lv2',name:'ピカチュウ',level:2,category:'pokemon',image:'/assets/rocket/cards/evolution/pikachu-lv2.webp'},
  {id:'promo-dragonite-lv1',category:'pokemon',image:'/assets/rocket/cards/evolution/dratini.webp'},
  {id:'promo-dragonite-lv2',category:'pokemon',image:'/assets/rocket/cards/evolution/dragonair.webp'},
  {id:'promo-dragonite-lv3',category:'pokemon',image:'/assets/rocket/cards/evolution/dragonite.webp'}
];
