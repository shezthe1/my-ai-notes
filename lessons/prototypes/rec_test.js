const {chromium}=require('playwright');const http=require('http'),fs=require('fs'),path=require('path');
const file=path.resolve(process.argv[2]);const html=fs.readFileSync(file);
const srv=http.createServer((q,r)=>{if(q.url.startsWith('/frame')){r.setHeader('content-type','text/html');r.end(`<iframe id=f src="http://127.0.0.1:8766/rec.html" ${q.url.includes('allow')?'allow="microphone"':''} width=900 height=600></iframe>`);return}r.setHeader('content-type','text/html');r.end(html)});
const srv2=http.createServer((q,r)=>{r.setHeader('content-type','text/html');r.end(html)});
async function run(label,url,{fake=true,frame=false,grant=true}={}){
  const b=await chromium.launch({args:fake?['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']:[]});
  const ctx=await b.newContext();if(grant&&url.startsWith('http'))await ctx.grantPermissions(['microphone']);
  const p=await ctx.newPage();await p.goto(url);const f=frame?p.frames().find(x=>x.url().includes('8766'))||(await (await p.waitForSelector('#f')).contentFrame()):p;
  await f.waitForSelector('#recBtn');await f.click('#recBtn');await p.waitForTimeout(2000);
  const err=await f.evaluate(()=>window.__recError||null);
  if(!err){await f.click('#recBtn');await p.waitForTimeout(600);}
  const r=await f.evaluate(async()=>{const o={blob:window.__lastBlob||null,err:window.__recError||null,msg:document.getElementById('msg').textContent};
    if(o.blob){try{await player.play();await new Promise(s=>setTimeout(s,400));o.playing=!player.paused&&player.currentTime>0}catch(e){o.playErr=e.name}}return o});
  console.log(label.padEnd(34),JSON.stringify(r));await b.close();}
(async()=>{srv.listen(8765);srv2.listen(8766);
  await run('1) file:// (파일 더블클릭)','file://'+file);
  await run('2) http://localhost (서버 배포 유사)','http://127.0.0.1:8765/rec.html');
  await run('3) 다른 사이트 iframe, allow 없음','http://localhost:8765/frame',{frame:true});
  await run('4) 다른 사이트 iframe, allow="microphone"','http://localhost:8765/frame-allow',{frame:true});
  await run('5) 마이크 없음(가짜 장치 끔)','http://127.0.0.1:8765/rec.html',{fake:false,grant:false});
  srv.close();srv2.close();})();
