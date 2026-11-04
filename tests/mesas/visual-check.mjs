import fs from 'node:fs';
const target = await (await fetch('http://127.0.0.1:9337/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }));
let serial = 0; const pending = new Map(); const blocked = [], errors = [];
const send = (method, params = {}) => new Promise((resolve,reject) => { const id=++serial; pending.set(id,{resolve,reject}); ws.send(JSON.stringify({id,method,params})); });
ws.addEventListener('message', async event => { const m=JSON.parse(event.data); if(m.id){const p=pending.get(m.id); if(p){pending.delete(m.id);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result);} } else if(m.method==='Fetch.requestPaused') {
 const {requestId,request}=m.params; if(request.url.startsWith('http://127.0.0.1:3147/') || request.url.startsWith('data:')) await send('Fetch.continueRequest',{requestId}); else {blocked.push(request.url);await send('Fetch.failRequest',{requestId,errorReason:'BlockedByClient'});}
 } else if(m.method==='Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text); });
const evaluate=async expression => {const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true}); if(r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails)); return r.result.value;};
await send('Page.enable'); await send('Runtime.enable'); await send('Fetch.enable',{patterns:[{urlPattern:'*'}]});
await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
await send('Page.navigate',{url:'http://127.0.0.1:3147/'});
for(let i=0;i<90;i++){if(await evaluate("!!document.querySelector('main button')"))break;await new Promise(r=>setTimeout(r,500));}
await new Promise(r=>setTimeout(r,1500));
await evaluate("document.querySelector('main button').click()");
for(let i=0;i<20;i++){if(await evaluate("!!document.querySelector('dialog[open] svg')"))break;await new Promise(r=>setTimeout(r,200));}
// Regression: clicking Print must not wait for unrelated web fonts.
const printClick = await evaluate(`(() => {
 const original = window.print;
 let invoked = false;
 Object.defineProperty(document.fonts, 'ready', { configurable: true, value: new Promise(() => {}) });
 window.print = () => { invoked = true; };
 try {
  Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Imprimir / Guardar como PDF').click();
  return invoked;
 } finally { window.print = original; delete document.fonts.ready; }
})()`);
if (!printClick) throw new Error('Printing is waiting instead of invoking the browser directly');
fs.mkdirSync('/tmp/mesas-visual-pdfs',{recursive:true});
await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true}).then(r=>fs.writeFileSync('/tmp/mesas-visual-pdfs/screen.png',Buffer.from(r.data,'base64')));
for(const [name,mode,paper] of [['plan-a4','plan','A4'],['plan-a3','plan','A3'],['list-a4','list','A4']]) {
 await evaluate(`(()=>{const s=document.querySelectorAll('select');s[0].value='${mode}';s[0].dispatchEvent(new Event('change',{bubbles:true}));})()`);
 await new Promise(r=>setTimeout(r,150));
 if(mode==='plan')await evaluate(`(()=>{const s=document.querySelectorAll('select')[1];s.value='${paper}';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
 await new Promise(r=>setTimeout(r,150));
 const pdf=await send('Page.printToPDF',{preferCSSPageSize:true,printBackground:true,displayHeaderFooter:false});
 fs.writeFileSync(`/tmp/mesas-visual-pdfs/${name}.pdf`,Buffer.from(pdf.data,'base64'));
}
console.log(JSON.stringify({blocked,errors,printInvokedWithoutWaitingForFonts: printClick,rows:await evaluate("document.querySelectorAll('tbody tr').length"),text:await evaluate("document.querySelector('.document-heading').innerText")}));
ws.close();
