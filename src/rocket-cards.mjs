import { ROCKET_LV3_DATA } from './rocket-lv3-data.mjs';
import { enrichPrinted } from './rocket-effects.mjs';
import { ROCKET_LV2_DATA } from './rocket-lv2-data.mjs';
import { ROCKET_LV1_DATA } from './rocket-lv1-data.mjs';
// Data registry for the Rocket game. Current records are provisional playtest placeholders.
// Replace these rows with verified card data when the user supplies the card list/images.
export const ROCKET_CARD_DATA_VERSION = 14;

export const ROCKET_ROLE_CARDS = [
  { id: 'leader', role: 'leader', name: 'ジムリーダー', copies: 1, public: true, image: '/assets/rocket/cards/card_055.webp', provisional: false },
  { id: 'trainer', role: 'trainer', name: 'ジムトレーナー', copies: 1, public: false, image: '/assets/rocket/cards/card_056.webp', provisional: false },
  { id: 'challenger', role: 'challenger', name: '挑戦者', copies: 3, public: false, image: '/assets/rocket/cards/card_057.webp', provisional: false },
  { id: 'rocket', role: 'rocket', name: 'ロケット団員', copies: 1, public: false, image: '/assets/rocket/cards/card_058.webp', provisional: false }
];

// kind is the broad rules family; effect.id maps to a server-side resolver.
// copies, text, and numeric values below are placeholders, not verified official data.
export const ROCKET_PLAY_CARDS = [
  {"id": "attack-sunny", "name": "くらえ！", "kind": "attack", "action": "attack", "copies": 6, "weather": "sunny", "image": "/assets/rocket/cards/weather/attack-sunny.webp", "text": "相手に攻撃する。", "effect": {"id": "attack"}, "targetMode": "opponent", "provisional": true},
  {"id": "attack-partly-cloudy", "name": "くらえ！", "kind": "attack", "action": "attack", "copies": 3, "weather": "partly-cloudy", "image": "/assets/rocket/cards/weather/attack-partly-cloudy.webp", "text": "相手に攻撃する。", "effect": {"id": "attack"}, "targetMode": "opponent", "provisional": true},
  {"id": "attack-rain", "name": "くらえ！", "kind": "attack", "action": "attack", "copies": 14, "weather": "rain", "image": "/assets/rocket/cards/weather/attack-rain.webp", "text": "相手に攻撃する。", "effect": {"id": "attack"}, "targetMode": "opponent", "provisional": true},
  {"id": "attack-thunderstorm", "name": "くらえ！", "kind": "attack", "action": "attack", "copies": 7, "weather": "thunderstorm", "image": "/assets/rocket/cards/card_kurae.webp", "text": "相手に攻撃する。", "effect": {"id": "attack"}, "targetMode": "opponent", "provisional": true},
  {"id": "dodge-sunny", "name": "よけて！", "kind": "dodge", "action": "dodge", "copies": 12, "weather": "sunny", "image": "/assets/rocket/cards/weather/dodge-sunny.webp", "text": "攻撃を回避する。", "effect": {"id": "dodge"}, "targetMode": "self", "provisional": true},
  {"id": "dodge-partly-cloudy", "name": "よけて！", "kind": "dodge", "action": "dodge", "copies": 3, "weather": "partly-cloudy", "image": "/assets/rocket/cards/card_yokete.webp", "text": "攻撃を回避する。", "effect": {"id": "dodge"}, "targetMode": "self", "provisional": true},
  { id: 'placeholder-potion', name: 'キズぐすり', kind: 'tool', action: 'potion', copies: 18, text: '選んだトレーナーのHPを3回復。', effect: { id: 'heal', amount: 3 }, weather: null, timing: '仮設定', target: '生存中のトレーナー', targetMode: 'any-trainer', image: '/assets/rocket/cards/card_045.webp', provisional: true },
  { id: 'placeholder-item', name: 'どうぐ', kind: 'tool', action: 'item', copies: 14, text: 'カードを1枚引く。', effect: { id: 'draw', amount: 1 }, weather: null, timing: '自分の番', target: '自分', targetMode: 'self', image: null, provisional: true },
  { id: 'placeholder-scout', name: 'さぐる', kind: 'event', action: 'scout', copies: 10, text: '選んだ相手の役割を自分だけ確認。', effect: { id: 'revealRole' }, weather: null, timing: '自分の番', target: '相手1人', targetMode: 'opponent', image: null, provisional: true },
  { id: 'placeholder-boost', name: 'きあい', kind: 'tool', action: 'boost', copies: 10, text: '自分のHPを1回復。', effect: { id: 'heal', amount: 1 }, weather: null, timing: '自分の番', target: '自分', targetMode: 'self', image: null, provisional: true }
];

