import {earlyYearsSample} from '../lib/early-years.js';
import {installVisuals} from './visual-helpers.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import * as locationHelpers from '../lib/location.js';
import {validateDraft} from '../lib/drafts.js';
import {sampleSpec,samplePaper} from '../lib/sample.js';
const html=await readFile(new URL('../public/school.html',import.meta.url),'utf8');
const shellScript=await readFile(new URL('../public/app-shell.js',import.meta.url),'utf8');
const script=(await readFile(new URL('../public/school.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'');
const school={id:'s1',name:'School <script>unsafe()</script>',role:'principal'};
async function setup(path,handler){const dom=new JSDOM(html,{url:`https://lessonpress.test${path}`,runScripts:'outside-only'});const w=dom.window;Object.assign(w,{structuredClone,validateDraft,...locationHelpers});installVisuals(w);w.confirm=()=>true;w.fetch=async(url,opts)=>{const out=await handler(url,opts?.body?JSON.parse(opts.body):null);return {ok:out.status!==403,json:async()=>out.body||out};};w.personalContext=async()=>{const out=await handler('/api/account');if(!(out.body||out).user)throw new Error('Sign in with the invited email to join your school.');return {user:(out.body||out).user,local:w.localStorage,session:w.sessionStorage};};w.accountRequest=async body=>{const out=await handler('/api/account',body);return out.body||out;};w.eval(shellScript);w.eval(script);await new Promise(r=>setTimeout(r,25));return {dom,w,$:id=>w.document.getElementById(id)};}
const dashboard={verification:{status:'verified'},departments:[{id:'d1',name:'Science'}],members:[],invitations:[],audit:[],papers:[]};
function signedHandler(extra){return (url,body)=>url==='/api/account'?{user:{id:'u1',email:'teacher@example.com'}}:body.action==='bootstrap'?{schools:[school]}:body.action==='dashboard'?dashboard:extra?.(body)||{};}
test('school sign in is shown without exposing workspace content',async()=>{const {dom,$}=await setup('/school',()=>({user:null}));try{assert.equal($('account-panel').hidden,true);assert.equal($('signed-panel').hidden,true);assert.match($('school-error').textContent,/Sign in/);}finally{dom.window.close();}});
test('school overview escapes names and provides genuine page navigation',async()=>{const {dom,w,$}=await setup('/school',signedHandler());try{assert.equal($('workspace-panel').hidden,false);assert.match($('school-role').textContent,/<script>/);assert.equal($('school-role').querySelector('script'),null);assert.equal(w.document.querySelector('[data-view=library]').getAttribute('href'),'/school/library?school=s1');assert.match($('school-content').textContent,/School activity/);}finally{dom.window.close();}});
test('paper views keep answers off the student copy and require review before print',async()=>{const content={spec:sampleSpec,paper:samplePaper,sample:true};const {dom,w,$}=await setup('/school/paper?school=s1&paper=p1',signedHandler(()=>({id:'p1',author_id:'u1',department_id:'d1',status:'approved',revision:2,current_revision:2,approved_revision:2,content,versions:[{revision:2,created_at:new Date().toISOString()}],reviews:[]})));try{const paper=w.document.querySelector('.school-print');assert.equal(paper.querySelectorAll('.school-evidence').length,0);assert.equal(paper.querySelectorAll('strong').length,0);const marking=[...w.document.querySelectorAll('button')].find(b=>b.textContent==='Marking guide');marking.click();await new Promise(r=>setTimeout(r,10));assert.ok(paper.textContent.includes(samplePaper.questions[0].answer));const print=[...w.document.querySelectorAll('button')].find(b=>b.textContent==='Print / PDF');assert.equal(print.disabled,true);const check=w.document.querySelector('.school-toolbar input[type=checkbox]');check.checked=true;check.dispatchEvent(new w.Event('change'));assert.equal(print.disabled,false);const student=[...w.document.querySelectorAll('button')].find(b=>b.textContent==='Student copy');student.click();await new Promise(r=>setTimeout(r,10));assert.equal(print.disabled,true);assert.equal(paper.textContent.includes('Lesson evidence:'),false);}finally{dom.window.close();}});
test('invitation token is removed from the address and retained only for acceptance',async()=>{const {dom,w,$}=await setup('/school?invite=one-time-token',()=>({user:null}));try{assert.equal(w.location.search,'');assert.equal(w.sessionStorage.getItem('lessonpress.invite'),'one-time-token');assert.match($('school-error').textContent,/invited email/);}finally{dom.window.close();}});

test('email confirmation fragments are discarded instead of trusting URL credentials',async()=>{const {dom,w}=await setup('/school#access_token=discarded&refresh_token=discarded',()=>({user:null}));try{assert.equal(w.location.hash,'');assert.equal(w.sessionStorage.length,0);}finally{dom.window.close();}});


test('a principal can create a department directly from the empty library, then choose it for a paper',async()=>{
 const state={...dashboard,departments:[]};const calls=[];
 const handler=(url,body)=>{
  if(url==='/api/account')return {user:{id:'u1',email:'principal@example.com'}};
  if(body.action==='bootstrap')return {schools:[school]};
  if(body.action==='dashboard')return state;
  if(body.action==='create_department'){calls.push(body.payload);state.departments=[{id:'science',name:body.payload.name}];return {id:'science'};}
  return {};
 };
 const {dom,w,$}=await setup('/school/library?school=s1',handler);
 try{
  const toggle=w.document.querySelector('[data-action=create-department]');assert.ok(toggle);assert.equal(toggle.getAttribute('aria-expanded'),'false');
  toggle.click();await new Promise(r=>setTimeout(r,10));const f=$('department-form');assert.equal(f.hidden,false);assert.equal(toggle.getAttribute('aria-expanded'),'true');
  const input=f.querySelector('input');assert.equal(w.document.activeElement,input);input.value='Science';f.dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,25));
  assert.equal(calls.length,1);assert.equal(calls[0].school_id,'s1');assert.equal(calls[0].name,'Science');assert.match($('school-status').textContent,/Science.*ready/);
  assert.ok([...w.document.querySelectorAll('option')].some(o=>o.value==='science'));
  assert.equal(w.document.querySelector('.school-import').open,false);
 }finally{dom.window.close();}
});
test('department controls stay restricted to principals and a department head gets guidance',async()=>{
 const {dom,w,$}=await setup('/school/team', (url,body)=>url==='/api/account'?{user:{id:'u1',email:'hod@example.com'}}:body.action==='bootstrap'?{schools:[{...school,role:'hod'}]}:dashboard);
 try{assert.equal(w.document.querySelector('[data-action=create-department]'),null);assert.match($('school-content').textContent,/principal manages/);}finally{dom.window.close();}
});

test('invitation form starts with a safe teacher role and an available department',async()=>{
 const {dom,w}=await setup('/school/team',signedHandler());
 try{const f=[...w.document.querySelectorAll('form')].find(f=>f.textContent.includes('Give a colleague access'));assert.ok(f);const selects=f.querySelectorAll('select');assert.equal(selects[0].value,'teacher');assert.equal(selects[1].value,'d1');assert.match(f.textContent,/Only that address can accept/);}finally{dom.window.close();}
});

test('unverified schools get clear guidance and cannot create invitations from the UI',async()=>{
 const state={...dashboard,verification:{status:'unverified'}};
 const {dom,w,$}=await setup('/school/team', (url,body)=>url==='/api/account'?{user:{id:'u1',email:'principal@example.com'}}:body.action==='bootstrap'?{schools:[school]}:state);
 try{assert.equal([...w.document.querySelectorAll('form')].some(f=>f.textContent.includes('Give a colleague access')),false);assert.match($('school-content').textContent,/independent school verification/);assert.ok([...w.document.querySelectorAll('a')].some(a=>a.href.includes('/school/trust')));}finally{dom.window.close();}
});
test('trust page submits a request without self-approval and filters safely rendered activity',async()=>{
 const calls=[];let requested=false;
 const {dom,w,$}=await setup('/school/trust?school=s1',(url,body)=>{
  if(url==='/api/account')return {user:{id:'u1',email:'principal@example.com'}};
  if(body.action==='bootstrap')return {schools:[school]};
  if(body.action==='dashboard')return {...dashboard,verification:{status:requested?'pending':'unverified'}};
  if(body.action==='verification_request'){calls.push(body);requested=true;return {status:'pending'};}
  if(body.action==='audit_list')return {events:[{id:'1',action:'save_paper',actor_label:'person<script>@school.test',paper_id:'p1',paper_title:'Chemistry <script>',detail:{revision:2},created_at:new Date().toISOString()}],next_before:null};return {};
 });
 try{assert.match($('school-content').textContent,/Not yet verified/);assert.equal($('school-content').querySelector('script'),null);assert.match($('school-content').textContent,/Version 2/);
 const search=w.document.querySelector('input[type=search]');search.value='nonexistent';search.dispatchEvent(new w.Event('input'));assert.match($('school-content').textContent,/0 matching records/);
 const form=[...w.document.querySelectorAll('form')].find(f=>f.querySelector('h3')?.textContent==='Request an independent check');form.querySelector('input[type=url]').value='https://school.example/about';form.querySelector('textarea').value='Principal; confirm through the public office contact listed on our website.';form.dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,30));assert.equal(calls.length,1);assert.equal(calls[0].payload.school_id,'s1');assert.equal(calls[0].payload.status,undefined);assert.match($('school-content').textContent,/Verification requested/);assert.match($('school-content').textContent,/approval is not automatic/);
 }finally{dom.window.close();}
});
test('staff trust page shows status without requesting the school activity log',async()=>{
 const calls=[];const {dom,$}=await setup('/school/trust',(url,body)=>{if(url==='/api/account')return {user:{id:'u2',email:'teacher@example.com'}};calls.push(body.action);return body.action==='bootstrap'?{schools:[{...school,role:'teacher'}]}:{...dashboard,verification:{status:'pending'}};});try{assert.match($('school-content').textContent,/Verification requested/);assert.equal(calls.includes('audit_list'),false);assert.match($('school-content').textContent,/available to the principal/);}finally{dom.window.close();}
});

