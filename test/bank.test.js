import test from 'node:test';
import assert from 'node:assert/strict';
import {saveBankQuestion,saveBankQuestions,readBank,writeBank,validateBank,assemblePaper,BANK_KEY} from '../lib/bank.js';
import {earlyYearsSample} from '../lib/early-years.js';
import {validateDraft} from '../lib/drafts.js';
import {paperTotal} from '../lib/visuals.js';
import {parseModelOutput,auditAssessment} from '../lib/assessment.js';
function storage(){const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};}
test('sections, raster logo and individual marks round trip with accurate totals',()=>{
 const d=earlyYearsSample();d.paper.markingMode='individual';d.paper.questions[0].marks=5;d.paper.questions[0].marking[0].marks=5;d.paper.questions[0].section={title:'Section A: Numbers',instructions:'Answer all questions.'};d.paper.layout.logo='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1sAAAAASUVORK5CYII=';
 const saved=validateDraft(d);assert.equal(saved.paper.questions[0].marks,5);assert.equal(paperTotal(saved.paper),10);assert.deepEqual(saved.paper,d.paper);assert.deepEqual(auditAssessment(saved.paper,saved.spec),[]);
 const bad=structuredClone(d);bad.paper.questions[0].marks=101;assert.throws(()=>validateDraft(bad),/marks/);bad.paper.questions[0].marks=5;bad.paper.questions[0].section.title='x'.repeat(81);assert.throws(()=>validateDraft(bad));bad.paper.questions[0].section.title='A';bad.paper.layout.logo='https://tracking.test/logo';assert.throws(()=>validateDraft(bad));
 // Generated papers cannot opt out of requested uniform marks themselves.
 assert.throws(()=>parseModelOutput(JSON.stringify(d.paper),d.spec,{generated:true}),/marks/);
});
test('bank keeps exact visuals and source notes, rejects duplicates and broken source evidence',()=>{
 const s=storage(),d=earlyYearsSample();saveBankQuestion(s,d,0,{topic:'Counting',term:'First term'});const item=readBank(s)[0];assert.deepEqual(item.question,d.paper.questions[0]);assert.equal(item.spec.notes,d.spec.notes);assert.throws(()=>saveBankQuestion(s,d,0,{topic:'Counting'}),/already/);
 d.paper.questions[1].evidence='This was never taught.';assert.throws(()=>saveBankQuestion(s,d,1,{topic:'Shapes'}),/quote/);assert.equal(readBank(s).length,1);
});
test('assembling creates an unreviewed paper, preserves order and rejects mixed classes or duplicated questions',()=>{
 const s=storage(),d=earlyYearsSample();for(const i of [0,1,2])saveBankQuestion(s,d,i,{topic:'Early learning'});const items=readBank(s),out=assemblePaper(items,{title:'Our first examination',minutes:40});assert.equal(out.approved,false);assert.equal(out.paper.questions[0].prompt,d.paper.questions[2].prompt);assert.equal(out.paper.markingMode,'individual');assert.equal(out.spec.minutes,40);assert.equal(paperTotal(out.paper),3);assert.deepEqual(auditAssessment(out.paper,out.spec),[]);
 assert.throws(()=>assemblePaper(items.slice(0,2),{title:'Test'}),/3–20/);assert.throws(()=>assemblePaper([items[0],items[0],items[1]],{title:'Test'}),/Duplicate/);const mixed=structuredClone(items);mixed[0].spec.level='Primary 1';assert.throws(()=>assemblePaper(mixed,{title:'Test'}),/same subject and class/);
});
test('bank import and storage writes are bounded and atomic',()=>{
 const s=storage(),d=earlyYearsSample();saveBankQuestion(s,d,0,{topic:'Counting'});const before=s.getItem(BANK_KEY),items=readBank(s),backup={version:1,items};assert.deepEqual(validateBank(JSON.parse(JSON.stringify(backup))),items);assert.throws(()=>writeBank(s,[...items,...items]),/Duplicate/);assert.equal(s.getItem(BANK_KEY),before);assert.throws(()=>validateBank({version:9,items}),/backup/);assert.throws(()=>writeBank(s,Array.from({length:51},()=>items[0])),/50/);
});

test('saving a selection is atomic, skips duplicates and keeps source content',()=>{const s=storage(),d=earlyYearsSample();let result=saveBankQuestions(s,d,[0,1],{topic:'Early learning'});assert.equal(result.saved,2);assert.equal(readBank(s).length,2);result=saveBankQuestions(s,d,[0,1,2],{topic:'Early learning'});assert.deepEqual(result,{saved:1,skipped:2});const before=s.getItem(BANK_KEY);assert.throws(()=>saveBankQuestions(s,d,[],{topic:'Early learning'}));const broken=structuredClone(d);broken.paper.questions[3].evidence='This was never taught.';assert.throws(()=>saveBankQuestions(s,broken,[0,3],{topic:'Early learning'}));assert.equal(s.getItem(BANK_KEY),before);assert.equal(readBank(s)[0].spec.notes,d.spec.notes);});
