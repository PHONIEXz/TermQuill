import {qualityReview} from '/quality.js';
export function renderQualityReview(container,paper,spec,{onEdit,isBusy=false}={}){
 if(!container)return;
 if(!paper){container.hidden=true;container.replaceChildren();delete container.dataset.signature;return;}
 const report=qualityReview(paper,spec),signature=JSON.stringify([report,isBusy]);container.hidden=false;
 if(container.dataset.signature===signature)return;
 const wasOpen=container.querySelector('details')?.open;container.dataset.signature=signature;container.replaceChildren();
 const document=container.ownerDocument,el=(tag,value)=>{const node=document.createElement(tag);if(value!==undefined)node.textContent=value;return node;};
 const details=el('details'),summary=el('summary',`Question quality review${report.findings.length?' · '+report.findings.length+' things to check':''}`);details.open=wasOpen??report.findings.length>0;
 details.append(summary,el('p','These are review prompts, not a correctness score. Check every answer, its support and the suitability for your class before confirming your review.'));
 if(report.topicCount)details.append(el('p',`${report.topicCount} ${report.topicCount===1?'question uses':'questions use'} a topic-generated rationale. Check facts and calculations independently; these rationales are not source evidence.`));
 if(!report.findings.length)details.append(el('p','No repetition, reused-passage or response-budget signals were found by these limited checks. Factual accuracy still needs teacher review.'));
 const list=el('ul');for(const item of report.findings.slice(0,12)){
  const li=el('li'),label=item.indices.map(i=>'Q'+(i+1)).join(', ');li.append(el('strong',label),el('p',item.message),el('p',item.action));
  if(onEdit)for(const index of item.indices){const button=el('button',`Review Q${index+1}`);button.type='button';button.disabled=isBusy;button.className='outline';button.addEventListener('click',()=>onEdit(index));li.append(button);}
  list.append(li);
 }if(report.findings.length)details.append(list);
 if(report.findings.length>12)details.append(el('p',`Showing the first 12 of ${report.findings.length} review prompts. Editing updates these checks.`));container.append(details);
}