test('printing records the authorised version and chosen copy before opening the dialog',async()=>{
 const calls=[];const content={spec:sampleSpec,paper:samplePaper,sample:true};const paper={id:'p1',author_id:'u1',department_id:'d1',status:'approved',revision:2,current_revision:2,approved_revision:2,content,versions:[{revision:2,created_at:new Date().toISOString()}],reviews:[]};
 const {dom,w,$}=await setup('/school/paper?school=s1&paper=p1',signedHandler(body=>{calls.push(body);return body.action==='print_request'?{ok:true}:paper;}));let printed=false;w.print=()=>{printed=true;assert.equal(calls.at(-1).action,'print_request');};
 try{[...w.document.querySelectorAll('button')].find(b=>b.textContent==='Marking guide').click();await new Promise(r=>setTimeout(r,10));const check=w.document.querySelector('.school-toolbar input[type=checkbox]');check.checked=true;check.dispatchEvent(new w.Event('change'));[...w.document.querySelectorAll('button')].find(b=>b.textContent==='Print / PDF').click();await new Promise(r=>setTimeout(r,15));assert.equal(printed,true);assert.deepEqual(JSON.parse(JSON.stringify(calls.at(-1).payload)),{school_id:'s1',paper_id:'p1',revision:2,copy:'teacher'});assert.match($('school-status').textContent,/does not confirm a completed print/);}finally{dom.window.close();}
});

