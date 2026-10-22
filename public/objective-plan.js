import {sourcePassages} from '/assessment.js';
import {cleanObjectivePlan,assertObjectivePlan,objectiveReport} from '/objectives.js';
export function initObjectivePlan(form,{getLessons=()=>null}={}){
 const d=form.ownerDocument,$=id=>d.getElementById(id),box=$('objective-plan');if(!box)return {restore(){},values:v=>v,sync(){}};
 let plan=[],notes='',subject='',level='';const node=(tag,text)=>{const n=d.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 const details=node('details'),summary=node('summary','Topics & learning objectives · optional'),list=node('div'),status=node('p'),add=node('button','Add learning objective'),balance=node('button','Balance objective questions'),clear=node('button','Remove objective plan');status.setAttribute('role','status');for(const b of [add,balance,clear])b.type='button';
 details.append(summary,node('p','Name each taught idea, choose its supporting passages and allocate questions. Use separate objectives to cover different ideas. For selected saved lessons, keep each source range inside one lesson. This plan checks counts and source ranges; review whether each question actually tests the intended learning.'),list,add,balance,clear,status);box.append(details);
 const currentNotes=()=>$('notes').value.trim(),same=()=>currentNotes()===notes&&$('subject').value.trim().toLowerCase()===subject.toLowerCase()&&$('level').value.trim().toLowerCase()===level.toLowerCase();
 const passages=()=>sourcePassages(currentNotes()).filter(p=>!getLessons()?.length||getLessons().some(l=>p.start>=l.start&&p.end<=l.end));
 function capture(){notes=currentNotes();subject=$('subject').value.trim();level=$('level').value.trim();}
 function sync(){
  box.hidden=$('source-mode').value!=='notes';add.disabled=plan.length>=20||!passages().length||(plan.length>0&&!same());balance.disabled=!plan.length||!same();clear.hidden=!plan.length;
  if(!plan.length){status.textContent=passages().length?'Add objectives when you need to control which ideas the paper covers.':'Add lesson notes first to choose supporting passages.';return;}
  if(!same()){status.textContent='Notes, subject or class changed. Restore them or remove this objective plan and build it again.';return;}
  try{const checked=cleanObjectivePlan(plan,notes,getLessons());assertObjectivePlan({objectivePlan:checked,lessonPlan:getLessons(),count:Number($('count').value)});status.textContent=`${plan.length} objectives · ${plan.reduce((n,o)=>n+o.questions,0)} / ${$('count').value} questions allocated. Review the objective labels and source ranges before generating.`;}catch(e){status.textContent=e.message;}
 }
 function draw(){
  list.replaceChildren();const options=passages();
  plan.forEach((objective,i)=>{
   const row=node('fieldset');row.className='objective-row';row.append(node('legend',`Objective ${i+1}`));
   const field=(title,input)=>{const label=node('label',title);input.id='objective-'+crypto.randomUUID();label.htmlFor=input.id;row.append(label,input);return input;};
   const label=field('Taught idea / learning objective',node('input'));label.type='text';label.maxLength=160;label.required=true;label.value=objective.label;label.placeholder='For example: distinguish elements from compounds';label.addEventListener('input',()=>{objective.label=label.value;sync();});
   const select=(title,items,selected,changed)=>{const s=field(title,node('select'));for(const p of items){const lesson=getLessons()?.find(l=>p.start>=l.start&&p.end<=l.end),o=node('option',`${lesson?lesson.topic+' · ':''}${p.id}. ${p.text.slice(0,85)}`);o.value=p.id;s.append(o);}s.value=String(selected?.id||'');s.addEventListener('change',()=>{changed(options.find(p=>p.id===Number(s.value)));draw();});return s;};
   const first=options.find(p=>p.start===objective.start),lesson=getLessons()?.find(l=>first&&first.start>=l.start&&first.end<=l.end);
   select('Source begins at',options,first,p=>{if(!p)return;objective.start=p.start;objective.end=p.end;});
   const ends=options.filter(p=>p.end>objective.start&&p.end-objective.start<=1200&&(!lesson||p.end<=lesson.end));
   select('Source ends at',ends,ends.find(p=>p.end===objective.end),p=>{if(p)objective.end=p.end;});
   row.append(node('p',notes.slice(objective.start,objective.end)));const count=field('Questions for this objective',node('input'));count.type='number';count.min=1;count.max=20;count.step=1;count.required=true;count.value=objective.questions;count.addEventListener('input',()=>{objective.questions=Number(count.value);sync();});
   const remove=node('button',`Remove objective ${i+1}`);remove.type='button';remove.addEventListener('click',()=>{plan.splice(i,1);draw();});row.append(remove);list.append(row);
  });sync();
 }
 function rebalance(){
  const distribute=(rows,count)=>rows.forEach((o,i)=>o.questions=Math.floor(count/rows.length)+(i<count%rows.length?1:0));
  const lessons=getLessons();if(lessons?.length)for(const l of lessons)distribute(plan.filter(o=>o.start>=l.start&&o.end<=l.end),l.questions);else distribute(plan,Number($('count').value));draw();
 }
 add.addEventListener('click',()=>{if(!plan.length)capture();const first=passages()[0];if(!first)return;plan.push({id:crypto.randomUUID(),label:'',start:first.start,end:first.end,questions:Math.max(1,Number($('count').value)-plan.reduce((n,o)=>n+o.questions,0))});details.open=true;draw();list.lastElementChild?.querySelector('input')?.focus();});
 balance.addEventListener('click',rebalance);clear.addEventListener('click',()=>{plan=[];draw();});$('count').addEventListener('input',()=>{if(plan.length&&same())rebalance();});for(const id of ['notes','subject','level'])$(id).addEventListener('input',sync);form.addEventListener('change',sync);sync();
 return {sync,restore(spec){plan=spec.objectivePlan?structuredClone(spec.objectivePlan):[];capture();details.open=plan.length>0;draw();},values(value){if(plan.length&&value.sourceMode==='notes'){if(!same())throw new Error('Your objective blueprint no longer matches the source, subject or class. Restore them or remove the plan.');value.objectivePlan=cleanObjectivePlan(plan,value.notes.trim(),value.lessonPlan);assertObjectivePlan({...value,objectivePlan:value.objectivePlan});}return value;}};
}
export function renderObjectiveCoverage(target,paper,spec){
 const report=objectiveReport(paper,spec);if(!report)return;const d=target.ownerDocument,box=d.createElement('details');box.className='creation-coverage objective-coverage no-print';const summary=d.createElement('summary');summary.textContent=report.matches?'Objective allocations match this paper':'Objective coverage changed: review the blueprint';box.append(summary);const explanation=d.createElement('p');explanation.textContent='Counts and supporting source ranges are checked. Review whether the wording and thinking demand actually match each objective; this is not curriculum certification.';box.append(explanation);
 for(const objective of report.rows){const p=d.createElement('p');p.textContent=`${objective.label.replace(/[.!?:;]\s*$/u,'')}: ${objective.actual} questions / ${objective.questions} planned`;box.append(p);}if(report.unassigned){const p=d.createElement('p');p.textContent=`${report.unassigned} questions have no matching objective source assignment.`;box.append(p);}target.append(box);
}
