// 차시 HTML에서 따라 쓰기 글자의 '쓰는 순서' 그림(획별 색·번호)을 PNG로 뽑는다 → 활동지에 넣는다
// 사용법: node tools/render_order.js out/차시.html 출력폴더
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const [,,file,out]=process.argv;fs.mkdirSync(out,{recursive:true});const b=await chromium.launch();const p=await b.newPage({viewport:{width:1600,height:900}});
await p.addInitScript(()=>{window.speechSynthesis.speak=()=>{}});await p.goto('file://'+require('path').resolve(file));
const acts=await p.evaluate(()=>L.acts.map((a,i)=>({i,type:a.type,mode:a.mode,items:a.items||[]})));
for(const a of acts){if(a.type!=='trace'||a.mode!=='trace')continue;
  for(const [k,w] of a.items.entries()){
    const url=await p.evaluate(async([ai,k])=>{go(3+ai);ti=k;drawTrace(curAct(),page-3,'show');await new Promise(r=>setTimeout(r,700));
      /* 배경 흰색 + 쓰는 순서 카드(전체 색·번호)를 2배 크기로 */
      const src=document.getElementById('tOrder'),c=document.createElement('canvas');c.width=src.width*2;c.height=src.height*2;const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.scale(2,2);drawOrderCard(L.acts[ai].items[k]);g.drawImage(src,0,0);return c.toDataURL('image/png')},[a.i,k]);
    fs.writeFileSync(`${out}/order_${w}.png`,Buffer.from(url.split(',')[1],'base64'));console.log('order',w)}}
await b.close()})();
