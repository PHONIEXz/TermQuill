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
  await assert.rejects(()=>generateAssessment(sampleSpec,{key:'test',signal:controller.signal,generate:async()=>{calls++;throw Object.assign(new Error('busy'),{statusCode:503});}}));assert.equal(calls,1);
});