const dragonite = {
  id:'promo-dragonite', cardId:'promo-dragonite', familyId:'dratini-line',
  name:'カイリュー', species:'カイリュー', type:'ドラゴン', cardType:'バランス型', level:3,
  hp:8, greenHp:8, redHp:4, move:'りゅうせいぐん',
  attacks:[{name:'りゅうせいぐん',damage:2,text:'左右のポケモンを最大2匹選ぶ。せんせいのツメで対象範囲を拡張できる。プラスパワーとスピーダーは無効で、回避できない。',weather:null,effect:null}],
  levels:[
    {level:1,name:'ミニリュウ',cardType:'バランス型',hp:3,greenHp:null,redHp:3,cardImage:'/assets/rocket/cards/evolution/dratini-q2.webp',ability:'ふしぎなうろこ',abilityText:'相手の番でも使える。特殊状態のこのポケモンが2以上のダメージを受けたとき、そのダメージを1減らすことができる。',attacks:[{name:'たつまき',damage:1,text:'1ダメージを与える。',weather:null,effect:null}]},
    {level:2,name:'ハクリュー',cardType:'バランス型',hp:3,greenHp:null,redHp:3,cardImage:'/assets/rocket/cards/evolution/dragonair-q2.webp',ability:'ふしぎなうろこ',abilityText:'相手の番でも使える。特殊状態のこのポケモンが2以上のダメージを受けたとき、そのダメージを1減らすことができる。',attacks:[{name:'りゅうのいかり',damage:2,text:'左右のポケモンを1匹選ぶ。せんせいのツメで対象範囲を拡張できる。プラスパワーとスピーダーは無効で、回避できない。',weather:null,effect:null}]},
    {level:3,name:'カイリュー',cardType:'バランス型',hp:4,basicHp:8,greenHp:8,redHp:4,cardImage:'/assets/rocket/cards/evolution/dragonite-q2.webp',ability:'マルチスケイル',abilityText:'バトルエリアにいる間続く。HPが満タンのこのポケモンがダメージを受けたとき、そのダメージを1にする。',attacks:[{name:'りゅうせいぐん',damage:2,text:'左右のポケモンを最大2匹選ぶ。せんせいのツメで対象範囲を拡張できる。プラスパワーとスピーダーは無効で、回避できない。',weather:null,effect:null}]}
  ],
  ability:'マルチスケイル', abilityText:'バトルエリアにいる間続く。HPが満タンのこのポケモンがダメージを受けたとき、そのダメージを1にする。',
  image:'/assets/rocket/pokemon/149.png', cardImage:'/assets/rocket/cards/evolution/dragonite-q2.webp',
  provisional:true
};

export const ROCKET_ROLE_LABELS = Object.fromEntries(ROCKET_ROLE_CARDS.map(card=>[card.role,card.name]));

