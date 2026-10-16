import {validateDraft} from '/drafts.js';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search);
// Confirmation links may contain Supabase tokens. Users sign in explicitly; discard the fragment.
if(location.hash)history.replaceState(null,'',location.pathname+location.search);
const view=location.pathname.split('/')[2]||'overview';
let user=null,schools=[],school=null,data=null,openPaper=null,editing=false,dirty=false,working=false;
let invite=params.get('invite')||sessionStorage.getItem('lessonpress.invite');
if(params.has('invite')){sessionStorage.setItem('lessonpress.invite',invite);params.delete('invite');history.replaceState(null,'',location.pathname+(params.size?'?'+params:''));}
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const link=(text,href,cls='school-link')=>{const a=el('a',text,cls);a.href=href;return a;};
function status(text=''){$('school-status').textContent=text;}
function error(text=''){$('school-error').textContent=text;$('school-error').hidden=!text;}
async function request(url,body){const response=await fetch(url,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(25000)});const out=await response.json();if(!response.ok)throw new Error(out.error||'Could not complete this request.');return out;}
const rpc=(action,payload={})=>request('/api/school',{action,payload:{school_id:school?.id,...payload}});
async function run(fn){if(working)return;working=true;error();document.body.setAttribute('aria-busy','true');try{await fn();}catch(e){error(e.name==='TimeoutError'?'The request took too long. Reload to check whether your change was saved.':e.message);status('');}finally{working=false;document.body.removeAttribute('aria-busy');}}
function button(text,fn,cls='outline'){const b=el('button',text,cls);b.type='button';b.addEventListener('click',()=>run(fn));return b;}
function field(form,label,{type='text',value='',max=100,required=true,options}={}){const id=`school-field-${crypto.randomUUID()}`,l=el('label',label);l.htmlFor=id;const n=el(options?'select':type==='textarea'?'textarea':'input');n.id=id;n.required=required;if(options)for(const [v,t] of options){const o=el('option',t);o.value=v;n.append(o);}else{if(type!=='textarea')n.type=type;n.maxLength=max;}n.value=value;form.append(l,n);return n;}
function form(title,fn){const f=el('form',undefined,'school-form');f.append(el('h3',title));f.addEventListener('submit',e=>{e.preventDefault();run(()=>fn(f));});return f;}
function submit(f,text){const b=el('button',text,'primary');b.type='submit';f.append(b);}
function department(id){return data.departments.find(d=>d.id===id)?.name||'Department';}
const date=value=>new Date(value).toLocaleString();
function route(path,extra={}){return path+'?'+new URLSearchParams({school:school.id,...extra});}
async function bootstrap(preferred=params.get('school')||localStorage.getItem('lessonpress.school')){
 const result=await rpc('bootstrap');schools=result.schools;school=schools.find(s=>s.id===preferred)||schools[0]||null;
 const select=$('school-select');select.replaceChildren(el('option',schools.length?'Choose a school':'No schools yet'));select.firstChild.value='';
 for(const s of schools){const o=el('option',s.name);o.value=s.id;select.append(o);}select.value=school?.id||'';
 $('accept-invite').hidden=!invite;
 if(school){localStorage.setItem('lessonpress.school',school.id);await load();}else{$('workspace-panel').hidden=true;status('Create a school, or accept an invitation from your principal.');}
}
async function load(){
 data=await rpc('dashboard');$('workspace-panel').hidden=false;$('school-heading').textContent=school.name;$('school-role').textContent=school.role==='hod'?'Department head':school.role;
 for(const a of document.querySelectorAll('[data-view]')){a.href=route(a.dataset.view==='overview'?'/school':`/school/${a.dataset.view}`);if(a.dataset.view===view)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');}
 const box=$('school-content');box.replaceChildren();status('');
 if(view==='paper')await paperView(box);else if(view==='team')teamView(box);else if(view==='reviews')listView(box,true);else if(view==='library')libraryView(box);else overview(box);
}
function overview(box){
 const stats=el('div',undefined,'school-stats');
 for(const [n,label] of [[data.papers.length,'Papers visible to you'],[data.papers.filter(p=>p.status==='submitted').length,'Awaiting review'],[data.papers.filter(p=>p.approved_revision).length,'Papers with an approved copy']]){const card=el('div',undefined,'school-stat');card.append(el('strong',String(n)),el('span',label));stats.append(card);}box.append(stats);
 const grid=el('div',undefined,'school-grid');for(const [title,text,path] of [['Build a paper','Create from lesson notes, then send the draft to your department.','/create'],['Review together','Leave question-level comments, request changes and approve a version.','/school/reviews']]){const card=el('article',undefined,'school-card');card.append(el('h3',title),el('p',text),link('Open →',path==='/create'?path:route(path)));grid.append(card);}box.append(grid);
 if(school.role==='principal'){box.append(el('h3','School activity'));const list=el('ol',undefined,'school-audit');for(const a of data.audit)list.append(el('li',`${a.action.replaceAll('_',' ')} · ${date(a.created_at)}${a.paper_id?' · Paper '+a.paper_id.slice(0,8):''}`));box.append(list,el('p','Activity records show workflow events. They are not a measure of teaching quality.','micro'));}
}
function listView(box,reviews=false){
 box.append(el('h2',reviews?'Review desk':'Your department’s papers'));
 if(reviews)box.append(el('p',school.role==='teacher'?'Track submissions and requested changes. A department head or principal makes the review decision.':'Review the questions, answers and lesson evidence before approving. Authors cannot approve their own papers.'));
 const toolbar=el('div',undefined,'school-toolbar'),search=el('input');search.type='search';search.placeholder='Search title, subject or class';search.setAttribute('aria-label','Search school papers');toolbar.append(search);const list=el('div',undefined,'school-grid');box.append(toolbar,list);
 function render(){list.replaceChildren();const query=search.value.toLowerCase();const papers=data.papers.filter(p=>(!reviews||['submitted','changes_requested'].includes(p.status))&&`${p.title} ${p.subject} ${p.level}`.toLowerCase().includes(query));
 for(const p of papers){const card=el('article',undefined,'school-card');card.append(el('span',p.status.replaceAll('_',' '),'school-tag'),el('h3',p.title),el('p',`${p.subject} · ${p.level} · ${department(p.department_id)}`),el('p',`Version ${p.revision} · ${date(p.updated_at)}`,'school-muted'),link('Open paper →',route('/school/paper',{paper:p.id})));
 if(p.approved_revision&&p.approved_revision!==p.revision)card.append(el('p'),link(`Open approved version ${p.approved_revision}`,route('/school/paper',{paper:p.id,revision:p.approved_revision})));list.append(card);}
 if(!papers.length)list.append(el('p',reviews?'No papers are awaiting review.':'No papers found. Send a draft from Create assessment, or import a LessonPress JSON draft.','school-empty'));}
 search.addEventListener('input',render);render();
}
function libraryView(box){
 box.append(el('p','Your own drafts stay private to you and reviewers. Approved copies are shared with staff in the department. School principals can oversee every department.'));
 const transfer=sessionStorage.getItem('lessonpress.school-transfer');
 const f=form(transfer?'Send your assessment to this school':'Import an assessment',async()=>{
 let raw;if(transfer)raw=JSON.parse(transfer);else{const file=input.files[0];if(!file)throw new Error('Choose a LessonPress JSON draft.');if(file.size>90000)throw new Error('Choose a JSON draft smaller than 90 KB.');raw=JSON.parse(await file.text());}
 const draft=validateDraft({...raw,id:raw.id||crypto.randomUUID(),savedAt:raw.savedAt||new Date().toISOString()});
 const out=await rpc('save_paper',{department_id:dep.value,content:{spec:draft.spec,paper:draft.paper,sample:draft.sample,model:draft.model}});
 sessionStorage.removeItem('lessonpress.school-transfer');location.href=route('/school/paper',{paper:out.id});
 });
 let input;if(!transfer){input=field(f,'LessonPress JSON file',{type:'file'});input.accept='.json,application/json';}else f.append(el('p','This uploads the assessment and source notes from your current draft. Check the school and department before sending.'));
 const dep=field(f,'Department',{options:[['','Choose a department'],...data.departments.map(d=>[d.id,d.name])]});if(data.departments.length===1)dep.value=data.departments[0].id;
 if(data.departments.length)submit(f,transfer?'Send to department':'Import paper');else f.append(el('p','The principal needs to create a department first.'));
 if(transfer)f.append(button('Discard transfer',async()=>{sessionStorage.removeItem('lessonpress.school-transfer');await load();},'quiet'));
 box.append(f);listView(box);
}
function teamView(box){
 box.append(el('h2','People & departments'));
 if(school.role!=='principal'){box.append(el('p','Your principal manages school membership. Department heads review papers within their department. Teachers can edit their own papers and reuse approved departmental copies.'));return;}
 const df=form('Create a department',async()=>{await rpc('create_department',{name:dn.value});await load();});const dn=field(df,'Department name',{max:80});submit(df,'Add department');box.append(df);
 if(data.departments.length){
 const inf=form('Invite a colleague',async()=>{const out=await rpc('invite',{email:email.value,role:role.value,department_id:dep.value});const panel=el('div',undefined,'school-invite-link');panel.append(el('strong','Invitation ready. Share it with this colleague yourself.'),el('p','This link is tied to their email, expires in seven days and can be used once. It is not sent automatically.'));const url=new URL('/school',location.origin);url.searchParams.set('invite',out.token);const text=field(panel,'Invitation link',{value:url.href,max:500});text.readOnly=true;panel.append(button('Copy invitation',async()=>{await navigator.clipboard.writeText(url.href);status('Invitation copied.');}));inf.append(panel);submitButton.disabled=true;status('Invitation created.');});
 const email=field(inf,'Colleague’s email',{type:'email',max:254});const role=field(inf,'Role',{options:[['teacher','Teacher'],['hod','Department head']]});const dep=field(inf,'Department',{options:data.departments.map(d=>[d.id,d.name])});submit(inf,'Create invitation link');const submitButton=inf.querySelector('[type=submit]');box.append(inf);
 }
 const wrap=el('div',undefined,'school-table-wrap'),table=el('table',undefined,'school-table');const head=el('tr');for(const h of ['Email','Role','Department','Access'])head.append(el('th',h));const thead=el('thead');thead.append(head);table.append(thead);const tbody=el('tbody');
 for(const m of data.members){const row=el('tr');row.append(el('td',m.email),el('td',m.role),el('td',m.department_id?department(m.department_id):'All departments'));const td=el('td');if(m.role!=='principal')td.append(button('Remove access',async()=>{if(confirm(`Remove ${m.email} from this school? Their saved papers remain in the school.`)){await rpc('remove_member',{user_id:m.user_id});await load();}},'quiet'));else td.textContent='School principal';row.append(td);tbody.append(row);}table.append(tbody);wrap.append(table);box.append(wrap,el('h3','Invitations'));
 for(const i of data.invitations){const row=el('div',undefined,'school-card school-row');const active=!i.accepted_at&&!i.revoked_at&&new Date(i.expires_at)>new Date();row.append(el('p',`${i.email} · ${i.role} · ${i.accepted_at?'Accepted':i.revoked_at?'Revoked':active?'Pending':'Expired'}`));if(active)row.append(button('Revoke',async()=>{await rpc('revoke_invite',{id:i.id});await load();},'quiet'));box.append(row);}
}
async function paperView(box){
 if(!params.get('paper'))throw new Error('Choose a paper from the library.');
 openPaper=await rpc('paper',{paper_id:params.get('paper'),...(params.get('revision')?{revision:Number(params.get('revision'))}:{})});
 const p=openPaper,draft=validateDraft({...p.content,id:p.id,savedAt:new Date().toISOString()});p.content={spec:draft.spec,paper:draft.paper,sample:draft.sample,model:draft.model};
 const current=p.revision===p.current_revision,owner=p.author_id===user.id,canEdit=current&&owner&&p.status!=='submitted';
 const toolbar=el('div',undefined,'school-toolbar no-print');toolbar.append(link('← Department library',route('/school/library')),el('span',`Version ${p.revision} · ${p.status.replaceAll('_',' ')}`,'school-tag'));
 const versions=field(toolbar,'Version',{options:p.versions.map(v=>[String(v.revision),`Version ${v.revision} · ${date(v.created_at)}`]),value:String(p.revision)});versions.addEventListener('change',()=>location.href=route('/school/paper',{paper:p.id,revision:versions.value}));
 toolbar.append(button('Download editable JSON',async()=>download(p.content)));
 if(canEdit)toolbar.append(button('Edit a new version',async()=>{editing=true;renderEdit(box,p);},'primary'));
 if(current&&owner&&['draft','changes_requested'].includes(p.status))toolbar.append(button('Submit for review',async()=>{await rpc('submit',{paper_id:p.id,expected_revision:p.revision});await load();status('Submitted. This version is locked while it is reviewed.');},'primary'));
 toolbar.append(button('Reuse as my draft',async()=>{const out=await rpc('save_paper',{department_id:p.department_id,content:p.content});location.href=route('/school/paper',{paper:out.id});}));
 box.append(toolbar,el('p',p.approved_revision===p.revision?'This version was approved. Editing creates a new version and leaves this approved copy intact.':'This is a draft or historical version. Teacher review is required before classroom use.','school-muted no-print'));
 const printTools=el('div',undefined,'school-toolbar no-print');let teacher=false;
 const paper=el('article',undefined,'school-print');
 printTools.append(button('Student copy',async()=>{teacher=false;renderCopy();}),button('Marking guide',async()=>{teacher=true;renderCopy();}));
 const reviewed=field(printTools,'I checked this copy before printing',{type:'checkbox',required:false});reviewed.addEventListener('change',()=>print.disabled=!reviewed.checked);const print=button('Print / PDF',async()=>window.print());print.disabled=true;printTools.append(print);box.append(printTools,paper);
 function renderCopy(){paper.replaceChildren(el('p',`${teacher?'TEACHER MARKING GUIDE':'STUDENT PAPER'} · VERSION ${p.revision}`,'eyebrow'),el('h2',p.content.spec.title),el('p',`${school.name} · ${p.content.spec.subject} · ${p.content.spec.level} · ${p.content.spec.minutes} minutes`),el('p',p.content.paper.instructions));if(p.content.sample)paper.append(el('p','Hand-authored sample assessment.','sample-notice'));
 p.content.paper.questions.forEach((q,i)=>{const card=el('section',undefined,'school-question');card.append(el('h3',`${i+1}. ${q.prompt} [${q.marks} marks]`));if(q.kind==='mcq'){const list=el('ol');list.type='A';q.options.forEach(o=>list.append(el('li',o)));card.append(list);}else if(!teacher)card.append(el('div',undefined,'answer-lines'));if(teacher){card.append(el('strong',q.answer));const marks=el('ul');q.marking.forEach(m=>marks.append(el('li',`${m.point} (${m.marks} marks)`)));card.append(marks,el('p',`Lesson evidence: “${q.evidence}”`,'school-evidence'));}paper.append(card);});paper.append(el('p',p.approved_revision===p.revision?'School-approved version':'Draft · Review before use','micro'));reviewed.checked=false;print.disabled=true;}
 renderCopy();
 const reviews=el('section',undefined,'no-print');reviews.append(el('h3','Review conversation'));
 for(const r of p.reviews){const card=el('article',undefined,'school-review');card.append(el('strong',`${r.decision.replaceAll('_',' ')}${r.question?' · Question '+r.question:''}`),el('p',r.comment),el('p',date(r.created_at),'school-muted'));reviews.append(card);}if(!p.reviews.length)reviews.append(el('p','No review comments on this version yet.'));
 if(current&&p.status==='submitted'&&!owner&&['principal','hod'].includes(school.role)){
 const f=form('Review this version',async()=>{if(decision.value==='approved'&&!check.checked)throw new Error('Confirm you checked every question, answer and source quote.');await rpc('review',{paper_id:p.id,expected_revision:p.revision,decision:decision.value,comment:comment.value,question:question.value?Number(question.value):null});await load();status('Review saved.');});
 const decision=field(f,'Decision',{options:[['comment','Leave a comment'],['changes_requested','Request changes'],['approved','Approve this version']]});const question=field(f,'Question number (optional)',{type:'number',required:false});question.min=1;question.max=p.content.paper.questions.length;const comment=field(f,'Review comment',{type:'textarea',max:2000});const check=field(f,'I reviewed every question, answer and source quote',{type:'checkbox',required:false});submit(f,'Save review');reviews.append(f);
 }box.append(reviews);
}
function renderEdit(box,p){
 const content=structuredClone(p.content);box.replaceChildren();const f=form('Edit a new paper version',async()=>{
 content.spec.title=title.value;content.paper.instructions=instructions.value;
 const checked=validateDraft({...content,id:p.id,savedAt:new Date().toISOString()});
 const out=await rpc('save_paper',{paper_id:p.id,expected_revision:p.current_revision,content:{spec:checked.spec,paper:checked.paper,sample:checked.sample,model:checked.model}});
 dirty=false;editing=false;location.href=route('/school/paper',{paper:out.id});
 });f.append(el('p','Saving creates a new draft version. Earlier versions and approval records stay unchanged. Source quotes must still appear in the notes.'));
 const title=field(f,'Paper title',{value:content.spec.title,max:100});const instructions=field(f,'Student instructions',{type:'textarea',value:content.paper.instructions,max:1200});
 content.paper.questions.forEach((q,i)=>{const fs=el('fieldset');fs.append(el('legend',`Question ${i+1}`));function bind(label,key,max=1200){const input=field(fs,label,{type:'textarea',value:q[key],max});input.addEventListener('input',()=>q[key]=input.value);}
 bind('Question','prompt');bind('Expected answer','answer');bind('Exact source quote','evidence');
 if(q.kind==='mcq'){q.options.forEach((v,j)=>{const input=field(fs,`Option ${'ABCD'[j]}`,{value:v,max:400});input.addEventListener('input',()=>{q.options[j]=input.value;if(q.correctIndex===j)sync();});});const correct=field(fs,'Correct option',{options:q.options.map((_,j)=>[String(j),`Option ${'ABCD'[j]}`]),value:String(q.correctIndex)});function sync(){q.answer=q.options[q.correctIndex];q.marking=[{point:`Select ${'ABCD'[q.correctIndex]}: ${q.answer}`,marks:q.marks}];}correct.addEventListener('change',()=>{q.correctIndex=Number(correct.value);sync();});
 }else q.marking.forEach((m,j)=>{const point=field(fs,`Marking point ${j+1}`,{type:'textarea',value:m.point,max:800});point.addEventListener('input',()=>m.point=point.value);const mark=field(fs,`Marks for point ${j+1}`,{type:'number',value:m.marks});mark.min=1;mark.max=q.marks;mark.addEventListener('input',()=>m.marks=Number(mark.value));});f.append(fs);});
 const details=el('details');details.append(el('summary','Original lesson notes'),el('p',content.spec.notes));f.append(details);f.addEventListener('input',()=>dirty=true);submit(f,'Save new version');f.append(button('Cancel editing',async()=>{if(!dirty||confirm('Discard these unsaved edits?')){dirty=false;editing=false;await load();}},'quiet'));box.append(f);
}
function download(content){const blob=new Blob([JSON.stringify({...content,id:crypto.randomUUID(),savedAt:new Date().toISOString()},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=link('Download',url);a.download='lessonpress-school-paper.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('account-form').addEventListener('submit',e=>{e.preventDefault();const action=e.submitter.value;run(async()=>{const out=await request('/api/account',{action,email:$('school-email').value,password:$('school-password').value});$('school-password').value='';if(out.verifyEmail){status('Check your email to verify your account. After verification, return here and sign in.');return;}await start();});});
$('logout').addEventListener('click',()=>run(async()=>{await request('/api/account',{action:'logout'});location.href='/school';}));
$('new-school-toggle').addEventListener('click',()=>{$('new-school').hidden=!$('new-school').hidden;});
$('new-school').addEventListener('submit',e=>{e.preventDefault();run(async()=>{const out=await rpc('create_school',{name:$('school-name').value});$('new-school').hidden=true;await bootstrap(out.id);status('School created. Open People & departments to add your first department.');});});
$('school-select').addEventListener('change',()=>run(async()=>{school=schools.find(s=>s.id===$('school-select').value);if(school){location.href=route('/school');}}));
$('accept-invite').addEventListener('submit',e=>{e.preventDefault();run(async()=>{const out=await rpc('accept_invite',{token:invite});invite=null;sessionStorage.removeItem('lessonpress.invite');await bootstrap(out.id);status('You have joined your school.');});});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
async function start(){const out=await request('/api/account');user=out.user;$('account-panel').hidden=Boolean(user);$('signed-panel').hidden=!user;if(user){$('account-email').textContent=user.email;await bootstrap();}else status(invite?'Sign in or create an account with the invited email to join your school.':'Sign in to access your school workspace.');}
run(start);
