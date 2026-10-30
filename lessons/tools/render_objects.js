const {chromium}=require('playwright');
(async()=>{const [,,html,out]=process.argv;const b=await chromium.launch();const p=await b.newPage({viewport:{width:800,height:600}});
await p.goto('file://'+html);
for(const id of ['book','ruler','paper']){const el=await p.$('#'+id);await el.screenshot({path:`${out}/${id}_raw.png`,omitBackground:true});}
await b.close();})();
