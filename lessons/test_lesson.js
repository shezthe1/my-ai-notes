// 명세(L)를 읽어 어느 차시든 같은 방식으로 검사: 화면 8개, 음성, 활동2·4 오답/정답, 예시 오버레이
const {chromium}=require('playwright');
(async()=>{const [,,file,shotDir]=process.argv;const b=await chromium.launch();const p=await b.newPage({viewport:{width:1600,height:900}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{window.__spoken=[];window.speechSynthesis.speak=u=>window.__spoken.push(u.text);});
await p.goto('file://'+file);const L=await p.evaluate(()=>L);const R=[];const ok=(c,m)=>R.push((c?'PASS ':'FAIL ')+m);
for(const n of [0,1,2,3,4,5,6,7]){await p.evaluate(n=>go(n),n);await p.waitForTimeout(450);if(shotDir)await p.screenshot({path:`${shotDir}/p${n}.png`});}
// 이미지 로드
await p.evaluate(()=>go(3));await p.waitForTimeout(300);
ok(await p.evaluate(()=>[...document.images].filter(i=>i.id!=="fbChar").every(i=>i.complete&&i.naturalWidth>0)),'활동1 이미지 모두 로드');
for(const c of await p.$$('#screenEl .card'))await c.click();
// 활동2
await p.evaluate(()=>go(4));await p.waitForTimeout(300);
const wrong=L.a2.options.find(x=>!L.a2.answer.includes(x));
await p.click(`.card:has(.lab:text-is("${wrong}"))`);await p.click('text=정답 확인');
ok(await p.evaluate(()=>fbModal.classList.contains('bad')&&next.classList.contains('hide')),'활동2 오답 판정');
await p.waitForTimeout(1200);ok(await p.evaluate(()=>{const r=[...document.querySelectorAll('#fbBtns button')].map(b=>b.getBoundingClientRect());const f=fb.getBoundingClientRect(),c=document.querySelector('.fbCard').getBoundingClientRect();const ov=(a,b)=>a.left<b.right-1&&b.left<a.right-1&&a.top<b.bottom-1&&b.top<a.bottom-1;return r.length===2&&!ov(r[0],r[1])&&r.every(x=>x.top>=f.bottom-1&&x.left>=c.left&&x.right<=c.right)}),'오답 팝업 버튼 위치(겹침 없음, 카드 안)');
await p.evaluate(()=>closeFb());await p.click(`.card:has(.lab:text-is("${wrong}"))`);
for(const a of L.a2.answer)await p.click(`.card:has(.lab:text-is("${a}"))`);await p.click('text=정답 확인');
ok(await p.evaluate(()=>fbModal.classList.contains('ok')&&!next.classList.contains('hide')),'활동2 정답 판정');
if(shotDir)await p.screenshot({path:`${shotDir}/a2_ok.png`});
await p.click('.fbBtns >> text=다음');await p.waitForTimeout(300);ok(await p.evaluate(()=>page===5),'정답 팝업 다음 → 활동3');
// 활동3
await p.click('.teacher .play');await p.click('text=예시 보기');await p.waitForTimeout(300);
ok(await p.evaluate(()=>overlay.classList.contains('on')&&!document.getElementById('a3next').classList.contains('hide')),'활동3 예시 열림·다음 버튼');
if(shotDir)await p.screenshot({path:`${shotDir}/a3_overlay.png`});await p.click('.close');
// 활동4
await p.evaluate(()=>go(6));await p.waitForTimeout(300);await p.click('.teacher .play');
const wrongOrder=[...L.a4.answer].reverse();
for(const [i,id] of wrongOrder.entries())await p.dragAndDrop(`.dragOptions [data-id="${id}"]`,`.slot >> nth=${i}`);
await p.click('text=정답 확인');ok(await p.evaluate(()=>fbModal.classList.contains('bad')),'활동4 오답 판정');
if(shotDir)await p.screenshot({path:`${shotDir}/a4_bad.png`});await p.evaluate(()=>closeFb());
for(const [i,id] of L.a4.answer.entries())await p.dragAndDrop(`.dragOptions [data-id="${id}"]`,`.slot >> nth=${i}`);
await p.click('text=정답 확인');ok(await p.evaluate(()=>fbModal.classList.contains('ok')),'활동4 정답 판정');
if(shotDir)await p.screenshot({path:`${shotDir}/a4_ok.png`});
// 음성
await p.evaluate(()=>go(4));await p.waitForTimeout(200);await p.click('.teacher .play');
const sp=await p.evaluate(()=>window.__spoken);
for(const t of [L.goal.text,L.a2.say.speech,L.a3.say.speech,L.a4.say.speech,...L.a1.items])ok(sp.includes(t),'음성: '+t);
ok(errs.length===0,'스크립트 오류 없음 '+errs.join('|'));
console.log(R.join('\n'));console.log(R.every(x=>x.startsWith('PASS'))?'ALL PASS':'HAS FAIL');await b.close();})();
