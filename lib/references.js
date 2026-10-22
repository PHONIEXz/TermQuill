import {readBank} from './bank.js';
import {readDrafts} from './drafts.js';
import {validateRequest} from './assessment.js';
export const MODE_PRESETS={test:{minutes:20,count:6,instructions:'Answer all questions. Show your working where needed.'},exam:{minutes:60,count:12,instructions:'Read each section carefully. Answer the required questions and show your working where needed.'}};
// Editable starting points, not curriculum requirements or fixed exam lengths.
const STAGE_DEFAULTS={
 early:{level:'Kindergarten',subject:'Early learning',title:'Shapes, letters & numbers',presentation:'early',format:'short',difficulty:'recall',marksEach:1,test:[6,20],exam:[10,30]},
 primary:{level:'Primary 4',subject:'Basic Science',title:'Living things & their environment',presentation:'primary',format:'mixed',difficulty:'mixed',marksEach:2,test:[6,20],exam:[12,45]},
 secondary:{level:'SS1',subject:'Chemistry',title:'Elements, compounds & mixtures',presentation:'standard',format:'mixed',difficulty:'mixed',marksEach:2,test:[6,20],exam:[12,60]},
 vocational:{level:'Level 1',subject:'Vocational skills',title:'Tools, safety & practical skills',presentation:'standard',format:'short',difficulty:'application',marksEach:3,test:[6,30],exam:[12,90]},
 undergraduate:{level:'Year 1',subject:'Course assessment',title:'Course concepts & applications',presentation:'standard',format:'mixed',difficulty:'application',marksEach:5,test:[6,30],exam:[12,90]},
 postgraduate:{level:'Postgraduate',subject:'Research methods',title:'Research design & critical analysis',presentation:'standard',format:'short',difficulty:'application',marksEach:5,test:[6,45],exam:[10,120]},
 adult:{level:'Adult learners',subject:'Communication skills',title:'Practical communication',presentation:'standard',format:'mixed',difficulty:'application',marksEach:2,test:[6,20],exam:[10,45]}
};
export function stagePreset(stage,mode='test'){const base=STAGE_DEFAULTS[stage]||STAGE_DEFAULTS.secondary;const {test,exam,...settings}=base;const [count,minutes]=mode==='exam'?exam:test;return {...settings,count,minutes};}
const key=value=>value.trim().toLowerCase();
export function gatherReferences(storage){
 const items=[],warnings=[],seen=new Set();
 const add=(id,spec,question,label,sample)=>{if(spec.sourceMode==='topic'||question.grounding==='topic')return;const fingerprint=JSON.stringify([key(spec.subject),key(spec.level),key(question.prompt)]);if(seen.has(fingerprint))return;seen.add(fingerprint);items.push({id,spec,question,label,sample});};
 try{for(const item of readBank(storage))add(`bank-${item.id}`,item.spec,item.question,`Question bank · ${item.topic}`,item.sample);}catch{warnings.push('Your question bank could not be read. Restore its backup before using it.');}
 try{for(const draft of readDrafts(storage))draft.paper.questions.forEach((q,i)=>add(`draft-${draft.id}-${i}`,draft.spec,q,`Saved paper · ${draft.spec.title}`,draft.sample));}catch{warnings.push('Saved papers could not be read. Restore a paper backup before using it.');}
 return {items,warnings};
}
export function referenceRequest(base,values){
 if(!Array.isArray(values)||values.length<1||values.length>10)throw new Error('Select 1–10 past questions as references.');
 if(values.some(x=>key(x.spec.subject)!==key(base.subject)||key(x.spec.level)!==key(base.level)))throw new Error('Reference questions must match the subject and class you selected.');
 const notes=[...new Set(values.map(x=>x.spec.notes))].join('\n\n');
 if(notes.length>18000)throw new Error('These references contain too much source material. Select fewer papers or questions from the same paper.');
 const {lessonPlan,objectivePlan,...settings}=base;
 return validateRequest({...settings,sourceMode:'references',referenceQuestions:values.map(x=>x.question.prompt),notes});
}
