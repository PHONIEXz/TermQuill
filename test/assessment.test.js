import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRequest,auditAssessment,parseModelOutput,expectedKinds,buildPrompt,sourcePassages } from '../lib/assessment.js';
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
test('quote repair receives the rejected paper without relaxing source checks',async()=>{
 const invalid=copy();invalid.questions[0].evidence='An element is a pure substance made of only one type of atom. Water is a compound made of hydrogen and oxygen.';
 assert.throws(()=>parseModelOutput(JSON.stringify(invalid),sampleSpec),/supporting quote/);
 const calls=[];const result=await generateAssessment(sampleSpec,{key:'test',generate:async args=>{calls.push(args);return {text:JSON.stringify(calls.length===1?invalid:samplePaper)};}});
 assert.equal(result.attempts,2);assert.ok(!calls[0].prompt.includes('PREVIOUS RESPONSE:'));assert.ok(calls[1].prompt.includes(JSON.stringify(JSON.stringify(invalid))));assert.match(calls[1].prompt,/ONE continuous verbatim passage/);assert.match(calls[1].prompt,/Q1: The supporting quote/);
});
test('source IDs resolve to original notes and invalid or oversized ranges fail',()=>{
 const raw=copy(),passages=sourcePassages(sampleSpec.notes);
 raw.questions[0].sourceStart=1;raw.questions[0].sourceEnd=passages.length;raw.questions[0].evidence='Ignored model-written text';
 const paper=parseModelOutput(JSON.stringify(raw),sampleSpec);assert.equal(paper.questions[0].evidence,sampleSpec.notes);assert.equal(paper.questions[0].sourceStart,undefined);
 for(const [start,end] of [[0,1],[1,999],[2,1],[1.5,2],['1',2]]){raw.questions[0].sourceStart=start;raw.questions[0].sourceEnd=end;assert.throws(()=>parseModelOutput(JSON.stringify(raw),sampleSpec),/supporting quote/);}
 const longSpec={...sampleSpec,notes:sampleSpec.notes.repeat(3)};raw.questions[0].sourceStart=1;raw.questions[0].sourceEnd=sourcePassages(longSpec.notes).length;assert.throws(()=>parseModelOutput(JSON.stringify(raw),longSpec),/supporting quote/);
 for(const passage of sourcePassages('  A\n\n'+ 'x'.repeat(700)+'   ending. ')){assert.equal(passage.text,('  A\n\n'+'x'.repeat(700)+'   ending. ').slice(passage.start,passage.end));assert.ok(passage.text.length<=500);}
});
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

test('custom prompts give valid JSON examples with exact supported kind strings',()=>{
 const prompt=buildPrompt({...sampleSpec,format:'custom',formatInstructions:'Three written comparisons.'});assert.match(prompt,/ONLY valid kind strings/);assert.ok(prompt.includes('"kind":"short"'));assert.ok(prompt.includes('"kind":"mcq"'));assert.ok(!prompt.includes('"kind":"mcq or short"'));
});

test('source selection gives focused complete sentences and preserves continuous ranges',()=>{
 const passages=sourcePassages(sampleSpec.notes);
 assert.equal(passages[0].text,'An element is a pure substance made of only one type of atom.');
 assert.equal(passages[1].text,'Iron and oxygen are examples of elements.');
 const mixture=passages.find(p=>p.text==='The substances in a mixture retain their individual properties.');
 assert.ok(mixture);
 const raw=copy();raw.questions[0].sourceStart=mixture.id;raw.questions[0].sourceEnd=mixture.id;
 assert.equal(parseModelOutput(JSON.stringify(raw),sampleSpec).questions[0].evidence,mixture.text);
 const notes='  Iron is an element.\n\n  Water is a compound.\tSalt is a compound.  ',spec={...sampleSpec,notes:notes+sampleSpec.notes};
 const parts=sourcePassages(spec.notes);raw.questions[0].sourceStart=1;raw.questions[0].sourceEnd=2;
 assert.equal(parseModelOutput(JSON.stringify(raw),spec).questions[0].evidence,'Iron is an element.\n\n  Water is a compound.');
 assert.equal(parts[2].text,'Salt is a compound.');
});
test('source passage fallback covers long sentences, line notes and decimals without changing text',()=>{
 const notes='Mass is 2.55 grams.\nElement: iron\nCompound: water\n'+('unpunctuated words\t'.repeat(80))+'x'.repeat(700);
 const passages=sourcePassages(notes);
 assert.equal(passages[0].text,'Mass is 2.55 grams.');
 assert.ok(passages.some(p=>p.text==='Element: iron'));
 assert.ok(passages.some(p=>p.text==='Compound: water'));
 let previous=0;
 for(const p of passages){
  assert.equal(p.text,notes.slice(p.start,p.end));assert.ok(p.text.length>0 && p.text.length<=500);
  assert.equal(notes.slice(previous,p.start).trim(),'');previous=p.end;
 }
 assert.equal(notes.slice(previous).trim(),'');
});

