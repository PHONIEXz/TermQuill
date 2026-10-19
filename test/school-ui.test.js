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
const script=(await readFile(new URL('../public/school.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'');
const school={id:'s1',name:'School <script>unsafe()</script>',role:'principal'};
async function setup(path,handler){const dom=new JSDOM(html,{url:`https://lessonpress.test${path}`,runScripts:'outside-only'});const w=dom.window;Object.assign(w,{structuredClone,validateDraft,...locationHelpers});installVisuals(w);w.confirm=()=>true;w.fetch=async(url,opts)=>{const out=await handler(url,opts?.body?JSON.parse(opts.body):null);return {ok:out.status!==403,json:async()=>out.body||out};};w.eval(script);await new Promise(r=>setTimeout(r,25));return {dom,w,$:id=>w.document.getElementById(id)};}
const dashboard={verification:{status:'verified'},departments:[{id:'d1',name:'Science'}],members:[],invitations:[],audit:[],papers:[]};
function signedHandler(extra){return (url,body)=>url==='/api/account'?{user:{id:'u1',email:'teacher@example.com'}}:body.action==='bootstrap'?{schools:[school]}:body.action==='dashboard'?dashboard:extra?.(body)||{};}
test('school sign in is shown without exposing workspace content',async()=>{const {dom,$}=await setup('/school',()=>({user:null}));try{assert.equal($('account-panel').hidden,false);assert.equal($('signed-panel').hidden,true);assert.match($('school-status').textContent,/Sign in/);}finally{dom.window.close();}});
test('school overview escapes names and provides genuine page navigation',async()=>{const {dom,w,$}=await setup('/school',signedHandler());try{assert.equal($('workspace-panel').hidden,false);assert.match($('school-heading').textContent,/<script>/);assert.equal($('school-heading').querySelector('script'),null);assert.equal(w.document.querySelector('[data-view=library]').getAttribute('href'),'/school/library?school=s1');assert.match($('school-content').textContent,/School activity/);}finally{dom.window.close();}});
test('paper views keep answers off the student copy and require review before print',async()=>{const content={spec:sampleSpec,paper:samplePaper,sample:true};const {dom,w,$}=await setup('/school/paper?school=s1&paper=p1',signedHandler(()=>({id:'p1',author_id:'u1',department_id:'d1',status:'approved',revision:2,current_revision:2,approved_revision:2,content,versions:[{revision:2,created_at:new Date().toISOString()}],reviews:[]})));try{const paper=w.document.querySelector('.school-print');assert.equal(paper.querySelectorAll('.school-evidence').length,0);assert.equal(paper.querySelectorAll('strong').length,0);const marking=[...w.document.querySelectorAll('button')].find(b=>b.textContent==='Marking guide');marking.click();await new Promise(r=>setTimeout(r,10));assert.ok(paper.textContent.includes(samplePaper.questions[0].answer));const print=[...w.document.querySelectorAll('button')].find(b=>b.textContent==='Print / PDF');assert.equal(print.disabled,true);const check=w.document.querySelector('.school-toolbar input[type=checkbox]');check.checked=true;check.dispatchEvent(new w.Event('change'));assert.equal(print.disabled,false);const student=[...w.document.querySelectorAll('button')].find(b=>b.textContent==='Student copy');student.click();await new Promise(r=>setTimeout(r,10));assert.equal(print.disabled,true);assert.equal(paper.textContent.includes('Lesson evidence:'),false);}finally{dom.window.close();}});
test('invitation token is removed from the address and retained only for acceptance',async()=>{const {dom,w,$}=await setup('/school?invite=one-time-token',()=>({user:null}));try{assert.equal(w.location.search,'');assert.equal(w.sessionStorage.getItem('lessonpress.invite'),'one-time-token');assert.match($('school-status').textContent,/invited email/);}finally{dom.window.close();}});

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
 const early=earlyYearsSample();const content={spec:early.spec,paper:early.paper,sample:true};let saved;
 const {dom,w,$}=await setup('/school/paper?school=s1&paper=p1',signedHandler(body=>{
  if(body.action==='save_paper'){saved=body.payload.content;return {id:'p1',revision:2};}
  return {id:'p1',author_id:'u1',department_id:'d1',status:'draft',revision:1,current_revision:1,approved_revision:null,content,versions:[{revision:1,created_at:new Date().toISOString()}],reviews:[]};
 }));
 try{
  const paper=w.document.querySelector('.school-print');assert.equal(paper.querySelectorAll('.count-objects')[0].querySelectorAll('svg').length,3);assert.ok(!paper.textContent.includes('1–B: Circle'));
  const find=t=>[...w.document.querySelectorAll('button')].find(b=>b.textContent===t);find('Marking guide').click();await new Promise(r=>setTimeout(r,10));assert.match(paper.textContent,/1–B: Circle/);
  find('Edit a new version').click();await new Promise(r=>setTimeout(r,10));
  const label=[...w.document.querySelectorAll('label')].find(l=>l.textContent==='Number of objects'),input=w.document.getElementById(label.htmlFor);input.value='4';input.dispatchEvent(new w.Event('input'));
  const form=[...w.document.querySelectorAll('form')].find(f=>f.textContent.includes('Edit a new paper version'));form.dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,15));
  assert.equal(saved.paper.questions[0].answer,'4');assert.equal(saved.paper.questions[0].blocks[0].quantity,4);assert.equal(saved.paper.questions[1].blocks[0].type,'matching');assert.equal(saved.paper.layout.preset,'early');
 }finally{dom.window.close();}
});