test('school location stays private by default, requires confirmation and saves only a reviewed point',async()=>{
 const calls=[];let saved=null;const state={...dashboard,verification:{status:'unverified'}};
 const {dom,w,$}=await setup('/school/location',(url,body)=>{if(url==='/api/account')return {user:{id:'u1',email:'principal@example.com'}};if(body.action==='bootstrap')return {schools:[school]};if(body.action==='dashboard')return state;if(body.action==='place_get')return {location:saved};if(body.action==='place_save'){calls.push(body.payload);saved={...body.payload,version:1,updated_at:new Date().toISOString()};return {location:saved};}return {};});
 try{let f=[...w.document.querySelectorAll('form')].find(f=>f.querySelector('h3')?.textContent==='Choose your school point');assert.ok(f);const checks=f.querySelectorAll('input[type=checkbox]');assert.equal(checks[1].checked,false);assert.equal(checks[1].disabled,true);const labels=[...f.querySelectorAll('label')];const input=label=>w.document.getElementById(labels.find(l=>l.textContent===label).htmlFor);input('Town or area').value='Test town';input('School latitude').value='6.543219';input('School longitude').value='3.332211';f.dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,10));assert.equal(calls.length,0);assert.match($('school-error').textContent,/Confirm/);checks[0].checked=true;f.dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,25));assert.equal(calls.length,1);assert.equal(calls[0].public_listing,false);assert.equal(calls[0].source,'manual');assert.equal(calls[0].confirmed_school,true);assert.equal(calls[0].expected_version,0);assert.match($('school-status').textContent,/saved privately/);assert.equal(w.localStorage.getItem('latitude'),null);}finally{dom.window.close();}
});


