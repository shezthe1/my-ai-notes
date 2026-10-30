// 태블릿 크롬(터치) 환경: 손가락으로 끌어 놓기 + 눌러서 고르고 칸 누르기
const {chromium,devices}=require('playwright');
(async()=>{const file=process.argv[2];const b=await chromium.launch();
const ctx=await b.newContext({...devices['Galaxy Tab S4'],viewport:{width:1138,height:712}});const p=await ctx.newPage();
await p.goto('file://'+file);const L=await p.evaluate(()=>L);const cdp=await ctx.newCDPSession(p);const R=[];const ok=(c,m)=>R.push((c?'PASS ':'FAIL ')+m);
const center=async sel=>{const r=await (await p.$(sel)).boundingBox();return {x:r.x+r.width/2,y:r.y+r.height/2}};
async function touchDrag(from,to){const a=await center(from),z=await center(to);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a]});
  for(let i=1;i<=12;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:a.x+(z.x-a.x)*i/12,y:a.y+(z.y-a.y)*i/12}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(150)}
await p.evaluate(()=>go(6));await p.waitForTimeout(400);
for(const [i,id] of L.a4.answer.entries())await touchDrag(`.dragOptions [data-id="${id}"]`,`.slot >> nth=${i}`);
ok(JSON.stringify(await p.evaluate(()=>[...document.querySelectorAll('.slot')].map(s=>s.dataset.id)))===JSON.stringify(L.a4.answer),'손가락 끌어 놓기로 3칸 채움');
await p.tap('text=정답 확인');ok(await p.evaluate(()=>fbModal.classList.contains('ok')),'터치 끌기 후 정답 판정');
await p.evaluate(()=>go(6));await p.waitForTimeout(400);
for(const [i,id] of L.a4.answer.entries()){await p.tap(`.dragOptions [data-id="${id}"]`);await p.tap(`.slot >> nth=${i}`)}
ok(JSON.stringify(await p.evaluate(()=>[...document.querySelectorAll('.slot')].map(s=>s.dataset.id)))===JSON.stringify(L.a4.answer),'눌러서 고르고 칸 누르기로 3칸 채움');
await p.tap('text=정답 확인');ok(await p.evaluate(()=>fbModal.classList.contains('ok')),'탭 방식 정답 판정');
await p.evaluate(()=>go(4));await p.waitForTimeout(300);for(const a of L.a2.answer)await p.tap(`.card:has(.lab:text-is("${a}"))`);await p.tap('text=정답 확인');
ok(await p.evaluate(()=>fbModal.classList.contains('ok')),'활동2 터치 선택 정답');
console.log(R.join('\n'));console.log(R.every(x=>x.startsWith('PASS'))?'ALL PASS':'HAS FAIL');await b.close()})();
