import {initReferencePicker} from '/reference-picker.js';
import {saveBankQuestion} from '/bank.js';
import {assertSchoolSize,visualAnswer,hasAnswerSpace,paperTotal} from '/visuals.js';
import {earlyYearsSample} from '/early-years.js';
import {renderBlocks,applyPaperLayout,assertPicturesReady,renderSection,renderLogo} from '/paper-blocks.js';
import {blockEditor,layoutEditor,questionDocumentEditor} from '/visual-editor.js';
import {validateRequest,auditAssessment,parseModelOutput} from '/assessment.js';
import {sampleSpec,samplePaper} from '/sample.js';
import {readDrafts,saveDraft,deleteDraft,validateDraft} from '/drafts.js';
const $ = id => document.getElementById(id);
const form = $('assessment-form');
let state = null, mode = 'student', active = null, config = {configured:false,accessRequired:false};
const route=location.pathname.replace(/\/$/,'')||'/';
const page=['/create','/drafts','/guide','/question-bank'].includes(route)?route.slice(1):'home';
document.body.dataset.page=page;
document.title=({home:'LessonPress | From lesson to assessment',create:'Create assessment | LessonPress',drafts:'My drafts | LessonPress',guide:'How it works | LessonPress','question-bank':'Question bank | LessonPress'})[page];
for(const link of document.querySelectorAll('[data-nav]'))if(link.dataset.nav===page)link.setAttribute('aria-current','page');
document.querySelector('.skip').href='#main-content';
document.querySelector('.skip').textContent='Skip to main content';
let dirty=false,pendingImages=0;const referencePicker=initReferencePicker(form);
function el(tag, text, cls) {const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
function message(text) {$('live-status').textContent=text;}
function error(text='') {$('error').textContent=text;$('error').hidden=!text;}
function fieldValues() {
  const values=Object.fromEntries(new FormData(form));
  for(const key of ['count','marksEach','minutes'])values[key]=Number(values[key]);
  return values;
}
function fillForm(spec) {referencePicker.reset();$('assessmentMode').value=spec.assessmentMode||'test';$('presentation').value=spec.presentation||'standard';for(const name of ['formatInstructions','difficultyInstructions'])form.elements[name].value=spec[name]||'';for(const [key,value] of Object.entries(spec))if(form.elements[key])form.elements[key].value=value;syncCustomSettings();updateCount();}
function syncCustomSettings(){for(const [select,name,wrap] of [['format','formatInstructions','custom-format-wrap'],['difficulty','difficultyInstructions','custom-difficulty-wrap']]){const custom=$(select).value==='custom';$(wrap).hidden=!custom;$(name).disabled=!custom||Boolean(active)||pendingImages>0;$(name).required=custom;}}
for(const id of ['format','difficulty'])$(id).addEventListener('change',syncCustomSettings);
function updateCount() {$('notes-count').textContent=`${$('notes').value.length.toLocaleString()} / 18,000`;$('total-marks').textContent=`${Number($('count').value)*Number($('marksEach').value)} marks`;}
function busy(on) {on=on||pendingImages>0;
  for(const item of form.elements)item.disabled=on;
  $('generate').disabled=on||!config.configured;
  $('generate').textContent=active?'Preparing assessment…':pendingImages?'Preparing picture…':'Create my assessment →';
for(const id of ['early-sample','try-sample','sample-notes','empty-sample','restore'])if($(id))$(id).disabled=on||(id==='restore'&&!hasSaved());
  $('cancel').disabled=false;$('cancel').hidden=!active;
  document.querySelector('.output').setAttribute('aria-busy',String(on));
  syncCustomSettings();referencePicker.sync(on);updateReview();
}
function hasSaved(){try{return readDrafts(localStorage).length>0;}catch{return false;}}
function updateReview() {
  const working=Boolean(active)||pendingImages>0;
  const issues=state?auditAssessment(state.paper,state.spec):[];
  $('review-bar').hidden=!state;
  $('approved').checked=Boolean(state?.approved);
  $('approved').disabled=working||issues.length>0;
  $('print').disabled=!state||!state.approved||issues.length>0||mode==='edit'||working;
  for(const id of ['save','download','send-school'])$(id).disabled=!state||working;
  $('restore').disabled=!hasSaved()||working;
  $('draft-badge').textContent=state?(state.approved?'REVIEWED':state.sample?'SAMPLE DRAFT':'REVIEW NEEDED'):'NOT STARTED';
  $('audit-status').textContent=state?(issues.length?`${issues.length} checks need attention. ${issues.slice(0,3).map(x=>`${x.index===null?'':`Q${x.index+1}: `}${x.message}`).join(' ')}`:`${state.paper.questions.length} questions · ${state.paper.questions.reduce((s,q)=>s+q.marks,0)} marks · Structural checks passed. Review accuracy and suitability before printing.`):'';
}
function resetApproval(){if(state){state.approved=false;dirty=true;}updateReview();}
function head(container) {
  if(state.sample)container.append(el('div','SAMPLE ASSESSMENT · Hand-authored example. Not generated from your current form.','sample-notice'));
  const header=el('div',undefined,'paper-head');renderLogo(header,state.paper.layout);
  for(const value of [state.paper.layout?.schoolName,state.paper.layout?.term])if(value)header.append(el('p',value));
  header.append(el('div',mode==='teacher'?'TEACHER COPY / MARKING GUIDE':`STUDENT COPY / ${state.spec.assessmentMode==='exam'?'EXAMINATION':state.spec.assessmentMode==='test'?'CLASS TEST':'ASSESSMENT'}`,'kicker'),el('h2',state.spec.title),el('p',`${state.spec.subject} · ${state.spec.level} · ${state.spec.minutes} minutes · ${paperTotal(state.paper)} marks`));
  if(mode==='student'){const names=el('div',undefined,'name-line');names.append(el('span','Name: __________________________'),el('span','Date: ______________'));header.append(names);}
  container.append(header,el('p',state.paper.instructions,'instructions'));
}
function preview() {
  const target=$('preview');target.replaceChildren();if(!state)return;applyPaperLayout(target,state.paper.layout||{preset:state.spec.presentation});
  if(mode==='edit'){renderEditor(target);return;}
  head(target);
  state.paper.questions.forEach((q,i)=>{
    const section=el('section',undefined,`question${q.pageBreakBefore?' question-page-break':''}`),title=el('div',undefined,'question-title');
    title.append(el('span',String(i+1).padStart(2,'0'),'number'),el('p',q.prompt),el('span',`[${q.marks} ${q.marks===1?'mark':'marks'}]`,'marks'));renderSection(section,q);section.append(title);renderBlocks(section,q,{teacher:mode==='teacher'});
    if(q.kind==='mcq'){const options=el('ul',undefined,'options');q.options.forEach((o,j)=>options.append(el('li',`${'ABCD'[j]}. ${o}`)));section.append(options);}
    if(mode==='teacher'){
      const answer=el('div',undefined,'teacher-answer');answer.append(el('strong',q.kind==='mcq'?`${'ABCD'[q.correctIndex]}. ${q.answer}`:q.answer));
      const points=el('ul');q.marking.forEach(p=>points.append(el('li',`${p.point} (${p.marks} ${p.marks===1?'mark':'marks'})`)));answer.append(points,el('div',`From the lesson notes: “${q.evidence}”`,'evidence'));section.append(answer);
    }else if(q.kind==='short'&&q.answerSpace!=='none'&&!hasAnswerSpace(q))section.append(el('div',undefined,'answer-lines'));
    target.append(section);
  });
  target.append(el('p',`${state.approved?'Teacher review confirmed':'DRAFT · Awaiting teacher review'} · Prepared with LessonPress`,'print-note'));
}
function editable(container,label,value,onInput,{multiline=true,max=1200}={}) {
  const id=`field-${crypto.randomUUID()}`,l=el('label',label);l.htmlFor=id;
  const input=el(multiline?'textarea':'input');input.id=id;input.value=value;input.maxLength=max;if(multiline)input.rows=2;
  input.addEventListener('input',()=>{onInput(input.value);resetApproval();});container.append(l,input);return input;
}
function actionButton(parent,text,action,disabled=false){const b=el('button',text);b.type='button';b.disabled=disabled;b.addEventListener('click',()=>{if(!active&&!pendingImages)action();});parent.append(b);return b;}
function changedQuestions(focusIndex){state.spec.count=state.paper.questions.length;state.spec.format='custom';state.spec.formatInstructions='Teacher-arranged written and multiple-choice questions.';fillForm(state.spec);resetApproval();preview();if(Number.isInteger(focusIndex)){const question=$('preview').querySelectorAll('.editor')[focusIndex];if(question){question.open=true;question.tabIndex=-1;question.focus();}}message('Paper updated. Review the question wording, answers and marks.');}
function syncDerivedAnswer(box,q){
 const answer=box.querySelector('[data-visual-answer]');if(answer){answer.value=q.answer;try{answer.readOnly=visualAnswer(q.blocks)!==null;}catch{answer.readOnly=false;}}
 const fields=box.querySelector('.editor-fields');if(fields){fields.querySelector('.marking-fields')?.remove();renderMarkingFields(fields,q);}
}
function renderMarkingFields(fields,q){const group=el('div',undefined,'marking-fields'),automatic=visualAnswer(q.blocks)!==null;
  q.marking.forEach((p,j)=>{
      const point=editable(group,`Marking point ${j+1}`,p.point,v=>p.point=v,{max:600});point.readOnly=automatic;
      const l=el('label',`Marks for point ${j+1}`),n=el('input');n.type='number';n.readOnly=automatic;n.min=1;n.max=100;n.value=p.marks;n.id=`marks-${crypto.randomUUID()}`;l.htmlFor=n.id;
      n.addEventListener('input',()=>{p.marks=Number(n.value);resetApproval();});group.append(l,n);
    });
  fields.append(group);
}
function questionControls(box,q,i){
 const tools=el('div',undefined,'question-controls'),count=state.paper.questions.length;
 const kind=el('select');kind.setAttribute('aria-label',`Question ${i+1} type`);for(const [v,t] of [['short','Written / visual response'],['mcq','Multiple choice']]){const o=el('option',t);o.value=v;kind.append(o);}kind.value=q.kind;
 kind.addEventListener('change',()=>{if(active||pendingImages){kind.value=q.kind;return;}if(kind.value==='mcq'&&visualAnswer(q.blocks)!==null){error('Remove the counting or matching task before choosing multiple choice.');kind.value=q.kind;return;}q.kind=kind.value;q.options=q.kind==='mcq'?['Option A','Option B','Option C','Option D']:[];q.correctIndex=q.kind==='mcq'?0:null;if(q.kind==='mcq'){q.answer=q.options[0];q.marking=[{point:'Select A: Option A',marks:q.marks}];}changedQuestions();});tools.append(kind);
 actionButton(tools,`Move question ${i+1} up`,()=>{[state.paper.questions[i-1],state.paper.questions[i]]=[q,state.paper.questions[i-1]];changedQuestions(i-1);},i===0);
 actionButton(tools,`Move question ${i+1} down`,()=>{[state.paper.questions[i+1],state.paper.questions[i]]=[q,state.paper.questions[i+1]];changedQuestions(i+1);},i===count-1);
 actionButton(tools,`Duplicate question ${i+1}`,()=>{state.paper.questions.splice(i+1,0,structuredClone(q));changedQuestions(i+1);message('Question duplicated. Change its wording and content before approving.');},count>=20);
 actionButton(tools,`Remove question ${i+1}`,()=>{if(confirm(`Remove question ${i+1} from this open paper? The saved copy stays unchanged until you save.`)){state.paper.questions.splice(i,1);changedQuestions(Math.min(i,count-2));}},count<=3);box.append(tools);const bankTools=el('div',undefined,'question-bank-actions');actionButton(bankTools,'Save question to bank',()=>openBankDialog(i));box.append(bankTools);
}
function renderEditor(target) {
  const intro=el('div',undefined,'editor-intro');intro.append(el('strong','Make it yours, one question at a time.'),el('p','Set your paper heading, open a question to edit, then use Student paper to check the result. Every edit resets your review.'));target.append(intro);
  layoutEditor(target,state.paper,()=>{resetApproval();},{onError:error,isBusy:()=>Boolean(active)||pendingImages>0,onBusy:on=>{pendingImages+=on?1:-1;if(on)resetApproval();busy(Boolean(active));}});
  const modeLabel=el('label','Paper assessment mode'),modeSelect=el('select');modeSelect.id='paper-assessment-mode';modeLabel.htmlFor=modeSelect.id;for(const [value,text] of [['test','Test'],['exam','Exam']]){const option=el('option',text);option.value=value;modeSelect.append(option);}modeSelect.value=state.spec.assessmentMode||'test';modeSelect.addEventListener('change',()=>{state.spec.assessmentMode=modeSelect.value;resetApproval();});target.append(modeLabel,modeSelect);
  editable(target,'Student instructions',state.paper.instructions,v=>state.paper.instructions=v);
  state.paper.questions.forEach((q,i)=>{
    const box=el('details',undefined,'editor question-editor');box.name='assessment-question';box.open=i===0;box.dataset.questionIndex=i;const heading=el('summary',undefined,'question-summary');heading.append(el('h3',`Question ${i+1} · ${q.kind==='mcq'?'Multiple choice':'Short answer'} · ${q.marks} ${q.marks===1?'mark':'marks'}`),el('span',q.prompt,'question-peek'));box.append(heading);heading.addEventListener('click',()=>requestAnimationFrame(()=>{if(box.open)box.scrollIntoView({block:'start'});}));
    questionControls(box,q,i);questionDocumentEditor(box,q,state.paper,()=>{resetApproval();syncDerivedAnswer(box,q);heading.querySelector('h3').textContent=`Question ${i+1} · ${q.kind==='mcq'?'Multiple choice':'Short answer'} · ${q.marks} ${q.marks===1?'mark':'marks'}`;});
    const grid=el('div',undefined,'editor-grid'),fields=el('div',undefined,'editor-fields'),evidence=el('aside',undefined,'editor-evidence');
    evidence.setAttribute('aria-label',`Supporting evidence for question ${i+1}`);evidence.append(el('strong','Teacher check'),el('p','This source evidence stays off the student copy.','visual-hint'));
    editable(fields,'Question',q.prompt,v=>{q.prompt=v;heading.querySelector('.question-peek').textContent=v;});
    if(q.kind==='mcq'){
      q.options.forEach((option,j)=>editable(fields,`Option ${'ABCD'[j]}`,option,v=>{q.options[j]=v;if(q.correctIndex===j){q.answer=v;q.marking=[{point:`Select ${'ABCD'[j]}: ${v}`,marks:q.marks}];}},{multiline:false,max:400}));
      const label=el('label','Correct option'),select=el('select');select.id=`correct-${i}`;label.htmlFor=select.id;
      q.options.forEach((_,j)=>{const o=el('option',`Option ${'ABCD'[j]}`);o.value=j;select.append(o);});select.value=q.correctIndex;
      select.addEventListener('change',()=>{q.correctIndex=Number(select.value);q.answer=q.options[q.correctIndex];q.marking=[{point:`Select ${'ABCD'[q.correctIndex]}: ${q.answer}`,marks:q.marks}];resetApproval();preview();});fields.append(label,select);
    }else {const answer=editable(fields,'Expected answer',q.answer,v=>q.answer=v);answer.dataset.visualAnswer='true';answer.readOnly=visualAnswer(q.blocks)!==null;}
    renderMarkingFields(fields,q);
    editable(evidence,'Supporting quote (copy exactly from your lesson notes)',q.evidence,v=>q.evidence=v);
    const details=el('details'),summary=el('summary','Read original lesson notes');details.append(summary,el('p',state.spec.notes));evidence.append(details);grid.append(fields,evidence);box.append(grid);
    blockEditor(box,q,{onChange:()=>{state.paper.version=2;resetApproval();syncDerivedAnswer(box,q);},onError:error,isBusy:()=>Boolean(active)||pendingImages>0,onBusy:on=>{pendingImages+=on?1:-1;if(on)resetApproval();busy(Boolean(active));}});target.append(box);
  });
  const tools=el('div',undefined,'question-controls');actionButton(tools,'Add a question',()=>{state.paper.questions.push({kind:'short',prompt:'Write your question here.',marks:state.spec.marksEach,options:[],correctIndex:null,answer:'',marking:[{point:'',marks:state.spec.marksEach}],evidence:'',blocks:[]});changedQuestions(state.paper.questions.length-1);},state.paper.questions.length>=20);target.append(tools);
}
function setMode(next) {
  mode=next;
  for(const name of ['student','teacher','edit']){const tab=$(`tab-${name}`);tab.setAttribute('aria-selected',String(name===mode));tab.tabIndex=name===mode?0:-1;}
  $('preview').setAttribute('aria-labelledby',`tab-${mode}`);$('workspace')?.classList.toggle('editing-paper',mode==='edit');if($('setup-drawer'))$('setup-drawer').open=mode!=='edit';
  if(state)preview();updateReview();
}
function loadSample() {
  if(active)return;
  if(page!=='create'){location.assign('/create?sample=1');return;}
  if(state&&!confirm('Replace the current paper with the sample? Save your draft first if you want to keep it.'))return;
  fillForm(sampleSpec);state={spec:structuredClone(sampleSpec),paper:structuredClone(samplePaper),sample:true,approved:false,model:'Hand-authored sample'};
  dirty=true;setMode('student');error();message('Sample loaded. This is a hand-authored example, not a live model response.');$('workspace').scrollIntoView({behavior:'smooth',block:'start'});
}
  $('early-sample').addEventListener('click',()=>{if(active||pendingImages)return;if(state&&!confirm('Replace this open paper with the Early Years example? Save first to keep it.'))return;state=earlyYearsSample();fillForm(state.spec);dirty=true;setMode('edit');error();message('Hand-authored Early Years example loaded. Adapt the tasks and review them for your class.');});
for(const id of ['try-sample','empty-sample'])$(id).addEventListener('click',loadSample);
$('sample-notes').addEventListener('click',()=>{if($('notes').value&&!confirm('Replace the notes and settings with the sample? Your current paper will remain unchanged.'))return;fillForm(sampleSpec);message('Sample notes added. Generate a fresh assessment or explore the prepared sample.');});
for(const name of ['student','teacher','edit'])$(`tab-${name}`).addEventListener('click',()=>setMode(name));
document.querySelector('.tabs').addEventListener('keydown',event=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();
  const modes=['student','teacher','edit'];let i=modes.indexOf(mode);
  i=event.key==='Home'?0:event.key==='End'?2:(i+(event.key==='ArrowRight'?1:2))%3;
  setMode(modes[i]);$(`tab-${modes[i]}`).focus();
});
form.addEventListener('input',updateCount);
form.addEventListener('submit',async event=>{
  event.preventDefault();if(active||pendingImages)return;error();let spec;
  try{spec=validateRequest(referencePicker.request(fieldValues()));}catch(e){error(e.message);return;}
  if(state&&!confirm('Generate a new paper? This replaces the current paper only if generation succeeds.'))return;
  const controller=new AbortController();active=controller;busy(true);message('Drafting your assessment, then checking questions, quotes and marks…');
  const timer=setTimeout(()=>controller.abort('timeout'),115000);
  try{
    const response=await fetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json','X-Access-Code':$('access-code').value},body:JSON.stringify(spec),signal:controller.signal});
    const data=await response.json();if(!response.ok)throw new Error(`${data.error||'Generation failed.'}${data.code?` (${data.code})`:''}${data.requestId?` Reference: ${data.requestId}`:''}`);
    const paper=parseModelOutput(JSON.stringify(data.paper),spec);paper.layout??={preset:spec.presentation||'standard',schoolName:'',term:''};
    state={spec,paper,sample:false,approved:false,model:data.model,generatedAt:data.generatedAt};dirty=true;setMode('edit');message('Your draft is ready. Review each question, expected answer and source quote.');
  }catch(e){if(e.name==='AbortError'||controller.signal.aborted)error(controller.signal.reason==='timeout'?'Generation timed out. Try fewer questions. Your previous paper is unchanged.':'Generation cancelled. Your previous paper is unchanged.');else error(e.message);message('');}
  finally{clearTimeout(timer);active=null;busy(false);}
});
$('cancel').addEventListener('click',()=>active?.abort());
$('approved').addEventListener('change',()=>{if(!state)return;state.approved=$('approved').checked;updateReview();if(mode!=='edit')preview();});
$('print').addEventListener('click',async()=>{if(!state?.approved||auditAssessment(state.paper,state.spec).length||mode==='edit')return;try{await assertPicturesReady($('preview'));if(state?.approved&&mode!=='edit')window.print();}catch(e){error(e.message);}});
$('save').addEventListener('click',()=>{if(!state)return;try{state={...saveDraft(localStorage,state),approved:state.approved};dirty=false;updateReview();if(mode!=='edit')preview();message('Draft saved to My drafts on this device. You can reopen it from the navigation above.');}catch(e){error(`Could not save: ${e.message} Export a JSON backup if device storage is unavailable.`);}});
$('restore').addEventListener('click',()=>{
  if(state&&!confirm('Replace this paper with the most recently saved draft?'))return;
  try{const drafts=readDrafts(localStorage);if(!drafts.length)throw new Error();state=validateDraft(drafts[0]);dirty=false;fillForm(state.spec);setMode('edit');error();message('Draft restored. Review it again before printing.');}catch{error('The saved draft is unavailable or failed validation.');}
});
$('clear').textContent='Remove this saved copy';
$('clear').addEventListener('click',()=>{if(!state?.id){message('This paper has not been saved yet.');return;}if(!confirm('Remove this paper from My drafts? Download a backup first if you want to keep it.'))return;try{deleteDraft(localStorage,state.id);delete state.id;dirty=true;updateReview();message('Saved copy removed. The paper currently open in this tab is unchanged.');}catch{error('Could not remove this saved copy.');}});
$('download').addEventListener('click',()=>{if(!state)return;const blob=new Blob([JSON.stringify({...state,approved:false},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='lessonpress-assessment.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);message('Editable JSON downloaded. Keep it somewhere private if the notes are sensitive.');});
$('about-button').addEventListener('click',()=>$('about').showModal());$('close-about').addEventListener('click',()=>$('about').close());
window.addEventListener('beforeprint',()=>{if(!state?.approved||mode==='edit'||auditAssessment(state.paper,state.spec).length||[...$('preview').querySelectorAll('img.paper-image')].some(img=>!img.complete||!img.naturalWidth)){$('preview').replaceChildren(el('p','This draft has not been approved for printing. Review it in LessonPress, confirm your review, and choose Student paper or Marking guide.'));}});
window.addEventListener('afterprint',()=>{if(state)preview();});
updateCount();setMode('student');busy(false);
if(page==='create')fetch('/api/config').then(r=>{if(!r.ok)throw new Error();return r.json();}).then(data=>{config=data;$('access-wrap').hidden=!data.accessRequired;$('connection').textContent=data.configured?'Hosted generation connected. Provider quota and availability apply.':'Generation is not connected yet. Explore the sample to try editing and printing.';busy(false);}).catch(()=>{$('connection').textContent='Could not check generation availability. Refresh to retry. The sample still works.';busy(false);});

function libraryMessage(text,failed=false){$('library-status').textContent=failed?'':text;$('library-error').hidden=!failed;$('library-error').textContent=failed?text:'';}
function downloadDraft(draft){const blob=new Blob([JSON.stringify({...draft,approved:false},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='lessonpress-assessment.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function renderLibrary(){
  if(page!=='drafts')return;
  const container=$('draft-list');container.replaceChildren();
  let drafts;try{drafts=readDrafts(localStorage);}catch{libraryMessage('Could not read saved drafts. Browser storage may be disabled, full or damaged. Import a JSON backup to recover a paper.',true);return;}
  $('draft-count').textContent=drafts.length;
  const query=$('draft-search').value.trim().toLowerCase();
  const matching=drafts.filter(d=>`${d.spec.title} ${d.spec.subject} ${d.spec.level}`.toLowerCase().includes(query));
  if(!matching.length){const empty=el('div',undefined,'library-empty');empty.append(el('h3',query?'No matching papers.':'Your next paper belongs here.'),el('p',query?'Try another title, subject or class.':'Create an assessment and choose Save on this device. You can also import an exported JSON draft.'));if(!query){const link=el('a','Create an assessment →');link.href='/create';empty.append(link);}container.append(empty);return;}
  for(const draft of matching){
    const card=el('article',undefined,'draft-card');card.append(el('span',draft.sample?'SAMPLE / EDITABLE DRAFT':'SAVED ASSESSMENT','sample-label'),el('h3',draft.spec.title),el('p',`${draft.spec.subject} · ${draft.spec.level}`),el('p',`${draft.spec.count} questions · ${paperTotal(draft.paper)} marks · ${draft.spec.minutes} minutes`),el('p',`Saved ${new Date(draft.savedAt).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'})}`));
    const actions=el('div',undefined,'card-actions'),open=el('a','Open paper →','outline');open.href=`/create?draft=${encodeURIComponent(draft.id)}`;
    const download=el('button','Export JSON','quiet');download.addEventListener('click',()=>downloadDraft(draft));
    const remove=el('button','Remove','quiet');remove.addEventListener('click',()=>{if(!confirm(`Remove “${draft.spec.title}” from this device? Export a backup first if you want to keep it.`))return;try{deleteDraft(localStorage,draft.id);libraryMessage('Draft removed from this device.');renderLibrary();}catch{libraryMessage('Could not remove this draft.',true);}});
    actions.append(open,download,remove);card.append(actions);container.append(card);
  }
}
$('draft-search').addEventListener('input',renderLibrary);
$('import-button').addEventListener('click',()=>$('import-file').click());
$('import-file').addEventListener('change',async()=>{
  const file=$('import-file').files?.[0];if(!file)return;
  try{if(file.size>200000)throw new Error('Choose a LessonPress JSON file smaller than 200 KB.');const value=JSON.parse(await file.text());const draft=validateDraft(value);draft.id=crypto.randomUUID();saveDraft(localStorage,draft);libraryMessage('Draft imported. Open the paper and review it before printing.');renderLibrary();}catch(e){libraryMessage(`Could not import this file. ${e instanceof SyntaxError?'Choose a valid LessonPress JSON export.':e.message}`,true);}finally{$('import-file').value='';}
});
if(page==='drafts')renderLibrary();
if(page==='create'){
  const params=new URLSearchParams(location.search),id=params.get('draft');
  if(id){try{const saved=readDrafts(localStorage).find(d=>d.id===id);if(!saved)throw new Error();state=validateDraft(saved);fillForm(state.spec);dirty=false;setMode('edit');message('Saved paper opened. Review it again before printing.');}catch{error('This draft could not be opened on this browser. Open My drafts or import its JSON backup.');}}
  else if(params.get('sample')==='1')loadSample();
}
document.addEventListener('click',event=>{const a=event.target.closest?.('a[href]');if(!a||!dirty||page!=='create')return;const target=new URL(a.href,location.href);if(target.pathname!==location.pathname&&!confirm('Leave without saving this paper? Choose Cancel, then Save on this device to keep it.'))event.preventDefault();});
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});

$('send-school').addEventListener('click',()=>{try{if(!state||active||pendingImages)return;const draft=validateDraft({...state,savedAt:new Date().toISOString()});assertSchoolSize({spec:draft.spec,paper:draft.paper,sample:draft.sample,model:draft.model});sessionStorage.setItem('lessonpress.school-transfer',JSON.stringify(draft));dirty=false;location.href='/school/library';}catch(e){error(e.message);}});

function openBankDialog(index){
 const dialog=el('dialog',undefined,'bank-dialog'),f=el('form');f.method='dialog';f.append(el('h2','Save a reusable question'),el('p','Stored on this browser with its answer, visuals and source notes. This is your personal bank, separate from school approval.'));
 function bankField(label,value,max){const l=el('label',label),input=el('input');input.id=`bank-${crypto.randomUUID()}`;l.htmlFor=input.id;input.value=value;input.maxLength=max;f.append(l,input);return input;}const topic=bankField('Topic','',80),term=bankField('Term (optional)',state.paper.layout?.term||'',60);topic.required=true;
 const label=el('label',undefined,'check-label'),check=el('input');check.type='checkbox';check.required=true;label.append(check,document.createTextNode(' I checked the question, answer and source evidence.'));f.append(label);
 const note=el('p');note.setAttribute('role','status');const actions=el('div',undefined,'block-controls'),save=el('button','Save to question bank','primary');save.type='submit';actions.append(save);actionButton(actions,'Cancel',()=>dialog.close());f.append(note,actions);dialog.append(f);document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove());f.addEventListener('submit',event=>{event.preventDefault();try{saveBankQuestion(localStorage,state,index,{topic:topic.value,term:term.value});dialog.close();message('Question saved to your device bank. Open Question bank to assemble another paper.');}catch(e){note.textContent=e.message;}});dialog.showModal();topic.focus();
}
