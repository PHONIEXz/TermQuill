import {readBank,writeBank,validateBank,assemblePaper} from '/bank.js';
import {saveDraft} from '/drafts.js';
import {renderBlocks} from '/paper-blocks.js';
if(document.body.dataset.page==='question-bank'){
 const $=id=>document.getElementById(id),selected=new Set();let items=[];
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const status=(message,bad=false)=>{$('bank-status').textContent=message;$('bank-status').classList.toggle('bank-error',bad);};
 function load(){try{items=readBank(localStorage);render();}catch(e){status(`Could not open the bank. ${e.message}`,true);}}
 function updateSelected(){ $('bank-selected').textContent=`${selected.size} selected`;const list=$('bank-selection');list.replaceChildren();for(const id of selected){const item=items.find(x=>x.id===id);if(item)list.append(el('li',item.question.prompt));}}
 function render(){
  const query=$('bank-search').value.trim().toLowerCase(),list=$('bank-list');list.replaceChildren();$('bank-count').textContent=`${items.length} / 50 saved`;updateSelected();
  const matches=items.filter(x=>`${x.spec.subject} ${x.spec.level} ${x.topic} ${x.term} ${x.question.prompt} ${x.question.kind}`.toLowerCase().includes(query));
  if(!matches.length)list.append(el('p',items.length?'No matching questions. Try another subject, class or topic.':'Your bank is empty. Open a paper in Edit & review and choose Save question to bank.','bank-empty'));
  matches.forEach(item=>{
   const card=el('article',undefined,'bank-card'),label=el('label',undefined,'bank-choice'),check=el('input');check.type='checkbox';check.checked=selected.has(item.id);check.addEventListener('change',()=>{if(check.checked){if(selected.size>=20){check.checked=false;status('Select at most 20 questions.',true);return;}selected.add(item.id);}else selected.delete(item.id);updateSelected();});label.append(check,el('span',item.question.prompt));card.append(label,el('p',`${item.spec.subject} · ${item.spec.level} · ${item.topic}${item.term?' · '+item.term:''} · ${item.question.marks} ${item.question.marks===1?'mark':'marks'}`,'bank-meta'));
   if(item.sample)card.append(el('p','Hand-authored sample question','bank-meta'));
   const detail=el('details');detail.append(el('summary','Inspect question, answer & source'));renderBlocks(detail,item.question,{teacher:true});if(item.question.kind==='mcq'){const list=el('ol');list.type='A';item.question.options.forEach(o=>list.append(el('li',o)));detail.append(list);}detail.append(el('p',`Expected answer: ${item.question.answer}`));const marks=el('ul');item.question.marking.forEach(m=>marks.append(el('li',`${m.point} (${m.marks} marks)`)));detail.append(marks,el('blockquote',item.question.evidence),el('p',`Saved ${new Date(item.savedAt).toLocaleDateString()}`,'bank-meta'));card.append(detail);
   const remove=el('button','Remove question','quiet');remove.type='button';remove.addEventListener('click',()=>{if(!confirm('Remove this question from this device bank? Export a backup first to keep it.'))return;try{const next=items.filter(x=>x.id!==item.id);writeBank(localStorage,next);selected.delete(item.id);items=next;render();status('Question removed. Existing papers are unchanged.');}catch(e){status(e.message,true);}});card.append(remove);list.append(card);
  });
 }
 $('bank-search').addEventListener('input',render);
 $('bank-assemble').addEventListener('submit',event=>{event.preventDefault();try{const chosen=[...selected].map(id=>items.find(x=>x.id===id));const draft=assemblePaper(chosen,{title:$('bank-title').value,minutes:Number($('bank-minutes').value)});saveDraft(localStorage,draft);location.href=`/create?draft=${encodeURIComponent(draft.id)}`;}catch(e){status(e.message,true);}});
 $('bank-export').addEventListener('click',()=>{try{const items=readBank(localStorage),blob=new Blob([JSON.stringify({version:1,items},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='lessonpress-question-bank.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('Backup exported. It contains answers and lesson notes; keep it private.');}catch(e){status(e.message,true);}});
 $('bank-import').addEventListener('change',async()=>{const file=$('bank-import').files?.[0];if(!file)return;try{if(file.size>2000000)throw new Error('Choose a backup under 2 MB.');const incoming=validateBank(JSON.parse(await file.text())),current=readBank(localStorage),ids=new Set(current.map(x=>x.id));const added=incoming.filter(x=>!ids.has(x.id));writeBank(localStorage,[...current,...added]);load();status(`${added.length} questions imported. Existing questions kept. Review imported content before reuse.`);}catch(e){status(`Could not import: ${e.message}`,true);}finally{$('bank-import').value='';}});
 load();
}
