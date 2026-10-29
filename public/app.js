import {shuffleQuestions} from '/term-plans.js';
import {showcaseDraft} from '/showcases.js';
import {GENERATION_BROWSER_MS} from '/generation-timing.js';
import {EditHistory} from '/edit-history.js';
import {initCreationPlan,renderCoverage} from '/creation-plan.js';
import {balanceLessons} from '/coverage.js';
import {initObjectivePlan,renderObjectiveCoverage} from '/objective-plan.js';
import {renderQualityReview} from '/quality-review.js';
import {saveSetup,readSetup,saveBranding,readBranding,forgetSetup} from '/device-setup.js';
import {LESSON_EXAMPLES,exampleVisualTasks} from '/lesson-examples.js';
import {stagePreset} from '/references.js';
import {cloudLessons} from '/cloud-lessons.js';
import {personalContext} from '/account-session.js';
import {emptyStorage} from '/identity.js';
import {readLessons,prepareLessonCollection,LESSON_TRANSFER_KEY} from '/lessons.js';
import {initReferencePicker} from '/reference-picker.js';
import {saveBankQuestion,saveBankQuestions} from '/bank.js';
import {assertSchoolSize,visualAnswer,hasAnswerSpace,paperTotal} from '/visuals.js';
import {earlyYearsSample} from '/early-years.js';
import {renderBlocks,applyPaperLayout,assertPicturesReady,renderSection,renderLogo} from '/paper-blocks.js';
import {blockEditor,layoutEditor,logoEditor,questionDocumentEditor} from '/visual-editor.js';
import {validateRequest,auditAssessment,parseModelOutput} from '/assessment.js';
import {sampleSpec,samplePaper} from '/sample.js';
import {readDrafts,saveDraft,deleteDraft,validateDraft} from '/drafts.js';
const $ = id => document.getElementById(id);
const form = $('assessment-form');
let exporting = false;
let shuffleGeneratedQuestions=false;
let state = null, mode = 'student', active = null, config = {configured:false,accessRequired:false};
const route=location.pathname.replace(/\/$/,'')||'/';
const page=['/create','/drafts','/guide','/question-bank'].includes(route)?route.slice(1):'home';
const personal=['create','drafts','question-bank'].includes(page)?await personalContext():{local:emptyStorage,session:emptyStorage};
const {local:localStorage,session:sessionStorage}=personal;
document.body.dataset.page=page;
document.title=({home:'TermQuill | From what you teach to what you assess',create:'Create assessment | TermQuill',drafts:'My drafts | TermQuill',guide:'How it works | TermQuill','question-bank':'Question bank | TermQuill'})[page];
for(const link of document.querySelectorAll('[data-nav]'))if(link.dataset.nav===page)link.setAttribute('aria-current','page');
document.querySelector('.skip').href='#main-content';
document.querySelector('.skip').textContent='Skip to main content';
const pendingLayout={preset:'standard',schoolName:'',term:''};
const editHistory=new EditHistory();let editOwner=null;
let dirty=false,pendingImages=0,completedBatch=null;const referencePicker=initReferencePicker(form,localStorage);const creationPlan=initCreationPlan(form);const objectivePlan=initObjectivePlan(form,{getLessons:()=>creationPlan.plan?.()});
function el(tag, text, cls) {const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
function message(text) {$('live-status').textContent=text;}
function error(text='') {$('error').textContent=text;$('error').hidden=!text;}
function mountLogo(){
 const box=$('paper-logo');if(!box)return;box.replaceChildren();
 const layout=state?(state.paper.layout??={preset:state.spec.presentation||'standard',schoolName:'',term:''}):pendingLayout;
 if(!state)layoutEditor(box,{layout},()=>{dirty=!rememberBranding(layout);},{includeLogo:false,includeStyle:false,isBusy:()=>Boolean(active)||pendingImages>0});
 logoEditor(box,layout,()=>{const saved=rememberBranding(layout);box.querySelector('.layout-panel')?.dispatchEvent(new Event('input'));if(state){resetApproval();preview();}else dirty=!saved;},{onError:error,isBusy:()=>Boolean(active)||pendingImages>0,onBusy:on=>{pendingImages+=on?1:-1;if(on&&state)resetApproval();busy(Boolean(active));}});
}
function rememberBranding(layout){if(page!=='create')return;try{saveBranding(localStorage,layout);$('setup-save-status').textContent='School branding saved on this device for your account.';return true;}catch{$('setup-save-status').textContent='Could not save branding on this device. It remains in the open paper; save or export the paper to keep it.';return false;}}
function carrySetupLogo(paper){const layout=state?.paper.layout||pendingLayout;paper.layout??={preset:'standard',schoolName:'',term:''};for(const key of ['schoolName','term','logo','header'])if(layout[key])paper.layout[key]=structuredClone(layout[key]);}
if(page==='create'){
 try{const saved=readSetup(localStorage);if(saved){fillForm(saved.settings);Object.assign(pendingLayout,saved.layout);$('setup-save-status').textContent='Saved setup restored from this device.'+(saved.settings.sourceMode==='references'?' Select your past questions again.':'');}}catch{$('setup-save-status').textContent='Saved setup could not be restored. Your saved copy is unchanged; you can save a replacement or forget it.';}
 try{const branding=readBranding(localStorage);if(branding){delete pendingLayout.logo;Object.assign(pendingLayout,branding);}}catch{$('setup-save-status').textContent='Saved school branding could not be restored. Upload it again to replace the saved copy.';}
 $('save-setup').addEventListener('click',()=>{if(active||pendingImages)return;try{saveBranding(localStorage,state?.paper.layout||pendingLayout);saveSetup(localStorage,fieldValues(),state?.paper.layout||pendingLayout);$('setup-save-status').textContent='Setup saved on this device for your account, including source text and school branding. It will restore when you reopen the studio.'+($('source-mode').value==='references'?' Select past questions again after reopening.':'');if(!state)dirty=false;}catch(e){$('setup-save-status').textContent='Could not save setup: '+e.message+' Your current entries are unchanged.';}});
 $('forget-setup').addEventListener('click',()=>{if(active||pendingImages)return;if(!confirm('Forget the setup and school branding saved on this device? Your open paper and saved drafts stay unchanged.'))return;try{forgetSetup(localStorage);$('setup-save-status').textContent='Saved setup and branding removed from this device. Your current entries stay; reopening starts with the default setup.';}catch{$('setup-save-status').textContent='Could not remove the saved setup. Your current entries are unchanged.';}});
}
mountLogo();
function fieldValues() {
  const values=Object.fromEntries(new FormData(form));
  for(const key of ['count','marksEach','minutes'])values[key]=Number(values[key]);
  values.visualTasks=[...form.querySelectorAll('[name="visualTask"]:checked')].map(e=>e.value);
  values.visualObjects=[...form.querySelectorAll('[name="visualObject"]:checked')].map(e=>e.value);
  delete values.visualTask;delete values.visualObject;
  return objectivePlan.values(creationPlan.values(values));
}
function fillForm(spec) {referencePicker.reset();for(const input of form.querySelectorAll('[name="visualTask"]'))input.checked=(spec.visualTasks||[]).includes(input.value);for(const input of form.querySelectorAll('[name="visualObject"]'))input.checked=(spec.visualObjects||[]).includes(input.value);$('generationMode').value=spec.generationMode||'single';$('assessmentMode').value=spec.assessmentMode||'test';$('presentation').value=spec.presentation||'standard';$('educationStage').value=spec.educationStage||(spec.presentation==='early'?'early':spec.presentation==='primary'?'primary':'secondary');for(const name of ['formatInstructions','difficultyInstructions','topicInstructions'])form.elements[name].value=spec[name]||'';for(const [key,value] of Object.entries(spec))if(form.elements[key])form.elements[key].value=value;referencePicker.sync();creationPlan.restore(spec);objectivePlan.restore(spec);syncCustomSettings();updateCount();}
function syncCustomSettings(){for(const [select,name,wrap] of [['format','formatInstructions','custom-format-wrap'],['difficulty','difficultyInstructions','custom-difficulty-wrap']]){const custom=$(select).value==='custom';$(wrap).hidden=!custom;$(name).disabled=!custom||Boolean(active)||pendingImages>0;$(name).required=custom;}}
for(const id of ['format','difficulty'])$(id).addEventListener('change',syncCustomSettings);
function updateCount() {const batchOption=$('generationMode').querySelector('[value="batches"]');batchOption.disabled=Number($('count').value)<9;if(batchOption.disabled&&$('generationMode').value==='batches'){$('generationMode').value='single';$('generation-hint').textContent='Switched to one request: two batches require at least nine questions.';}$('notes-count').textContent=`${$('notes').value.length.toLocaleString()} / 60,000`;$('total-marks').textContent=`${Number($('count').value)*Number($('marksEach').value)} marks`;}
function busy(on) {on=on||pendingImages>0;
  for(const item of form.elements)item.disabled=on;
  $('generate').disabled=on||!config.configured;
  $('generate').textContent=active?'Preparing assessment…':pendingImages?'Preparing picture…':'Create my assessment →';
for(const id of ['early-sample','try-sample','sample-notes','empty-sample','restore'])if($(id))$(id).disabled=on||(id==='restore'&&!hasSaved());
  for(const id of ['save-setup','forget-setup'])if($(id))$(id).disabled=on;
  $('cancel').disabled=false;$('cancel').hidden=!active;
  document.querySelector('.output').setAttribute('aria-busy',String(on));
  syncCustomSettings();referencePicker.sync(on);if(!on)objectivePlan.sync();updateReview();
}
function hasSaved(){try{return readDrafts(localStorage).length>0;}catch{return false;}}
function updateReview() {
  const working=Boolean(active)||pendingImages>0||exporting;
  const issues=state?auditAssessment(state.paper,state.spec):[];
  $('review-bar').hidden=!state;
  $('approved').checked=Boolean(state?.approved);
  $('approved').disabled=working||issues.length>0;
  $('print').disabled=!state||!state.approved||issues.length>0||mode==='edit'||working;
  for(const format of ['pdf','pptx']){const b=$('export-'+format);b.disabled=$('print').disabled;b.textContent=`Download ${format==='pdf'?'PDF':'PowerPoint'}${state&&mode!=='edit'?' · '+(mode==='teacher'?'Marking guide':'Student'):''}`;}
  for(const id of ['open-completed-batch','download-completed-batch'])$(id).disabled=working||!completedBatch;
  for(const id of ['save','download','send-school','save-library'])$(id).disabled=!state||working;
  for(const button of document.querySelectorAll('.question-bank-actions button'))button.disabled=working;
  $('restore').disabled=!hasSaved()||working;
  for(const direction of ['undo','redo']){const b=$('edit-'+direction);if(b)b.disabled=working||!(direction==='undo'?editHistory.past:editHistory.future).length;}
  $('draft-badge').textContent=state?(state.approved?'REVIEWED':state.sample?'SAMPLE DRAFT':'REVIEW NEEDED'):'NOT STARTED';
  document.dispatchEvent(new CustomEvent('termquill:paper-state',{detail:{exists:Boolean(state),dirty,saved:Boolean(state?.id)}}));
  $('audit-status').textContent=state?(issues.length?`${issues.length} checks need attention. ${issues.slice(0,3).map(x=>`${x.index===null?'':`Q${x.index+1}: `}${x.message}`).join(' ')}`:`${state.paper.questions.length} questions · ${state.paper.questions.reduce((s,q)=>s+q.marks,0)} marks · Structural checks passed. Review accuracy and suitability before printing.`):'';
  renderQualityReview($('quality-review'),state?.paper,state?.spec,{isBusy:working,onEdit:index=>{if(working)return;setMode('edit');const question=$('preview').querySelectorAll('.question-editor')[index];if(question){question.open=true;question.tabIndex=-1;question.focus();question.scrollIntoView({block:'start'});}}});
}
function resetApproval(){if(state){state.approved=false;dirty=true;if(editOwner===state){const a=document.activeElement;editHistory.record({paper:state.paper,spec:state.spec},a&&['INPUT','TEXTAREA'].includes(a.tagName)?a.id:null);}}updateReview();}
function historyMove(direction){if(active||pendingImages)return;const restored=editHistory[direction]();if(!restored)return;state.paper=restored.paper;state.spec=restored.spec;state.approved=false;dirty=true;rememberBranding(state.paper.layout||{});fillForm(state.spec);preview();updateReview();message(direction==='undo'?'Last edit undone. Review the restored paper.':'Edit restored. Review the paper.');}

function head(container) {
  if(state.sample)container.append(el('div','SAMPLE ASSESSMENT · Hand-authored example. Not generated from your current form.','sample-notice'));
  const header=el('div',undefined,'paper-head');renderLogo(header,state.paper.layout);
  for(const key of state.paper.layout?.header?.order||['school','term','title']){if(key==='title')header.append(el('h2',state.spec.title,'header-title'));else{const value=state.paper.layout?.[key==='school'?'schoolName':'term'];if(value)header.append(el('p',value,'header-'+key));}}
  header.append(el('div',mode==='teacher'?'TEACHER COPY / MARKING GUIDE':`STUDENT COPY / ${state.spec.assessmentMode==='exam'?'EXAMINATION':state.spec.assessmentMode==='test'?'CLASS TEST':'ASSESSMENT'}`,'kicker'),el('p',`${state.spec.subject} · ${state.spec.level} · ${state.spec.minutes} minutes · ${paperTotal(state.paper)} marks`));
  if(mode==='student'){const names=el('div',undefined,'name-line');names.append(el('span','Name: __________________________'),el('span','Date: ______________'));header.append(names);}
  container.append(header,el('p',state.paper.instructions,'instructions'));
}
function preview() {
  const target=$('preview');target.replaceChildren();if(!state)return;applyPaperLayout(target,state.paper.layout||{preset:state.spec.presentation});
  if(mode==='edit'){renderCoverage(target,state.paper,state.spec);renderObjectiveCoverage(target,state.paper,state.spec);renderEditor(target);return;}
  renderCoverage(target,state.paper,state.spec);renderObjectiveCoverage(target,state.paper,state.spec);head(target);
  state.paper.questions.forEach((q,i)=>{
    const section=el('section',undefined,`question${q.pageBreakBefore?' question-page-break':''}`),title=el('div',undefined,'question-title');
    title.append(el('span',String(i+1).padStart(2,'0'),'number'),el('p',q.prompt),el('span',`[${q.marks} ${q.marks===1?'mark':'marks'}]`,'marks'));renderSection(section,q);section.append(title);renderBlocks(section,q,{teacher:mode==='teacher'});
    if(q.kind==='mcq'){const options=el('ul',undefined,'options');q.options.forEach((o,j)=>options.append(el('li',`${'ABCD'[j]}. ${o}`)));section.append(options);}
    if(mode==='teacher'){
      const answer=el('div',undefined,'teacher-answer');answer.append(el('strong',q.kind==='mcq'?`${'ABCD'[q.correctIndex]}. ${q.answer}`:q.answer));
      const points=el('ul');q.marking.forEach(p=>points.append(el('li',`${p.point} (${p.marks} ${p.marks===1?'mark':'marks'})`)));answer.append(points,el('div',q.grounding==='topic'||state.spec.sourceMode==='topic'?`Topic-generated · Not source-verified. Answer rationale: ${q.rationale}`:`From the lesson notes: “${q.evidence}”`,'evidence'));section.append(answer);
    }else if(q.kind==='short'&&q.answerSpace!=='none'&&!hasAnswerSpace(q))section.append(el('div',undefined,'answer-lines'));
    const libraryActions=el('div',undefined,'question-bank-actions no-print');actionButton(libraryActions,'Save question to library',()=>openBankDialog(i));section.append(libraryActions);target.append(section);
  });
  target.append(el('p',`${state.approved?'Teacher review confirmed':'DRAFT · Awaiting teacher review'} · Prepared with TermQuill`,'print-note'));
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
function renderMarkingFields(fields,q){const group=el('div',undefined,'marking-fields'),automatic=q.kind==='mcq'||visualAnswer(q.blocks)!==null;
  const total=el('p',undefined,'visual-hint');total.setAttribute('role','status');const tally=()=>{total.textContent=`Allocated ${q.marking.reduce((n,p)=>n+(Number(p.marks)||0),0)} / ${q.marks} marks. ${automatic?'Answer key is derived from this question.':'Marking criteria must add up to the question total.'}`;};
  q.marking.forEach((p,j)=>{
      const point=editable(group,`Marking point ${j+1}`,p.point,v=>p.point=v,{max:600});point.readOnly=automatic;
      const l=el('label',`Marks for point ${j+1}`),n=el('input');n.type='number';n.readOnly=automatic;n.min=1;n.max=100;n.value=p.marks;n.id=`marks-${crypto.randomUUID()}`;l.htmlFor=n.id;
      n.addEventListener('input',()=>{p.marks=Number(n.value);resetApproval();tally();});group.append(l,n);
      if(!automatic)actionButton(group,`Remove marking point ${j+1}`,()=>{q.marking.splice(j,1);resetApproval();group.remove();renderMarkingFields(fields,q);},q.marking.length<=1);
    });
  if(!automatic)actionButton(group,'Add marking point',()=>{q.marking.push({point:'',marks:1});resetApproval();group.remove();renderMarkingFields(fields,q);},q.marking.length>=10);
  tally();group.append(total);fields.append(group);
}
function questionControls(box,q,i){
 const tools=el('div',undefined,'question-controls'),count=state.paper.questions.length;
 const kind=el('select');kind.setAttribute('aria-label',`Question ${i+1} type`);for(const [v,t] of [['short','Written / visual response'],['mcq','Multiple choice']]){const o=el('option',t);o.value=v;kind.append(o);}kind.value=q.kind;
 kind.addEventListener('change',()=>{if(active||pendingImages){kind.value=q.kind;return;}if(kind.value==='mcq'&&visualAnswer(q.blocks)!==null){error('Remove the counting or matching task before choosing multiple choice.');kind.value=q.kind;return;}q.kind=kind.value;q.options=q.kind==='mcq'?['Option A','Option B','Option C','Option D']:[];q.correctIndex=q.kind==='mcq'?0:null;if(q.kind==='mcq'){q.answer=q.options[0];q.marking=[{point:'Select A: Option A',marks:q.marks}];}changedQuestions();});tools.append(kind);
 actionButton(tools,`Move question ${i+1} up`,()=>{[state.paper.questions[i-1],state.paper.questions[i]]=[q,state.paper.questions[i-1]];changedQuestions(i-1);},i===0);
 actionButton(tools,`Move question ${i+1} down`,()=>{[state.paper.questions[i+1],state.paper.questions[i]]=[q,state.paper.questions[i+1]];changedQuestions(i+1);},i===count-1);
 actionButton(tools,`Duplicate question ${i+1}`,()=>{state.paper.questions.splice(i+1,0,structuredClone(q));changedQuestions(i+1);message('Question duplicated. Change its wording and content before approving.');},count>=20);
 actionButton(tools,`Remove question ${i+1}`,()=>{if(confirm(`Remove question ${i+1} from this open paper? The saved copy stays unchanged until you save.`)){state.paper.questions.splice(i,1);changedQuestions(Math.min(i,count-2));}},count<=3);box.append(tools);const bankTools=el('div',undefined,'question-bank-actions');actionButton(bankTools,'Save question to library',()=>openBankDialog(i));box.append(bankTools);
}
function renderEditor(target) {
  if(editOwner!==state){editOwner=state;editHistory.reset({paper:state.paper,spec:state.spec});}
  const historyTools=el('div',undefined,'question-controls');for(const direction of ['undo','redo']){const b=actionButton(historyTools,direction==='undo'?'Undo edit':'Redo edit',()=>historyMove(direction),!(direction==='undo'?editHistory.past:editHistory.future).length);b.id='edit-'+direction;}historyTools.append(el('p','Undo history stays in this tab. Save your paper separately.','visual-hint'));target.append(historyTools);

  const intro=el('div',undefined,'editor-intro');intro.append(el('strong','Make it yours, one question at a time.'),el('p','Set your paper heading, open a question to edit, then use Student paper to check the result. Every edit resets your review.'));target.append(intro);
  layoutEditor(target,state.paper,()=>{rememberBranding(state.paper.layout);resetApproval();},{includeLogo:false,onError:error,isBusy:()=>Boolean(active)||pendingImages>0,onBusy:on=>{pendingImages+=on?1:-1;if(on)resetApproval();busy(Boolean(active));}});
  const modeLabel=el('label','Paper assessment mode'),modeSelect=el('select');modeSelect.id='paper-assessment-mode';modeLabel.htmlFor=modeSelect.id;for(const [value,text] of [['test','Test'],['exam','Exam']]){const option=el('option',text);option.value=value;modeSelect.append(option);}modeSelect.value=state.spec.assessmentMode||'test';modeSelect.addEventListener('change',()=>{state.spec.assessmentMode=modeSelect.value;resetApproval();});target.append(modeLabel,modeSelect);
  editable(target,'Paper title',state.spec.title,v=>state.spec.title=v,{multiline:false,max:120});
  editable(target,'Student instructions',state.paper.instructions,v=>state.paper.instructions=v);
  state.paper.questions.forEach((q,i)=>{
    const box=el('details',undefined,'editor question-editor');box.name='assessment-question';box.open=i===0;box.dataset.questionIndex=i;const heading=el('summary',undefined,'question-summary');heading.append(el('h3',`Question ${i+1} · ${q.kind==='mcq'?'Multiple choice':'Short answer'} · ${q.marks} ${q.marks===1?'mark':'marks'}`),el('span',q.prompt,'question-peek'));box.append(heading);heading.addEventListener('click',()=>requestAnimationFrame(()=>{if(box.open)box.scrollIntoView({block:'start'});}));
    questionControls(box,q,i);
    if(state.spec.objectivePlan?.length){const l=el('label','Learning objective'),select=el('select');select.id=`objective-edit-${i}`;l.htmlFor=select.id;const blank=el('option','Unassigned · review coverage');blank.value='';select.append(blank);for(const o of state.spec.objectivePlan){const opt=el('option',o.label);opt.value=o.id;select.append(opt);}select.value=q.objectiveId||'';select.addEventListener('change',()=>{const objective=state.spec.objectivePlan.find(o=>o.id===select.value);if(objective){q.objectiveId=objective.id;if(objective.lessonId)q.lessonId=objective.lessonId;}else delete q.objectiveId;resetApproval();});box.append(l,select,el('p','Assigning an objective does not verify it. Its quote must lie inside the objective source range; check the coverage report.','visual-hint'));}
    questionDocumentEditor(box,q,state.paper,()=>{resetApproval();syncDerivedAnswer(box,q);heading.querySelector('h3').textContent=`Question ${i+1} · ${q.kind==='mcq'?'Multiple choice':'Short answer'} · ${q.marks} ${q.marks===1?'mark':'marks'}`;});
    const grid=el('div',undefined,'editor-grid'),fields=el('div',undefined,'editor-fields'),evidence=el('aside',undefined,'editor-evidence');
    evidence.setAttribute('aria-label',`Supporting evidence for question ${i+1}`);const topic=q.grounding==='topic'||state.spec.sourceMode==='topic';evidence.append(el('strong',topic?'Independent teacher check':'Teacher check'),el('p',topic?'Generated from a topic brief. This rationale is AI-generated, not verified source evidence. Check facts, calculations and suitability independently.':'This source evidence stays off the student copy.','visual-hint'));
    editable(fields,'Question',q.prompt,v=>{q.prompt=v;heading.querySelector('.question-peek').textContent=v;});
    if(q.kind==='mcq'){
      q.options.forEach((option,j)=>editable(fields,`Option ${'ABCD'[j]}`,option,v=>{q.options[j]=v;if(q.correctIndex===j){q.answer=v;q.marking=[{point:`Select ${'ABCD'[j]}: ${v}`,marks:q.marks}];syncDerivedAnswer(box,q);}},{multiline:false,max:400}));
      const label=el('label','Correct option'),select=el('select');select.id=`correct-${i}`;label.htmlFor=select.id;
      q.options.forEach((_,j)=>{const o=el('option',`Option ${'ABCD'[j]}`);o.value=j;select.append(o);});select.value=q.correctIndex;
      select.addEventListener('change',()=>{q.correctIndex=Number(select.value);q.answer=q.options[q.correctIndex];q.marking=[{point:`Select ${'ABCD'[q.correctIndex]}: ${q.answer}`,marks:q.marks}];resetApproval();preview();});fields.append(label,select);
    }else {const answer=editable(fields,'Expected answer',q.answer,v=>q.answer=v);answer.dataset.visualAnswer='true';answer.readOnly=visualAnswer(q.blocks)!==null;}
    renderMarkingFields(fields,q);
    if(topic)editable(evidence,'Answer rationale / teacher verification notes',q.rationale||'',v=>q.rationale=v);else editable(evidence,'Supporting quote (copy exactly from your lesson notes)',q.evidence,v=>q.evidence=v);
    const details=el('details'),summary=el('summary',topic?'Read topic instructions':'Read original lesson notes');details.append(summary,el('p',topic?state.spec.topicInstructions||'Reused topic-generated question. Independently check this answer.':state.spec.notes));evidence.append(details);grid.append(fields,evidence);box.append(grid);
    blockEditor(box,q,{onChange:()=>{state.paper.version=2;resetApproval();syncDerivedAnswer(box,q);},onError:error,isBusy:()=>Boolean(active)||pendingImages>0,onBusy:on=>{pendingImages+=on?1:-1;if(on)resetApproval();busy(Boolean(active));}});target.append(box);
  });
  const tools=el('div',undefined,'question-controls');actionButton(tools,'Add a question',()=>{state.paper.questions.push({kind:'short',prompt:'Write your question here.',marks:state.spec.marksEach,options:[],correctIndex:null,answer:'',marking:[{point:'',marks:state.spec.marksEach}],evidence:'',...(state.spec.sourceMode==='topic'?{grounding:'topic',rationale:''}:{}),blocks:[]});changedQuestions(state.paper.questions.length-1);},state.paper.questions.length>=20);target.append(tools);
}
function setMode(next) {
  mode=next;
  for(const name of ['student','teacher','edit']){const tab=$(`tab-${name}`);tab.setAttribute('aria-selected',String(name===mode));tab.tabIndex=name===mode?0:-1;}
  $('preview').setAttribute('aria-labelledby',`tab-${mode}`);$('workspace')?.classList.toggle('editing-paper',mode==='edit');if($('setup-drawer'))$('setup-drawer').open=mode!=='edit';
  mountLogo();if(state)preview();updateReview();
}
function loadSample() {
  if(active)return;
  if(page!=='create'){location.assign('/demo');return;}
  if(state&&!confirm('Replace the current paper with the sample? Save your draft first if you want to keep it.'))return;
  const paper=structuredClone(samplePaper);carrySetupLogo(paper);fillForm(sampleSpec);state={spec:structuredClone(sampleSpec),paper,sample:true,approved:false,model:'Hand-authored sample'};
  dirty=true;setMode('student');error();message('Sample loaded. This is a hand-authored example, not a live model response.');$('workspace').scrollIntoView({behavior:'smooth',block:'start'});
}
  $('early-sample').addEventListener('click',()=>{if(active||pendingImages)return;if(state&&!confirm('Replace this open paper with the Early Years example? Save first to keep it.'))return;const example=earlyYearsSample();carrySetupLogo(example.paper);state=example;fillForm(state.spec);dirty=true;setMode('edit');error();message('Hand-authored Early Years example loaded. Adapt the tasks and review them for your class.');});
for(const id of ['try-sample','empty-sample'])$(id).addEventListener('click',loadSample);
$('stage-lesson-example')?.addEventListener('click',()=>{if(active||pendingImages)return;if(($('notes').value||$('topicInstructions').value)&&!confirm('Replace the source text and new-generation settings with the example for this stage? Your current preview paper is unchanged.'))return;const stage=$('educationStage').value,example=LESSON_EXAMPLES.find(e=>e.stage===stage),preset=stagePreset(stage,$('assessmentMode').value);fillForm({...preset,title:example.topic,subject:example.subject,level:example.level,educationStage:stage,assessmentMode:$('assessmentMode').value,sourceMode:'notes',notes:example.body,format:'short',visualTasks:exampleVisualTasks(stage),visualObjects:[]});message('Original example lesson loaded for '+example.level+'. Review the notes and settings, then generate. Save all seven examples from Lesson library.');});
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
  event.preventDefault();if(active||pendingImages)return;error();if(!$('provider-consent').checked){error('Confirm permission to send this request to the selected AI provider.');return;}let spec;
  try{spec=validateRequest(referencePicker.request(fieldValues()),{forGeneration:true});}catch(e){error(e.message);return;}
  if(state&&!confirm('Generate a new paper? This replaces the current paper only if generation succeeds.'))return;
  const controller=new AbortController();active=controller;busy(true);message(spec.generationMode==='batches'?'Building two checked batches, then checking the combined paper. Allow up to 4½ minutes; you can cancel…':spec.sourceMode==='topic'?'Drafting from your topic, then checking structure and marks. Answer accuracy needs your review…':'Drafting your assessment, then checking questions, quotes and marks…');
  const timer=setTimeout(()=>controller.abort('timeout'),GENERATION_BROWSER_MS);
  try{
    const response=await fetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json','X-Access-Code':$('access-code').value},body:JSON.stringify({...spec,provider:$('ai-provider').value,providerConsent:$('provider-consent').checked}),signal:controller.signal});
    const data=await response.json();if(!response.ok){if(data.partialDraft){try{completedBatch={draft:validateDraft(data.partialDraft),requested:spec.count};$('batch-recovery').hidden=false;$('batch-recovery-status').textContent=`${completedBatch.draft.paper.questions.length} of ${spec.count} requested questions are available. This is an incomplete paper. Open it for review or download a backup. It has not been saved automatically.`;}catch{error('A completed batch could not be restored. Your open paper is unchanged.');}}throw new Error(`${data.error||'Generation failed.'}${data.code?` (${data.code})`:''}${data.requestId?` Reference: ${data.requestId}`:''}`);}
    const paper=parseModelOutput(JSON.stringify(data.paper),spec);paper.layout??={preset:spec.presentation||'standard',schoolName:'',term:''};
    if(shuffleGeneratedQuestions)paper.questions=shuffleQuestions(paper.questions);completedBatch=null;$('batch-recovery').hidden=true;carrySetupLogo(paper);state={spec,paper,sample:false,approved:false,model:data.model,generatedAt:data.generatedAt};dirty=true;setMode('student');message('Produced by '+data.model+'. '+(spec.generationMode==='batches'?'Both batches are ready. Review the combined paper, answers and coverage before printing.':spec.sourceMode==='topic'?'Your topic draft is ready. Independently verify every answer and rationale before printing.':'Your draft is ready. Review each question, expected answer and source quote.'));
  }catch(e){if(e.name==='AbortError'||controller.signal.aborted)error(controller.signal.reason==='timeout'?'Generation reached its time limit. Save your setup before retrying. Any open paper is unchanged.':'Generation cancelled. Your previous paper is unchanged.');else error(e.message);message('');}
  finally{clearTimeout(timer);active=null;busy(false);}
});
$('cancel').addEventListener('click',()=>active?.abort());
$('download-completed-batch').addEventListener('click',()=>{if(completedBatch&&!active)downloadDraft(completedBatch.draft);});
$('open-completed-batch').addEventListener('click',()=>{if(!completedBatch||active||pendingImages)return;if(state&&!confirm('Open the incomplete first batch instead of the current paper? Save your current draft first if you want to keep it.'))return;const recovered=structuredClone(completedBatch.draft);carrySetupLogo(recovered.paper);state=recovered;delete state.id;state.approved=false;dirty=true;fillForm(state.spec);setMode('edit');message(`Incomplete paper: ${state.paper.questions.length} of ${completedBatch.requested} questions. Check the original blueprint for missing coverage before completing and reviewing it.`);});
$('approved').addEventListener('change',()=>{if(!state)return;state.approved=$('approved').checked;updateReview();if(mode!=='edit')preview();});
$('print').addEventListener('click',async()=>{if(!state?.approved||auditAssessment(state.paper,state.spec).length||mode==='edit')return;try{await assertPicturesReady($('preview'));if(state?.approved&&mode!=='edit')window.print();}catch(e){error(e.message);}});
for(const format of ['pdf','pptx'])$('export-'+format).addEventListener('click',async()=>{
 if(exporting||active||pendingImages||!state?.approved||mode==='edit'||auditAssessment(state.paper,state.spec).length)return;
 const copy=mode,draft=structuredClone(state);exporting=true;updateReview();error();message(`Preparing ${copy==='teacher'?'marking guide':'student copy'} ${format==='pdf'?'PDF':'PowerPoint'}…`);
 try{
  await assertPicturesReady($('preview'));
  const r=await fetch('/api/export',{method:'POST',headers:{'Content-Type':'application/json','X-Personal-Account':personal.user.id},body:JSON.stringify({draft,format,copy,reviewed:true}),signal:AbortSignal.timeout(90000)});
  if(!r.ok){const out=await r.json().catch(()=>({}));throw new Error(out.error||'The file service is temporarily unavailable. Try again or use Print / PDF. Your draft is unchanged.');}
  if(!r.headers.get('content-type')?.includes(format==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.presentationml.presentation'))throw new Error('The server did not return a valid download. Reload and try again.');
  const blob=await r.blob();if(!blob.size)throw new Error('The download was empty. Try again.');const url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download=/filename="([^"]+)"/.exec(r.headers.get('content-disposition')||'')?.[1]||`termquill-${copy}.${format}`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);message(`${copy==='teacher'?'Marking guide':'Student copy'} ${format==='pdf'?'PDF':'PowerPoint'} download requested. Check your browser downloads. Keep editable JSON for reopening a paper in TermQuill.`);
 }catch(e){error(e.name==='TimeoutError'?'File creation timed out. Try again or use Print / PDF. Your draft is unchanged.':e.message);message('');}
 finally{exporting=false;updateReview();}
});
$('save').addEventListener('click',()=>{if(!state)return;try{state={...saveDraft(localStorage,state),approved:state.approved};dirty=false;updateReview();if(mode!=='edit')preview();message('Draft saved to My drafts on this device. You can reopen it from the navigation above.');}catch(e){error(`Could not save: ${e.message} Export a JSON backup if device storage is unavailable.`);}});
$('restore').addEventListener('click',()=>{
  if(state&&!confirm('Replace this paper with the most recently saved draft?'))return;
  try{const drafts=readDrafts(localStorage);if(!drafts.length)throw new Error();state=validateDraft(drafts[0]);dirty=false;fillForm(state.spec);setMode('edit');error();message('Draft restored. Review it again before printing.');}catch{error('The saved draft is unavailable or failed validation.');}
});
$('clear').textContent='Remove this saved copy';
$('clear').addEventListener('click',()=>{if(!state?.id){message('This paper has not been saved yet.');return;}if(!confirm('Remove this paper from My drafts? Download a backup first if you want to keep it.'))return;try{deleteDraft(localStorage,state.id);delete state.id;dirty=true;updateReview();message('Saved copy removed. The paper currently open in this tab is unchanged.');}catch{error('Could not remove this saved copy.');}});
$('download').addEventListener('click',()=>{if(!state)return;const blob=new Blob([JSON.stringify({...state,approved:false},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='termquill-assessment.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);message('Editable JSON downloaded. Keep it somewhere private if the notes are sensitive.');});
$('about-button').addEventListener('click',()=>$('about').showModal());$('close-about').addEventListener('click',()=>$('about').close());
window.addEventListener('beforeprint',()=>{if(!state?.approved||mode==='edit'||auditAssessment(state.paper,state.spec).length||[...$('preview').querySelectorAll('img.paper-image')].some(img=>!img.complete||!img.naturalWidth)){$('preview').replaceChildren(el('p','This draft has not been approved for printing. Review it in TermQuill, confirm your review, and choose Student paper or Marking guide.'));}});
window.addEventListener('afterprint',()=>{if(state)preview();});
updateCount();setMode('student');busy(false);
if(page==='create')fetch('/api/config').then(r=>{if(!r.ok)throw new Error();return r.json();}).then(data=>{config=data;$('access-wrap').hidden=!data.accessRequired;$('connection').textContent=data.configured?'Hosted generation connected. Provider quota and availability apply.':'Generation is not connected yet. Explore the sample to try editing and printing.';busy(false);}).catch(()=>{$('connection').textContent='Could not check generation availability. Refresh to retry. The sample still works.';busy(false);});

function libraryMessage(text,failed=false){$('library-status').textContent=failed?'':text;$('library-error').hidden=!failed;$('library-error').textContent=failed?text:'';}
function downloadDraft(draft){const blob=new Blob([JSON.stringify({...draft,approved:false},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='termquill-assessment.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
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
  try{if(file.size>200000)throw new Error('Choose a TermQuill JSON file smaller than 200 KB.');const value=JSON.parse(await file.text());const draft=validateDraft(value);draft.id=crypto.randomUUID();saveDraft(localStorage,draft);libraryMessage('Draft imported. Open the paper and review it before printing.');renderLibrary();}catch(e){libraryMessage(`Could not import this file. ${e instanceof SyntaxError?'Choose a valid TermQuill JSON export.':e.message}`,true);}finally{$('import-file').value='';}
});
if(page==='drafts')renderLibrary();
if(page==='create'){
  const params=new URLSearchParams(location.search),id=params.get('draft');
  if(id){try{const saved=readDrafts(localStorage).find(d=>d.id===id);if(!saved)throw new Error();state=validateDraft(saved);fillForm(state.spec);dirty=false;setMode('edit');message('Saved paper opened. Review it again before printing.');}catch{error('This draft could not be opened on this browser. Open My drafts or import its JSON backup.');}}
  else if(params.has('example')){try{state=showcaseDraft(params.get('example'));carrySetupLogo(state.paper);fillForm(state.spec);dirty=true;setMode('edit');message('Hand-authored stage example opened as an unsaved copy. Your saved papers are unchanged. Review before use.');}catch{error('Choose an available example from the public showcase.');}}
  else if(params.get('sample')==='1')loadSample();
}
document.addEventListener('click',event=>{const a=event.target.closest?.('a[href]');if(!a||a.hasAttribute('download')||!dirty||page!=='create')return;const target=new URL(a.href,location.href);if(target.pathname!==location.pathname&&!confirm('Leave without saving this paper? Choose Cancel, then Save on this device to keep it.'))event.preventDefault();});
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});

$('send-school').addEventListener('click',()=>{try{if(!state||active||pendingImages)return;const draft=validateDraft({...state,savedAt:new Date().toISOString()});assertSchoolSize({spec:draft.spec,paper:draft.paper,sample:draft.sample,model:draft.model});sessionStorage.setItem('lessonpress.school-transfer',JSON.stringify(draft));dirty=false;location.href='/school/library';}catch(e){error(e.message);}});

$('save-library').addEventListener('click',()=>openBankDialog());
function openBankDialog(index){
 if(!state||active||pendingImages||document.querySelector('.bank-dialog'))return;
 const dialog=el('dialog',undefined,'bank-dialog'),f=el('form');f.method='dialog';const heading=el('h2',index===undefined?'Save to question library':'Save question to library');heading.id='save-library-heading';dialog.setAttribute('aria-labelledby',heading.id);
 f.append(heading,el('p','Saved for your account on this browser, with answers, visuals and source notes or topic instructions. This does not approve the paper or share it with a school.'));
 const choices=[];if(index===undefined){const group=el('fieldset'),legend=el('legend','Choose questions to keep');group.append(legend);state.paper.questions.forEach((q,i)=>{const label=el('label',undefined,'library-save-choice'),check=el('input');check.type='checkbox';check.checked=true;check.dataset.questionIndex=i;choices.push(check);label.append(check,document.createTextNode(`${i+1}. ${q.prompt}`));group.append(label);});f.append(group);}
 else f.append(el('p',`${index+1}. ${state.paper.questions[index].prompt}`));
 function bankField(label,value,max){const l=el('label',label),input=el('input');input.id=`bank-${crypto.randomUUID()}`;l.htmlFor=input.id;input.value=value;input.maxLength=max;f.append(l,input);return input;}
 const topic=bankField('Topic',state.spec.title.slice(0,80),80),term=bankField('Term (optional)',state.paper.layout?.term||'',60);topic.required=true;
 const label=el('label',undefined,'check-label'),check=el('input');check.type='checkbox';check.required=true;label.append(check,document.createTextNode(' I checked the selected questions, answers and source evidence or topic rationales.'));f.append(label);
 const note=el('p');note.setAttribute('role','status');const actions=el('div',undefined,'block-controls'),save=el('button','Save to question library','primary');save.type='submit';actions.append(save);actionButton(actions,'Cancel',()=>dialog.close());f.append(note,actions);dialog.append(f);document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove());
 f.addEventListener('submit',event=>{event.preventDefault();if(active||pendingImages)return;try{if(!check.checked)throw new Error('Confirm that you checked the selected questions and answers before saving.');if(!f.checkValidity())throw new Error('Add a topic of up to 80 characters.');if(index===undefined){const result=saveBankQuestions(localStorage,state,choices.filter(c=>c.checked).map(c=>Number(c.dataset.questionIndex)),{topic:topic.value,term:term.value});message(`${result.saved} question${result.saved===1?'':'s'} saved to your question library on this device.${result.skipped?` ${result.skipped} already saved; no duplicates added.`:''}`);}else{saveBankQuestion(localStorage,state,index,{topic:topic.value,term:term.value});message('Question saved to your question library on this device. Open Question library to reuse it.');}dialog.close();}catch(e){note.textContent=e.message;}});
 dialog.showModal();topic.focus();
}

if(page==='create'&&new URLSearchParams(location.search).get('lessons')==='1'){
 try{const raw=sessionStorage.getItem(LESSON_TRANSFER_KEY);if(!raw)throw new Error('No lesson selection is waiting. Open Lesson library and select your notes.');const transfer=JSON.parse(raw);if(transfer.version!==1||!['exam','test'].includes(transfer.assessmentMode))throw new Error('Invalid lesson selection. Return to Lesson library.');const saved=transfer.storage==='cloud'?(await cloudLessons(personal).list()).items:readLessons(localStorage);if(transfer.storage==='cloud'&&(!Array.isArray(transfer.versions)||transfer.ids.some(id=>!transfer.versions.some(v=>v[0]===id&&v[1]===saved.find(n=>n.id===id)?.version))))throw new Error('Selected cloud lessons changed. Return to Lesson library and review your selection.');const group=prepareLessonCollection(saved,transfer.ids,{byWeek:transfer.byWeek===true});if(state)throw new Error('A saved paper is already open. Start from Lesson library in a new assessment.');const exampleStage=LESSON_EXAMPLES.find(e=>e.level===group.level&&e.subject===group.subject&&transfer.ids.includes('termquill-example-'+e.stage+'-v1'))?.stage,stage=exampleStage||$('educationStage').value,preset=stagePreset(stage,transfer.assessmentMode);if(transfer.questionCount!==undefined){if(!Number.isInteger(transfer.questionCount)||transfer.questionCount<3||transfer.questionCount>20)throw new Error('Choose 3–20 questions.');preset.count=transfer.questionCount;}shuffleGeneratedQuestions=transfer.shuffle===true;fillForm({...fieldValues(),...(exampleStage?preset:{}),...group,lessonPlan:balanceLessons(group.lessons,preset.count),educationStage:stage,assessmentMode:transfer.assessmentMode,count:preset.count,minutes:preset.minutes,...(exampleStage?{format:'short',visualTasks:exampleVisualTasks(stage)}:{visualTasks:[]}),visualObjects:[]});pendingLayout.term=group.heading.slice(0,60);sessionStorage.removeItem(LESSON_TRANSFER_KEY);message(`${group.count} saved lessons loaded: ${group.subject} · ${group.level} · ${group.heading}. Review the source notes and settings before generating. Review the lesson coverage allocations before generating. These check source assignment and counts, not factual correctness or full syllabus coverage.`);error();}
 catch(e){error(e.message);}
}
