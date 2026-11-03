"""차시 명세(JSON) → 학생 활동지(.hwpx, 한글 개방형 문서).
사용법: python3 tools/worksheet.py specs/차시.json 그림폴더 출력.hwpx
  그림폴더: tools/render_order.js가 뽑은 order_글자.png(쓰는 순서 그림)가 있는 곳
한글 2014 이상에서 열린다. .hwp가 필요하면 한글에서 '다른 이름으로 저장'.
활동 종류: cards · quiz · choose · example · order · record(repeat·name·qa·review·read) · match · trace(trace·free)."""
import json, sys, os, io
from PIL import Image, ImageDraw
from hwpx import HwpxDocument

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec_path, img_dir, out = sys.argv[1:4]
L = json.load(open(spec_path, encoding='utf-8'))
OBJ = json.load(open(f'{D}/assets/objects/index.json', encoding='utf-8'))
if 'acts' not in L:  # 예전 형식(a1~a4) → build.py와 같은 방식으로 바꿔 읽는다
    L['acts'] = [dict(type='cards', **L['a1']), dict(type='choose', **L['a2']), dict(type='example', **L['a3']), dict(type='order', **L['a4'])]
MM = 283.465  # HWPUNIT / mm

doc = HwpxDocument.new()
doc.set_page_margins(left=round(15 * MM), right=round(15 * MM), top=round(13 * MM), bottom=round(12 * MM), header=round(5 * MM), footer=round(5 * MM))
SANS, SERIF = '함초롬돋움', '함초롬바탕'
run = lambda **k: doc.styles.ensure_run(**k)
ST = {
    'meta': run(font=SANS, size=9, color='#8A8F94'),
    'title': run(font=SANS, size=20, bold=True, color='#22313F'),
    'goal_lab': run(font=SANS, size=11, bold=True, color='#E2733A'),
    'goal': run(font=SANS, size=11, color='#22313F'),
    'act_lab': run(font=SANS, size=12, bold=True, color='#E2733A'),
    'act': run(font=SANS, size=12, bold=True, color='#22313F'),
    'ins': run(font=SANS, size=10, color='#4A5866'),
    'cell': run(font=SANS, size=10, color='#4A5866'),
    'name': run(font=SANS, size=12, bold=True, color='#22313F'),
    'faint': run(font=SERIF, size=44, color='#C3CCD6'),
    'model': run(font=SERIF, size=44, bold=True, color='#22313F'),
    'glyph': run(font=SERIF, size=34, bold=True, color='#22313F'),
}

def media(png_bytes):
    return doc.media.add_image(png_bytes, 'png')

def to_png(path, max_px=600):
    im = Image.open(path).convert('RGBA'); im.thumbnail((max_px, max_px))
    bg = Image.new('RGBA', im.size, (255, 255, 255, 255)); bg.alpha_composite(im)
    b = io.BytesIO(); bg.convert('RGB').save(b, 'PNG'); return b.getvalue(), im.size

# 쓰기 칸 배경: 가운데 십자 점선(깍두기 공책처럼)
def cross_png():
    im = Image.new('RGB', (300, 300), 'white'); g = ImageDraw.Draw(im)
    for t in range(0, 300, 16):
        g.line([(150, t), (150, t + 8)], fill=(240, 184, 187), width=2); g.line([(t, 150), (t + 8, 150)], fill=(240, 184, 187), width=2)
    b = io.BytesIO(); im.save(b, 'PNG'); return b.getvalue()
CROSS = media(cross_png())

def para(text='', style='ins', align=None, before=0, after=3):
    p = doc.add_paragraph('', include_run=False)
    if text: p.add_run(text, char_pr_id_ref=ST[style])
    doc.styles.apply_paragraph_format(paragraphs=[p], alignment=align, spacing_before_pt=before, spacing_after_pt=after)
    return p

def cell_text(tb, r, c, text, style, align='CENTER'):
    p = tb.cell(r, c).paragraphs[0]; p.text = ''
    p.add_run(text, char_pr_id_ref=ST[style]); doc.styles.apply_paragraph_format(paragraphs=[p], alignment=align)

