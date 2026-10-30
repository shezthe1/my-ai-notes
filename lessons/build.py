"""차시 명세(JSON) + 공통 템플릿(engine.html) + 이미지 라이브러리(assets) → 단일 HTML.
사용법: python3 build.py specs/초1~2-듣기-06.json 출력.html

활동 1~4는 acts 배열에 종류(type)로 적는다: cards · choose · example · order · quiz · record · match · trace.
예전 형식(a1~a4)의 명세는 cards · choose · example · order로 바꿔서 쓴다."""
import json,base64,sys,os,re
D=os.path.dirname(os.path.abspath(__file__))
spec_path,out=sys.argv[1],sys.argv[2]
L=json.load(open(spec_path,encoding='utf-8'))
OBJ=json.load(open(f'{D}/assets/objects/index.json',encoding='utf-8'))
CH=json.load(open(f'{D}/assets/characters/index.json',encoding='utf-8'))
def uri(path):
    ext=path.rsplit('.',1)[1]; return f'data:image/{ext};base64,'+base64.b64encode(open(path,'rb').read()).decode()

if 'acts' not in L:
    assert len(L['a1']['items'])==6 and len(L['a2']['options'])==5,'개수 규격(활동1 6, 활동2 5) 불일치'
    L['acts']=[dict(type='cards',**L['a1']),dict(type='choose',**L['a2']),dict(type='example',**L['a3']),dict(type='order',**L['a4'])]
A=L['acts']
assert len(L['guide'])==4 and len(A)==4,'개수 규격(안내 카드 4, 활동 4) 불일치'

# 활동마다 쓰는 그림(이미지 라이브러리 이름)과 글자 카드
img,glyph,speech,shown=[],[],[],[]
for k,a in enumerate(A,1):
    t=a['type']
    if 'say' in a: speech.append(a['say']['speech']); shown.append(a['say']['text'])
    if t=='cards': [ (img if x in OBJ else glyph).append(x) for x in a['items'] ]
    elif t=='choose':
        img+=a['options']; assert set(a['answer'])<=set(a['options']),f'활동{k} 정답이 보기에 없음'
    elif t=='example': img+=a['example']['items']
    elif t=='order':
        img+=[c['img'] for c in a['cards'] if 'img' in c]
        assert sorted(a['answer'])==sorted(c['id'] for c in a['cards']),f'활동{k} 정답과 카드가 다름'
    elif t=='quiz':
        for q in a['rounds']:
            [ (img if x in OBJ else glyph).append(x) for x in q['options'] ]
            assert set(q['answer'])<=set(q['options']),f'활동{k} 문제 정답이 보기에 없음: {q["answer"]}'
            speech.append(q['say']['speech']); shown.append(q['say']['text'])
    elif t=='record':
        assert a['mode'] in ('repeat','name','qa','read','review'),f'활동{k} 녹음 방식 오류: {a["mode"]}'
        [ (img if x in OBJ else glyph).append(x) for x in a['items'] ]; speech+=a['items']
        if a['mode'] in ('name','qa'): assert all(x in OBJ for x in a['items']),f'활동{k} 그림 보고 말하기는 그림이 있어야 함'
        if a['mode']=='qa': speech.append(a['ask']['speech']); shown.append(a['ask']['text'])
    elif t=='match':
        img+=[p['img'] for p in a['pairs']]
        assert sorted(a['right'])==sorted(p['word'] for p in a['pairs']),f'활동{k} 그림 순서(right)와 낱말이 다름'
        assert a['right']!=[p['word'] for p in a['pairs']],f'활동{k} 그림이 낱말과 같은 순서임(섞기)'
    elif t=='trace':
        assert a['mode'] in ('trace','free'),f'활동{k} 쓰기 방식 오류'; speech+=a['items']
    else: raise AssertionError(f'활동{k} 종류를 모름: {t}')
need_obj=list(dict.fromkeys(img))
need_ch=list(dict.fromkeys(L['cover']['chars']+[L['goal']['char']]+[g['char'] for g in L['guide']]+L['end']['chars']+list(L['feedbackChars'].values())))
err=[x for x in need_obj if x not in OBJ]+[x for x in need_ch if x not in CH]
assert not err,f'이미지 라이브러리에 없음: {err}'
for t in speech+[L['goal']['text'],L['cover']['text']]:
    assert "'" not in t and not any(c.isdigit() for c in t),f'읽기 문장에 숫자나 작은따옴표가 있음(읽을 말로 풀어 쓰기): {t}'
norm=lambda x:re.sub(r'[\s.,!?]','',x)
shown=[norm(x) for x in shown]
for d in L['meta'].get('diag_prompt',[]):
    core=norm(re.sub(r'\(.*?\)','',d))
    assert not any(core and core in s_ for s_ in shown),f'진단 원고 문장을 그대로 사용함 → 소재·상황을 살짝 바꾸기: {d}'
for f in L.get('files',[]): assert f['file'].lower().endswith(('.hwp','.hwpx')),f'한글 파일이 아님: {f}'
if glyph: print('글자 카드(그림 없음):',' '.join(dict.fromkeys(glyph)))

IMG={k:uri(f'{D}/assets/objects/{OBJ[k]}') for k in need_obj}
IMG.update({k:uri(f'{D}/assets/characters/{CH[k]}') for k in need_ch})
t=open(f'{D}/engine.html',encoding='utf-8').read()
VENDOR=open(f'{D}/assets/vendor/qrcode.js',encoding='utf-8').read()  # QR 코드 생성(MIT, Kazuhiko Arase)
rep={'/*__VENDOR__*/':VENDOR,'/*__IMG_DECL__*/':'const IMG='+json.dumps(IMG,ensure_ascii=False)+';',
     '/*__LESSON_DECL__*/':'const L='+json.dumps(L,ensure_ascii=False)+';',
     '__TITLE__':L['title'],'__LESSON_ID__':L['meta']['id'],'__CODES__':', '.join(L['meta']['codes']),
     '__BOOK__':L['book'],'__NAVTITLE__':f"{L['unit']} · {L['title']}"}
for k,v in rep.items():
    assert t.count(k)==1,k; t=t.replace(k,v)
open(out,'w',encoding='utf-8').write(t); print(out,len(t))