test('school illustrated copies and editing preserve blocks and separate answer keys',async()=>{
 const early=earlyYearsSample();early.paper.layout.logo='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1sAAAAASUVORK5CYII=';const content={spec:early.spec,paper:early.paper,sample:true};let saved;
 const {dom,w,$}=await setup('/school/paper?school=s1&paper=p1',signedHandler(body=>{
  if(body.action==='save_paper'){saved=body.payload.content;return {id:'p1',revision:2};}
  return {id:'p1',author_id:'u1',department_id:'d1',status:'draft',revision:1,current_revision:1,approved_revision:null,content,versions:[{revision:1,created_at:new Date().toISOString()}],reviews:[]};
 }));
 try{
  w.HTMLElement.prototype.scrollIntoView=()=>{};const paper=w.document.querySelector('.school-print');assert.equal(paper.firstElementChild.className,'paper-image school-logo');assert.equal(paper.querySelectorAll('.count-objects')[0].querySelectorAll('svg').length,3);assert.ok(!paper.textContent.includes('1–B: Circle'));
  const find=t=>[...w.document.querySelectorAll('button')].find(b=>b.textContent===t);find('Marking guide').click();await new Promise(r=>setTimeout(r,10));assert.match(paper.textContent,/1–B: Circle/);assert.equal(paper.querySelector('.school-logo').src,early.paper.layout.logo);
  find('Change school logo').click();await new Promise(r=>setTimeout(r,10));
  assert.equal(w.document.activeElement.className,'outline logo-upload');const label=[...w.document.querySelectorAll('label')].find(l=>l.textContent==='Number of objects'),input=w.document.getElementById(label.htmlFor);input.value='4';input.dispatchEvent(new w.Event('input'));
  const form=[...w.document.querySelectorAll('form')].find(f=>f.textContent.includes('Edit a new paper version'));form.dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,15));
  assert.equal(saved.paper.questions[0].answer,'4');assert.equal(saved.paper.questions[0].blocks[0].quantity,4);assert.equal(saved.paper.questions[1].blocks[0].type,'matching');assert.equal(saved.paper.layout.preset,'early');assert.equal(saved.paper.layout.logo,early.paper.layout.logo);
 }finally{dom.window.close();}
});