def cell_pic(tb, r, c, item, w_mm, h_mm, caption=None):
    p = tb.cell(r, c).paragraphs[0]; doc.styles.apply_paragraph_format(paragraphs=[p], alignment='CENTER')
    p.add_picture(item.id if hasattr(item, 'id') else item, width=round(w_mm * MM), height=round(h_mm * MM))
    if caption:
        q = tb.cell(r, c).add_paragraph(''); q.add_run(caption, char_pr_id_ref=ST['name']); doc.styles.apply_paragraph_format(paragraphs=[q], alignment='CENTER')

def table(rows, widths_mm, heights_mm):
    tb = doc.add_table(rows, len(widths_mm), width=round(sum(widths_mm) * MM), height=round(sum(heights_mm) * MM))
    for r in range(rows):
        for c, w in enumerate(widths_mm):
            tb.cell(r, c).set_size(width=round(w * MM), height=round(heights_mm[r] * MM))
    return tb

PIC = {}
def pic_item(name, box_w, box_h):  # 같은 그림은 한 번만 넣고 다시 쓴다
    if name not in PIC:
        data, wh = to_png(f'{D}/assets/objects/{OBJ[name]}'); PIC[name] = (media(data), wh)
    it, (w, h) = PIC[name]; k = min(box_w / w, box_h / h); return it, w * k, h * k

def act_head(k, a, ins):
    p = doc.add_paragraph('', include_run=False)
    p.add_run(f'활동 {k}  ', char_pr_id_ref=ST['act_lab']); p.add_run(a['title'], char_pr_id_ref=ST['act'])
    doc.styles.apply_paragraph_format(paragraphs=[p], spacing_before_pt=12, spacing_after_pt=2, keep_with_next=True)
    para(ins, 'ins', after=4)

# ---- 머리: 차시 정보 · 제목 · 목표 · 이름 칸
m = L['meta']
doc.paragraphs[0].text = ''
doc.paragraphs[0].add_run(f"{L['book']} · {m['grade']} · {m['area']} {m['id'][-2:]} · {L['unit']}", char_pr_id_ref=ST['meta'])
para(L['title'], 'title', after=2)
p = doc.add_paragraph('', include_run=False); p.add_run('학습 목표  ', char_pr_id_ref=ST['goal_lab']); p.add_run(L['goal']['text'], char_pr_id_ref=ST['goal'])
doc.styles.apply_paragraph_format(paragraphs=[p], spacing_after_pt=6)
nt = table(1, [22, 48, 18, 92], [10]); cell_text(nt, 0, 0, '학년 · 반', 'cell'); cell_text(nt, 0, 2, '이름', 'cell')
for c in (0, 2): nt.set_cell_shading(0, c, '#EEF4FA')


def obj_or_glyph(tb, r, c, x, w, h=19, caption=True):
    if x in OBJ:
        it, pw, ph = pic_item(x, w - 6, h); cell_pic(tb, r, c, it, pw, ph, caption=x if caption else None)
    else:
        cell_text(tb, r, c, x, 'glyph')

def options_row(opts, label=None, pic_h=26, name_row=False):
    """보기 한 줄: (번호 칸) + 그림/글자 칸들. ○ 하기용"""
    lw = 10 if label else 0; w = (180 - lw) / len(opts)
    cols = ([lw] if label else []) + [w] * len(opts)
    tb = table(1, cols, [pic_h + (7 if any(x in OBJ for x in opts) else 0)])
    if label: cell_text(tb, 0, 0, label, 'act')
    for i, x in enumerate(opts): obj_or_glyph(tb, 0, i + (1 if label else 0), x, w, h=pic_h - 6)
    return tb

def icon_png(name):
    return to_png(f'{img_dir}/icon_{name}.png', 480)

WHITE = None
def no_border():
    global WHITE
    if WHITE is None: WHITE = doc.ensure_border_fill(border_color='#FFFFFF')
    return WHITE

