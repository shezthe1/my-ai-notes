// 활동 종류별 동작 검사(명세 L.acts를 읽어 어느 차시든 같은 방식으로): 고르기 퀴즈 · 녹음(가짜 마이크) · 짝 잇기 · 따라 쓰기 · 순서 놓기
const {chromium}=require('playwright');
(async()=>{const [,,file,shotDir]=process.argv;const b=await chromium.launch({args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
const p=await b.newPage({viewport:{width:1600,height:900}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{window.__spoken=[];window.speechSynthesis.speak=u=>window.__spoken.push(u.text);});
await p.goto('file://'+file);const L=await p.evaluate(()=>L);const R=[];const ok=(c,m)=>R.push((c?'PASS ':'FAIL ')+m);
const shot=async n=>{if(shotDir)await p.screenshot({path:`${shotDir}/${n}.png`})};
const fbState=()=>p.evaluate(()=>fbModal.classList.contains('on')?(fbModal.classList.contains('ok')?'ok':'bad'):'none');
for(const [k,A] of L.acts.entries()){const n=k+1;await p.evaluate(k=>go(k+3),k);await p.waitForTimeout(500);
  ok(await p.evaluate(()=>[...document.querySelectorAll('#screenEl img')].every(i=>i.complete&&i.naturalWidth>0)),`활동${n}(${A.type}) 이미지 로드`);
  if(A.type==='quiz'){for(const [r,q] of A.rounds.entries()){
      const wrong=q.options.find(x=>!q.answer.includes(x));await p.click(`.card[data-n="${wrong}"]`);if(q.answer.length>1)await p.click('button:has-text("정답 확인")');
      ok(await fbState()==='bad',`활동${n} ${r+1}번 오답 판정`);await p.evaluate(()=>closeFb());
      if(q.answer.length>1)await p.click(`.card[data-n="${wrong}"]`);
      for(const a of q.answer)await p.click(`.card[data-n="${a}"]`);if(q.answer.length>1)await p.click('button:has-text("정답 확인")');
      ok(await fbState()==='ok',`활동${n} ${r+1}번 정답 판정`);ok((await p.evaluate(()=>__spoken)).includes(q.say.speech),`활동${n} ${r+1}번 음성: ${q.say.speech}`);
      if(r===0)await shot(`a${n}_ok`);await p.click('#fbNext');await p.waitForTimeout(450)}
    ok(await p.evaluate(k=>page===k+4,k),`활동${n} 마지막 문제 뒤 다음 활동으로`)}
  if(A.type==='record'){for(const [i,w] of A.items.entries()){
      if(['name','qa'].includes(A.mode))ok(await p.evaluate(()=>document.querySelector('.recWord').textContent==='?'),`활동${n} ${w}: 녹음 전 정답 숨김`);
      await p.click('#recBtn');await p.waitForTimeout(1200);await p.click('#recBtn');await p.waitForTimeout(600);
      ok(await p.evaluate(w=>!!REC[w]&&!document.getElementById('mineBtn').disabled&&document.querySelector('.recWord').textContent===w,w),`활동${n} ${w}: 녹음·다시 듣기·정답 표시`);
      if(A.mode==='review'){await p.click('.evalFace >> nth=0');ok(await p.evaluate(w=>EVAL[w]==='good',w),`활동${n} ${w}: 스스로 평가`)}
      if(i===0)await shot(`a${n}_rec`);
      if(i<A.items.length-1)await p.click('button:has-text("다음 낱말")')}
    ok(await p.evaluate(()=>!next.classList.contains('hide')),`활동${n} 마지막 낱말에서 다음 버튼`)}
  if(A.type==='match'){const pick=async(w,pw)=>{await p.click(`.mw[data-w="${w}"]`);await p.click(`.mp[data-w="${pw}"]`)};
    const ws=A.pairs.map(x=>x.word);for(const [i,w] of ws.entries())await pick(w,ws[(i+1)%ws.length]);
    ok(await p.evaluate(()=>document.querySelectorAll('#mlines line').length)===ws.length,`활동${n} 선 ${ws.length}개 그려짐`);
    await p.click('button:has-text("정답 확인")');ok(await fbState()==='bad'&&await p.evaluate(()=>Object.keys(mPairs).length===0),`활동${n} 틀린 짝 판정·지움`);await p.evaluate(()=>closeFb());
    await p.click(`.mp[data-w="${ws[0]}"]`);await p.click(`.mw[data-w="${ws[0]}"]`);for(const w of ws.slice(1))await pick(w,w);
    await shot(`a${n}_match`);await p.click('button:has-text("정답 확인")');ok(await fbState()==='ok',`활동${n} 바른 짝 판정(그림부터 눌러도 이어짐)`)}
  if(A.type==='trace'){for(const [i,w] of A.items.entries()){
      await p.click('button:has-text("다 썼어요")');ok(await fbState()==='bad',`활동${n} ${w}: 안 쓰고 확인하면 다시`);await p.evaluate(()=>closeFb());
      if(A.mode==='trace'){await p.evaluate(()=>{inkCtx.fillStyle='#22313f';inkCtx.fillRect(10,10,60,60)});await p.click('button:has-text("다 썼어요")');ok(await fbState()==='bad',`활동${n} ${w}: 엉뚱한 곳에 쓰면 다시`);await p.evaluate(()=>{closeFb();clearInk()})}
      // 손가락으로 쓴 것처럼 글자 모양을 따라 굵게 그림
      await p.evaluate(w=>{inkCtx.strokeStyle=inkCtx.fillStyle='#22313f';glyphs(inkCtx,w,true,INK*.6)},w);
      const box=await (await p.$('#tInk')).boundingBox();await p.mouse.move(box.x+40,box.y+box.height-30);await p.mouse.down();await p.mouse.move(box.x+90,box.y+box.height-30,{steps:5});await p.mouse.up();
      await p.click('button:has-text("다 썼어요")');await p.waitForTimeout(A.mode==='free'?1400:200);
      const sc=await p.evaluate(()=>__traceScore);ok(await fbState()==='ok',`활동${n} ${w}: 따라 쓰면 통과 (덮음 ${Math.round(sc.cover*100)}%, 바깥 ${Math.round(sc.out*100)}%)`);
      if(i===0)await shot(`a${n}_trace`);await p.click('#fbNext');await p.waitForTimeout(450)}
    ok(await p.evaluate(k=>page===k+4,k),`활동${n} 마지막 글자 뒤 다음 활동으로`)}
  if(A.type==='order'){for(const [i,id] of [...A.answer].reverse().entries())await p.dragAndDrop(`.dragOptions [data-id="${id}"]`,`.slot >> nth=${i}`);
    await p.click('button:has-text("정답 확인")');ok(await fbState()==='bad',`활동${n} 순서 오답 판정`);await p.evaluate(()=>closeFb());
    for(const [i,id] of A.answer.entries())await p.dragAndDrop(`.dragOptions [data-id="${id}"]`,`.slot >> nth=${i}`);
    await p.click('button:has-text("정답 확인")');ok(await fbState()==='ok',`활동${n} 순서 정답 판정`);await shot(`a${n}_order`);
    await p.evaluate(()=>closeFb());await p.click('.teacher .play');ok((await p.evaluate(()=>__spoken)).includes(A.say.speech),`활동${n} 음성: ${A.say.speech}`)}
  if(A.type==='cards'){for(const c of await p.$$('#screenEl .card'))await c.click();
    const sp=await p.evaluate(()=>__spoken);ok(A.items.every(x=>sp.includes(x)),`활동${n} 카드 소리: ${A.items.join(' ')}`)}
}
ok(errs.length===0,'스크립트 오류 없음 '+errs.join('|'));
console.log(R.join('\n'));console.log(R.every(x=>x.startsWith('PASS'))?'ALL PASS':'HAS FAIL');await b.close()})();
