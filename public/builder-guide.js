// Progressive enhancement: the complete form remains usable without this module.
export function initBuilderGuide(doc=document) {
 if(doc.defaultView.location.pathname.replace(/\/$/,'')!=='/create')return;
 const form=doc.getElementById('assessment-form');if(!form||form.dataset.guided)return;
 form.dataset.guided='true';
 const win=doc.defaultView,$=id=>doc.getElementById(id),make=(tag,text,cls)=>{const n=doc.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
 const sections=[...form.querySelectorAll(':scope > .setup-section')],names=['Choose your class','Add your material','Shape your questions'];
 if(sections.length!==3)return;
 let current=0,paperStatus=null,invalidPending=false,invalidField=null;
 const steps=make('nav',null,'builder-steps');steps.setAttribute('aria-label','Assessment setup steps');
 const announcement=make('p',null,'micro');announcement.id='builder-progress';announcement.setAttribute('role','status');
 const buttons=sections.map((section,i)=>{section.id=`builder-step-${i+1}`;section.querySelector('legend').textContent=`${i+1}. ${names[i]}`;const b=make('button',`${i+1}. ${names[i]}`);b.type='button';b.setAttribute('aria-controls',section.id);b.addEventListener('click',()=>{if(!working())show(i,true);});steps.append(b);return b;});
 form.prepend(steps,announcement);
 const early=form.querySelector('.early-start');sections[1].append(early);early.querySelector('strong').textContent='Need a starting point?';early.querySelector('p').textContent='Load a lesson example for your stage, or explore a finished Early Years paper.';
 const purpose=make('div',null,'builder-purpose');
 const lesson=make('a','Write a lesson note');lesson.href='/lessons';purpose.append(lesson);
 for(const [value,text] of [['test','Class test'],['exam','Examination']]){const b=make('button',text);b.type='button';b.dataset.purpose=value;b.addEventListener('click',()=>{$('assessmentMode').value=value;$('assessmentMode').dispatchEvent(new win.Event('change',{bubbles:true}));});purpose.append(b);}
 sections[0].querySelector('legend').after(purpose);
 // Keep optional paper styling and difficulty out of the main decision path.
 const extras=make('details',null,'builder-extras');extras.append(make('summary','More options: paper style & thinking level'));
 for(const id of ['presentation','difficulty']){const control=$(id),label=form.querySelector(`label[for="${id}"]`);extras.append(label,control);}
 extras.append($('custom-difficulty-wrap'));sections[2].append(extras);
 const visual=form.querySelector('.visual-generation-settings');visual.open=false;visual.querySelector('summary').textContent='Picture tasks: counting, matching, tracing & more';
 const cards=make('div',null,'question-style-cards');cards.setAttribute('role','group');cards.setAttribute('aria-label','Choose a question style');
 for(const [value,title,example] of [['mixed','A balanced mix','A. B. C. D. + space to write'],['mcq','Multiple choice','○ A   ○ B   ○ C   ○ D'],['short','Written / visual','Write, count, match or draw'],['custom','Your own mix','Describe the styles you need']]){const b=make('button',null,'question-style-card');b.type='button';b.dataset.format=value;b.append(make('span',example,'style-example'),make('strong',title));b.addEventListener('click',()=>{$('format').value=value;$('format').dispatchEvent(new win.Event('change',{bubbles:true}));refresh();});cards.append(b);}
 const formatLabel=form.querySelector('label[for="format"]');formatLabel.parentElement.before(cards);
 const recommended=make('div',null,'builder-recommended'),preset=make('button','Use recommended settings','outline');preset.type='button';preset.addEventListener('click',()=>{$('educationStage').dispatchEvent(new win.Event('change',{bubbles:true}));refresh();});recommended.append(make('strong','Start with a sensible setup'),make('p','Class-based defaults are ready. Adjust any choice below, or reset the setup for this stage.'),preset);sections[2].querySelector('legend').after(recommended);
 const controls=make('div',null,'builder-controls'),back=make('button','← Back','outline'),next=make('button','Continue →','primary');back.type=next.type='button';back.addEventListener('click',()=>show(current-1,true));next.addEventListener('click',()=>{if(validateStep())show(current+1,true);});controls.append(back,next);sections[2].after(controls);
 const final=make('div');final.id='builder-final';while(controls.nextSibling)final.append(controls.nextSibling);controls.after(final);
 const sample=make('section',null,'builder-paper-sample no-print');sample.id='builder-paper-sample';sample.setAttribute('aria-label','Illustrative paper layout');
 sample.append(make('p','LAYOUT PREVIEW · NOT GENERATED QUESTIONS','eyebrow'),make('h3','Your paper takes shape here'),make('p','This illustrates the layout only. Generate to see questions based on your material.','micro'));
 const sheet=make('div',null,'builder-sample-sheet'),heading=make('h3'),meta=make('p'),rows=make('div');sheet.append(make('span','STUDENT PAPER','kicker'),heading,meta,rows);sample.append(sheet,make('p','You will also receive a separate marking guide. Review both copies before printing.','micro'));$('preview').before(sample);
 const saveState=make('p',null,'builder-save-state no-print');saveState.setAttribute('role','status');doc.querySelector('.draft-actions').before(saveState);
 const saveHint=make('p','Device drafts are saved in this browser. Lesson-library saves go to your private cloud collection. Sending to a school is a separate action.','micro no-print');doc.querySelector('.draft-actions').after(saveHint);
 const branding=make('details',null,'builder-extras no-print');branding.append(make('summary','School name, logo & paper heading'));$('paper-logo').before(branding);branding.append($('paper-logo'));
 const work=doc.querySelector('#workspace');work.classList.add('guided-builder');
 const toolbar=doc.querySelector('.toolbar');$('tab-edit').textContent='Edit questions & review';$('tab-teacher').textContent='View marking guide';$('print').textContent='Print / save PDF';
 function working(){return doc.querySelector('.output').getAttribute('aria-busy')==='true';}
 function show(i,focus=false){current=Math.max(0,Math.min(2,i));sections.forEach((s,j)=>s.hidden=j!==current);buttons.forEach((b,j)=>{if(j===current)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});back.hidden=current===0;next.hidden=current===2;final.hidden=current!==2;announcement.textContent=`Step ${current+1} of 3 · ${names[current]}`;if(focus){const legend=sections[current].querySelector('legend');legend.tabIndex=-1;legend.focus();}refresh();}
 function reveal(control){const index=sections.findIndex(s=>s.contains(control));if(index>=0)show(index);for(let p=control.parentElement;p&&p!==form;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;$('setup-drawer').open=true;}
 function validateStep(){for(const control of sections[current].querySelectorAll('input,select,textarea'))if(control.willValidate&&!control.validity.valid){reveal(control);control.reportValidity();return false;}return true;}
 form.addEventListener('invalid',e=>{e.preventDefault();if(invalidPending)return;invalidPending=true;invalidField=e.target;reveal(invalidField);invalidField.setAttribute('aria-invalid','true');const label=form.querySelector(`label[for="${invalidField.id}"]`);$('error').textContent=`${label?.textContent||'Check this field'}: ${invalidField.validationMessage||'Please check your entry.'}`;$('error').hidden=false;win.queueMicrotask(()=>{invalidField?.focus();invalidPending=false;});},true);
 form.addEventListener('input',e=>{if(e.target===invalidField){invalidField.removeAttribute('aria-invalid');invalidField=null;$('error').hidden=true;}},true);
 form.addEventListener('submit',e=>{if(current!==2){e.preventDefault();e.stopImmediatePropagation();if(validateStep())show(current+1,true);}},true);
 function refresh(){
  const busy=working();[...buttons,back,next,preset,...cards.querySelectorAll('button'),...purpose.querySelectorAll('button')].forEach(b=>b.disabled=busy);
  cards.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.format===$('format').value)));
  purpose.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.purpose===$('assessmentMode').value)));
  heading.textContent=$('title').value||'Your assessment title';meta.textContent=`${$('subject').value} · ${$('level').value} · ${$('minutes').value} minutes · ${Number($('count').value)*Number($('marksEach').value)} marks`;
  rows.replaceChildren();const chosen=[...form.querySelectorAll('[name="visualTask"]:checked')].map(x=>x.value),styles=chosen.length?chosen:[$('format').value==='mcq'?'multiple choice':$('format').value==='short'?'written response':'multiple choice','written response'];
  for(const [i,style] of styles.slice(0,5).entries()){const row=make('div',null,'builder-sample-row');row.append(make('strong',`${i+1}. ${style[0].toUpperCase()+style.slice(1)} layout`));const art=make('div',null,'sample-answer-shape');art.textContent=({counting:'△  △  △     Count: ___',matching:'1. △       A. Shape',tracing:'△ · · · · △',drawing:'[ Space for a drawing ]',table:'Item  |  Number  |  Answer','multiple choice':'○ A     ○ B     ○ C     ○ D','written response':'________________________________'})[style]||'________________________________';row.append(art);rows.append(row);}
  const started=$('draft-badge').textContent!=='NOT STARTED';sample.hidden=started;$('preview').classList.toggle('builder-empty-hidden',!started);toolbar.hidden=!started;
  // Derive saved status from the existing successful save acknowledgement, never from a click.
  saveState.textContent=!started?'No paper generated yet.':paperStatus?.saved&&!paperStatus.dirty?'Saved copy open on this device.':'Unsaved changes. Save this paper on your device to keep your latest work.';
 }
 doc.addEventListener('termquill:paper-state',e=>{paperStatus=e.detail;refresh();});
 form.addEventListener('input',refresh);form.addEventListener('change',refresh);form.addEventListener('click',()=>win.queueMicrotask(refresh));
 const observer=new win.MutationObserver(refresh);observer.observe($('draft-badge'),{childList:true,characterData:true,subtree:true});observer.observe($('live-status'),{childList:true,characterData:true,subtree:true});observer.observe(doc.querySelector('.output'),{attributes:true,attributeFilter:['aria-busy']});
 show(0);return {show,refresh,disconnect:()=>observer.disconnect()};
}
if(typeof document!=='undefined')initBuilderGuide();
