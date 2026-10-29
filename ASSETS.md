# Terrain artwork sources

Terrain illustrations are extracted from the CATAN 5th edition official rules, page 3.
Source: https://www.catan.com/sites/default/files/2021-06/catan_base_rules_2020_200707.pdf
Original illustrations remain the property of their respective rights holders.
The application is an unofficial project and is not affiliated with CATAN or Board Game Arena.

The original embedded images are preserved in SVG wrappers, with a viewBox framing the terrain tile.
Sea, ports, number tokens and wooden playing pieces are drawn as SVG by this project.

## タイムボムの素材

`public/assets/timebomb/` のカード4種とニッパーは、このサイト向けのオリジナルSVGです。写真や公式画像の切り抜き・転載ではありません。赤い縁・導線・ニッパータイルという実物の構成を参考に制作しました。

参考に確認した画像・商品情報：
- https://arclightgames.jp/product/187bks/
- https://www.tk-game-diary.net/time_bomb/time_bomb.html
- https://non-board.hatenablog.com/entry/timebomb

公式サービスではなく、画像・ロゴの公式利用許諾を示すものではありません。

## ペンギンパーティの素材

`public/assets/penguin/` のペンギン5色・裏面・シャチは、このサイト向けのオリジナルSVGです。各色に異なるアクセサリーと記号を用い、色だけに依存せず選択できるようにしています。既製品のカードイラスト・ロゴの複製ではありません。

## 赤い扉と殺人鬼の鍵の素材

`public/assets/reddoor/` の廊下・扉・鍵・各アイテムは、このサイト向けに描いたオリジナルSVGです。赤い扉、薄暗い廊下、真鍮の装飾、古い屋敷という雰囲気を参考にしており、製品のイラスト・ロゴ・カード文章を転載していません。ルールの説明はオンライン操作に合わせて書き起こしています。背景、霧、カード演出はCSS、効果音はWeb Audio APIによる合成音です。

参照作品：『赤い扉と殺人鬼の鍵 BLACK MAZE DEEP』（HOBBY BASE / オズプランニング）
https://www.yellowsubmarine.co.jp/hobbybase/game/reddoor/top.htm

非公式ファン実装で、公式サービスや公認を示すものではありません。

## リンク共有用プレビュー画像

`public/assets/og-boardgame-v1.jpg` は、組み込みの画像生成ツールで制作した独自の共有画像です。1200×630pxのJPEGに書き出しています。4ゲームの雰囲気を島・ニッパーとカード・ペンギン・赤い扉と鍵で表現し、サイト名「ボードゲームオンライン」と「友達と、いつものボードゲームを。」を記載しました。製品のイラストやロゴは複製していません。

生成指示の要点：深緑・アイボリー・真鍮色、温かい光と紙・木の質感、横長の共有カード。上半分に読みやすいサイト名、下半分に4ゲームを表す独自の卓上ジオラマ。公式ロゴやカード原画、人、透かしは含めない。

トップページと各ゲームページに、HTMLで直接読めるOpen GraphとXの大型カード情報を設定しています。部屋コードや参加情報は共有用メタデータに含めません。画像を更新する際はファイル名も更新してプレビューのキャッシュに対応してください。


### カフェ版の共有画像（現行）

`public/assets/og-boardgame-cafe-v2.jpg`（1200×630px JPEG）へ更新しました。組み込み画像生成ツールで制作した、明るい木目・コーヒー・ゲーム棚・自然光を取り入れたボードゲームカフェの写真調ビジュアルです。深緑の文字と余白でスマートな印象に整え、キャッチコピーは「いつもの仲間と、ひと卓を囲もう。」としています。全4ページの共有画像参照と代替テキストを更新しています。

生成指示：明るい現代的な日本のボードゲームカフェ、オーク材の卓、コーヒーカップ、ゲーム棚、柔らかな自然光。左に読みやすい2行の日本語サイト名、卓上に独自のサイコロ・カード・島・ペンギン・赤い扉。アイボリーとセージグリーンを使い、余白のある洗練された構図。公式ロゴや既存原画は使わない。

## 大富豪の素材

`public/assets/daifugo/crown.svg` は独自の王冠イラストです。トランプはHTML/CSSで数字・マーク・ジョーカー・裏面を描画し、既製のカード画像は使用していません。フェルトと木枠の卓、手札の選択、紙吹雪はCSS、効果音はWeb Audio APIの合成音です。共有画像は既存のカフェ版を使用します。

- `public/assets/reddoor/clown.svg`, `shadow.svg`: 本サイト用のオリジナルSVG。公式カード画像の複製ではありません。
