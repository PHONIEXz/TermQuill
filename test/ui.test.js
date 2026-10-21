import {readLessons,prepareLessonCollection,LESSON_TRANSFER_KEY,writeLessons,validateLesson} from '../lib/lessons.js';
import {saveBankQuestion,readBank} from '../lib/bank.js';
import {installVisuals} from './visual-helpers.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { sampleSpec,samplePaper } from '../lib/sample.js';
import { auditAssessment,validateRequest,parseModelOutput } from '../lib/assessment.js';
import {readDrafts,saveDraft,deleteDraft,validateDraft,DRAFTS_KEY} from '../lib/drafts.js';
const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
const script=(await readFile(new URL('../public/app.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'');
async function setup(generate,route="/create",seed,lessonSeed,cloudActual) {
  const dom=new JSDOM(html,{url:`http://localhost:3000${route}`,runScripts:'outside-only'}),w=dom.window;
  Object.assign(w,{readLessons,prepareLessonCollection,LESSON_TRANSFER_KEY,structuredClone,saveBankQuestion,validateRequest,auditAssessment,parseModelOutput,sampleSpec,samplePaper,readDrafts,saveDraft,deleteDraft,validateDraft});
  installVisuals(w);
  w.HTMLElement.prototype.scrollIntoView=()=>{};w.confirm=()=>true;
  w.fetch=async (url,options)=>url==='/api/config'?{ok:true,json:async()=>({configured:Boolean(generate),accessRequired:false})}:generate(url,options);
  if(seed)w.localStorage.setItem(DRAFTS_KEY,JSON.stringify(seed));
  if(lessonSeed){writeLessons(w.localStorage,lessonSeed);w.sessionStorage.setItem(LESSON_TRANSFER_KEY,JSON.stringify({version:1,ids:lessonSeed.map(x=>x.id),assessmentMode:'test',...(cloudActual?{storage:'cloud',versions:lessonSeed.map(x=>[x.id,x.version])}:{})}));}
  w.cloudLessons=()=>({list:async()=>({items:cloudActual})});
  w.personalContext=async()=>({user:{id:'test-user'},local:w.localStorage,session:w.sessionStorage});w.emptyStorage={getItem:()=>null};await w.eval(`(async()=>{${script}})()`);await new Promise(r=>setTimeout(r,0));
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

test('Early Years editor updates visual keys, invalidates review and saves every block',async()=>{
 const {dom,w,$}=await setup();try{
  $('early-sample').click();assert.equal(w.document.querySelectorAll('.editor').length,6);assert.match($('live-status').textContent,/Hand-authored/);assert.equal($('approved').disabled,false);
  $('approved').checked=true;$('approved').dispatchEvent(new w.Event('change'));
  const first=w.document.querySelector('.editor'),quantity=[...first.querySelectorAll('label')].find(l=>l.textContent==='Number of objects');const input=w.document.getElementById(quantity.htmlFor);input.value='5';input.dispatchEvent(new w.Event('input'));
  assert.equal($('approved').checked,false);assert.equal(first.querySelector('[data-visual-answer]').value,'5');assert.equal(first.querySelector('[data-visual-answer]').readOnly,true);
  $('save').click();const saved=readDrafts(w.localStorage)[0];assert.equal(saved.paper.questions[0].blocks[0].quantity,5);assert.equal(saved.paper.questions[0].answer,'5');assert.equal(saved.paper.questions[1].blocks[0].type,'matching');
  $('tab-student').click();assert.equal($('preview').querySelectorAll('.count-objects')[0].querySelectorAll('svg').length,5);assert.equal($('preview').querySelectorAll('.teacher-answer').length,0);assert.ok($('preview').classList.contains('paper-early'));
  $('restore').click();assert.equal(w.document.querySelectorAll('.block-editor').length,7);assert.equal($('approved').checked,false);
 }finally{dom.window.close();}
});
test('question reordering changes the actual paper order and updates count without losing visuals',async()=>{
 const {dom,w,$}=await setup();try{
  $('early-sample').click();const original=readDrafts(w.localStorage);assert.equal(original.length,0);
  [...w.document.querySelectorAll('button')].find(b=>b.textContent==='Move question 2 up').click();$('save').click();let saved=readDrafts(w.localStorage)[0];assert.equal(saved.paper.questions[0].blocks[0].type,'matching');assert.equal(saved.spec.format,'custom');
  [...w.document.querySelectorAll('button')].find(b=>b.textContent==='Duplicate question 1').click();assert.equal($('count').value,'7');assert.equal($('approved').disabled,true);assert.match($('audit-status').textContent,/Duplicate/);
  [...w.document.querySelectorAll('button')].find(b=>b.textContent==='Remove question 2').click();$('save').click();saved=readDrafts(w.localStorage)[0];assert.equal(saved.spec.count,6);assert.equal(saved.paper.questions[0].blocks[0].type,'matching');
 }finally{dom.window.close();}
});

test('explicit answer-space choice removes extra lines without hiding supplied blocks',async()=>{
 const {dom,w,$}=await setup();try{
  $('early-sample').click();$('tab-student').click();assert.equal($('preview').querySelectorAll('.answer-lines').length,0);
  $('tab-edit').click();const choices=[...w.document.querySelectorAll('.visual-editor select')].filter(s=>s.previousElementSibling?.textContent==='Default answer space');choices[5].value='auto';choices[5].dispatchEvent(new w.Event('change'));$('tab-student').click();assert.equal($('preview').querySelectorAll('.answer-lines').length,1);assert.equal($('preview').querySelectorAll('.count-objects').length,2);
 }finally{dom.window.close();}
});

test('printing refuses an embedded picture that failed to decode',async()=>{
 const draft=validateDraft({spec:sampleSpec,paper:structuredClone(samplePaper)});draft.paper.questions[0].blocks=[{type:'image',src:'data:image/png;base64,iVBORw0KGgo=',alt:'Broken imported picture',size:'small',crop:'fit',caption:''}];
 const {dom,w,$}=await setup(null,`/create?draft=${draft.id}`,[draft]);try{
  let prints=0;w.print=()=>prints++;$('tab-student').click();$('approved').checked=true;$('approved').dispatchEvent(new w.Event('change'));$('print').click();await new Promise(r=>setTimeout(r,10));
  assert.equal(prints,0);assert.match($('error').textContent,/picture.*not ready/i);
 }finally{dom.window.close();}
});

test('document editing updates section, individual marks, totals and preserves them in device drafts',async()=>{
 const {dom,w,$}=await setup();try{
 $('early-sample').click();const first=$('preview').querySelector('.editor'),marks=[...first.querySelectorAll('label')].find(l=>l.textContent==='Total marks for this question'),input=w.document.getElementById(marks.htmlFor);input.value='5';input.dispatchEvent(new w.Event('input',{bubbles:true}));
 const section=[...first.querySelectorAll('label')].find(l=>l.textContent==='Start a new exam section here'),check=w.document.getElementById(section.htmlFor);check.checked=true;check.dispatchEvent(new w.Event('change',{bubbles:true}));
 $('tab-student').click();assert.match($('preview').textContent,/10 marks/);assert.match($('preview').querySelector('.exam-section').textContent,/Section A/);$('save').click();const saved=readDrafts(w.localStorage)[0];assert.equal(saved.paper.markingMode,'individual');assert.equal(saved.paper.questions[0].marks,5);assert.equal(saved.paper.questions[0].section.title,'Section A');
 }finally{dom.window.close();}
});

test('question bank dialog saves reviewed content without changing paper review status',async()=>{
 const {dom,w,$}=await setup();try{w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};$('early-sample').click();const button=[...w.document.querySelectorAll('.question-bank-actions button')][0];button.click();const dialog=w.document.querySelector('.bank-dialog'),topic=[...dialog.querySelectorAll('label')].find(l=>l.textContent==='Topic');w.document.getElementById(topic.htmlFor).value='Counting';dialog.querySelector('input[type=checkbox]').checked=true;dialog.querySelector('form').dispatchEvent(new w.Event('submit',{cancelable:true}));assert.equal(readBank(w.localStorage).length,1);assert.equal(readBank(w.localStorage)[0].topic,'Counting');assert.equal(w.document.querySelector('.bank-dialog'),null);assert.match($('live-status').textContent,/saved to your device bank/);
 }finally{dom.window.close();}
});

test('Exam and Test presets change fresh generation settings without imposing a live-test flow',async()=>{const {dom,w,$}=await setup();try{$('assessmentMode').value='exam';$('assessmentMode').dispatchEvent(new w.Event('change'));assert.equal($('minutes').value,'60');assert.equal($('count').value,'12');$('assessmentMode').value='test';$('assessmentMode').dispatchEvent(new w.Event('change'));assert.equal($('minutes').value,'20');assert.equal($('count').value,'6');}finally{dom.window.close();}});
test('reference generation submits saved source evidence without requiring pasted notes',async()=>{let request;const {dom,w,$}=await setup(async(url,options)=>{request=JSON.parse(options.body);return {ok:true,json:async()=>({paper:samplePaper,model:'test'})};},'/create',[{id:'reference-fixture',spec:sampleSpec,paper:samplePaper}]);try{$('source-mode').value='references';$('source-mode').dispatchEvent(new w.Event('change'));assert.equal($('notes').required,false);assert.equal($('notes').disabled,true);assert.equal($('notes').value,'');const reference=$('reference-list').querySelector('input');assert.ok(reference);reference.checked=true;reference.dispatchEvent(new w.Event('change'));$('assessment-form').dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,10));assert.equal(request.sourceMode,'references');assert.equal(request.notes,sampleSpec.notes);assert.equal(request.referenceQuestions.length,1);assert.match($('live-status').textContent,/draft is ready/);assert.equal($('approved').checked,false);$('source-mode').value='notes';$('source-mode').dispatchEvent(new w.Event('change'));assert.equal($('notes').required,true);assert.equal($('notes').disabled,false);}finally{dom.window.close();}});

test('visible logo upload before generation stays local and survives both copies, saving, restore and removal',async()=>{
 let sent;const {dom,w,$}=await setup(async(url,options)=>{sent=JSON.parse(options.body);return {ok:true,json:async()=>({paper:samplePaper,model:'mock'})};});
 const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1sAAAAASUVORK5CYII=';
 try{
  const button=[...$('paper-logo').querySelectorAll('button')].find(b=>b.textContent==='Upload school logo');assert.ok(button);assert.equal(button.type,'button');
  const upload=$('paper-logo').querySelector('input[type=file]');let opened=false;upload.click=()=>{opened=true;};button.click();assert.ok(opened);
  w.createImageBitmap=async()=>({width:1,height:1,close(){}});w.HTMLCanvasElement.prototype.getContext=()=>({fillRect(){},drawImage(){}});w.HTMLCanvasElement.prototype.toDataURL=()=>png;
  const data=Buffer.from(png.split(',')[1],'base64');Object.defineProperty(upload,'files',{value:[{type:'image/png',size:data.length,arrayBuffer:async()=>data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength)}],configurable:true});
  upload.dispatchEvent(new w.Event('change'));await new Promise(r=>setTimeout(r,10));assert.match($('paper-logo').textContent,/Logo added/);
  $('sample-notes').click();$('assessment-form').dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,10));assert.equal(JSON.stringify(sent).includes('data:image'),false);
  for(const copy of ['student','teacher']){$(`tab-${copy}`).click();assert.equal($('preview').querySelector('.school-logo')?.src,png);}
  $('save').click();$('restore').click();$('tab-student').click();assert.equal($('preview').querySelector('.school-logo')?.src,png);
  $('approved').checked=true;$('approved').dispatchEvent(new w.Event('change'));[...$('paper-logo').querySelectorAll('button')].find(b=>b.textContent==='Remove logo').click();assert.equal($('approved').checked,false);assert.equal($('preview').querySelector('.school-logo'),null);
 }finally{dom.window.close();}
});

