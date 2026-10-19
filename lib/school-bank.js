import {validateDraft} from './drafts.js';
import {assemblePaper} from './bank.js';
import {assertSchoolSize} from './visuals.js';
const invalid=message=>Object.assign(new Error(message),{status:400});
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export async function assembleSchoolPaper(payload,rpc){
 const {school_id,department_id,selections,title,minutes,assessmentMode}=payload;
 if(!uuid(school_id)||!uuid(department_id)||!Array.isArray(selections)||selections.length<3||selections.length>20)throw invalid('Choose a school department and 3–20 approved questions.');
 if(selections.some(s=>!s||!uuid(s.paper_id)||!Number.isInteger(s.revision)||s.revision<1||!Number.isInteger(s.question)||s.question<1||s.question>20))throw invalid('Invalid school question selection.');
 const keys=selections.map(s=>`${s.paper_id}:${s.revision}:${s.question}`);if(new Set(keys).size!==keys.length)throw invalid('Choose each source question once.');
 const sources=[...new Map(selections.map(s=>[`${s.paper_id}:${s.revision}`,s])).values()];if(sources.length>5)throw invalid('Use at most five approved source papers per new paper.');
 // Every read uses the signed-in user's existing RPC, never a service role.
 // No write occurs until every source has passed access and approval checks.
 const settled=await Promise.allSettled(sources.map(async s=>{const p=await rpc('paper',{school_id,paper_id:s.paper_id,revision:s.revision});if(p.revision!==s.revision||p.approved_revision!==s.revision)throw invalid('A source is no longer the approved copy. Reload the school bank.');return p;}));
 const failed=settled.find(r=>r.status==='rejected');if(failed)throw failed.reason;
 const papers=new Map(settled.map(r=>[`${r.value.id}:${r.value.revision}`,r.value]));
 const items=selections.map(s=>{const p=papers.get(`${s.paper_id}:${s.revision}`),question=p.content.paper.questions[s.question-1];if(!question)throw invalid('A source question was not found. Reload the school bank.');return {id:crypto.randomUUID(),topic:p.content.spec.subject,term:p.content.paper.layout?.term||'',spec:p.content.spec,question,sample:p.content.sample,source:{schoolId:school_id,paperId:p.id,revision:p.revision,question:s.question,authorId:p.author_id,title:p.content.spec.title}};});
 const draft=assemblePaper(items,{title,minutes,assessmentMode});draft.paper.questions.forEach((q,i)=>q.source=items[i].source);draft.model='Teacher assembled from approved school copies';const validated=validateDraft(draft),content={spec:validated.spec,paper:validated.paper,sample:validated.sample,model:validated.model};assertSchoolSize(content);return rpc('save_paper',{school_id,department_id,content});
}

export async function listSchoolBank(payload,rpc){
 const {school_id,offset=0}=payload;if(!uuid(school_id)||!Number.isInteger(offset)||offset<0||offset>10000)throw invalid('Invalid school bank page.');
 const dashboard=await rpc('dashboard',{school_id}),approved=dashboard.papers.filter(p=>Number.isInteger(p.approved_revision)&&p.approved_revision>0),batch=approved.slice(offset,offset+8);
 const results=await Promise.allSettled(batch.map(async meta=>{const p=await rpc('paper',{school_id,paper_id:meta.id,revision:meta.approved_revision});if(p.revision!==p.approved_revision)throw invalid('Source changed.');const draft=validateDraft({...p.content,id:p.id});return {id:p.id,department_id:p.department_id,author_id:p.author_id,approved_revision:p.revision,title:draft.spec.title,subject:draft.spec.subject,level:draft.spec.level};}));
 return {papers:results.filter(r=>r.status==='fulfilled').map(r=>r.value),nextOffset:offset+8<approved.length?offset+8:null,total:approved.length,skipped:results.filter(r=>r.status==='rejected').length};
}
