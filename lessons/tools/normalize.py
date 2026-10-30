# 렌더한 사물 이미지를 기존 사진 사물과 같은 규격(800x600, 투명 배경, 면적 기준 크기)으로 맞춤
import sys,numpy as np
from PIL import Image
src,dst=sys.argv[1],sys.argv[2]
for raw,name in [('book','book'),('ruler','ruler'),('paper','drawing_paper')]:
    im=Image.open(f'{src}/{raw}_raw.png').convert('RGBA')
    im=im.crop(im.getchannel('A').point(lambda v:255 if v>60 else 0).getbbox())
    W,H,pad=800,600,24;area=(np.asarray(im.getchannel('A'))>128).sum()
    r=min((W-2*pad)/im.width,(H-2*pad)/im.height,(200000/area)**.5)
    im=im.resize((round(im.width*r),round(im.height*r)),Image.LANCZOS)
    c=Image.new('RGBA',(W,H),(0,0,0,0));c.paste(im,((W-im.width)//2,(H-im.height)//2),im)
    c.save(f'{dst}/{name}.webp','WEBP',quality=88,method=6);print(name,c.getbbox())