test('selected term lessons hand off together without generating automatically or changing the library',async()=>{
 let sent;const notes=[1,2].map(week=>validateLesson({year:'2026/2027',level:sampleSpec.level,subject:sampleSpec.subject,term:'1',week,topic:`Topic ${week}`,body:sampleSpec.notes}));
 const {dom,w,$}=await setup(async(url,options)=>{sent=JSON.parse(options.body);return {ok:true,json:async()=>({paper:samplePaper,model:'mock'})};},'/create?lessons=1',undefined,notes);
 try{assert.equal(sent,undefined);assert.match($('notes').value,/LESSON: Topic 1/);assert.match($('notes').value,/LESSON: Topic 2/);assert.match($('notes').value,/2026\/2027/);assert.match($('live-status').textContent,/2 saved lessons loaded/);assert.equal(w.sessionStorage.getItem(LESSON_TRANSFER_KEY),null);$('assessment-form').dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,15));assert.match(sent.notes,/Topic 2/);assert.equal(readLessons(w.localStorage).length,2);$('tab-student').click();assert.match($('preview').textContent,/First term/);}finally{dom.window.close();}
});


test('cloud lesson selection checks saved versions again before loading assessment sources',async()=>{const notes=[{...validateLesson({year:'2026/2027',level:'SS1',subject:'Chemistry',term:'1',week:1,topic:'Cloud elements',body:sampleSpec.notes}),version:1}];let result=await setup(undefined,'/create?lessons=1',undefined,notes,notes);try{assert.match(result.$('notes').value,/Cloud elements/);assert.match(result.$('live-status').textContent,/1 saved lessons loaded/);assert.equal(result.w.sessionStorage.getItem(LESSON_TRANSFER_KEY),null);}finally{result.dom.window.close();}result=await setup(undefined,'/create?lessons=1',undefined,notes,[{...notes[0],version:2}]);try{assert.match(result.$('error').textContent,/cloud lessons changed/);assert.ok(result.w.sessionStorage.getItem(LESSON_TRANSFER_KEY));assert.equal(result.$('notes').value,'');}finally{result.dom.window.close();}});

