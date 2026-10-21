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
 w.document.querySelector('[data-format="mcq"]').click();assert.equal($('format').value,'mcq');assert.equal(w.document.querySelector('[data-format="mcq"]').getAttribute('aria-pressed'),'true');
 $('title').value='<script>not HTML</script>';$('title').dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(w.document.querySelector('.builder-sample-sheet h3').textContent,$('title').value);assert.equal(w.document.querySelector('.builder-sample-sheet script'),null);
 assert.match($('builder-paper-sample').textContent,/NOT GENERATED/);assert.equal(w.document.querySelector('.toolbar').hidden,true);
 $('draft-badge').textContent='REVIEW NEEDED';w.document.dispatchEvent(new w.CustomEvent('termquill:paper-state',{detail:{exists:true,saved:true,dirty:false}}));assert.equal($('builder-paper-sample').hidden,true);assert.match(w.document.querySelector('.builder-save-state').textContent,/Saved copy/);
 w.document.dispatchEvent(new w.CustomEvent('termquill:paper-state',{detail:{exists:true,saved:true,dirty:true}}));assert.match(w.document.querySelector('.builder-save-state').textContent,/Unsaved changes/);
 w.document.querySelector('.output').setAttribute('aria-busy','true');await new Promise(r=>setTimeout(r,0));assert.equal(w.document.querySelector('[data-format="mcq"]').disabled,true);
 }finally{guide.disconnect();dom.window.close();}});
test('enhancement leaves public home and other pages alone',()=>{const dom=new JSDOM(html,{url:'https://termquill.vercel.app/'});try{assert.equal(initBuilderGuide(dom.window.document),undefined);assert.equal(dom.window.document.querySelector('.builder-steps'),null);}finally{dom.window.close();}});
