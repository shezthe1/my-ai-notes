"""게이트 시안 + 수업 파일 + 이미지 → HTML 한 파일(보고·시연용).
사용법: python3 bundle.py 출력.html
수업은 파일 안에 넣어 두었다가 누르면 새 창(blob 주소)으로 연다."""
import json,base64,glob,os,sys
D=os.path.dirname(os.path.abspath(__file__))
t=open(f'{D}/index.html',encoding='utf-8').read()
cat=open(f'{D}/catalog.js',encoding='utf-8').read()
asset={f'img/{os.path.basename(f)}':'data:image/webp;base64,'+base64.b64encode(open(f,'rb').read()).decode() for f in glob.glob(f'{D}/img/*.webp')}
lessons={f'lessons/{os.path.basename(f)}':open(f,encoding='utf-8').read() for f in glob.glob(f'{D}/lessons/*.html')}
# 안내 페이지는 목록 데이터 없이 열리므로 catalog.js 참조를 뺀다
lessons['lessons/sample.html']=lessons['lessons/sample.html'].replace('<script src="../catalog.js"></script>\n','')
need={r['file'] for r in json.loads(cat[len('const CATALOG='):-1]) if r['st']=='open'}
assert need<=set(lessons),f'수업 파일 없음: {need-set(lessons)}'
js=lambda o:json.dumps(o,ensure_ascii=False).replace('</','<\\/').replace('<!--','<\\!--')
tag='<script src="catalog.js"></script>'
assert t.count(tag)==1
t=t.replace(tag,f'<script>{cat}\nwindow.ASSET={js(asset)};\nwindow.LESSONS={js(lessons)};</script>')
open(sys.argv[1],'w',encoding='utf-8').write(t);print(sys.argv[1],f'{len(t.encode())/1e6:.1f}MB','수업',len(lessons)-1)