test('topic source sends no notes, restores settings, retains visual tools and keeps rationales teacher-only',async()=>{
 let sent;const {dom,w,$}=await setup(async(url,options)=>{sent=JSON.parse(options.body);const paper=structuredClone(samplePaper);for(const q of paper.questions){q.marks=sent.marksEach;q.marking=[{point:q.answer,marks:sent.marksEach}];q.evidence='';q.grounding='topic';q.rationale='Independently check the chemical definition and expected answer.';}return {ok:true,json:async()=>({paper,model:'mock-gemma'})};});
 try{
  $('notes').value='Private inactive source material that must not be sent';$('source-mode').value='topic';$('source-mode').dispatchEvent(new w.Event('change'));
  assert.equal($('notes').disabled,true);assert.equal($('notes').required,false);assert.equal($('topic-entry').hidden,false);assert.equal($('topicInstructions').required,true);
  $('educationStage').value='undergraduate';$('educationStage').dispatchEvent(new w.Event('change'));$('level').value='First-year chemistry';$('topicInstructions').value='Assess elements, compounds and mixtures with definitions and application questions.';
  $('assessment-form').dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,10));assert.equal(sent.sourceMode,'topic');assert.equal(sent.educationStage,'undergraduate');assert.equal(sent.notes,'');assert.match(sent.topicInstructions,/elements/);
  assert.match($('preview').textContent,/not verified source evidence/);assert.ok([...$('preview').querySelectorAll('label')].some(x=>x.textContent==='Answer rationale / teacher verification notes'));assert.match($('preview').textContent,/Pictures, tables/);
  $('save').click();$('restore').click();assert.equal($('source-mode').value,'topic');assert.equal($('topicInstructions').disabled,false);assert.equal($('notes').disabled,true);assert.equal($('educationStage').value,'undergraduate');
  $('tab-student').click();assert.equal($('preview').textContent.includes('Independently check the chemical'),false);$('tab-teacher').click();assert.match($('preview').textContent,/Topic-generated · Not source-verified/);
  $('educationStage').value='early';$('educationStage').dispatchEvent(new w.Event('change'));assert.equal($('presentation').value,'early');$('topic-example').click();assert.match($('topicInstructions').value,/Count objects/);
  $('source-mode').value='notes';$('source-mode').dispatchEvent(new w.Event('change'));assert.equal($('topicInstructions').disabled,true);assert.equal($('notes').required,true);
 }finally{dom.window.close();}
});

