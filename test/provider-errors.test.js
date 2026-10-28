import test from 'node:test';
import assert from 'node:assert/strict';
import { publicFailure,AppError } from '../lib/errors.js';
import { generateAssessment } from '../lib/generator.js';
import { sampleSpec,samplePaper } from '../lib/sample.js';
test('provider error categories are specific and never expose raw messages',()=>{
  for(const [status,code] of [[429,'PROVIDER_QUOTA'],[403,'PROVIDER_ACCESS'],[401,'PROVIDER_ACCESS'],[404,'MODEL_UNAVAILABLE'],[400,'PROVIDER_REQUEST'],[503,'PROVIDER_BUSY']]){
    const failure=publicFailure(Object.assign(new Error('SECRET key and private notes'),{statusCode:status}));assert.equal(failure.code,code);assert.ok(!failure.error.includes('SECRET'));
  }
  // A third-party status/message pair must not become a trusted application message.
  assert.ok(!publicFailure({status:418,message:'SECRET'}).error.includes('SECRET'));
  assert.equal(publicFailure(new AppError('Known safe error',422,'SAFE')).code,'SAFE');
  assert.equal(publicFailure(new Error(),true).code,'GENERATION_TIMEOUT');
});
test('Gemma 4 minimal thinking is sent, without applying it to other models',async()=>{
  for(const model of ['gemma-4-26b-a4b-it','gemma-3-27b-it']){
    let sent;await generateAssessment(sampleSpec,{model,key:'test',generate:async options=>{sent=options;return {text:JSON.stringify(samplePaper)};}});
    assert.equal(sent.providerOptions?.google?.thinkingConfig?.thinkingLevel,model.startsWith('gemma-4-')?'minimal':undefined);
  }
});
test('transient provider failure retries once and can recover',async()=>{
  let calls=0;
  const result=await generateAssessment(sampleSpec,{key:'test',generate:async()=>{calls++;if(calls===1)throw Object.assign(new Error('busy'),{statusCode:503});return {text:JSON.stringify(samplePaper)};}});
  assert.equal(calls,2);assert.equal(result.paper.questions.length,6);
});
test('quota is not blindly retried',async()=>{
  let calls=0;await assert.rejects(()=>generateAssessment(sampleSpec,{key:'test',generate:async()=>{calls++;throw Object.assign(new Error('quota'),{statusCode:429});}}));assert.equal(calls,1);
});
test('aborted request does not retry',async()=>{
  const controller=new AbortController();controller.abort();let calls=0;
  await assert.rejects(()=>generateAssessment(sampleSpec,{key:'test',signal:controller.signal,generate:async()=>{calls++;throw Object.assign(new Error('busy'),{statusCode:503});}}));assert.equal(calls,0);
});
test('two primary 500s fall back to another Gemma and report the actual model',async()=>{
  const models=[];const result=await generateAssessment(sampleSpec,{key:'test',sleep:async()=>{},generate:async options=>{
    models.push(options.model.modelId);if(models.length<3)throw Object.assign(new Error('internal'),{statusCode:500});return {text:JSON.stringify(samplePaper)};
  }});
  assert.deepEqual(models,['gemma-4-26b-a4b-it','gemma-4-26b-a4b-it','gemma-4-31b-it']);assert.equal(result.model,'gemma-4-31b-it');assert.equal(result.fallbackUsed,true);assert.equal(result.providerCalls,3);
});
test('fallback failure is bounded and does not loop',async()=>{
  let calls=0;await assert.rejects(()=>generateAssessment(sampleSpec,{key:'test',sleep:async()=>{},generate:async()=>{calls++;throw Object.assign(new Error('internal'),{statusCode:500});}}));assert.equal(calls,3);
});
test('fallback is not used for access, quota or invalid request errors',async()=>{
  for(const statusCode of [400,401,403,404,429]){let calls=0;await assert.rejects(()=>generateAssessment(sampleSpec,{key:'test',sleep:async()=>{},generate:async()=>{calls++;throw Object.assign(new Error('failed'),{statusCode});}}));assert.equal(calls,1);}
});
test('validation repair stays on the successful fallback model',async()=>{
  const models=[];const result=await generateAssessment(sampleSpec,{key:'test',sleep:async()=>{},generate:async options=>{
    models.push(options.model.modelId);if(models.length<3)throw Object.assign(new Error('internal'),{statusCode:500});return {text:models.length===3?'{}':JSON.stringify(samplePaper)};
  }});assert.deepEqual(models,['gemma-4-26b-a4b-it','gemma-4-26b-a4b-it','gemma-4-31b-it','gemma-4-31b-it']);assert.equal(result.attempts,2);assert.equal(result.providerCalls,4);
});

test('a stalled model call is cancelled and reaches the existing bounded fallback',async()=>{
 let calls=0;const events=[];
 const result=await generateAssessment(sampleSpec,{key:'test',attemptTimeoutMs:5,sleep:async()=>{},onProgress:event=>events.push(event),generate:async({abortSignal})=>{calls++;if(calls<3)return new Promise((resolve,reject)=>abortSignal.addEventListener('abort',()=>reject(abortSignal.reason),{once:true}));return {text:JSON.stringify(samplePaper)};}});
 assert.equal(calls,3);assert.equal(result.fallbackUsed,true);assert.equal(events.filter(e=>e.event==='provider_call').length,3);
});
test('cancelling during a stalled call stops immediately without retry or fallback',async()=>{
 const controller=new AbortController();let calls=0;
 await assert.rejects(()=>generateAssessment(sampleSpec,{key:'test',signal:controller.signal,attemptTimeoutMs:1000,generate:async({abortSignal})=>{calls++;queueMicrotask(()=>controller.abort());return new Promise((resolve,reject)=>abortSignal.addEventListener('abort',()=>reject(abortSignal.reason),{once:true}));}}));assert.equal(calls,1);
});
test('Groq-only uses its adapter and keeps validation',async()=>{let seen;const r=await generateAssessment(sampleSpec,{provider:'groq',groqKey:'test',generate:async x=>{seen=x;return {text:JSON.stringify(samplePaper)};}});assert.equal(seen.model.modelId,'openai/gpt-oss-20b');assert.equal(seen.providerOptions,undefined);assert.equal(r.model,'groq:openai/gpt-oss-20b');assert.deepEqual(r.paper,samplePaper);});
test('automatic switches on quota and server errors but not access denial',async()=>{for(const statusCode of [429,503,403]){const models=[];const run=()=>generateAssessment(sampleSpec,{provider:'automatic',key:'test',groqKey:'test',generate:async x=>{models.push(x.model.modelId);if(models.length===1)throw Object.assign(new Error('private'),{statusCode});return {text:JSON.stringify(samplePaper)};}});if(statusCode===403){await assert.rejects(run);assert.equal(models.length,1);}else{const r=await run();assert.equal(r.fallbackUsed,true);assert.deepEqual(models,['gemma-4-26b-a4b-it','openai/gpt-oss-20b']);}}});
test('Groq rejects invalid papers without switching to Google',async()=>{let n=0;await assert.rejects(()=>generateAssessment(sampleSpec,{provider:'groq',groqKey:'test',generate:async x=>{n++;assert.equal(x.model.modelId,'openai/gpt-oss-20b');return {text:'{}'};}}),e=>e.code==='ASSESSMENT_VALIDATION');assert.equal(n,2);});