// Every official-site image from the supplied ZIP is registered here. Names and
// gameplay effects are kept in their card records and are not inferred from IDs.
export const ROCKET_CARD_IMAGE_ASSETS = [
  ...Array.from({length:58},(_,index)=>{
    const n=String(index+1).padStart(3,'0');
    const weatherVariants = {
      31: ['ライバルからの挑戦', 'thunderstorm'],
      35: ['バリヤードのトリック', 'thunderstorm'],
      36: ['カモネギのいたずら', 'thunderstorm'],
      37: ['プラスパワー／スピーダー', 'thunderstorm'],
      41: ['フリーザーの守り', 'thunderstorm'],
      44: ['きのみ大豊作', 'partly-cloudy'],
      45: ['キズぐすり／げんきのかけら', 'partly-cloudy'],
      46: ['キズぐすり／なんでもなおし', 'partly-cloudy'],
      47: ['プリンのライブ', 'partly-cloudy'],
      48: ['ふしぎなアメ／きんのたま', 'partly-cloudy'],
      49: ['ディフェンダー／スピーダー', 'rain'],
      51: ['ファイヤーからの試練', 'sunny'],
      54: ['サンダーのペナルティ', 'thunderstorm'],

      32: ['どくバリ', 'thunderstorm'],
      33: ['いのちのたま', 'thunderstorm'],
      34: ['おんみつマント', 'thunderstorm'],
      38: ['からぶりほけん', 'thunderstorm'],
      39: ['ゴツゴツメット', 'thunderstorm'],
      40: ['おうじゃのしるし', 'thunderstorm'],
      42: ['ちからのハチマキ', 'thunderstorm'],
      43: ['せんせいのツメ', 'thunderstorm'],
      50: ['かえんだま', 'sunny'],
      52: ['でんきだま', 'sunny'],
      53: ['たべのこし', 'partly-cloudy']
    };
    const variant = weatherVariants[index + 1];
    const known={"1": "ベトベトン", "2": "パルシェン", "3": "ゲンガー", "4": "ナッシー", "5": "ガラガラ", "6": "マタドガス", "7": "サイドン", "8": "ラッキー", "9": "ガルーラ", "10": "スターミー", "11": "エレブー", "12": "ギャラドス", "13": "ポリゴン", "14": "プテラ", "15": "カビゴン", "16": "フシギバナ", "17": "リザードン", "18": "カメックス", "19": "ピジョット", "20": "ライチュウ", "21": "サンドパン", "22": "ニドキング", "23": "キュウコン", "24": "ペルシアン", "25": "オコリザル", "26": "ゴルダック", "27": "ウインディ", "28": "カイリキー", "29": "ヤドラン", "30": "レアコイル", "55": "ジムリーダー", "56": "ジムトレーナー", "57": "挑戦者", "58": "ロケット団員"};
    return {id:`card_${n}`,name:variant?.[0]||known[index+1]||null,weather:variant?.[1]||null,level:index<30?3:null,category:index<30?'pokemon':index<54?'play': 'role',image:`/assets/rocket/cards/card_${n}.webp`};
  }),
  {id:'covert-cloak-rain',name:'おんみつマント',weather:'rain',category:'play',image:'/assets/rocket/cards/weather/covert-cloak-rain.webp'},
  {id:'quick-claw-rain',name:'せんせいのツメ',weather:'rain',category:'play',image:'/assets/rocket/cards/weather/quick-claw-rain.webp'},
  {"id": "farfetchd-partly-cloudy", "name": "カモネギのいたずら", "weather": "partly-cloudy", "category": "play", "image": "/assets/rocket/cards/weather/farfetchd-partly-cloudy.webp", "observedCopies": 1, "sourcePhoto": "IMG_1614.jpeg"},
  {"id": "farfetchd-rain", "name": "カモネギのいたずら", "weather": "rain", "category": "play", "image": "/assets/rocket/cards/weather/farfetchd-rain.webp", "observedCopies": 2, "sourcePhoto": "IMG_1614.jpeg"},
  {"id": "mr-mime-sunny", "name": "バリヤードのトリック", "weather": "sunny", "category": "play", "image": "/assets/rocket/cards/weather/mr-mime-sunny.webp", "observedCopies": 2, "sourcePhoto": "IMG_1615.jpeg"},
  {"id": "articuno-rain", "name": "フリーザーの守り", "weather": "rain", "category": "play", "image": "/assets/rocket/cards/weather/articuno-rain.webp", "observedCopies": 3, "sourcePhoto": "IMG_1616.jpeg"},
  {"id": "jigglypuff-rain", "name": "プリンのライブ", "weather": "rain", "category": "play", "image": "/assets/rocket/cards/weather/jigglypuff-rain.webp", "observedCopies": 1, "sourcePhoto": "IMG_1617.jpeg"},
  {"id": "rival-rain", "name": "ライバルからの挑戦", "weather": "rain", "category": "play", "image": "/assets/rocket/cards/weather/rival-rain.webp", "observedCopies": 2, "sourcePhoto": "IMG_1618.jpeg"},
  {"id": "plus-power-partly-cloudy", "name": "プラスパワー／スピーダー", "weather": "partly-cloudy", "category": "play", "image": "/assets/rocket/cards/weather/plus-power-partly-cloudy.webp", "observedCopies": 2, "sourcePhoto": "IMG_1619.jpeg"},
  {"id": "plus-power-rain", "name": "プラスパワー／スピーダー", "weather": "rain", "category": "play", "image": "/assets/rocket/cards/weather/plus-power-rain.webp", "observedCopies": 1, "sourcePhoto": "IMG_1619.jpeg"},
  {"id": "potion-full-heal-sunny", "name": "キズぐすり／なんでもなおし", "weather": "sunny", "category": "play", "image": "/assets/rocket/cards/weather/potion-full-heal-sunny.webp", "observedCopies": 2, "sourcePhoto": "IMG_1621.jpeg"},
  {"id": "attack-sunny", "name": "くらえ！", "weather": "sunny", "copies": 6, "category": "play", "image": "/assets/rocket/cards/weather/attack-sunny.webp"},
  {"id": "attack-partly-cloudy", "name": "くらえ！", "weather": "partly-cloudy", "copies": 3, "category": "play", "image": "/assets/rocket/cards/weather/attack-partly-cloudy.webp"},
  {"id": "attack-rain", "name": "くらえ！", "weather": "rain", "copies": 14, "category": "play", "image": "/assets/rocket/cards/weather/attack-rain.webp"},
  {"id": "attack-thunderstorm", "name": "くらえ！", "weather": "thunderstorm", "copies": 7, "category": "play", "image": "/assets/rocket/cards/card_kurae.webp"},
  {"id": "dodge-sunny", "name": "よけて！", "weather": "sunny", "copies": 12, "category": "play", "image": "/assets/rocket/cards/weather/dodge-sunny.webp"},
  {"id": "dodge-partly-cloudy", "name": "よけて！", "weather": "partly-cloudy", "copies": 3, "category": "play", "image": "/assets/rocket/cards/card_yokete.webp"},
  {"id": "charmander-lv1", "name": "ヒトカゲ", "level": 1, "category": "pokemon", "image": "/assets/rocket/cards/evolution/charmander-lv1.webp", "cardType": "アタック型", "redHp": 3, "ability": "もうか", "attacks": [{"name": "ひのこ", "damage": 1}]},
  {"id": "squirtle-lv1", "name": "ゼニガメ", "level": 1, "category": "pokemon", "image": "/assets/rocket/cards/evolution/squirtle-lv1.webp", "cardType": "バランス型", "redHp": 3, "ability": "あめうけざら", "attacks": [{"name": "みずでっぽう", "damage": 2}]},
  {"id": "pidgey-lv1", "name": "ポッポ", "level": 1, "category": "pokemon", "image": "/assets/rocket/cards/evolution/pidgey-lv1.webp", "cardType": "アタック型", "redHp": 3, "ability": "するどいめ", "attacks": [{"name": "たいあたり", "damage": 1}]},
  {"id": "nidoran-m-lv1", "name": "ニドラン♂", "level": 1, "category": "pokemon", "image": "/assets/rocket/cards/evolution/nidoran-m-lv1.webp", "cardType": "アタック型", "redHp": 3, "ability": "どくのトゲ", "attacks": [{"name": "にどげり", "damage": 1}]},
  {"id": "mankey-lv1", "name": "マンキー", "level": 1, "category": "pokemon", "image": "/assets/rocket/cards/evolution/mankey-lv1.webp", "cardType": "バランス型", "redHp": 3, "ability": "まけんき", "attacks": [{"name": "ひっかく", "damage": 2}]},
  {"id": "psyduck-lv1", "name": "コダック", "level": 1, "category": "pokemon", "image": "/assets/rocket/cards/evolution/psyduck-lv1.webp", "cardType": "ぼうがい型", "redHp": 3, "ability": "すいすい", "attacks": [{"name": "あわ", "damage": 1}]},
  {"id": "growlithe-lv1", "name": "ガーディ", "level": 1, "category": "pokemon", "image": "/assets/rocket/cards/evolution/growlithe-lv1.webp", "cardType": "バランス型", "redHp": 3, "ability": "せいぎのこころ", "attacks": [{"name": "ほのおのキバ", "damage": 2}]},
  {"id": "sandshrew-lv1", "name": "サンド", "level": 1, "category": "pokemon", "image": "/assets/rocket/cards/evolution/sandshrew-lv1.webp", "cardType": "ぼうがい型", "redHp": 3, "ability": "すながくれ", "attacks": [{"name": "どくばり", "damage": 1}]},
  {"id": "machop-lv1", "name": "ワンリキー", "level": 1, "category": "pokemon", "image": "/assets/rocket/cards/evolution/machop-lv1.webp", "cardType": "アタック型", "redHp": 3, "ability": "こんじょう", "attacks": [{"name": "いわくだき", "damage": 1}]},
  {"id": "magnemite-lv1", "name": "コイル", "level": 1, "category": "pokemon", "image": "/assets/rocket/cards/evolution/magnemite-lv1.webp", "cardType": "ぼうがい型", "redHp": 3, "ability": "アナライズ", "attacks": [{"name": "でんきショック", "damage": 1}]},
  {"id": "shellder-lv1", "name": "シェルダー", "level": 1, "category": "pokemon", "image": "/assets/rocket/cards/evolution/shellder-lv1.webp", "cardType": "アタック型", "redHp": 3, "ability": "スキルリンク", "attacks": [{"name": "たいあたり", "damage": 1}]},
  {"id": "gastly-lv1", "name": "ゴース", "level": 1, "category": "pokemon", "image": "/assets/rocket/cards/evolution/gastly-lv1.webp", "cardType": "アタック型", "redHp": 3, "ability": "ふゆう", "attacks": [{"name": "したでなめる", "damage": 1}]},
  {"id": "exeggcute-lv1", "name": "タマタマ", "level": 1, "category": "pokemon", "image": "/assets/rocket/cards/evolution/exeggcute-lv1.webp", "cardType": "アタック型", "redHp": 3, "ability": "しゅうかく", "attacks": [{"name": "やどりぎのタネ", "damage": 1}]},
  {"id": "cubone-lv1", "name": "カラカラ", "level": 1, "category": "pokemon", "image": "/assets/rocket/cards/evolution/cubone-lv1.webp", "cardType": "ディフェンス型", "redHp": 3, "ability": "カブトアーマー", "attacks": [{"name": "たいあたり", "damage": 1}]},
  {"id": "koffing-lv1", "name": "ドガース", "level": 1, "category": "pokemon", "image": "/assets/rocket/cards/evolution/koffing-lv1.webp", "cardType": "バランス型", "redHp": 3, "ability": "かがくへんかガス", "attacks": [{"name": "アシッドボム", "damage": 2}]},
  {"id": "rhyhorn-lv1", "name": "サイホーン", "level": 1, "category": "pokemon", "image": "/assets/rocket/cards/evolution/rhyhorn-lv1.webp", "cardType": "アタック型", "redHp": 3, "ability": "すてみ", "attacks": [{"name": "いわおとし", "damage": 1}]},
  {"id": "chansey-lv1", "name": "ラッキー", "level": 1, "category": "pokemon", "image": "/assets/rocket/cards/evolution/chansey-lv1.webp", "cardType": "サポート型", "redHp": 3, "ability": "いやしのこころ", "attacks": [{"name": "あまえる", "damage": 0}]},
  {"id": "kangaskhan-lv1", "name": "ガルーラ", "level": 1, "category": "pokemon", "image": "/assets/rocket/cards/evolution/kangaskhan-lv1.webp", "cardType": "アタック型", "redHp": 3, "ability": "はやおき", "attacks": [{"name": "ねこだまし", "damage": 1}]},
  {"id": "staryu-lv1", "name": "ヒトデマン", "level": 1, "category": "pokemon", "image": "/assets/rocket/cards/evolution/staryu-lv1.webp", "cardType": "バランス型", "redHp": 3, "ability": "はっこう", "attacks": [{"name": "みずでっぽう", "damage": 2}]},
  {"id": "electabuzz-lv1", "name": "エレブー", "level": 1, "category": "pokemon", "image": "/assets/rocket/cards/evolution/electabuzz-lv1.webp", "cardType": "バランス型", "redHp": 3, "ability": "やるき", "attacks": [{"name": "でんげきは", "damage": 2}]},
  {"id": "vulpix-lv1", "name": "ロコン", "level": 1, "category": "pokemon", "image": "/assets/rocket/cards/evolution/vulpix-lv1.webp", "cardType": "ぼうがい型", "redHp": 3, "ability": "ひでり", "attacks": [{"name": "ひのこ", "damage": 1}]},
  {"id": "magikarp-lv1", "name": "コイキング", "level": 1, "category": "pokemon", "image": "/assets/rocket/cards/evolution/magikarp-lv1.webp", "cardType": "アタック型", "redHp": 3, "ability": "びびり", "attacks": [{"name": "はねる", "damage": 0}]},
  {"id": "grimer-lv1", "name": "ベトベター", "level": 1, "category": "pokemon", "image": "/assets/rocket/cards/evolution/grimer-lv1.webp", "cardType": "ぼうがい型", "redHp": 3, "ability": "どくしゅ", "attacks": [{"name": "はたく", "damage": 1}]},
  {"id": "porygon-lv1", "name": "ポリゴン", "level": 1, "category": "pokemon", "image": "/assets/rocket/cards/evolution/porygon-lv1.webp", "cardType": "ぼうがい型", "redHp": 3, "ability": "ダウンロード", "attacks": [{"name": "でんきショック", "damage": 1}]},
  {"id": "snorlax-lv1", "name": "カビゴン", "level": 1, "category": "pokemon", "image": "/assets/rocket/cards/evolution/snorlax-lv1.webp", "cardType": "ディフェンス型", "redHp": 4, "ability": "くいしんぼう", "attacks": [{"name": "たいあたり", "damage": 1}]},
  {"id": "aerodactyl-lv1", "name": "プテラ", "level": 1, "category": "pokemon", "image": "/assets/rocket/cards/evolution/aerodactyl-lv1.webp", "cardType": "アタック型", "redHp": 3, "ability": "プレッシャー", "attacks": [{"name": "つばさでうつ", "damage": 2}]},
  {id:'card_mew',weather:'partly-cloudy',category:'special',image:'/assets/rocket/cards/card_mew.webp'},
  {id:'card_mewtwo',weather:'partly-cloudy',category:'special',image:'/assets/rocket/cards/card_mewtwo.webp'},
  {id:'bulbasaur-lv1',name:'フシギダネ',level:1,category:'pokemon',image:'/assets/rocket/cards/evolution/bulbasaur-lv1-q2.webp'},
  {id:'pikachu-lv1',name:'ピカチュウ',level:1,category:'pokemon',image:'/assets/rocket/cards/evolution/pikachu-lv1-q2.webp'},
  {id:'meowth-lv1',name:'ニャース',level:1,category:'pokemon',image:'/assets/rocket/cards/evolution/meowth-lv1-q2.webp'},
  {id:'slowpoke-lv1',name:'ヤドン',level:1,category:'pokemon',image:'/assets/rocket/cards/evolution/slowpoke-lv1-q2.webp'},
  {id:'aerodactyl-lv2',name:'プテラ',level:2,category:'pokemon',image:'/assets/rocket/cards/evolution/aerodactyl-lv2-q2.webp'},
  {id:'gyarados-lv2',name:'ギャラドス',level:2,category:'pokemon',image:'/assets/rocket/cards/evolution/gyarados-lv2-q2.webp'},
  {id:'haunter-lv2',name:'ゴースト',level:2,category:'pokemon',image:'/assets/rocket/cards/evolution/haunter-lv2-q2.webp'},
  {id:'pikachu-lv2',name:'ピカチュウ',level:2,category:'pokemon',image:'/assets/rocket/cards/evolution/pikachu-lv2-q2.webp'},
  {id:'promo-dragonite-lv1',category:'pokemon',image:'/assets/rocket/cards/evolution/dratini-q2.webp'},
  {id:'promo-dragonite-lv2',category:'pokemon',image:'/assets/rocket/cards/evolution/dragonair-q2.webp'},
  {id:'promo-dragonite-lv3',category:'pokemon',image:'/assets/rocket/cards/evolution/dragonite-q2.webp'}
];

