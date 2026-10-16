import {json,readBody} from '../lib/http.js';
import {signedIn,sameOrigin} from '../lib/school-auth.js';
import {validateDraft} from '../lib/drafts.js';
const actions=new Set(['bootstrap','dashboard','create_school','create_department','invite','revoke_invite','accept_invite','remove_member','save_paper','paper','submit','review']);
export default async function school(req,res){
 try{
  if(req.method!=='POST')return json(res,405,{error:'Use POST.'});
  if(!sameOrigin(req))return json(res,403,{error:'Open LessonPress and try again.'});
  const {client}=await signedIn(req,res);
  const {action,payload={}}=await readBody(req);
  if(!actions.has(action)||!payload||Array.isArray(payload)||typeof payload!=='object')return json(res,400,{error:'Invalid workspace request.'});
  if(action==='save_paper'){
   const draft=validateDraft({...payload.content,id:'00000000-0000-4000-8000-000000000001',savedAt:new Date().toISOString()});
   payload.content={spec:draft.spec,paper:draft.paper,sample:draft.sample,model:draft.model};
  }
  const {data,error}=await client.rpc('lp_workspace',{p_action:action,p_payload:payload});
  if(error){console.warn(JSON.stringify({event:'school_request_failed',action,code:error.code||'unknown'}));const forbidden=['42501','28000'].includes(error.code);const conflict=error.code==='40001';return json(res,forbidden?403:conflict?409:400,{error:forbidden?'You do not have permission for this action, or the invitation is invalid.':conflict?'A newer version exists. Reload before continuing.':safeMessage(error.message)});}
  return json(res,200,data);
 }catch(e){return json(res,e.status||400,{error:e.status?e.message:'Could not complete this request. Check your assessment and try again.'});}
}
function safeMessage(message){const allowed=['Pilot limit:','You already belong','Only principals','Enter a valid email','Another version','Withdraw through','Invalid assessment','This paper','An independent','Reload the latest','Version not found','Request too large'];return allowed.some(s=>message?.startsWith(s))?message:'Could not save this change. Check the fields and try again.';}