test('rubric repair preserves criteria and rejects string, fractional, missing and incorrect totals',async()=>{
 for(const marks of [1,2,5,10]){
  const spec={...sampleSpec,format:'short',marksEach:marks},valid=copy();for(const q of valid.questions){q.kind='short';q.options=[];q.correctIndex=null;q.marks=marks;q.marking=[{point:q.answer,marks}];}
  assert.deepEqual(auditAssessment(valid,spec),[]);
  for(const marking of [[{point:'Criterion',marks:String(marks)}],[{point:'Criterion',marks:0.5}],[],[{point:'Criterion',marks:marks+1}]]){
   const bad=structuredClone(valid);bad.questions[1].marking=marking;assert.throws(()=>parseModelOutput(JSON.stringify(bad),spec,{generated:true}),/Marking points/);
  }
  let calls=0;const result=await generateAssessment(spec,{key:'test',generate:async({prompt})=>{calls++;assert.ok(prompt.includes(`sum to exactly ${marks}`));const out=structuredClone(valid);if(calls===1)out.questions[1].marking[0].marks=marks+1;return {text:JSON.stringify(out)};}});assert.equal(calls,2);assert.equal(result.paper.questions[1].marking[0].marks,marks);
 }
});
test('unrepaired marking totals stay rejected with a specific user-facing explanation',async()=>{
 const bad=copy();bad.questions[3].marking=[{point:'Creditworthy criterion',marks:1}];let calls=0;
 await assert.rejects(generateAssessment(sampleSpec,{key:'test',generate:async()=>{calls++;return{text:JSON.stringify(bad)};}}),e=>e.code==='ASSESSMENT_VALIDATION'&&/Marking criteria or totals need correction in Q4/.test(e.message)&&/Expected 2; found 1/.test(e.validationChecks));assert.equal(calls,2);
});

test('rubric-only repair edits marking fields only and preserves every question, answer and source',async()=>{
 const bad=copy();bad.questions[3].marking=[{point:'One fact',marks:1}];let calls=0;
 const result=await generateAssessment(sampleSpec,{key:'test',generate:async({prompt})=>{calls++;if(calls===1)return{text:JSON.stringify(bad)};assert.match(prompt,/Repair ONLY the marking rubrics/);assert.match(prompt,/"question":4/);const patch=copy();patch.questions[0].prompt='An unwanted replacement';patch.questions[0].answer='An unsupported unrelated change';return{text:JSON.stringify(patch)};}});
 assert.equal(calls,2);assert.deepEqual(result.paper,samplePaper);
});
test('targeted rubric patch has exact question identities and still rejects incorrect sums',async()=>{
 const bad=copy();bad.questions[3].marking=[{point:'One fact',marks:1}];
 for(const repairs of [[{question:5,marking:samplePaper.questions[3].marking}],[],[{question:4,marking:[{point:'Fact',marks:3}]}]]){let calls=0;await assert.rejects(generateAssessment(sampleSpec,{key:'test',generate:async()=>({text:JSON.stringify(++calls===1?bad:{repairs})})}),e=>e.code==='ASSESSMENT_VALIDATION');assert.equal(calls,2);}
 let changedCalls=0;const changed=copy();changed.questions[3].answer='A different answer';await assert.rejects(generateAssessment(sampleSpec,{key:'test',generate:async()=>({text:JSON.stringify(++changedCalls===1?bad:changed)})}),e=>e.code==='ASSESSMENT_VALIDATION');
 let calls=0;const out=await generateAssessment(sampleSpec,{key:'test',generate:async()=>({text:JSON.stringify(++calls===1?bad:{repairs:[{question:4,marking:samplePaper.questions[3].marking}]})})});assert.deepEqual(out.paper,samplePaper);
});
