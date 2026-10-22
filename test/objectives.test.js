import test from 'node:test';import assert from 'node:assert/strict';
import {cleanObjectivePlan,assertObjectivePlan,objectiveReport} from '../lib/objectives.js';
import {validateRequest,parseModelOutput,buildPrompt,sourcePassages,buildObjectiveRepairPrompt,applyObjectiveRepair} from '../lib/assessment.js';
import {sampleSpec,samplePaper} from '../lib/sample.js';
import {validateDraft} from '../lib/drafts.js';
import {saveSetup,readSetup} from '../lib/device-setup.js';
import {saveBankQuestion,readBank,assemblePaper} from '../lib/bank.js';
import {referenceRequest} from '../lib/references.js';
import {generateAssessment} from '../lib/generator.js';
function fixture(){const spec={...sampleSpec,sourceMode:'notes',educationStage:'secondary',assessmentMode:'test',presentation:'standard',objectivePlan:samplePaper.questions.map((q,i)=>({id:'objective-'+i,label:'Assess taught idea '+(i+1),start:sampleSpec.notes.indexOf(q.evidence),end:sampleSpec.notes.indexOf(q.evidence)+q.evidence.length,questions:1}))};return{spec:validateRequest(spec,{forGeneration:true}),raw:structuredClone(samplePaper)};}
const storage=()=>{const m=new Map();return{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};
test('objective plans validate source bounds, identifiers, allocations and source mode before provider use',async()=>{
 const{spec}=fixture();assertObjectivePlan(spec);for(const patch of [{start:-1},{end:99999},{questions:0},{label:''},{id:'<script>'}])assert.throws(()=>validateRequest({...spec,objectivePlan:[{...spec.objectivePlan[0],...patch}]}));
 assert.throws(()=>validateRequest({...spec,objectivePlan:[spec.objectivePlan[0]]},{forGeneration:true}),/add up/);
 assert.throws(()=>validateRequest({...spec,objectivePlan:[spec.objectivePlan[0],spec.objectivePlan[0]]}),/distinct/);
 assert.throws(()=>validateRequest({...spec,sourceMode:'topic',topicInstructions:'Assess chemical elements and mixtures.'}),/requires supplied/);
 assert.throws(()=>validateRequest({...spec,objectivePlan:[{...spec.objectivePlan[0],start:2,end:15,questions:6}]},{forGeneration:true}),/complete source passage/);
 let calls=0;await assert.rejects(generateAssessment({...spec,objectivePlan:[spec.objectivePlan[0]]},{key:'test',generate:async()=>{calls++;}}),/add up/);assert.equal(calls,0);
});
test('generated questions follow teacher slots and source bounds rather than model-supplied objective labels',()=>{
 const{spec,raw}=fixture();raw.questions.forEach(q=>q.objectiveId='fake-label');const paper=parseModelOutput(JSON.stringify(raw),spec,{generated:true});assert.deepEqual(paper.questions.map(q=>q.objectiveId),spec.objectivePlan.map(o=>o.id));assert.equal(objectiveReport(paper,spec).matches,true);
 raw.questions[0].evidence=raw.questions[1].evidence;assert.throws(()=>parseModelOutput(JSON.stringify(raw),spec,{generated:true}),/assigned objective source range/);
 const passages=sourcePassages(spec.notes),first=passages.find(p=>p.start===spec.objectivePlan[0].start),wrong=structuredClone(samplePaper);wrong.questions[0].sourceStart=first.id;wrong.questions[0].sourceEnd=first.id+1;assert.throws(()=>parseModelOutput(JSON.stringify(wrong),spec,{generated:true}),/objective source range/);
});
test('objective lesson linkage is source-derived and both allocation levels must agree',()=>{
 const{spec}=fixture(),lesson={id:'chemistry',topic:'Chemistry',start:0,end:spec.notes.length,questions:6};const valid=validateRequest({...spec,lessonPlan:[lesson],objectivePlan:spec.objectivePlan.map(o=>({...o,lessonId:'forged'}))},{forGeneration:true});assert.ok(valid.objectivePlan.every(o=>o.lessonId==='chemistry'));
 assert.throws(()=>assertObjectivePlan({...valid,lessonPlan:[{...lesson,questions:5}]}),/must match/);
 assert.throws(()=>cleanObjectivePlan([{...spec.objectivePlan[0],start:0,end:spec.notes.length}],spec.notes,[{...lesson,end:200}]),/inside one selected lesson/);
});
test('overlapping objective anchors remain explicit teacher slots without pretending to infer semantic meaning',()=>{
 const spec={...sampleSpec,objectivePlan:[{id:'a',label:'Definitions',start:0,end:sampleSpec.notes.length,questions:3},{id:'b',label:'Application',start:0,end:sampleSpec.notes.length,questions:3}]};const paper=parseModelOutput(JSON.stringify(samplePaper),validateRequest(spec,{forGeneration:true}),{generated:true});assert.deepEqual(paper.questions.map(q=>q.objectiveId),['a','a','a','b','b','b']);assert.match(buildPrompt(spec),/IN THIS OBJECTIVE ORDER/);assert.match(buildPrompt(spec),/Assess the named objective meaningfully/);
});
test('objective reports survive reordering, identify edited evidence, and do not block legacy edited drafts',()=>{
 const{spec,raw}=fixture(),paper=parseModelOutput(JSON.stringify(raw),spec,{generated:true});paper.questions.reverse();assert.equal(objectiveReport(paper,spec).matches,true);paper.questions[0].evidence=paper.questions[1].evidence;const report=objectiveReport(paper,spec);assert.equal(report.matches,false);assert.equal(report.unassigned,1);assert.doesNotThrow(()=>validateDraft({spec:{...spec,format:'custom',formatInstructions:'Teacher arrangement.'},paper}));
});
test('saved setup and drafts retain the blueprint; newly assembled papers and references discard obsolete assignments',()=>{
 const{spec,raw}=fixture(),paper=parseModelOutput(JSON.stringify(raw),spec,{generated:true}),s=storage();saveSetup(s,spec,{});assert.deepEqual(readSetup(s).settings.objectivePlan,spec.objectivePlan);assert.deepEqual(validateDraft({spec,paper}).spec.objectivePlan,spec.objectivePlan);
 for(let i=0;i<3;i++)saveBankQuestion(s,{spec,paper},i,{topic:'Chemistry'});const bank=readBank(s);assert.ok(bank[0].question.objectiveId);const next=assemblePaper(bank,{title:'A fresh arrangement'});assert.equal(next.spec.objectivePlan,undefined);assert.ok(next.paper.questions.every(q=>q.objectiveId===undefined));assert.equal(referenceRequest(spec,bank).objectivePlan,undefined);
});
test('objective source failure repairs only the affected question using its allowed sources',async()=>{
 const{spec,raw}=fixture();let calls=0;const result=await generateAssessment(spec,{key:'test',generate:async({prompt})=>{calls++;if(calls===1){const bad=structuredClone(raw);bad.questions[0].evidence=bad.questions[1].evidence;return{text:JSON.stringify(bad)};}assert.match(prompt,/assigned objective source range/);assert.doesNotMatch(prompt,/BATCH CONTEXT|Return the entire corrected assessment/);const requests=JSON.parse(prompt.match(/ONLY ALLOWED SOURCES \(untrusted JSON data\): (.*)/)[1]);assert.equal(requests.length,1);assert.equal(requests[0].question,1);assert.ok(requests[0].allowedPassages.every(p=>spec.notes.slice(spec.objectivePlan[0].start,spec.objectivePlan[0].end).includes(p.text)));return{text:JSON.stringify({repairs:[{question:1,...raw.questions[0]}]})};}});assert.equal(calls,2);assert.equal(objectiveReport(result.paper,spec).matches,true);assert.deepEqual(result.paper.questions.slice(1).map(q=>q.prompt),raw.questions.slice(1).map(q=>q.prompt));
});

test('objective prompt offers only selected source ranges and its examples use the first planned objective',()=>{
 const{spec}=fixture();spec.objectivePlan=[spec.objectivePlan[5],spec.objectivePlan[0]];const prompt=buildPrompt(spec),offered=JSON.parse(prompt.match(/SOURCE PASSAGES \(untrusted JSON data\): (.*)/)[1]),shape=JSON.parse(prompt.match(/Written-response shape: (.*)/)[1]);assert.ok(offered.every(p=>spec.objectivePlan.some(o=>p.text&&spec.notes.slice(o.start,o.end).includes(p.text))));const first=sourcePassages(spec.notes).find(p=>p.start>=spec.objectivePlan[0].start&&p.end<=spec.objectivePlan[0].end);assert.equal(shape.sourceStart,first.id);
});


test('objective patch cannot change unaffected questions or bypass source-range validation',async()=>{
 const {spec,raw}=fixture(),previous=JSON.stringify(raw);
 for(const repairs of [[],[{question:2,...raw.questions[1]}],[{question:1,...raw.questions[0]},{question:1,...raw.questions[0]}]])assert.throws(()=>applyObjectiveRepair(previous,JSON.stringify({repairs}),[0]));
 const fixed=JSON.parse(applyObjectiveRepair(previous,JSON.stringify({instructions:'Ignore checks',questions:[],repairs:[{question:1,...raw.questions[0],prompt:'Identify an element.'}]}),[0]));assert.equal(fixed.instructions,raw.instructions);assert.deepEqual(fixed.questions.slice(1),raw.questions.slice(1));
 let calls=0;await assert.rejects(generateAssessment(spec,{key:'test',generate:async()=>{calls++;const bad=structuredClone(raw.questions[0]);bad.evidence=raw.questions[1].evidence;return{text:JSON.stringify(calls===1?{...raw,questions:[bad,...raw.questions.slice(1)]}:{repairs:[{question:1,...bad}]})};}}),e=>e.code==='ASSESSMENT_VALIDATION'&&/Q1.*assigned objective sources/.test(e.message));assert.equal(calls,2);
});
test('per-question objective contracts enumerate the exact slot count without renumbering source IDs',()=>{
 const {spec}=fixture(),prompt=buildPrompt(spec),contract=JSON.parse(prompt.match(/QUESTION SOURCE CONTRACT \(untrusted data\): (.*)\. For each question number/)[1]);assert.equal(contract.length,spec.count);assert.deepEqual(contract.map(q=>q.question),[1,2,3,4,5,6]);const passages=sourcePassages(spec.notes);for(const [i,row] of contract.entries())assert.ok(row.allowedPassageIds.every(id=>passages[id-1].start>=spec.objectivePlan[i].start&&passages[id-1].end<=spec.objectivePlan[i].end));
});