test('reviewer progress gates approval, feedback sits beside questions and comparison stays read-only',async()=>{
 const content={spec:sampleSpec,paper:samplePaper,sample:true},old=structuredClone(content);old.paper.questions[0].prompt='Earlier question wording?';const calls=[];const p={id:'p1',author_id:'u2',department_id:'d1',status:'submitted',revision:2,current_revision:2,approved_revision:1,content,versions:[{revision:2,created_at:new Date().toISOString()},{revision:1,created_at:new Date().toISOString()}],reviews:[{decision:'comment',question:2,comment:'Please check this wording.',created_at:new Date().toISOString()}]};
 const {dom,w,$}=await setup('/school/paper?school=s1&paper=p1',signedHandler(body=>{calls.push(body);if(body.action==='paper'&&body.payload.revision===1)return {...p,revision:1,content:old};return p;}));w.HTMLElement.prototype.scrollIntoView=()=>{};
 try{assert.match(w.document.querySelector('#school-question-2 .question-review-notes').textContent,/Please check this wording/);assert.ok(w.document.querySelector('.question-review-notes.no-print'));const f=[...w.document.querySelectorAll('form')].find(f=>f.querySelector('h3')?.textContent==='Review this version');const byLabel=text=>{const l=[...f.querySelectorAll('label')].find(x=>x.textContent===text);return w.document.getElementById(l.htmlFor);};const decision=byLabel('Decision');decision.value='approved';decision.dispatchEvent(new w.Event('change'));assert.equal(f.querySelector('button[type=submit]').disabled,true);const checks=w.document.querySelectorAll('[data-review-question]');checks.forEach(c=>{c.checked=true;c.dispatchEvent(new w.Event('change'));});assert.match(w.document.querySelector('.review-progress').textContent,/6 of 6/);const final=f.querySelector('input[type=checkbox]');final.checked=true;final.dispatchEvent(new w.Event('change'));assert.equal(f.querySelector('button[type=submit]').disabled,false);[...w.document.querySelectorAll('button')].find(b=>b.textContent==='Give feedback on Question 2').click();assert.equal(byLabel('Question number (optional)').value,'2');[...w.document.querySelectorAll('button')].find(b=>b.textContent==='Show comparison').click();await new Promise(r=>setTimeout(r,20));assert.match(w.document.querySelector('.revision-comparison').textContent,/Earlier question wording/);assert.equal(calls.filter(x=>x.action==='save_paper'||x.action==='review').length,0);assert.equal(calls.at(-1).payload.revision,1);checks[0].checked=false;checks[0].dispatchEvent(new w.Event('change'));assert.equal(f.querySelector('button[type=submit]').disabled,true);
 }finally{dom.window.close();}
});
test('approved-copy link and printed status distinguish a new draft from its approved version',async()=>{const p={id:'p1',author_id:'u1',department_id:'d1',status:'draft',revision:2,current_revision:2,approved_revision:1,content:{spec:sampleSpec,paper:samplePaper},versions:[{revision:2,created_at:new Date().toISOString()},{revision:1,created_at:new Date().toISOString()}],reviews:[]};const {dom,w}=await setup('/school/paper?school=s1&paper=p1',signedHandler(()=>p));try{assert.equal(w.document.querySelector('.approved-copy-link').getAttribute('href'),'/school/paper?school=s1&paper=p1&revision=1');assert.match(w.document.querySelector('.school-print').textContent,/DRAFT \/ NOT SCHOOL-APPROVED/);assert.equal(w.document.querySelector('.review-progress'),null);}finally{dom.window.close();}});

test('school bank reads only approved versions and submits source identifiers instead of client-authored answers',async()=>{const pid='00000000-0000-4000-8000-000000000002',uid='00000000-0000-4000-8000-000000000003',calls=[],meta={id:pid,author_id:uid,department_id:'d1',status:'draft',revision:2,approved_revision:1,title:sampleSpec.title,subject:sampleSpec.subject,level:sampleSpec.level};const {dom,w,$}=await setup('/school/bank',(url,body)=>{if(url==='/api/account')return {user:{id:'u1',email:'reviewer@example.com'}};if(body.action==='bootstrap')return {schools:[school]};if(body.action==='dashboard')return {...dashboard,papers:[meta]};calls.push(body);if(body.action==='school_bank_catalogue')return {papers:[{...meta,revision:1}],nextOffset:null,total:1,skipped:0};if(body.action==='assemble_school_paper')return {id:'new-paper'};return {...meta,revision:1,current_revision:2,content:{spec:sampleSpec,paper:samplePaper},versions:[],reviews:[]};});w.HTMLElement.prototype.scrollIntoView=()=>{};try{[...w.document.querySelectorAll('button')].find(b=>b.textContent==='Open approved questions').click();await new Promise(r=>setTimeout(r,20));assert.equal(calls.find(x=>x.action==='paper').payload.revision,1);const checks=w.document.querySelectorAll('.school-bank-question input[type=checkbox]');assert.equal(checks.length,6);for(const c of [...checks].slice(0,3)){c.checked=true;c.dispatchEvent(new w.Event('change'));}w.document.getElementById('school-bank-title').value='Reused school examination';w.document.querySelector('.school-bank-composer').dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,20));const sent=calls.find(x=>x.action==='assemble_school_paper');assert.ok(sent);assert.equal(sent.payload.selections.length,3);assert.deepEqual(Object.keys(sent.payload.selections[0]).sort(),['paper_id','question','revision']);assert.equal(sent.payload.content,undefined);assert.match($('school-content').textContent,/Source credit/);}finally{dom.window.close();}});

