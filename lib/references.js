import {readBank} from './bank.js';
import {readDrafts} from './drafts.js';
import {validateRequest} from './assessment.js';
export const MODE_PRESETS={test:{minutes:20,count:6,instructions:'Answer all questions. Show your working where needed.'},exam:{minutes:60,count:12,instructions:'Read each section carefully. Answer the required questions and show your working where needed.'}};
const key=value=>value.trim().toLowerCase();
export function gatherReferences(storage){
 const items=[],warnings=[],seen=new Set();
 const add=(id,spec,question,label,sample)=>{const fingerprint=JSON.stringify([key(spec.subject),key(spec.level),key(question.prompt)]);if(seen.has(fingerprint))return;seen.add(fingerprint);items.push({id,spec,question,label,sample});};
 try{for(const item of readBank(storage))add(`bank-${item.id}`,item.spec,item.question,`Question bank · ${item.topic}`,item.sample);}catch{warnings.push('Your question bank could not be read. Restore its backup before using it.');}
 try{for(const draft of readDrafts(storage))draft.paper.questions.forEach((q,i)=>add(`draft-${draft.id}-${i}`,draft.spec,q,`Saved paper · ${draft.spec.title}`,draft.sample));}catch{warnings.push('Saved papers could not be read. Restore a paper backup before using it.');}
 return {items,warnings};
}
export function referenceRequest(base,values){
 if(!Array.isArray(values)||values.length<1||values.length>10)throw new Error('Select 1–10 past questions as references.');
 if(values.some(x=>key(x.spec.subject)!==key(base.subject)||key(x.spec.level)!==key(base.level)))throw new Error('Reference questions must match the subject and class you selected.');
 const notes=[...new Set(values.map(x=>x.spec.notes))].join('\n\n');
 if(notes.length>18000)throw new Error('These references contain too much source material. Select fewer papers or questions from the same paper.');
 return validateRequest({...base,sourceMode:'references',referenceQuestions:values.map(x=>x.question.prompt),notes});
}
