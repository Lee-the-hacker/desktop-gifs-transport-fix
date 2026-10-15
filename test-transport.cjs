const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const source=fs.readFileSync(require('path').join(__dirname,'main.js'),'utf8');
const origin='https://www.youtube.com',endpoint=origin+'/youtubei/v1/comment/create_comment?prettyPrint=false';
const nonce='aabbccdd11223344',id='1234567890123456789',marker=`[[gif:${id}:${nonce}]]`;
function fixture(reply){
 const sent=[],messages=[],listeners={};
 const window={addEventListener:(n,f)=>listeners[n]=f,postMessage:m=>messages.push(m),fetch:async function(input,init){const r=input instanceof Request?input:new Request(new URL(input,origin),init);sent.push({url:r.url,method:r.method,body:await r.text(),headers:r.headers,credentials:r.credentials,cache:r.cache,redirect:r.redirect});return reply?reply():Response.json({actionResult:{status:'STATUS_SUCCEEDED'}});}};
 const context=vm.createContext({window,document:{readyState:'loading'},location:{origin,href:origin+'/watch?v=fixture'},Request,Headers,Response,URL,Blob,DecompressionStream,TextDecoder,Symbol,Map,Date,TypeError,JSON});
 vm.runInContext(source,context);
 const arm=()=>listeners.message({source:window,origin,data:{gcfy:'to-main',type:'arm',id,nonce}});
 return {window,sent,messages,arm,context};
}
(async()=>{
 let f=fixture();await f.window.fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:'{"commentText":"ordinary"}'});assert.equal(f.sent[0].body,'{"commentText":"ordinary"}');
 f=fixture();f.arm();const original=new Request(endpoint,{method:'POST',headers:{'x-original':'fixture'},body:JSON.stringify({commentText:'old body'})});
 await f.window.fetch(original,{body:JSON.stringify({commentText:'new text '+marker,context:{fixture:true}}),headers:{'content-type':'application/json','x-override':'fixture'},credentials:'omit',cache:'no-store',redirect:'manual'});
 let sent=f.sent[0],body=JSON.parse(sent.body);assert.equal(body.commentText,'new text');assert.equal(body.tenorId,id);assert.ok(body.context.fixture);assert.equal(sent.headers.get('x-override'),'fixture');assert.equal(sent.headers.get('x-original'),null);assert.equal(sent.credentials,'omit');assert.equal(sent.cache,'no-store');assert.equal(sent.redirect,'manual');assert.equal(original.bodyUsed,false);
 f=fixture();f.arm();const zipped=await new Response(new Blob([JSON.stringify({commentText:marker})]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
 await f.window.fetch(endpoint,{method:'POST',headers:{'content-type':'application/json','content-encoding':'gzip'},body:zipped});assert.equal(JSON.parse(f.sent[0].body).tenorId,id);assert.equal(f.sent[0].headers.get('content-encoding'),null);assert.equal(f.sent[0].headers.get('content-type'),'application/json');
 f=fixture(()=>Response.json({error:{code:400,message:'Request contains an invalid argument.',status:'INVALID_ARGUMENT'}},{status:400}));f.arm();await f.window.fetch(endpoint,{method:'POST',body:JSON.stringify({commentText:marker})});let result=f.messages.find(x=>x.type==='result');assert.equal(result.ok,false);assert.match(result.error,/does not identify the invalid field/);assert.ok(!result.error.includes('Try a different'));assert.equal(f.sent.length,1);
 f=fixture(()=>new Response('<html>not confirmation</html>',{status:200}));f.arm();await f.window.fetch(endpoint,{method:'POST',body:JSON.stringify({commentText:marker})});result=f.messages.find(x=>x.type==='result');assert.equal(result.ok,false);assert.equal(result.uncertain,true);
 f=fixture(()=>{throw Error('fixture network failure');});f.arm();await assert.rejects(()=>f.window.fetch(endpoint,{method:'POST',body:JSON.stringify({commentText:marker})}));assert.equal(f.sent.length,1);assert.equal(f.messages.find(x=>x.type==='result').uncertain,true);
 f=fixture();await assert.rejects(()=>f.window.fetch(endpoint,{method:'POST',body:JSON.stringify({commentText:marker})}));assert.equal(f.sent.length,0);
 f=fixture();const once=f.window.fetch;vm.runInContext(source,f.context);assert.equal(f.window.fetch,once);
 f=fixture();const text='{"commentText":"stream ordinary"}';const stream=new Blob([text]).stream();await f.window.fetch(endpoint,{method:'POST',body:stream,duplex:'half'});assert.equal(f.sent[0].body,text);
 console.log('PASS: normal text unchanged; Request+init body/headers and options preserved; caller Request unconsumed; gzip rewriting; honest generic-error handling; unreadable success not assumed; network uncertainty; no automatic retries; marker safety; duplicate-hook guard; streaming ordinary body. Mock network only; nothing posted to YouTube.');
})().catch(e=>{console.error(e);process.exitCode=1;});


