// Data registry for the Rocket game. Current records are provisional playtest placeholders.
// Replace these rows with verified card data when the user supplies the card list/images.
export const ROCKET_CARD_DATA_VERSION = 1;

export const ROCKET_ROLE_CARDS = [
  { id: 'leader', role: 'leader', name: 'ジムリーダー', copies: 1, public: true, image: null, provisional: false },
  { id: 'trainer', role: 'trainer', name: 'ジムトレーナー', copies: 1, public: false, image: null, provisional: false },
  { id: 'challenger', role: 'challenger', name: '挑戦者', copies: 3, public: false, image: null, provisional: false },
  { id: 'rocket', role: 'rocket', name: 'ロケット団員', copies: 1, public: false, image: null, provisional: false }
];

// kind is the broad rules family; effect.id maps to a server-side resolver.
// copies, text, and numeric values below are placeholders, not verified official data.
export const ROCKET_PLAY_CARDS = [
  { id: 'placeholder-attack', name: 'くらえ！', kind: 'attack', action: 'attack', copies: 30, text: '相手に攻撃する。', effect: { id: 'attack', damage: 2 }, weather: null, timing: '自分の番', target: '相手1人', targetMode: 'opponent', image: null, provisional: true },
  { id: 'placeholder-dodge', name: 'よけて！', kind: 'dodge', action: 'dodge', copies: 20, text: '攻撃を回避する。', effect: { id: 'dodge' }, weather: null, timing: '攻撃されたとき', target: '自分', targetMode: 'self', image: null, provisional: true },
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
  const attacks=[{name:move,damage:2,weather:null,effect:null}];
  // Provisional stages keep the expert mode playable until verified card stats arrive.
  // Replace each family's stage rows with the printed red-heart HP and attack data.
  const levels=[1,2,3].map(level=>({level,hp,attacks:attacks.map(attack=>({...attack}))}));
  return {id:'placeholder-'+id,familyId:'placeholder-'+id,name,species:name,type,level:3,hp,move,attacks,levels,ability:null,abilityText:'',image:null,provisional:true};
});

export const ROCKET_ROLE_LABELS = Object.fromEntries(ROCKET_ROLE_CARDS.map(card=>[card.role,card.name]));
