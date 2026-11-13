"""Extract card faces from supplied IMG_1629..1633 photos without redrawing content.
Usage: python scripts/import-rocket-lv2.py /path/to/upload
"""
import json, sys
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
ROOT=Path(__file__).resolve().parents[1]
# Corners: top-left, bottom-left, bottom-right, top-right in EXIF-normalized originals.
QUADS={
1629:[(342,20,286,402,631,404,648,20),(675,22,659,405,997,402,980,22),(998,33,1027,404,1359,399,1290,32),(269,422,177,939,589,940,621,424),(659,428,631,943,1031,939,1006,428),(1026,432,1060,942,1478,932,1366,429)],
1630:[(330,21,265,410,610,409,634,20),(667,20,643,409,987,408,979,19),(1003,24,1019,408,1365,405,1305,21),(246,438,164,957,571,957,603,437),(644,441,617,958,1025,955,1001,439),(1028,435,1056,953,1466,949,1378,435)],
1631:[(346,3,285,403,633,405,655,4),(680,6,663,408,1006,408,991,6),(1018,11,1032,409,1379,406,1325,11),(278,431,198,950,606,953,630,431),(660,432,637,952,1026,952,1006,435),(1041,435,1061,950,1462,953,1391,436)],
1632:[(322,8,255,398,611,396,630,9),(664,11,644,389,992,390,975,11),(996,18,1030,395,1381,395,1305,18),(238,423,135,953,575,955,598,422),(642,415,609,946,1036,943,1000,416),(1036,420,1089,945,1516,932,1387,414)],
1633:[(326,0,255,392,614,395,640,0),(674,0,650,395,1005,396,988,0),(1021,0,1041,400,1403,398,1348,0),(243,423,145,953,571,957,603,423),(650,425,613,956,1039,957,1010,425),(1053,425,1074,957,1500,956,1431,425)]}
# id, name, HP, role, ability, moves (name:damage).
ROWS=[
('ivysaur','フシギソウ',4,'ディフェンス型','ようりょくそ','メガドレイン:2'),('charmeleon','リザード',4,'アタック型','もうか','かえんほうしゃ:2'),('wartortle','カメール',4,'バランス型','あめうけざら','アクアテール:1'),('pikachu','ピカチュウ',3,'アタック型','せいでんき','１０まんボルト:2'),('pidgeotto','ピジョン',4,'アタック型','するどいめ','つばさでうつ:2'),('nidorino','ニドリーノ',4,'アタック型','どくのトゲ','つのでつく:2'),
('meowth','ニャース',3,'サポート型','ものひろい','ネコにこばん:2'),('mankey','マンキー',3,'バランス型','まけんき','かわらわり:2'),('psyduck','コダック',4,'ぼうがい型','すいすい','あわ:1|かなしばり:0'),('growlithe','ガーディ',4,'バランス型','せいぎのこころ','かえんほうしゃ:2'),('sandshrew','サンド',4,'ぼうがい型','すながくれ','はたきおとす:2'),('machoke','ゴーリキー',4,'アタック型','こんじょう','かわらわり:2'),
('slowpoke','ヤドン',4,'ディフェンス型','どんかん','しねんのずつき:2'),('magnemite','コイル',3,'ぼうがい型','アナライズ','でんきショック:1|でんじは:0'),('shellder','シェルダー',3,'アタック型','スキルリンク','とげキャノン:2'),('haunter','ゴースト',3,'アタック型','ふゆう','シャドーボール:2'),('exeggcute','タマタマ',4,'アタック型','しゅうかく','タネばくだん:2'),('cubone','カラカラ',4,'ディフェンス型','カブトアーマー','ボーンラッシュ:2'),
('koffing','ドガース',4,'バランス型','かがくへんかガス','ヘドロばくだん:2'),('rhyhorn','サイホーン',4,'アタック型','すてみ','いわなだれ:2'),('chansey','ラッキー',4,'サポート型','いやしのこころ','あまえる:0|いのちのしずく:0'),('kangaskhan','ガルーラ',4,'アタック型','はやおき','すてみタックル:2'),('staryu','ヒトデマン',3,'バランス型','はっこう','ねんりき:2'),('electabuzz','エレブー',4,'バランス型','やるき','１０まんボルト:2'),
('vulpix','ロコン',3,'ぼうがい型','ひでり','ひのこ:1|おにび:0'),('gyarados','ギャラドス',4,'アタック型','じしんかじょう','たきのぼり:2'),('grimer','ベトベター',4,'ぼうがい型','どくしゅ','ヘドロばくだん:2'),('porygon','ポリゴン',4,'ぼうがい型','ダウンロード','トライアタック:2'),('snorlax','カビゴン',5,'ディフェンス型','くいしんぼう','かみつく:2'),('aerodactyl','プテラ',4,'アタック型','プレッシャー','かみつく:2')]
def main():
 data=[]
 for i,(slug,name,hp,role,ability,moves) in enumerate(ROWS):
  photo=1629+i//6; filename=f'IMG_{photo}(1).jpeg'
  original=ImageOps.exif_transpose(Image.open(Path(sys.argv[1])/filename))
  card=original.transform((600,840),Image.Transform.QUAD,QUADS[photo][i%6],Image.Resampling.BICUBIC)
  asset=f'/assets/rocket/cards/evolution/{slug}-lv2.webp'
  card.save(ROOT/'public'/asset.lstrip('/'),quality=93,method=6)
  data.append(dict(id=slug+'-lv2',name=name,level=2,cardType=role,redHp=hp,greenHp=None,ability=ability,attacks=[dict(name=m.split(':')[0],damage=int(m.split(':')[1])) for m in moves.split('|')],cardImage=asset,sourcePhoto=filename,effectStatus='pending'))
 (ROOT/'src/rocket-lv2-data.mjs').write_text('// Printed fields from user photos; additional move effects are not implemented.\nexport const ROCKET_LV2_DATA = '+json.dumps(data,ensure_ascii=False,indent=2)+';\n')
 print('Extracted',len(data),'Lv.2 card faces')
if __name__=='__main__': main()
