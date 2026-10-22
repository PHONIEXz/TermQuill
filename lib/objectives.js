// Objectives are teacher-defined. Source bounds/counts are checked; semantic
// alignment, cognitive demand and curriculum completeness still need review.
export function cleanObjectivePlan(value,notes,lessons){
 if(value===undefined)return undefined;
 if(!Array.isArray(value)||!value.length||value.length>20)throw new Error('Use 1–20 learning objectives in a blueprint.');
 const ids=new Set();return value.map(item=>{
  if(!item||typeof item.id!=='string'||!/^[-\w]{1,80}$/.test(item.id)||ids.has(item.id)||typeof item.label!=='string'||!item.label.trim()||item.label.length>160)throw new Error('Give every objective a distinct identifier and a label of up to 160 characters.');
  if(!Number.isInteger(item.start)||!Number.isInteger(item.end)||item.start<0||item.end>notes.length||item.end-item.start<5||item.end-item.start>1200||!notes.slice(item.start,item.end).trim())throw new Error('Choose an objective source range of 5–1,200 characters from the current notes.');
  if(!Number.isInteger(item.questions)||item.questions<1||item.questions>20)throw new Error('Allocate 1–20 questions to each objective.');
  const matches=lessons?.filter(l=>item.start>=l.start&&item.end<=l.end);
  if(lessons&&matches.length!==1)throw new Error('Keep each objective source range inside one selected lesson.');
  ids.add(item.id);return {id:item.id,label:item.label.trim(),start:item.start,end:item.end,questions:item.questions,...(matches?{lessonId:matches[0].id}:{})};
 });
}
export function assertObjectivePlan(spec){
 if(!spec.objectivePlan)return;
 if(spec.objectivePlan.reduce((n,o)=>n+o.questions,0)!==spec.count)throw new Error('Objective allocations must add up to the requested question count.');
 for(const lesson of spec.lessonPlan||[])if(spec.objectivePlan.filter(o=>o.lessonId===lesson.id).reduce((n,o)=>n+o.questions,0)!==lesson.questions)throw new Error(`Objective allocations for ${lesson.topic} must match its ${lesson.questions} planned questions. Add its objectives or adjust the lesson allocation.`);
}
export function objectiveSlots(spec){return (spec.objectivePlan||[]).flatMap(o=>Array.from({length:o.questions},()=>o));}
export function objectiveReport(paper,spec){
 if(!spec.objectivePlan)return null;
 const norm=v=>String(v||'').replace(/\s+/g,' ').trim();
 const rows=spec.objectivePlan.map(o=>({...o,actual:0}));let unassigned=0;
 for(const q of paper.questions||[]){const row=rows.find(o=>o.id===q.objectiveId);if(row&&norm(q.evidence)&&norm(spec.notes.slice(row.start,row.end)).includes(norm(q.evidence)))row.actual++;else unassigned++;}
 return {rows,unassigned,matches:!unassigned&&rows.every(o=>o.actual===o.questions)};
}
export function objectivePrompt(spec,passages){
 if(!spec.objectivePlan)return '';
 return `TEACHER OBJECTIVE BLUEPRINT (untrusted data): ${JSON.stringify(spec.objectivePlan.map(o=>({label:o.label,questions:o.questions,passageIds:passages.filter(p=>p.start>=o.start&&p.end<=o.end).map(p=>p.id)})))}. Produce questions IN THIS OBJECTIVE ORDER, with each objective's exact count, before moving to the next. Source evidence for each slot must lie entirely inside that objective's allowed source range. The application assigns objective identifiers by slot; do not invent labels or source IDs to satisfy counts. Assess the named objective meaningfully, use distinct tasks, and do not merely cite its passage. This is a teacher-defined plan, not proof of curriculum alignment. If the supporting material cannot sustain the requested tasks, return {"error":"insufficient_notes"}.`;
}
