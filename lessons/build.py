"""차시 명세(JSON) + 공통 템플릿(engine.html) + 이미지 라이브러리(assets) → 단일 HTML.
사용법: python3 build.py specs/초1~2-듣기-06.json 출력.html"""
import json,base64,sys,os
D=os.path.dirname(os.path.abspath(__file__))
spec_path,out=sys.argv[1],sys.argv[2]
L=json.load(open(spec_path,encoding='utf-8'))
OBJ=json.load(open(f'{D}/assets/objects/index.json',encoding='utf-8'))
CH=json.load(open(f'{D}/assets/characters/index.json',encoding='utf-8'))
def uri(path):
    ext=path.rsplit('.',1)[1]; return f'data:image/{ext};base64,'+base64.b64encode(open(path,'rb').read()).decode()
need_obj=list(dict.fromkeys(L['a1']['items']+L['a2']['options']+L['a3']['example']['items']))
need_ch=list(dict.fromkeys(L['cover']['chars']+[L['goal']['char']]+[g['char'] for g in L['guide']]+L['end']['chars']+list(L['feedbackChars'].values())))
err=[x for x in need_obj if x not in OBJ]+[x for x in need_ch if x not in CH]
assert not err,f'이미지 라이브러리에 없음: {err}'
assert set(L['a2']['answer'])<=set(L['a2']['options']),'활동2 정답이 보기에 없음'
assert sorted(L['a4']['answer'])==sorted(c['id'] for c in L['a4']['cards']),'활동4 정답과 카드가 다름'
assert len(L['guide'])==4 and len(L['a1']['items'])==6 and len(L['a2']['options'])==5,'개수 규격(안내 4, 활동1 6, 활동2 5) 불일치'
for t in [L['a2']['say']['speech'],L['a3']['say']['speech'],L['a4']['say']['speech'],L['goal']['text'],L['cover']['text']]:
    assert "'" not in t and not any(c.isdigit() for c in t),f'읽기 문장에 숫자나 작은따옴표가 있음(읽을 말로 풀어 쓰기): {t}'
import re
norm=lambda x:re.sub(r'[\s.,!?]','',x)
says=[norm(L[k]['say']['text']) for k in ('a2','a3','a4')]
for d in L['meta'].get('diag_prompt',[]):
    core=norm(re.sub(r'\(.*?\)','',d))
    assert not any(core in s_ for s_ in says),f'진단 원고 문장을 그대로 사용함 → 소재·상황을 살짝 바꾸기: {d}'
IMG={k:uri(f'{D}/assets/objects/{OBJ[k]}') for k in need_obj}
IMG.update({k:uri(f'{D}/assets/characters/{CH[k]}') for k in need_ch})
t=open(f'{D}/engine.html',encoding='utf-8').read()
rep={'/*__IMG_DECL__*/':'const IMG='+json.dumps(IMG,ensure_ascii=False)+';',
     '/*__LESSON_DECL__*/':'const L='+json.dumps({k:v for k,v in L.items()},ensure_ascii=False)+';',
     '__TITLE__':L['title'],'__LESSON_ID__':L['meta']['id'],'__CODES__':', '.join(L['meta']['codes']),
     '__BOOK__':L['book'],'__NAVTITLE__':f"{L['unit']} · {L['title']}"}
for k,v in rep.items():
    assert t.count(k)==1,k; t=t.replace(k,v)
open(out,'w',encoding='utf-8').write(t); print(out,len(t))
