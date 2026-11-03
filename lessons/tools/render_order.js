// 차시 HTML에서 활동지에 넣을 그림을 PNG로 뽑는다
//  - order_글자.png: 따라 쓰기 글자의 '쓰는 순서'(획별 색·번호)
//  - icon_이름.png: 순서 놓기 행동 그림(자로 선 긋기 등)
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
for(const a of acts){if(a.type!=='order')continue;
  const icons=await p.evaluate(ai=>(L.acts[ai].cards||[]).filter(c=>c.icon).map(c=>c.icon),a.i);
  for(const ic of icons){const url=await p.evaluate(async ic=>{const svg=ICON[ic].replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" width="480" height="420" ');const im=new Image();im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);await im.decode();
      const c=document.createElement('canvas');c.width=480;c.height=420;const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,480,420);g.drawImage(im,0,0,480,420);return c.toDataURL('image/png')},ic);
    fs.writeFileSync(`${out}/icon_${ic}.png`,Buffer.from(url.split(',')[1],'base64'));console.log('icon',ic)}}
await b.close()})();
