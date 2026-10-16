import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { createHandler } from '../api/generate.js';
import { server } from '../server.js';
import { sampleSpec,samplePaper } from '../lib/sample.js';
async function fixture(fn,handler){const srv=handler?http.createServer(handler):server;srv.listen(0,'127.0.0.1');await once(srv,'listening');try{await fn(`http://127.0.0.1:${srv.address().port}`);}finally{await new Promise(r=>srv.close(r));}}
const post=(url,body,headers={})=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
test('serves UI and browser modules, never source secrets or package files',async()=>fixture(async base=>{
  assert.equal((await fetch(base)).status,200);assert.equal((await fetch(base+'/assessment.js')).status,200);
  for(const path of ['/.env','/package.json','/lib/generator.js'])assert.equal((await fetch(base+path)).status,404);
  const config=await(await fetch(base+'/api/config')).json();assert.equal('key' in config,false);
  const response=await fetch(base);assert.match(response.headers.get('content-security-policy'),/script-src 'self'/);
}));
test('valid HTTP generation returns matching settings and complete paper',async()=>fixture(async base=>{const response=await post(base,sampleSpec);assert.equal(response.status,200);const data=await response.json();assert.deepEqual(data.paper,samplePaper);assert.deepEqual(data.spec,sampleSpec);},createHandler({limiter:()=>true,generate:async()=>({paper:samplePaper,model:'mock-gemma',attempts:1})})));
test('bad JSON, methods, inputs and cross-site calls are rejected',async()=>fixture(async base=>{
  assert.equal((await fetch(base)).status,405);
  assert.equal((await fetch(base,{method:'POST',headers:{'Content-Type':'application/json'},body:'{'})).status,400);
  assert.equal((await post(base,{...sampleSpec,count:99})).status,400);
  assert.equal((await post(base,sampleSpec,{'Sec-Fetch-Site':'cross-site'})).status,403);
  assert.equal((await post(base,{...sampleSpec,notes:'a'.repeat(110000)})).status,413);
},createHandler({limiter:()=>true,generate:()=>assert.fail('invalid request reached model')})));
test('quota rejection never calls model',async()=>fixture(async base=>assert.equal((await post(base,sampleSpec)).status,429),createHandler({limiter:()=>false,generate:()=>assert.fail()})));
test('provider errors are redacted',async()=>fixture(async base=>{const response=await post(base,sampleSpec);assert.equal(response.status,502);assert.ok(!(await response.text()).includes('SECRET'));},createHandler({limiter:()=>true,generate:()=>{throw new Error('SECRET upstream key');}})));
test('optional pilot code gates generation',async()=>{
  const previous=process.env.LESSONPRESS_ACCESS_CODE;process.env.LESSONPRESS_ACCESS_CODE='pilot-test';
  try{await fixture(async base=>{
    assert.equal((await post(base,sampleSpec)).status,401);
    assert.equal((await post(base,sampleSpec,{'X-Access-Code':'pilot-test'})).status,200);
  },createHandler({limiter:()=>true,generate:async()=>({paper:samplePaper})}));}finally{if(previous===undefined)delete process.env.LESSONPRESS_ACCESS_CODE;else process.env.LESSONPRESS_ACCESS_CODE=previous;}
});
