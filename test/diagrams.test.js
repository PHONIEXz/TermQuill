import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {cleanDiagram,freshDiagram,renderDiagram} from '../lib/diagrams.js';
import {EditHistory} from '../lib/edit-history.js';
import {cleanBlocks} from '../lib/visuals.js';
import {validateDraft} from '../lib/drafts.js';
import {sampleSpec,samplePaper} from '../lib/sample.js';
import {installVisuals} from './visual-helpers.js';
test('scaled graph renders actual data positions and blank grids hide points on both copies',()=>{
 const d=new JSDOM().window.document,b=freshDiagram('graph');b.points=[[0,0],[10,20]];b.style='line';let svg=renderDiagram(d,b);assert.equal(svg.querySelector('polyline').getAttribute('points'),'80,330 580,50');assert.equal(svg.querySelectorAll('circle').length,2);assert.match(svg.textContent,/Time \(s\)/);b.style='blank';svg=renderDiagram(d,b);assert.equal(svg.querySelectorAll('circle,polyline').length,0);
});
test('invalid geometry, excessive grid intervals and hostile element types cannot enter saved paper',()=>{
 const b=freshDiagram('graph');for(const bad of [{...b,x:{...b.x,step:0}},{...b,x:{...b.x,max:0}},{...b,x:{...b.x,step:.01}},{...b,points:[[11,2]]},{...b,points:[[NaN,2]]}])assert.throws(()=>cleanBlocks([bad]));
 const diagram=freshDiagram();diagram.parts[0].width=100;assert.throws(()=>cleanDiagram(diagram));assert.throws(()=>cleanDiagram({...diagram,parts:[{kind:'script',x:0,y:0,label:'alert(1)'}]}));
 const d=new JSDOM().window.document;diagram.parts=[{kind:'text',x:50,y:50,label:'<script>alert(1)</script>'}];const svg=renderDiagram(d,diagram);assert.equal(svg.querySelector('script'),null);assert.match(svg.textContent,/<script>/);
});
test('structured graphs and diagrams survive draft validation without losing labels or geometry',()=>{
 const paper=structuredClone(samplePaper);paper.questions[0].blocks=[freshDiagram('graph'),freshDiagram()];const draft=validateDraft({spec:sampleSpec,paper});assert.deepEqual(draft.paper.questions[0].blocks,cleanBlocks(paper.questions[0].blocks));
});
test('visual editor previews graph changes, adds points and preserves answer/rubric for teacher review',()=>{
 const dom=new JSDOM('<main></main>',{runScripts:'outside-only'}),w=dom.window;w.structuredClone=structuredClone;installVisuals(w);const q={kind:'short',answer:'Review me',marks:2,marking:[{point:'Independent criterion',marks:2}],blocks:[freshDiagram('graph')]};let changes=0;w.blockEditor(w.document.querySelector('main'),q,{onChange:()=>changes++});const buttons=[...w.document.querySelectorAll('button')];buttons.find(b=>b.textContent==='Add data point').click();assert.equal(q.blocks[0].points.length,1);const select=[...w.document.querySelectorAll('select')].find(e=>e.options[0]?.textContent==='Blank plotting grid');select.value='points';select.dispatchEvent(new w.Event('change'));assert.equal(w.document.querySelectorAll('.diagram-live-preview circle').length,1);assert.equal(q.answer,'Review me');assert.equal(q.marking[0].marks,2);assert.ok(changes>=2);dom.window.close();
});
test('bounded undo/redo coalesces typing, preserves answer keys and drops redo after a new edit',()=>{
 const h=new EditHistory(2);h.reset({answer:'a',marks:2});h.record({answer:'ab',marks:2},'answer');h.record({answer:'abc',marks:2},'answer');assert.deepEqual(h.undo(),{answer:'a',marks:2});assert.deepEqual(h.redo(),{answer:'abc',marks:2});h.record({answer:'abc',marks:3});assert.deepEqual(h.undo(),{answer:'abc',marks:2});h.record({answer:'new',marks:2});assert.equal(h.redo(),null);h.record({answer:'next',marks:2});h.record({answer:'last',marks:2});assert.equal(h.past.length,2);
});
