import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRequest,auditAssessment,parseModelOutput,expectedKinds,buildPrompt } from '../lib/assessment.js';
import { sampleSpec,samplePaper } from '../lib/sample.js';
import { generateAssessment } from '../lib/generator.js';
import { makeLimiter } from '../lib/http.js';
const copy=()=>structuredClone(samplePaper);
test('sample passes every structural check',()=>assert.deepEqual(auditAssessment(copy(),sampleSpec),[]));
test('rejects overlong notes, fractional counts and unknown formats',()=>{
  for(const patch of [{notes:'x'.repeat(18001)},{count:4.5},{format:'essay'},{marksEach:0},{count:21},{notes:'Too short'}])assert.throws(()=>validateRequest({...sampleSpec,...patch}));
});
test('mixed allocation is deterministic for odd counts',()=>assert.deepEqual(expectedKinds({...sampleSpec,count:5}),['mcq','mcq','mcq','short','short']));
test('detects wrong question count',()=>{const p=copy();p.questions.pop();assert.match(auditAssessment(p,sampleSpec)[0].message,/Expected 6/);});
test('detects duplicates ignoring punctuation and case',()=>{const p=copy();p.questions[1].prompt=p.questions[0].prompt.toUpperCase()+'!!!';assert.ok(auditAssessment(p,sampleSpec).some(x=>/Duplicate/.test(x.message)));});
test('rejects fabricated source quotes',()=>{const p=copy();p.questions[0].evidence='An element is made of molecules.';assert.ok(auditAssessment(p,sampleSpec).some(x=>/supporting quote/.test(x.message)));});
test('rejects missing answers, invalid options and marking totals',()=>{const p=copy();p.questions[0].answer='';p.questions[1].correctIndex=9;p.questions[2].options[1]=p.questions[2].options[0];p.questions[3].marking[0].marks=5;assert.ok(auditAssessment(p,sampleSpec).length>=4);});
test('parses fenced JSON and drops extra root fields',()=>{const p=parseModelOutput('```json\n'+JSON.stringify({...copy(),secret:'ignore'})+'\n```',sampleSpec);assert.equal(p.secret,undefined);});
test('rejects malformed output, null and meta instructions',()=>{for(const v of ['Here is how you can write a test.','null','{}','{"questions":[]}'])assert.throws(()=>parseModelOutput(v,sampleSpec));});
test('missing key fails before a provider call',async()=>{await assert.rejects(()=>generateAssessment(sampleSpec,{key:'',generate:()=>assert.fail()}),/not connected/);});
test('invalid response repairs once using original settings and notes',async()=>{
  const calls=[];const generate=async args=>{calls.push(args);return {text:calls.length===1?'{}':JSON.stringify(samplePaper),finishReason:'stop'};};
  const r=await generateAssessment(sampleSpec,{key:'test-not-a-real-key',generate});assert.equal(r.attempts,2);assert.ok(calls[1].prompt.includes(sampleSpec.notes));assert.ok(calls[1].prompt.includes('Previous attempt failed'));assert.equal(calls[0].maxRetries,0);
});
test('two invalid outputs fail honestly rather than returning a sample',async()=>{let calls=0;await assert.rejects(()=>generateAssessment(sampleSpec,{key:'test',generate:async()=>{calls++;return {text:'{}'};}}),/could not produce/);assert.equal(calls,2);});
test('per-client and global limits expire',()=>{const allow=makeLimiter(2,100,3);assert.equal(allow('a',1),true);assert.equal(allow('a',2),true);assert.equal(allow('a',3),false);assert.equal(allow('b',4),true);assert.equal(allow('c',5),false);assert.equal(allow('a',102),true);});

test('manual preferences are bounded and remain attached to validated drafts',()=>{
 const custom=validateRequest({...sampleSpec,format:'custom',difficulty:'custom',formatInstructions:'Four written questions, followed by two multiple-choice questions.',difficultyInstructions:'Start with recall and finish with everyday application.'});
 assert.match(buildPrompt(custom),/Four written questions/);assert.match(buildPrompt(custom),/Start with recall/);assert.ok(!buildPrompt(custom).includes('[null,null'));assert.match(custom.formatInstructions,/Four written/);assert.match(custom.difficultyInstructions,/everyday/);
 for(const patch of [{formatInstructions:''},{formatInstructions:'x'.repeat(601)},{difficultyInstructions:''},{difficultyInstructions:7}])assert.throws(()=>validateRequest({...custom,...patch}));
 assert.equal('formatInstructions' in validateRequest({...sampleSpec,formatInstructions:'ignored inactive input'}),false);
});
test('manual format permits different supported ordering but still rejects invalid kinds and evidence',()=>{
 const spec=validateRequest({...sampleSpec,format:'custom',formatInstructions:'Written questions first, followed by multiple choice.'});const p=copy();p.questions=[...p.questions.slice(3),...p.questions.slice(0,3)];assert.deepEqual(auditAssessment(p,spec),[]);
 p.questions[0].kind='image';assert.ok(auditAssessment(p,spec).some(x=>/written-response/.test(x.message)));
 p.questions[1].evidence='This is not from the notes';assert.ok(auditAssessment(p,spec).some(x=>/supporting quote/.test(x.message)));
});
