import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {validateDraft} from '../lib/drafts.js';
import {sampleSpec,samplePaper} from '../lib/sample.js';
const html=await readFile(new URL('../public/school.html',import.meta.url),'utf8');
const script=(await readFile(new URL('../public/school.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'');
const school={id:'s1',name:'School <script>unsafe()</script>',role:'principal'};
async function setup(path,handler){const dom=new JSDOM(html,{url:`https://lessonpress.test${path}`,runScripts:'outside-only'});const w=dom.window;Object.assign(w,{structuredClone,validateDraft});w.confirm=()=>true;w.fetch=async(url,opts)=>{const out=await handler(url,opts?.body?JSON.parse(opts.body):null);return {ok:out.status!==403,json:async()=>out.body||out};};w.eval(script);await new Promise(r=>setTimeout(r,25));return {dom,w,$:id=>w.document.getElementById(id)};}
const dashboard={departments:[{id:'d1',name:'Science'}],members:[],invitations:[],audit:[],papers:[]};
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
