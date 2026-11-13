# ロケット団ゲーム画像メモ

## 添付ZIPから反映した公式カード画像

`omaroke_cards_original.zip` に収録されていた画像62枚を無加工で `public/assets/rocket/cards/` に配置し、`ROCKET_CARD_IMAGE_ASSETS`（`src/rocket-cards.mjs`）へ全件登録しています。

| ファイル | 枚数 | 画像用途 |
| --- | ---: | --- |
| `card_001.webp`〜`card_030.webp` | 30 | Lv.3ポケモンカード |
| `card_031.webp`〜`card_054.webp` | 24 | プレイカード |
| `card_055.webp`〜`card_058.webp` | 4 | 役割カードの各絵柄 |
| `card_kurae.webp`, `card_yokete.webp` | 2 | 「くらえ！」「よけて！」 |
| `card_mew.webp`, `card_mewtwo.webp` | 2 | ミュウ／ミュウツーの特別画像 |

ゲームのポケモン選択・盤面・手札で使う画像は、カードレコードの `cardImage` / `image` に正しいカードIDを紐づけてください。番号だけからポケモン名や効果を推測して登録しないでください。元ファイル、画像寸法、SHA-256、取得時のメモは添付ZIP内の `manifest.json` と `README.txt` を参照してください。

## ポケモン選択画像

選択中の12匹には、公式サイトの全国図鑑画像を表示します。ファイル名は全国図鑑番号です。

| ポケモン | 番号 |
| --- | ---: |
| ピカチュウ | 025 |
| フシギダネ | 001 |
| ヒトカゲ | 004 |
| ゼニガメ | 007 |
| コラッタ | 019 |
| ガーディ | 058 |
| ニャース | 052 |
| ドガース | 109 |
| イシツブテ | 074 |
| コダック | 054 |
| ケーシィ | 063 |
| サンド | 027 |

取得元は `https://assets.pokemon.com/assets/cms2/img/pokedex/full/<番号>.png` です。カード画像が用意されていないゲーム内データの代替画像として使用しています。