test('education stage changes apply coherent defaults, preserve written work and respect Exam/Test',async()=>{const {dom,w,$}=await setup();try{
 const change=id=>$(id).dispatchEvent(new w.Event('change',{bubbles:true}));
 $('notes').value='My own lesson content must not be replaced when I select a different education stage.';
 $('topicInstructions').value='Use my supplied topic instructions, including the visual tasks I have described.';
 $('formatInstructions').value='My custom format remains available if I select it again.';
 $('educationStage').value='early';change('educationStage');
 assert.equal($('level').value,'Kindergarten');assert.equal($('subject').value,'Early learning');assert.equal($('presentation').value,'early');assert.equal($('format').value,'short');assert.equal($('difficulty').value,'recall');assert.equal($('marksEach').value,'1');assert.equal($('total-marks').textContent,'6 marks');assert.match($('stage-settings-status').textContent,/defaults applied/);
 $('assessmentMode').value='exam';change('assessmentMode');assert.equal($('count').value,'10');assert.equal($('minutes').value,'30');assert.match($('mode-hint').textContent,/Nursery/);
 $('educationStage').value='primary';change('educationStage');assert.equal($('level').value,'Primary 4');assert.equal($('subject').value,'Basic Science');assert.equal($('presentation').value,'primary');assert.equal($('count').value,'12');assert.equal($('minutes').value,'45');
 $('title').value='My teacher-written paper title';$('subject').value='Mathematics';
 $('educationStage').value='postgraduate';change('educationStage');assert.equal($('level').value,'Postgraduate');assert.equal($('subject').value,'Mathematics');assert.equal($('title').value,'My teacher-written paper title');assert.equal($('minutes').value,'120');assert.equal($('format').value,'short');
 assert.match($('notes').value,/My own lesson/);assert.match($('topicInstructions').value,/my supplied topic/);assert.match($('formatInstructions').value,/My custom format/);
 $('assessmentMode').value='test';change('assessmentMode');assert.equal($('minutes').value,'45');assert.equal($('count').value,'6');
 for(const [stage,level] of [['vocational','Level 1'],['undergraduate','Year 1'],['adult','Adult learners'],['secondary','SS1']]){$('educationStage').value=stage;change('educationStage');assert.equal($('level').value,level);}
 // Loading an existing paper restores its actual settings rather than applying a stage preset.
 $('early-sample').click();assert.equal($('minutes').value,'30');assert.equal($('level').value,'Kindergarten');assert.equal($('preview').querySelectorAll('.question-editor').length,6);
 }finally{dom.window.close();}});