for (const image of ROCKET_CARD_IMAGE_ASSETS) {
 const printed = ROCKET_LV1_DATA.find(row => row.name === image.name && image.level === 1);
 if (printed) Object.assign(image, {redHp:printed.redHp,cardType:printed.cardType,ability:printed.ability,attacks:printed.attacks});
}

// Lv.2 scans are registered separately from same-name Lv.1 cards.
for (const printed of ROCKET_LV2_DATA) {
 const asset = {...printed, category:'pokemon', image:printed.cardImage};
 const existing = ROCKET_CARD_IMAGE_ASSETS.find(row => row.id === printed.id);
 if (existing) Object.assign(existing, asset);
 else ROCKET_CARD_IMAGE_ASSETS.push(asset);
}
// Attach the matching printed Lv.3 face to each expert family.
const NEXT_SPECIES = {フシギダネ:'フシギソウ',ヒトカゲ:'リザード',ゼニガメ:'カメール',ポッポ:'ピジョン','ニドラン♂':'ニドリーノ',ワンリキー:'ゴーリキー',ゴース:'ゴースト',コイキング:'ギャラドス'};
export const ROCKET_EXPERT_POKEMON_CARDS = ROCKET_LV1_DATA.map(first => {
 const second = ROCKET_LV2_DATA.find(row => row.name === (NEXT_SPECIES[first.name] || first.name));
 const third = ROCKET_LV3_DATA.find(row => row.family === first.name);
 const stages = [first,second,third].filter(Boolean).map(row => ({...enrichPrinted(row), hp:row.redHp, basicHp:row.greenHp}));
 return {...stages[0],id:'expert-'+first.id,familyId:first.id.replace('-lv1',''),species:first.name,type:'',level:1,hp:first.redHp,levels:stages,provisional:true};
});
 dragonite.levels=dragonite.levels.map(stage=>({
  ...stage,abilityStatus:'implemented',effectStatus:'implemented',
  attacks:stage.attacks.map(move=>({
   ...move,trigger:'attack',maxTargets:stage.level===3?2:1,effectStatus:'implemented',
   effect:{id:stage.level===1?'none':'dragon-adjacent'},
  })),
 }));
ROCKET_EXPERT_POKEMON_CARDS.push(dragonite);
export const ROCKET_POKEMON_CARDS = ROCKET_EXPERT_POKEMON_CARDS.flatMap(family => {
 const stage=family.levels.find(card=>card.level===3);
 if(!stage?.cardImage||!Number.isFinite(stage.basicHp))return [];
 return [{...family,...stage,id:family.id,name:stage.name,species:stage.name,hp:stage.basicHp,provisional:false,levels:[stage]}];
});
for (const image of ROCKET_CARD_IMAGE_ASSETS) {
 const row = [...ROCKET_LV1_DATA,...ROCKET_LV2_DATA,...ROCKET_LV3_DATA].find(row => row.id === image.id);
 if (row) Object.assign(image, enrichPrinted(row));
}