test('dashboard counts accessible papers honestly and links recent work without leaking answers',async()=>{
 const papers=[
  {id:'p1',title:'Newest <script>unsafe()</script>',subject:'Chemistry',level:'SS1',status:'draft',approved_revision:1,revision:2,updated_at:'2026-10-19T10:00:00Z'},
  {id:'p2',title:'Waiting paper',subject:'Science',level:'Basic 4',status:'submitted',revision:1,updated_at:'2026-10-18T10:00:00Z'},
  {id:'p3',title:'Approved paper',subject:'Science',level:'Basic 4',status:'approved',approved_revision:1,revision:1,updated_at:'2026-10-17T10:00:00Z'},
  {id:'p4',title:'Needs work',subject:'Science',level:'Basic 4',status:'changes_requested',revision:1,updated_at:'2026-10-16T10:00:00Z'}
 ];const {dom,w,$}=await setup('/school?school=s1',(url,body)=>url==='/api/account'?{user:{id:'u1',email:'teacher@example.com'}}:body.action==='bootstrap'?{schools:[school]}:{...dashboard,papers});
 try{
  assert.deepEqual([...w.document.querySelectorAll('.dashboard-stat strong')].map(n=>n.textContent),['4','2','1','2']);
  assert.equal(w.document.querySelector('.dashboard-paper-table tbody a').getAttribute('href'),'/school/paper?school=s1&paper=p1');assert.equal($('school-content').querySelector('script'),null);
  assert.equal(w.document.querySelectorAll('.dashboard-queue-item').length,1);assert.match(w.document.querySelector('.dashboard-queue-item').textContent,/Waiting paper/);
  assert.equal(w.document.querySelector('.dashboard-distribution').getAttribute('aria-label'),'Draft: 1; Waiting for review: 1; Changes requested: 1; Approved: 1');
  assert.ok(w.document.body.classList.contains('shell-school-ready'));assert.ok(w.document.querySelector('.app-rail .school-nav'));assert.equal(w.document.querySelector('.school-layout .school-nav'),null);
 }finally{dom.window.close();}
});

test('school topic papers retain rationales in marking guide and editor without showing them on student copies',async()=>{
 const example=earlyYearsSample(),spec={...example.spec,notes:'',sourceMode:'topic',educationStage:'early',topicInstructions:'Assess counting, shapes and letters using familiar visual tasks.'},paper=structuredClone(example.paper);for(const q of paper.questions){q.evidence='';q.grounding='topic';q.rationale='Check the visual task and its expected response independently.';}
 const content={spec,paper},p={id:'p1',author_id:'u1',department_id:'d1',status:'draft',revision:1,current_revision:1,approved_revision:null,content,versions:[{revision:1,created_at:new Date().toISOString()}],reviews:[]};
 const {dom,w}=await setup('/school/paper?school=s1&paper=p1',signedHandler(()=>p));try{
  const copy=w.document.querySelector('.school-print');assert.equal(copy.textContent.includes('Check the visual task'),false);
  [...w.document.querySelectorAll('button')].find(b=>b.textContent==='Marking guide').click();await new Promise(r=>setTimeout(r,10));assert.match(copy.textContent,/Topic-generated · Not source-verified/);assert.equal(copy.textContent.includes('Lesson evidence:'),false);
  [...w.document.querySelectorAll('button')].find(b=>b.textContent==='Edit a new version').click();await new Promise(r=>setTimeout(r,10));assert.ok([...w.document.querySelectorAll('label')].some(l=>l.textContent==='Answer rationale / teacher verification notes'));assert.ok(![...w.document.querySelectorAll('label')].some(l=>l.textContent==='Exact source quote'));
 }finally{dom.window.close();}
});