test('visual task controls, object search and stage lesson examples feed the actual request',async()=>{let sent;const {dom,w,$}=await setup(async(url,opts)=>{sent=JSON.parse(opts.body);return {ok:false,json:async()=>({error:'Test stops before model generation.'})};});try{$('educationStage').value='early';$('educationStage').dispatchEvent(new w.Event('change'));assert.equal(w.document.querySelectorAll('[name="visualTask"]:checked').length,5);$('stage-lesson-example').click();assert.equal($('level').value,'Kindergarten');assert.match($('notes').value,/Counting: one apple/);assert.equal($('source-mode').value,'notes');$('visual-object-search').value='car';$('visual-object-search').dispatchEvent(new w.Event('input'));const car=w.document.querySelector('[name="visualObject"][value="car"]');assert.equal(car.parentElement.hidden,false);assert.equal(w.document.querySelector('[name="visualObject"][value="apple"]').parentElement.hidden,true);car.checked=true;car.dispatchEvent(new w.Event('change'));$('assessment-form').dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,10));assert.equal(sent.visualTasks.length,5);assert.deepEqual(sent.visualObjects,['car']);assert.equal(sent.format,'short');assert.equal(sent.visualTask,undefined);$('educationStage').value='postgraduate';$('educationStage').dispatchEvent(new w.Event('change'));$('stage-lesson-example').click();assert.match($('notes').value,/No standard deviations/);assert.equal($('level').value,'Postgraduate');assert.equal(w.document.querySelectorAll('[name="visualTask"]:checked').length,1);}finally{dom.window.close();}});
