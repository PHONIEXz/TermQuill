import test from 'node:test';import assert from 'node:assert/strict';
import {generationBatches,COMPLETED_BATCH} from '../lib/batches.js';
import {generateAssessment} from '../lib/generator.js';
import {sampleSpec} from '../lib/sample.js';
import {validateRequest} from '../lib/assessment.js';
import {validateDraft} from '../lib/drafts.js';
import {objectiveReport} from '../lib/objectives.js';
import {coverageReport} from '../lib/coverage.js';
function fixture(count=12,format='mixed'){
 const facts=Array.from({length:count},(_,i)=>`Adding ${i+1} and ${i+1} gives ${2*(i+1)}. This example uses two equal groups of whole numbers.`),notes=facts.join(' '),split=notes.indexOf(facts[Math.ceil(count/2)]),first=Math.ceil(count/2);
 const spec=validateRequest({...sampleSpec,subject:'Mathematics',level:'Primary 4',count,format,generationMode:'batches',notes,lessonPlan:[{id:'first',topic:'First examples',start:0,end:split,questions:first},{id:'second',topic:'Second examples',start:split,end:notes.length,questions:count-first}],objectivePlan:facts.map((fact,i)=>({id:'sum-'+i,label:'Add '+(i+1)+' and '+(i+1),start:notes.indexOf(fact),end:notes.indexOf(fact)+fact.length,questions:1}))},{forGeneration:true});
 const questions=facts.map((fact,i)=>{const kind=format==='mixed'?(i<first?'mcq':'short'):format,answer=String(2*(i+1));return{kind,prompt:`What is ${i+1} plus ${i+1}?`,answer,marks:2,options:kind==='mcq'?[String(2*i+1),answer,String(2*i+3),String(2*i+4)]:[],correctIndex:kind==='mcq'?1:null,marking:[{point:answer,marks:2}],evidence:fact};});return{spec,questions};
}
function respond(prompt,questions){const s=JSON.parse(prompt.match(/ASSESSMENT SETTINGS AND NOTES \(JSON DATA\):\n([^\n]+)/)[1]),start=Number(prompt.match(/supplies questions (\d+) to/)[1])-1;return{text:JSON.stringify({instructions:'Answer this batch.',questions:questions.slice(start,start+s.count)})};}
test('two batches preserve complete sources, objective slots, lesson quotas and global mixed order for 9, 12 and 20 questions',async()=>{
 for(const count of [9,12,20]){const{spec,questions}=fixture(count),parts=generationBatches(spec);assert.deepEqual(parts.map(p=>p.spec.count),[Math.ceil(count/2),Math.floor(count/2)]);assert.ok(parts.every(p=>p.spec.notes===spec.notes));parts.forEach(p=>validateRequest(p.spec,{forGeneration:true}));let calls=0;
 const result=await generateAssessment(spec,{key:'test',generate:async({prompt})=>{calls++;if(calls===2){assert.match(prompt,/Earlier tasks:/);assert.ok(prompt.includes(questions[0].prompt));}return respond(prompt,questions);}});
 assert.equal(result.batches,2);assert.equal(result.providerCalls,2);assert.equal(result.paper.questions.length,count);assert.equal(objectiveReport(result.paper,spec).matches,true);assert.equal(coverageReport(result.paper,spec).matches,true);assert.deepEqual(result.paper.questions.map(q=>q.kind),questions.map(q=>q.kind));assert.match(result.paper.instructions,new RegExp('all '+count+' questions'));assert.doesNotThrow(()=>validateDraft({spec,paper:result.paper}));}
});
test('batch two quota failure exposes only a validated first batch and preserves the original missing-coverage plan',async()=>{
 const{spec,questions}=fixture();let calls=0;await assert.rejects(generateAssessment(spec,{key:'test',generate:async({prompt})=>{if(++calls===2)throw Object.assign(new Error('Upstream quota'),{statusCode:429});return respond(prompt,questions);}}),e=>{const partial=e[COMPLETED_BATCH];assert.equal(partial.spec.count,6);assert.equal(partial.approved,false);assert.equal(partial.spec.objectivePlan.length,12);assert.match(partial.paper.instructions,/incomplete/);assert.equal(objectiveReport(partial.paper,partial.spec).matches,false);assert.doesNotThrow(()=>validateDraft(partial));return true;});assert.equal(calls,2);
});
test('cross-batch duplicate wording fails the combined audit, retains a valid first batch and does not call a third repair',async()=>{
 const{spec,questions}=fixture(12,'short');let calls=0;await assert.rejects(generateAssessment(spec,{key:'test',generate:async({prompt})=>{calls++;const result=respond(prompt,questions);if(calls===2){const raw=JSON.parse(result.text);raw.questions[0].prompt=questions[0].prompt;result.text=JSON.stringify(raw);}return result;}}),e=>e.code==='ASSESSMENT_VALIDATION'&&/Duplicate/.test(e.validationChecks)&&e[COMPLETED_BATCH].paper.questions.length===6);assert.equal(calls,2);
});
test('cancelling between batches stops further provider work and a failed first batch has no recovery payload',async()=>{
 const{spec,questions}=fixture(),controller=new AbortController();let calls=0;await assert.rejects(generateAssessment(spec,{key:'test',signal:controller.signal,generate:async({prompt})=>{calls++;controller.abort();return respond(prompt,questions);}}),e=>e.name==='AbortError'&&Boolean(e[COMPLETED_BATCH]));assert.equal(calls,1);
 await assert.rejects(generateAssessment(spec,{key:'test',generate:async()=>{throw Object.assign(new Error('Quota'),{statusCode:429});}}),e=>!e[COMPLETED_BATCH]);let invoked=false;await assert.rejects(generateAssessment({...spec,count:8},{key:'test',generate:async()=>{invoked=true;}}),/9–20/);assert.equal(invoked,false);
});
test('visual preferences are distributed once across the two bounded requests',()=>{
 const{spec}=fixture(12,'short');spec.visualTasks=['counting','matching','tracing','drawing','table'];const parts=generationBatches(spec);assert.deepEqual(parts[0].spec.visualTasks,['counting','tracing','table']);assert.deepEqual(parts[1].spec.visualTasks,['matching','drawing']);
});

