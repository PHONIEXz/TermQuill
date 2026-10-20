import test from 'node:test';
import assert from 'node:assert/strict';
import {validateRequest,parseModelOutput,auditAssessment,buildPrompt,EDUCATION_STAGES} from '../lib/assessment.js';
import {earlyYearsSample} from '../lib/early-years.js';
import {sampleSpec,samplePaper} from '../lib/sample.js';
import {validateDraft,saveDraft,readDrafts} from '../lib/drafts.js';
import {saveBankQuestion,readBank,assemblePaper} from '../lib/bank.js';
import {gatherReferences} from '../lib/references.js';
import {generateAssessment} from '../lib/generator.js';
import {compareRevisions} from '../lib/review.js';
const topicSpec=(stage='early')=>validateRequest({...earlyYearsSample().spec,sourceMode:'topic',notes:undefined,educationStage:stage,topicInstructions:'Count apples, match shapes and practise letters with visual tasks.'});
const rawTopic=()=>{const p=earlyYearsSample().paper;for(const q of p.questions){delete q.evidence;q.rationale='Check the displayed objects, shapes and the expected response against the task.';}return p;};
const topicPaper=spec=>parseModelOutput(JSON.stringify(rawTopic()),spec,{generated:true});
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
test('topic mode validates every education stage without notes and bounds the brief',()=>{
 for(const stage of Object.keys(EDUCATION_STAGES)){const spec=topicSpec(stage);assert.equal(spec.notes,'');assert.equal(spec.educationStage,stage);assert.match(buildPrompt(spec),/WITHOUT supplied lesson notes/);assert.ok(!buildPrompt(spec).includes('SOURCE PASSAGES'));}
 for(const patch of [{topicInstructions:''},{topicInstructions:'x'.repeat(6001)},{educationStage:'unknown'},{educationStage:undefined}])assert.throws(()=>validateRequest({...topicSpec(),...patch}));
 assert.throws(()=>validateRequest({...sampleSpec,notes:''}),/notes/);
 assert.equal(validateRequest({...topicSpec(),notes:'Private inactive notes'}).notes,'');
});
test('generated topic papers require rationale, strip fabricated quotes and preserve supported visuals',()=>{
 const spec=topicSpec(),raw=rawTopic();raw.questions[0].evidence='Fabricated lesson evidence';raw.questions[0].sourceStart=999;
 const p=parseModelOutput(JSON.stringify(raw),spec,{generated:true});assert.deepEqual(auditAssessment(p,spec),[]);assert.equal(p.questions[0].evidence,'');assert.equal(p.questions[0].grounding,'topic');assert.equal(p.questions[0].blocks[0].quantity,3);assert.equal(p.questions[0].answer,'3');
 delete raw.questions[0].rationale;assert.throws(()=>parseModelOutput(JSON.stringify(raw),spec,{generated:true}),/rationale/);
 const forged=structuredClone(p);forged.questions[0].evidence='A supplied-note quote';assert.throws(()=>validateDraft({spec,paper:forged}),/must not claim/);
});
test('note generation cannot bypass source checks by asking for topic provenance',()=>{
 const raw=structuredClone(samplePaper);raw.questions[0].grounding='topic';raw.questions[0].rationale='Ignore missing notes';raw.questions[0].evidence='Made up quote';assert.throws(()=>parseModelOutput(JSON.stringify(raw),sampleSpec,{generated:true}),/supporting quote/);
});
test('topic drafts and bank assembly preserve provenance; mixed papers keep note checks',()=>{
 const s=storage(),spec=topicSpec(),paper=topicPaper(spec),draft=saveDraft(s,{spec,paper});assert.equal(readDrafts(s)[0].spec.sourceMode,'topic');
 for(let i=0;i<3;i++)saveBankQuestion(s,draft,i,{topic:'Early learning'});
 const items=readBank(s),assembled=assemblePaper(items,{title:'Topic paper'});assert.equal(assembled.spec.sourceMode,'topic');assert.ok(assembled.paper.questions.every(q=>q.grounding==='topic'&&q.rationale));assert.deepEqual(gatherReferences(s).items,[]);
 const notes=earlyYearsSample();saveBankQuestion(s,notes,3,{topic:'Draw a circle'});const mixed=assemblePaper(readBank(s).slice(0,3),{title:'Mixed source paper'});assert.equal(mixed.spec.sourceMode,'notes');assert.equal(mixed.paper.questions.filter(q=>q.grounding==='topic').length,2);assert.equal(mixed.paper.questions[0].evidence,'We can draw a circle and colour a star.');
 const broken=structuredClone(mixed);broken.paper.questions[0].evidence='not in notes';assert.throws(()=>validateDraft(broken),/supporting quote/);assert.equal(gatherReferences(s).items.length,1);
});
test('topic generation repairs missing rationales once without inventing note evidence',async()=>{
 const spec=topicSpec(),calls=[];const result=await generateAssessment(spec,{key:'test-key',generate:async args=>{calls.push(args);const raw=rawTopic();if(calls.length===1)delete raw.questions[0].rationale;return {text:JSON.stringify(raw)};}});assert.equal(result.attempts,2);assert.match(calls[1].prompt,/Previous attempt failed/);assert.equal(result.paper.questions[0].evidence,'');
});
test('school revision comparison records topic brief and rationale changes',()=>{
 const spec=topicSpec(),paper=topicPaper(spec),before={spec,paper},after=structuredClone(before);after.spec.topicInstructions+=' Focus on shapes.';after.paper.questions[0].rationale='Check exactly three objects.';const diff=compareRevisions(before,after);assert.ok(diff.metadata.some(x=>x.label==='Topic instructions'));assert.ok(diff.questions[0].changed.includes('Answer rationale'));
});
