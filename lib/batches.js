import {objectiveSlots} from './objectives.js';
export const COMPLETED_BATCH=Symbol('completedBatch');
// Two bounded requests preserve the original twenty-question ceiling. Source
// text is never truncated; each request carries its allocated source ranges.
export function generationBatches(spec){
 const first=Math.ceil(spec.count/2),sizes=[first,spec.count-first],slots=spec.objectivePlan?objectiveSlots(spec):spec.lessonPlan?.flatMap(l=>Array.from({length:l.questions},()=>l));let offset=0;
 return sizes.map((count,index)=>{
  const batch={...spec,count,generationMode:'single',...(spec.format==='mixed'?{format:index===0?'mcq':'short'}:{})};
  if(spec.objectivePlan){batch.objectivePlan=spec.objectivePlan.map(o=>({...o,questions:slots.slice(offset,offset+count).filter(s=>s.id===o.id).length})).filter(o=>o.questions);}
  if(spec.lessonPlan){batch.lessonPlan=spec.lessonPlan.map(l=>({...l,questions:spec.objectivePlan?batch.objectivePlan.filter(o=>o.lessonId===l.id).reduce((n,o)=>n+o.questions,0):slots.slice(offset,offset+count).filter(s=>s.id===l.id).length})).filter(l=>l.questions);}
  if(spec.visualTasks)batch.visualTasks=spec.visualTasks.filter((_,i)=>i%2===index);
  const result={spec:batch,offset};offset+=count;return result;
 });
}