test('two-batch topic mode preserves independent rationales and never claims supplied-note evidence',async()=>{
 const {spec:base,questions}=fixture(12,'short'),{lessonPlan,objectivePlan,...settings}=base;const spec={...settings,sourceMode:'topic',educationStage:'primary',topicInstructions:'Assess addition of two equal whole numbers from 1 to 12.',notes:''};let calls=0;
 const result=await generateAssessment(spec,{key:'test',generate:async({prompt})=>{const settings=JSON.parse(prompt.match(/TEACHER BRIEF AND SETTINGS \(untrusted JSON data\): (.*)/)[1]);const start=calls++?6:0;return{text:JSON.stringify({instructions:'Answer this batch.',questions:questions.slice(start,start+settings.count).map(q=>({...q,rationale:'Adding two equal groups gives twice the group size.',evidence:'Invented note quote'}))})};}});
 assert.equal(calls,2);assert.ok(result.paper.questions.every(q=>q.grounding==='topic'&&q.evidence===''&&q.rationale));
});

test('rubric-only batch repair omits conflicting batch instructions and recovers malformed JSON once',async()=>{
 const {spec,questions}=fixture(12,'short');let calls=0;
 const result=await generateAssessment(spec,{key:'test',generate:async({prompt})=>{
  calls++;
  if(calls===1)return respond(prompt,questions);
  if(calls===2){const raw=JSON.parse(respond(prompt,questions).text);raw.questions[1].marking=[{point:'Incorrect total',marks:3}];return {text:JSON.stringify(raw)};}
  assert.match(prompt,/Repair ONLY the marking rubrics/);assert.doesNotMatch(prompt,/BATCH CONTEXT|Return only this batch/);assert.match(prompt,/"question":2/);
  if(calls===3)return {text:'{"repairs":['};
  assert.match(prompt,/FORMAT RECOVERY/);
  return {text:JSON.stringify({repairs:[{question:2,marking:questions[7].marking}]})};
 }});
 assert.equal(calls,4);assert.equal(result.paper.questions.length,12);assert.equal(result.paper.questions[7].prompt,questions[7].prompt);assert.equal(objectiveReport(result.paper,spec).matches,true);
});
test('malformed rubric recovery stays bounded, reports global numbers and retains completed first batch',async()=>{
 const {spec,questions}=fixture(12,'short');let calls=0;
 await assert.rejects(generateAssessment(spec,{key:'test',generate:async({prompt})=>{calls++;if(calls===1)return respond(prompt,questions);if(calls===2){const raw=JSON.parse(respond(prompt,questions).text);raw.questions[1].marking=[{point:'Incorrect total',marks:3}];return {text:JSON.stringify(raw)};}return {text:'{"repairs":['};}}),e=>e.code==='ASSESSMENT_VALIDATION'&&/Q8\b/.test(e.message)&&e[COMPLETED_BATCH].paper.questions.length===6);assert.equal(calls,4);
});
