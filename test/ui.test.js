import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { sampleSpec,samplePaper } from '../lib/sample.js';
import { auditAssessment,validateRequest,parseModelOutput } from '../lib/assessment.js';
const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
const script=(await readFile(new URL('../public/app.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'');
async function setup(generate) {
  const dom=new JSDOM(html,{url:'http://localhost:3000',runScripts:'outside-only'}),w=dom.window;
  Object.assign(w,{structuredClone,validateRequest,auditAssessment,parseModelOutput,sampleSpec,samplePaper});
  w.HTMLElement.prototype.scrollIntoView=()=>{};w.confirm=()=>true;
  w.fetch=async (url,options)=>url==='/api/config'?{ok:true,json:async()=>({configured:Boolean(generate),accessRequired:false})}:generate(url,options);
  w.eval(script);await new Promise(r=>setTimeout(r,0));
  return {dom,w,$:id=>w.document.getElementById(id)};
}
test('sample: render, review, print views, edits invalidate approval, local save/restore',async()=>{
  const {dom,w,$}=await setup();try{
    assert.equal($('generate').disabled,true);$('try-sample').click();
    assert.equal(w.document.querySelectorAll('.question').length,6);
    assert.equal(w.document.querySelectorAll('.teacher-answer').length,0);
    assert.match($('preview').textContent,/Hand-authored/);
    assert.equal($('print').disabled,true);
    $('approved').checked=true;$('approved').dispatchEvent(new w.Event('change'));
    assert.equal($('print').disabled,false);
    $('tab-teacher').click();assert.equal(w.document.querySelectorAll('.teacher-answer').length,6);assert.ok($('preview').textContent.includes(samplePaper.questions[0].evidence));
    $('tab-edit').click();assert.equal($('print').disabled,true);
    const prompt=w.document.querySelector('.editor textarea');prompt.value='Revised question wording?';prompt.dispatchEvent(new w.Event('input'));
    assert.equal($('approved').checked,false);
    $('save').click();assert.equal($('restore').disabled,false);
    $('restore').click();assert.ok($('preview').textContent.includes('Question 1'));assert.equal(w.document.querySelector('.editor textarea').value,'Revised question wording?');
    $('tab-student').click();assert.equal(w.document.querySelectorAll('.teacher-answer').length,0);
    assert.equal($('preview').textContent.includes('From the lesson notes:'),false);
    $('clear').click();assert.equal($('restore').disabled,true);
  }finally{dom.window.close();}
});
test('duplicate editing disables approval with a specific issue',async()=>{
  const {dom,w,$}=await setup();try{$('try-sample').click();$('tab-edit').click();const prompts=[...w.document.querySelectorAll('.editor')].map(e=>e.querySelector('textarea'));prompts[1].value=prompts[0].value;prompts[1].dispatchEvent(new w.Event('input'));assert.equal($('approved').disabled,true);assert.match($('audit-status').textContent,/Duplicate/);}finally{dom.window.close();}
});
test('generation submits settings and renders escaped output in edit view',async()=>{
  let sent;
  const {dom,w,$}=await setup(async(url,options)=>{sent=JSON.parse(options.body);return {ok:true,json:async()=>({paper:samplePaper,model:'mock-gemma'})};});
  try{
    $('sample-notes').click();$('title').value='<img src=x onerror=alert(1)>';
    $('assessment-form').dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,10));
    assert.equal(sent.count,6);assert.equal($('tab-edit').getAttribute('aria-selected'),'true');assert.match($('live-status').textContent,/draft is ready/);
    $('tab-student').click();assert.equal($('preview').querySelector('img'),null);assert.ok($('preview').textContent.includes('<img src=x'));
  }finally{dom.window.close();}
});
test('generation failure preserves current paper and exposes retryable error',async()=>{
  const {dom,w,$}=await setup(async()=>({ok:false,json:async()=>({error:'Provider quota exhausted.'})}));
  try{$('try-sample').click();$('assessment-form').dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,10));assert.match($('error').textContent,/quota/);assert.equal(w.document.querySelectorAll('.question').length,6);assert.equal($('generate').disabled,false);}finally{dom.window.close();}
});
test('cancel stops waiting and preserves draft',async()=>{
  const {dom,w,$}=await setup((url,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')))));
  try{$('try-sample').click();$('assessment-form').dispatchEvent(new w.Event('submit',{cancelable:true}));assert.equal($('cancel').hidden,false);$('cancel').click();await new Promise(r=>setTimeout(r,10));assert.match($('error').textContent,/cancelled/);assert.equal(w.document.querySelectorAll('.question').length,6);}finally{dom.window.close();}
});