# ---- 활동
INS = {'cards': '그림과 글자를 보고 소리 내어 읽은 다음, 읽은 것에 ○ 하세요.',
       'quiz': '선생님(화면)이 읽어 주는 말을 잘 듣고, 알맞은 것에 ○ 하세요.',
       'quiz2': '선생님(화면)이 읽어 주는 말을 잘 듣고, 두 가지를 골라 ○ 하세요.',
       'choose': '선생님의 안내를 잘 듣고, 필요한 물건을 모두 골라 ○ 하세요.',
       'example': '선생님의 안내를 잘 듣고, 펴야 할 쪽수를 쓰고 준비할 물건에 ○ 하세요.',
       'order': '선생님의 말을 잘 듣고, 들은 순서대로 (   ) 안에 1, 2, 3을 쓰세요.',
       'repeat': '선생님 말을 듣고 따라 말해 보세요. 말한 것에 ○ 하세요.',
       'name': '그림을 보고 이름을 말해 보세요. 그리고 빈칸에 이름을 써 보세요.',
       'qa': '“이건 뭐예요?” 하고 물으면 “○○예요.”라고 대답해 보세요. 빈칸에 이름을 쓰고 소리 내어 말해요.',
       'review': '낱말을 다시 말해 보고, 내 목소리가 어땠는지 알맞은 곳에 ○ 하세요.',
       'read': '낱말을 소리 내어 읽어 보세요. 읽은 것에 ○ 하세요.',
       'match': '낱말을 읽고, 알맞은 그림과 선으로 이어 보세요.',
       'trace': '쓰는 순서(번호·색)를 보고, 흐린 글자를 따라 쓴 다음 빈칸에 혼자 써 보세요.',
       'free': '왼쪽 글자를 보고, 칸에 혼자 써 보세요.'}
