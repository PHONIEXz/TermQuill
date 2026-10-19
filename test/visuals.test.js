import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {installVisuals} from './visual-helpers.js';
import {earlyYearsSample} from '../lib/early-years.js';
import {cleanBlocks,visualAnswer,setVisualAnswer,assertSchoolSize} from '../lib/visuals.js';
import {validateDraft} from '../lib/drafts.js';
import {auditAssessment,parseModelOutput,buildPrompt} from '../lib/assessment.js';
import {samplePaper,sampleSpec} from '../lib/sample.js';
import {generateAssessment} from '../lib/generator.js';
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1sAAAAASUVORK5CYII=';
test('illustrated papers and legacy text papers survive validation and JSON round trips',()=>{
 const early=earlyYearsSample();early.paper.questions[3].blocks.push({type:'image',src:png,alt:'A teacher picture',size:'small',crop:'fit',caption:''});
 const saved=validateDraft(JSON.parse(JSON.stringify(early)));assert.deepEqual(saved.paper,early.paper);assert.deepEqual(auditAssessment(saved.paper,saved.spec),[]);assert.equal(saved.approved,false);
 assert.deepEqual(parseModelOutput(JSON.stringify(samplePaper),sampleSpec),samplePaper);
});
test('rejects unsafe images, malformed tables, invented blocks and invalid versions',()=>{
 const bad=[{type:'image',src:'https://tracker.test/pixel',alt:'x'},{type:'image',src:'data:image/svg+xml;base64,PHN2Zz4=',alt:'x'},{type:'image',src:png+'x'.repeat(24000),alt:'x'},{type:'table',headers:['A','B'],rows:[['x']]},{type:'table',headers:['x'],rows:Array(9).fill(['x'])},{type:'tracing',text:'x'.repeat(33),rows:1},{type:'drawing',height:999,label:''},{type:'html',html:'<script>bad()</script>'},{type:'picture',icon:'unknown',quantity:3,size:'medium'}];
 for(const block of bad)assert.throws(()=>cleanBlocks([block]));
 assert.throws(()=>parseModelOutput(JSON.stringify({...samplePaper,version:99}),sampleSpec),/version/);
});
test('counts, answers and marking keys agree; matching uses its actual displayed order',()=>{
 const early=earlyYearsSample(),count=early.paper.questions[0],match=early.paper.questions[1];
 count.blocks[0].quantity=7;assert.ok(auditAssessment(early.paper,early.spec).some(i=>/answer/.test(i.message)));setVisualAnswer(count);assert.equal(count.answer,'7');assert.equal(count.marking[0].point,'7');assert.deepEqual(auditAssessment(early.paper,early.spec),[]);
 match.blocks[0].order=[1,2,0];setVisualAnswer(match);assert.match(match.answer,/1–C: Circle = Round/);assert.equal(match.marking[0].point,'1–C; 2–A; 3–B');
 match.marking[0].point='Incorrect key';assert.ok(auditAssessment(early.paper,early.spec).some(i=>/marking key/.test(i.message)));
 assert.throws(()=>cleanBlocks([{...match.blocks[0],order:[0,0,2]}]));
});
test('generated visual keys are app-owned while invalid imports are rejected',async()=>{
 const early=earlyYearsSample();early.paper.questions[0].answer='999';early.paper.questions[1].answer='Model-written key';
 assert.throws(()=>validateDraft(early),/answer/);
 const result=await generateAssessment(early.spec,{key:'test',generate:async()=>({text:JSON.stringify(early.paper)})});assert.equal(result.paper.questions[0].answer,'3');assert.match(result.paper.questions[1].answer,/1–B/);assert.equal(result.providerCalls,1);
 assert.match(buildPrompt(early.spec),/VISUAL BLOCKS/);assert.match(buildPrompt(early.spec),/not force counting/);
});
test('student visuals contain exact objects and shuffled matching columns without answer keys',()=>{
 const dom=new JSDOM('<article></article>',{runScripts:'outside-only'}),w=dom.window;installVisuals(w);
 try{const paper=w.document.querySelector('article'),sample=earlyYearsSample();sample.paper.questions.forEach(q=>w.renderBlocks(paper,q));
 assert.equal(paper.querySelectorAll('.count-objects')[0].querySelectorAll('svg').length,3);
 const rows=paper.querySelectorAll('.matching-table tbody tr');assert.equal(rows[0].textContent,'1. CircleA. Three sides');assert.ok(!paper.textContent.includes(visualAnswer(sample.paper.questions[1].blocks)));
 assert.equal(paper.querySelectorAll('.block-tracing svg').length,2);assert.equal(paper.querySelectorAll('.writing-rule').length,1);assert.equal(paper.querySelectorAll('.question-table').length,2);
 const q={blocks:[{type:'table',caption:'<img onerror=bad()>',headers:['<script>bad()</script>'],rows:[['<b>literal</b>']]}]};w.renderBlocks(paper,q);assert.equal(paper.querySelectorAll('script,img').length,0);assert.match(paper.textContent,/<b>literal/);
 }finally{dom.window.close();}
});
test('school size checks use encoded bytes and preserve the existing storage boundary',()=>{
 assert.doesNotThrow(()=>assertSchoolSize(earlyYearsSample()));assert.throws(()=>assertSchoolSize({notes:'中'.repeat(30000)}),e=>e.status===413);assert.throws(()=>assertSchoolSize({notes:'x'.repeat(86000)}),/too large/);
});


test('generated matching tasks shuffle aligned rows while teacher-saved order stays intact',()=>{
 const early=earlyYearsSample(),q=early.paper.questions[1];q.blocks[0].order=[0,1,2];setVisualAnswer(q);
 const saved=parseModelOutput(JSON.stringify(early.paper),early.spec);assert.deepEqual(saved.questions[1].blocks[0].order,[0,1,2]);
 const generated=parseModelOutput(JSON.stringify(early.paper),early.spec,{generated:true});assert.deepEqual(generated.questions[1].blocks[0].order,[1,2,0]);assert.match(generated.questions[1].answer,/1–C: Circle = Round/);assert.deepEqual(auditAssessment(generated,early.spec),[]);
});
