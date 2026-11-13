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

## 追加した進化カード写真

ユーザー提供の写真からミニリュウ（Lv.1）、ハクリュー（Lv.2）、カイリュー（Lv.3）を個別に切り出し、遠近補正・軽い色調整・シャープ化を行いました。文字や絵を描き直す処理は行っていません。

| カード | 画像 | 写真で確認できた値 |
| --- | --- | --- |
| ミニリュウ | `cards/evolution/dratini.webp` | Lv.1、赤♥3、バランス型、特性「ふしぎなうろこ」、技「たつまき」1 |
| ハクリュー | `cards/evolution/dragonair.webp` | Lv.2、赤♥3、バランス型、特性「ふしぎなうろこ」、技「りゅうのいかり」2 |
| カイリュー | `cards/evolution/dragonite.webp` | Lv.3、緑♥8、赤♥4、バランス型、特性「マルチスケイル」、技「りゅうせいぐん」2 |

選択画面と盤面には、玄人ルールのレベルに合った進化段階のカード画像を表示します。技の追加効果は写真だけでは確実に転記できない箇所があるため、画像を原文確認用に併記し、効果処理は未登録のままにしています。

## Lv.2 photo batch (2026-11-13)

IMG_1629(1).jpeg–IMG_1633(1).jpeg: 30 card faces extracted into
`public/assets/rocket/cards/evolution/*-lv2.webp`. The original text/art is
retained (no generated reconstruction). Crop corners are recorded in
`scripts/import-rocket-lv2.py`; metadata is in `src/rocket-lv2-data.mjs`.
The four previously registered Lv.2 entries are updated by ID, not duplicated.
Printed names, red HP, role, ability names and move names/base damage are
transcribed. Weather-dependent and other complex effects remain pending;
image registration does not mean those gameplay effects are implemented.
The top borders of IMG_1633 are clipped in the source photo; no missing
content was reconstructed.
