import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {qualityReview} from '../lib/quality.js';
import {buildPrompt} from '../lib/assessment.js';
import {sampleSpec} from '../lib/sample.js';
import {JSDOM} from 'jsdom';
import {installVisuals} from './visual-helpers.js';
const cases=JSON.parse(await readFile(new URL('./fixtures/creation-quality.json',import.meta.url),'utf8'));
for(const fixture of cases)test(`quality baseline: ${fixture.id}`,()=>{
 const paper={questions:fixture.questions},before=structuredClone(paper),report=qualityReview(paper,fixture.spec);
 assert.deepEqual(report.findings.map(f=>f.code),fixture.expectedCodes);assert.equal(report.topicCount,fixture.topicCount||0);assert.deepEqual(paper,before);
});
test('quality signals preserve signed values, avoid formula digits and keep different numerical tasks distinct',()=>{
 const question=(prompt,answer,evidence)=>({prompt,answer,evidence,marks:1});
 assert.deepEqual(qualityReview({questions:[question('Name the formula of water.','H2O','Water has the formula H2O.')]}).findings,[]);
 assert.equal(qualityReview({questions:[question('State the temperature.','-5 °C','The temperature is 5 °C.')]}).findings[0].code,'check-values');
 assert.deepEqual(qualityReview({questions:[question('Calculate the signed result.','-5','The result is -5.'),question('Find the signed result.','5','The result is 5.')]}).findings,[]);
 assert.equal(qualityReview({questions:[question('Give the measurement.','1.5 cm','The measurement is 1.5 cm.')]}).findings.length,0);
 assert.equal(qualityReview({questions:[question('Give the measurement.','1.6 cm','The measurement is 1.5 cm.')]}).findings[0].code,'check-values');
 assert.deepEqual(qualityReview(null),{findings:[],topicCount:0});
});
test('review panel is advisory, safely renders text, links to exact questions and refreshes after edits',()=>{
 const dom=new JSDOM('<section id="quality"></section>',{runScripts:'outside-only'});try{const w=dom.window;installVisuals(w);const panel=w.document.querySelector('#quality'),paper=structuredClone({questions:cases.find(f=>f.id==='similar-task-different-wording').questions});let index=null;
 w.renderQualityReview(panel,paper,{}, {onEdit:i=>index=i});assert.equal(panel.hidden,false);assert.match(panel.textContent,/not a correctness score/);assert.match(panel.textContent,/Q1, Q2/);assert.equal(panel.querySelector('details').open,true);
 [...panel.querySelectorAll('button')].find(b=>b.textContent==='Review Q2').click();assert.equal(index,1);
 w.renderQualityReview(panel,paper,{}, {isBusy:true,onEdit:i=>index=i});assert.ok([...panel.querySelectorAll('button')].every(b=>b.disabled));
 paper.questions[1].prompt='<img src=x onerror=alert(1)> What is a different question?';paper.questions[1].answer='An unrelated answer';w.renderQualityReview(panel,paper,{});assert.equal(panel.querySelectorAll('button').length,0);assert.equal(panel.querySelector('img'),null);assert.match(panel.textContent,/Factual accuracy still needs teacher review/);
 w.renderQualityReview(panel,null,{});assert.equal(panel.hidden,true);assert.equal(panel.textContent,'');
 }finally{dom.window.close();}
});
test('both generation source modes include answer, units, MCQ ambiguity and repeated-task guidance',()=>{
 for(const spec of [sampleSpec,{...sampleSpec,sourceMode:'topic',topicInstructions:'Generate questions on chemical elements.'}]){const prompt=buildPrompt(spec);assert.match(prompt,/Solve each question/);assert.match(prompt,/units and rounding/);assert.match(prompt,/exactly one must be defensible/);assert.match(prompt,/Do not rephrase the same task/);}
});
