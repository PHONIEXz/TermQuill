import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { sampleSpec,samplePaper } from '../lib/sample.js';
import { auditAssessment,validateRequest,parseModelOutput } from '../lib/assessment.js';
import {readDrafts,saveDraft,deleteDraft,validateDraft,DRAFTS_KEY} from '../lib/drafts.js';
const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
const script=(await readFile(new URL('../public/app.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'');
async function setup(generate,route="/create",seed) {
  const dom=new JSDOM(html,{url:`http://localhost:3000${route}`,runScripts:'outside-only'}),w=dom.window;
  Object.assign(w,{structuredClone,validateRequest,auditAssessment,parseModelOutput,sampleSpec,samplePaper,readDrafts,saveDraft,deleteDraft,validateDraft});
  w.HTMLElement.prototype.scrollIntoView=()=>{};w.confirm=()=>true;
  w.fetch=async (url,options)=>url==='/api/config'?{ok:true,json:async()=>({configured:Boolean(generate),accessRequired:false})}:generate(url,options);
  if(seed)w.localStorage.setItem(DRAFTS_KEY,JSON.stringify(seed));
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
test('distinct pages set active navigation and page titles',async()=>{
  for(const name of ['home','create','drafts','guide']){
    const {dom,w}=await setup(null,name==='home'?'/':`/${name}`);
    try{assert.equal(w.document.body.dataset.page,name);assert.equal(w.document.querySelector('[aria-current=page]').dataset.nav,name);if(name==='drafts')assert.match(w.document.title,/My drafts/);}finally{dom.window.close();}
  }
});
test('draft library lists, searches and removes individual papers',async()=>{
  const first=validateDraft({spec:sampleSpec,paper:samplePaper}),second=validateDraft({spec:{...sampleSpec,title:'Another chemistry paper',level:'SS2'},paper:samplePaper});
  const {dom,w,$}=await setup(null,'/drafts',[first,second]);try{
    assert.equal(w.document.querySelectorAll('.draft-card').length,2);$('draft-search').value='SS2';$('draft-search').dispatchEvent(new w.Event('input'));assert.equal(w.document.querySelectorAll('.draft-card').length,1);
    assert.equal(w.document.querySelector('.draft-card a').getAttribute('href'),`/create?draft=${second.id}`);
    [...w.document.querySelectorAll('.draft-card button')].find(b=>b.textContent==='Remove').click();assert.equal(readDrafts(w.localStorage).length,1);
  }finally{dom.window.close();}
});
test('saved URL opens the right assessment with approval reset',async()=>{
  const draft=validateDraft({spec:sampleSpec,paper:samplePaper});const {dom,w,$}=await setup(null,`/create?draft=${draft.id}`,[draft]);try{assert.equal($('tab-edit').getAttribute('aria-selected'),'true');assert.equal($('approved').checked,false);assert.equal($('title').value,sampleSpec.title);assert.match($('live-status').textContent,/Saved paper opened/);}finally{dom.window.close();}
});
test('JSON import validates and saves a separate editable copy',async()=>{
  const {dom,w,$}=await setup(null,'/drafts');try{
    Object.defineProperty($('import-file'),'files',{value:[{size:5000,text:async()=>JSON.stringify({spec:sampleSpec,paper:samplePaper,approved:true})}],configurable:true});
    $('import-file').dispatchEvent(new w.Event('change'));await new Promise(r=>setTimeout(r,10));assert.equal(readDrafts(w.localStorage).length,1);assert.equal(readDrafts(w.localStorage)[0].approved,false);assert.match($('library-status').textContent,/imported/);
    Object.defineProperty($('import-file'),'files',{value:[{size:200001,text:()=>assert.fail()}],configurable:true});$('import-file').dispatchEvent(new w.Event('change'));await new Promise(r=>setTimeout(r,10));assert.equal(readDrafts(w.localStorage).length,1);assert.equal($('library-error').hidden,false);
  }finally{dom.window.close();}
});


test('landing-only content stays off the create, draft and guide pages',async()=>{
 const styles=await readFile(new URL('../public/styles.css',import.meta.url),'utf8');const landing=await readFile(new URL('../public/landing.css',import.meta.url),'utf8');
 for(const page of ['/create','/drafts','/guide','/']){
  const {dom,w}=await setup(null,page);try{const style=w.document.createElement('style');style.textContent=styles+'\n'+landing;w.document.head.append(style);assert.equal(w.getComputedStyle(w.document.querySelector('.landing-trust')).display,page==='/'?'grid':'none');}finally{dom.window.close();}
 }
});

test('custom assessment inputs toggle, reach generation and survive save/reopen',async()=>{
 let sent;const {dom,w,$}=await setup(async(url,options)=>{sent=JSON.parse(options.body);return {ok:true,json:async()=>({paper:samplePaper,model:'mock-gemma'})};});
 try{
  $('sample-notes').click();assert.equal($('custom-format-wrap').hidden,true);
  $('format').value='custom';$('format').dispatchEvent(new w.Event('change'));$('difficulty').value='custom';$('difficulty').dispatchEvent(new w.Event('change'));
  assert.equal($('formatInstructions').disabled,false);assert.equal($('difficultyInstructions').required,true);
  $('formatInstructions').value='Three multiple-choice questions, then three written explanations.';$('difficultyInstructions').value='Start with remembering facts, then explain reasons.';
  $('assessment-form').dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,15));
  assert.equal(sent.format,'custom');assert.match(sent.formatInstructions,/written explanations/);assert.equal(sent.difficulty,'custom');assert.match(sent.difficultyInstructions,/explain reasons/);
  $('save').click();$('restore').click();assert.equal($('format').value,'custom');assert.equal($('custom-format-wrap').hidden,false);assert.equal($('formatInstructions').value,sent.formatInstructions);
  $('format').value='mcq';$('format').dispatchEvent(new w.Event('change'));assert.equal($('custom-format-wrap').hidden,true);assert.equal($('formatInstructions').disabled,true);assert.equal($('formatInstructions').required,false);
 }finally{dom.window.close();}
});

test('saving preserves current review and print state; reopening and edits require fresh review',async()=>{
 const {dom,w,$}=await setup();try{
  $('try-sample').click();$('approved').checked=true;$('approved').dispatchEvent(new w.Event('change'));
  for(const view of ['student','teacher']){
   $(`tab-${view}`).click();$('save').click();
   assert.equal($('approved').checked,true);assert.equal($('print').disabled,false);
   assert.equal($('draft-badge').textContent,'REVIEWED');assert.match($('preview').querySelector('.print-note').textContent,/Teacher review confirmed/);
   assert.equal(readDrafts(w.localStorage)[0].approved,false);
  }
  const saved=readDrafts(w.localStorage);const reopened=await setup(null,`/create?draft=${saved[0].id}`,saved);
  try{reopened.$('tab-student').click();assert.equal(reopened.$('approved').checked,false);assert.equal(reopened.$('print').disabled,true);assert.match(reopened.$('preview').textContent,/Awaiting teacher review/);}finally{reopened.dom.window.close();}
  $('tab-edit').click();const input=w.document.querySelector('.editor textarea');input.value='What is an element?';input.dispatchEvent(new w.Event('input'));$('save').click();$('tab-student').click();
  assert.equal($('approved').checked,false);assert.equal($('print').disabled,true);assert.match($('preview').querySelector('.print-note').textContent,/Awaiting teacher review/);
 }finally{dom.window.close();}
});
test('failed storage save preserves the reviewed paper and reports failure',async()=>{
 const {dom,w,$}=await setup();try{
  $('try-sample').click();$('approved').checked=true;$('approved').dispatchEvent(new w.Event('change'));
  w.Storage.prototype.setItem=()=>{throw new Error('Storage full');};$('save').click();
  assert.equal($('approved').checked,true);assert.equal($('print').disabled,false);assert.match($('error').textContent,/Could not save/);
  assert.match($('preview').querySelector('.print-note').textContent,/Teacher review confirmed/);
 }finally{dom.window.close();}
});
