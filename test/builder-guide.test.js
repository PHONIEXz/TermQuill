import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {initBuilderGuide} from '../public/builder-guide.js';
const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
function setup(){const dom=new JSDOM(html,{url:'https://termquill.vercel.app/create'});const w=dom.window,$=id=>w.document.getElementById(id);w.HTMLElement.prototype.scrollIntoView=()=>{};const guide=initBuilderGuide(w.document);return{dom,w,$,guide,sections:[...$('assessment-form').querySelectorAll(':scope > .setup-section')]};}
test('guided steps retain sources, reveal invalid fields, and intercept early submit without generating',async()=>{const {dom,w,$,guide,sections}=setup();try{
 assert.equal(sections[0].hidden,false);assert.equal(sections[1].hidden,true);
 $('notes').value='Lesson material retained while navigating between steps.';
 const e=new w.Event('submit',{cancelable:true,bubbles:true});$('assessment-form').dispatchEvent(e);assert.equal(e.defaultPrevented,true);assert.equal(sections[1].hidden,false);
 guide.show(2);guide.show(0);assert.match($('notes').value,/retained/);
 $('topicInstructions').disabled=false;$('topicInstructions').dispatchEvent(new w.Event('invalid'));assert.equal(sections[1].hidden,false);
 await Promise.resolve();$('difficultyInstructions').disabled=false;$('difficultyInstructions').dispatchEvent(new w.Event('invalid'));assert.equal(sections[2].hidden,false);assert.equal($('difficultyInstructions').closest('details').open,true);
 guide.show(2);let passed=false;$('assessment-form').addEventListener('submit',()=>passed=true);$('assessment-form').dispatchEvent(new w.Event('submit',{cancelable:true}));assert.equal(passed,true);
 }finally{guide.disconnect();dom.window.close();}});
test('cards update real fields, layout remains illustrative and saved feedback uses actual state',async()=>{const{dom,w,$,guide}=setup();try{
 assert.equal(w.document.querySelector('.question-style-cards').closest('.two'),null);
 w.document.querySelector('[data-format="mcq"]').click();assert.equal($('format').value,'mcq');assert.equal(w.document.querySelector('[data-format="mcq"]').getAttribute('aria-pressed'),'true');
 $('title').value='<script>not HTML</script>';$('title').dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(w.document.querySelector('.builder-sample-sheet h3').textContent,$('title').value);assert.equal(w.document.querySelector('.builder-sample-sheet script'),null);
 assert.match($('builder-paper-sample').textContent,/NOT GENERATED/);assert.equal(w.document.querySelector('.toolbar').hidden,true);
 $('draft-badge').textContent='REVIEW NEEDED';w.document.dispatchEvent(new w.CustomEvent('termquill:paper-state',{detail:{exists:true,saved:true,dirty:false}}));assert.equal($('builder-paper-sample').hidden,true);assert.match(w.document.querySelector('.builder-save-state').textContent,/Saved copy/);
 w.document.dispatchEvent(new w.CustomEvent('termquill:paper-state',{detail:{exists:true,saved:true,dirty:true}}));assert.match(w.document.querySelector('.builder-save-state').textContent,/Unsaved changes/);
 w.document.querySelector('.output').setAttribute('aria-busy','true');await new Promise(r=>setTimeout(r,0));assert.equal(w.document.querySelector('[data-format="mcq"]').disabled,true);
 }finally{guide.disconnect();dom.window.close();}});
test('enhancement leaves public home and other pages alone',()=>{const dom=new JSDOM(html,{url:'https://termquill.vercel.app/'});try{assert.equal(initBuilderGuide(dom.window.document),undefined);assert.equal(dom.window.document.querySelector('.builder-steps'),null);}finally{dom.window.close();}});

test('focused studio shows one task, preserves source text and reveals generation or validation in context',async()=>{
 const {dom,w,$,guide}=setup();try{
  const setupPanel=w.document.querySelector('.setup'),output=w.document.querySelector('.output');
  assert.equal(setupPanel.hidden,false);assert.equal(output.hidden,true);
  $('notes').value='The complete teacher source stays intact when changing working panes.';
  $('studio-paper-task').click();assert.equal(setupPanel.hidden,true);assert.equal(output.hidden,false);assert.equal($('builder-paper-sample').hidden,false);
  $('studio-setup-task').click();assert.equal(setupPanel.hidden,false);assert.match($('notes').value,/stays intact/);
  assert.equal($('error').closest('.output'),null);assert.equal($('live-status').closest('.output'),null);
  output.setAttribute('aria-busy','true');guide.refresh();assert.equal(output.hidden,false);assert.equal(setupPanel.hidden,true);assert.equal($('studio-setup-task').disabled,true);
  output.removeAttribute('aria-busy');guide.refresh();$('topicInstructions').disabled=false;$('topicInstructions').dispatchEvent(new w.Event('invalid'));assert.equal(setupPanel.hidden,false);assert.equal(output.hidden,true);assert.equal($('builder-step-2').hidden,false);
  $('draft-badge').textContent='REVIEW NEEDED';w.document.dispatchEvent(new w.CustomEvent('termquill:paper-state',{detail:{exists:true,saved:false,dirty:true}}));assert.equal(output.hidden,false);assert.equal(setupPanel.hidden,true);
 }finally{guide.disconnect();dom.window.close();}
});
