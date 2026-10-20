import {validateRequest,parseModelOutput} from './assessment.js';
import {validateDraft} from './drafts.js';
export const BANK_KEY='lessonpress.questions.v1';
const MAX_BYTES=2000000,MAX_ITEMS=50;
function text(value,max,required=false){if(typeof value!=='string'||value.length>max||(required&&!value.trim()))throw new Error('Add a topic of up to 80 characters and a term of up to 60 characters.');return value.trim();}
export function validateBankItem(value){
 if(!value||typeof value!=='object')throw new Error('Invalid saved question.');
 const spec=validateRequest(value.spec);
 const paper=parseModelOutput(JSON.stringify({instructions:'Answer this question.',markingMode:'individual',questions:[value.question]}),{...spec,count:1,format:'custom'});
 return {id:typeof value.id==='string'&&/^[\w-]{1,80}$/.test(value.id)?value.id:crypto.randomUUID(),topic:text(value.topic,80,true),term:text(value.term??'',60),spec,question:paper.questions[0],savedAt:typeof value.savedAt==='string'&&Number.isFinite(Date.parse(value.savedAt))?value.savedAt:new Date().toISOString(),sample:value.sample===true};
}
export function validateBank(value){
 if(!value||value.version!==1||!Array.isArray(value.items)||value.items.length>MAX_ITEMS)throw new Error('Choose a TermQuill question-bank backup with up to 50 questions.');
 if(JSON.stringify(value).length>MAX_BYTES)throw new Error('Question bank is too large (2 MB maximum).');
 const items=value.items.map(validateBankItem);if(new Set(items.map(x=>x.id)).size!==items.length)throw new Error('Duplicate question identifiers in backup.');return items;
}
export function readBank(storage){const raw=storage.getItem(BANK_KEY);if(!raw)return [];if(raw.length>MAX_BYTES)throw new Error('Question bank is too large.');return validateBank(JSON.parse(raw));}
export function writeBank(storage,items){const checked=validateBank({version:1,items}),raw=JSON.stringify({version:1,items:checked});if(raw.length>MAX_BYTES)throw new Error('Question bank is full. Export a backup and remove unused questions.');storage.setItem(BANK_KEY,raw);return checked;}
export function saveBankQuestion(storage,draft,index,{topic,term=''}){
 const item=validateBankItem({spec:draft.spec,question:draft.paper.questions[index],topic,term,sample:draft.sample,savedAt:new Date().toISOString()}),items=readBank(storage);
 if(items.some(x=>x.spec.subject.toLowerCase()===item.spec.subject.toLowerCase()&&x.spec.level.toLowerCase()===item.spec.level.toLowerCase()&&x.question.prompt.trim().toLowerCase()===item.question.prompt.trim().toLowerCase()))throw new Error('This question is already in your bank. Manage it from Question bank.');
 if(items.length>=MAX_ITEMS)throw new Error('Your question bank is full (50 questions). Export a backup first.');writeBank(storage,[item,...items]);return item;
}
export function assemblePaper(values,{title,minutes=30,assessmentMode='test'}){
 if(values.length<3||values.length>20)throw new Error('Choose 3–20 questions for a paper.');
 const items=values.map(validateBankItem),first=items[0];
 if(items.some(x=>x.spec.subject.trim().toLowerCase()!==first.spec.subject.trim().toLowerCase()||x.spec.level.trim().toLowerCase()!==first.spec.level.trim().toLowerCase()))throw new Error('Choose questions from the same subject and class.');
 const notes=[...new Set(items.map(x=>x.spec.notes))].join('\n\n');
 const allTopic=items.every(x=>x.spec.sourceMode==='topic'||x.question.grounding==='topic');
 const spec={...first.spec,assessmentMode,sourceMode:allTopic?'topic':'notes',title,minutes,count:items.length,notes,format:'custom',formatInstructions:'Teacher-selected questions from the question bank.',...(allTopic?{topicInstructions:'Teacher-selected topic questions from the question bank. Verify each retained answer rationale independently.',educationStage:first.spec.educationStage||'secondary'}:{})};
 // Sections are paper-specific. Keep saved visuals and answers, then let the
 // teacher arrange sections for the new examination.
 const questions=items.map(x=>{const q=structuredClone(x.question);delete q.section;delete q.pageBreakBefore;return q;});
 return validateDraft({id:crypto.randomUUID(),spec,paper:{version:2,markingMode:'individual',instructions:'Answer all questions.',layout:{preset:spec.presentation||'standard',schoolName:'',term:''},questions},sample:items.every(x=>x.sample),model:'Teacher assembled from question bank'});
}
