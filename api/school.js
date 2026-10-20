import {assembleSchoolPaper,listSchoolBank} from '../lib/school-bank.js';
import {assertSchoolSize} from '../lib/visuals.js';
import {json,readBody} from '../lib/http.js';
import {signedIn,sameOrigin} from '../lib/school-auth.js';
import {validateSchoolLocation} from '../lib/location.js';
import {validateDraft} from '../lib/drafts.js';
const actions=new Set(['bootstrap','dashboard','create_school','create_department','invite','revoke_invite','accept_invite','remove_member','save_paper','paper','submit','review','audit_list','verification_request','print_request','place_get','place_save','place_remove','assemble_school_paper','school_bank_catalogue']);
export default async function school(req,res){
 try{
  if(req.method!=='POST')return json(res,405,{error:'Use POST.'});
  if(!sameOrigin(req))return json(res,403,{error:'Open LessonPress and try again.'});
  const {client}=await signedIn(req,res);
  const {action,payload={}}=await readBody(req);
  if(!actions.has(action)||!payload||Array.isArray(payload)||typeof payload!=='object')return json(res,400,{error:'Invalid workspace request.'});
  if(['assemble_school_paper','school_bank_catalogue'].includes(action)){const out=await (action==='assemble_school_paper'?assembleSchoolPaper:listSchoolBank)(payload,async(action,payload)=>{const {data,error}=await client.rpc('lp_workspace',{p_action:action,p_payload:payload});if(error)throw Object.assign(new Error(['42501','28000'].includes(error.code)?'You do not have permission to reuse this school source.':error.code==='40001'?'A newer version exists. Reload the bank.':'Could not access or save this school paper.'),{status:['42501','28000'].includes(error.code)?403:400});return data;});return json(res,200,out);}
  if(action==='create_school'&&payload.confirmAuthority!==true)return json(res,400,{error:'Confirm you are authorised to create this school workspace.'});
  if(action==='place_save'){try{Object.assign(payload,validateSchoolLocation(payload));}catch(e){return json(res,400,{error:e.message});}}
  if(action==='save_paper'){
   const draft=validateDraft({...payload.content,id:'00000000-0000-4000-8000-000000000001',savedAt:new Date().toISOString()});
   payload.content={spec:draft.spec,paper:draft.paper,sample:draft.sample,model:draft.model};assertSchoolSize(payload.content);
  }
  const {data,error}=await client.rpc('lp_workspace',{p_action:action,p_payload:payload});
  if(error){console.warn(JSON.stringify({event:'school_request_failed',action,code:error.code||'unknown'}));if(error.code==='P0429'){res.setHeader('Retry-After','3600');return json(res,429,{error:'School invitation limit reached. Try again after the hourly window resets.'});}if(error.message?.startsWith('School verification is required'))return json(res,403,{error:'School verification is required before creating new invitations. Request a check from School trust & activity.'});if(error.message?.startsWith('Verify the school before publishing'))return json(res,403,{error:'Verify this school before listing its location publicly. You can save a private location now.'});const forbidden=['42501','28000'].includes(error.code);const conflict=error.code==='40001';return json(res,forbidden?403:conflict?409:400,{error:forbidden?'You do not have permission for this action, or the invitation is invalid.':conflict?'A newer version exists. Reload before continuing.':safeMessage(error.message)});}
  return json(res,200,data);
 }catch(e){return json(res,e.status||400,{error:e.status?e.message:'Could not complete this request. Check your assessment and try again.'});}
}
function safeMessage(message){const allowed=['Pilot limit:','You already belong','Only principals','Enter a valid email','Another version','Withdraw through','Invalid assessment','This paper','An independent','Reload the latest','Version not found','Request too large','Enter a public HTTPS','Reload the latest verification','This school already','Check the school coordinates','Check the location accuracy'];return allowed.some(s=>message?.startsWith(s))?message:'Could not save this change. Check the fields and try again.';}