for k, a in enumerate(L['acts'], 1):
    t = a['type']
    if t == 'cards':
        act_head(k, a, INS['cards']); n = len(a['items']); w = 180 / n
        tb = table(2, [w] * n, [30, 9])
        for c, x in enumerate(a['items']):
            obj_or_glyph(tb, 0, c, x, w); cell_text(tb, 1, c, '(      )', 'cell')
    elif t == 'quiz':
        multi = any(len(q['answer']) > 1 for q in a['rounds'])
        act_head(k, a, INS['quiz2' if multi else 'quiz'])
        for i, q in enumerate(a['rounds'], 1):
            options_row(q['options'], label=f'{i})'); para('', after=2)
    elif t == 'choose':
        act_head(k, a, INS['choose']); options_row(a['options'])
    elif t == 'example':
        act_head(k, a, INS['example'])
        tb = table(1, [40, 30, 110], [11]); cell_text(tb, 0, 0, '펴야 할 쪽', 'cell'); cell_text(tb, 0, 1, '(        )쪽', 'cell'); tb.set_cell_shading(0, 0, '#EEF4FA')
        para('', after=2)
        pool = list(dict.fromkeys(a['example']['items'] + [x for b in L['acts'] if b['type'] in ('cards', 'choose') for x in b.get('items', b.get('options', [])) if x in OBJ]))
        opts = [x for x in pool if x in OBJ][:5]
        for x in a['example']['items']:
            if x not in opts: opts[-1] = x
        options_row(sorted(opts, key=pool.index))
    elif t == 'order':
        act_head(k, a, INS['order']); n = len(a['cards']); w = 180 / n
        tb = table(2, [w] * n, [34, 10])
        for c, cd in enumerate(a['cards']):
            if 'img' in cd: obj_or_glyph(tb, 0, c, cd['img'], w, h=22, caption=False)
            else:
                data, (iw, ih) = icon_png(cd['icon']); kk = min((w - 10) / iw, 24 / ih); cell_pic(tb, 0, c, media(data), iw * kk, ih * kk)
            q = tb.cell(0, c).add_paragraph(''); q.add_run(cd['label'], char_pr_id_ref=ST['name']); doc.styles.apply_paragraph_format(paragraphs=[q], alignment='CENTER')
            cell_text(tb, 1, c, '(      )', 'act')
    elif t == 'record' and a['mode'] in ('repeat', 'read'):
        act_head(k, a, INS[a['mode']]); n = len(a['items']); w = 180 / n
        tb = table(2, [w] * n, [30 if a['mode'] == 'repeat' else 22, 9])
        for c, x in enumerate(a['items']):
            if a['mode'] == 'repeat': obj_or_glyph(tb, 0, c, x, w)
            else: cell_text(tb, 0, c, x, 'glyph')   # 읽기: 그림 없이 글자만 크게
            cell_text(tb, 1, c, '(      )', 'cell')
    elif t == 'record' and a['mode'] in ('name', 'qa'):
        act_head(k, a, INS[a['mode']]); n = len(a['items']); w = 180 / n
        tb = table(2, [w] * n, [26, 15])
        for c, x in enumerate(a['items']):
            obj_or_glyph(tb, 0, c, x, w, h=22, caption=False)
            cell_text(tb, 1, c, '(              )' + ('예요.' if a['mode'] == 'qa' else ''), 'cell')
    elif t == 'record' and a['mode'] == 'review':
        act_head(k, a, INS['review'])
        tb = table(len(a['items']) + 1, [26, 34, 40, 40, 40], [8] + [17] * len(a['items']))
        for c, h in enumerate(['그림', '낱말', '잘했어요', '조금 더', '다시 해요']):
            cell_text(tb, 0, c, h, 'cell'); tb.set_cell_shading(0, c, '#EEF4FA')
        for r, x in enumerate(a['items'], 1):
            obj_or_glyph(tb, r, 0, x, 26, h=13, caption=False); cell_text(tb, r, 1, x, 'name')
            for c in (2, 3, 4): cell_text(tb, r, c, '○', 'act')
    elif t == 'match':
        act_head(k, a, INS['match']); n = len(a['pairs'])
        tb = table(n, [50, 12, 56, 12, 50], [24] * n); nb = no_border()
        imgs = {p_['word']: p_['img'] for p_ in a['pairs']}
        for r in range(n):
            cell_text(tb, r, 0, a['pairs'][r]['word'], 'glyph'); cell_text(tb, r, 1, '●', 'act'); cell_text(tb, r, 3, '●', 'act')
            for c in (1, 2, 3): tb.set_cell_border_fill(r, c, nb)
            obj_or_glyph(tb, r, 4, imgs[a['right'][r]], 50, h=18, caption=False)
    elif t == 'trace' and a['mode'] == 'trace':
        act_head(k, a, INS['trace'])
        for w in a['items']:
            n = len(w); order = f'{img_dir}/order_{w}.png'
            if n == 1: cols, cw = [34] + [24] * 6, 24
            else: cols, cw = [46] + [22] * 6, 22
            tb = table(1, cols, [cw])
            data, (iw, ih) = to_png(order, 900); kk = min((cols[0] - 3) / iw, (cw - 3) / ih)
            cell_pic(tb, 0, 0, media(data), iw * kk, ih * kk)
            for c in range(1, 7):
                tb.set_cell_fill_image(0, c, CROSS)
                ch = w[(c - 1) % n]
                if c <= (3 if n == 1 else 4): cell_text(tb, 0, c, ch, 'faint')  # 흐린 글자 따라 쓰기, 나머지는 빈칸
            para('', after=2)
    elif t == 'trace' and a['mode'] == 'free':
        act_head(k, a, INS['free'])
        for w in a['items']:
            tb = table(1, [34] + [24] * 6, [24])
            cell_text(tb, 0, 0, w, 'model')
            for c in range(1, 7): tb.set_cell_fill_image(0, c, CROSS)
            para('', after=2)
    else:
        raise SystemExit(f'활동지: 아직 다루지 않는 활동 종류 {t}')

# ---- 스스로 평가
p = doc.add_paragraph('', include_run=False); p.add_run('스스로 평가', char_pr_id_ref=ST['act'])
doc.styles.apply_paragraph_format(paragraphs=[p], spacing_before_pt=12, spacing_after_pt=4, keep_with_next=True)
ev = table(1, [60, 60, 60], [11])
for c, s in enumerate(['잘했어요  ○', '조금 더 연습할래요  ○', '다시 해 볼래요  ○']): cell_text(ev, 0, c, s, 'cell')

rep = doc.validate(); assert not rep.issues, rep.issues
doc.save_to_path(out); print(out, os.path.getsize(out), 'bytes')
