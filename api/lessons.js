import {requireEducator,sameOrigin} from '../lib/school-auth.js';
import {json,readBody,makeLimiter} from '../lib/http.js';
import {validateLesson,validateLessons} from '../lib/lessons.js';
const allow=makeLimiter(100,600000,2000);
export function createLessonsHandler({authenticate=requireEducator,limiter=allow}={}){return async(req,res)=>{try{
 if(!['GET','POST'].includes(req.method))return json(res,405,{error:'Use GET or POST.'});
 if(req.method==='POST'&&!sameOrigin(req))return json(res,403,{error:'Open TermQuill to change your lessons.'});
 const {client,user}=await authenticate(req,res);if(req.headers['x-personal-account']!==user.id)return json(res,409,{error:'Your signed-in account changed. Reload before opening or saving personal lessons.'});let action='list',payload={};
 if(req.method==='POST'){
  if(!(req.headers['content-type']||'').startsWith('application/json'))return json(res,415,{error:'Send JSON.'});
  if(!limiter(user.id))return json(res,429,{error:'Too many library changes. Wait before retrying.'});
  const body=await readBody(req,3200000);action=body.action;
  if(action==='import'){if(body.confirmImport!==true)return json(res,400,{error:'Confirm the selected notes belong to you and should be copied to your private cloud library.'});payload={items:validateLessons(body.backup)};}
  else if(action==='save')payload={note:validateLesson(body.note),expectedVersion:body.expectedVersion};
  else if(['remove','restore'].includes(action))payload={id:body.id,expectedVersion:body.expectedVersion};
  else return json(res,400,{error:'Choose a valid library action.'});
  if(action!=='import'&&(!Number.isSafeInteger(payload.expectedVersion)||payload.expectedVersion<0||typeof (payload.id||payload.note?.id)!=='string'||!/^[-\w]{1,80}$/.test(payload.id||payload.note.id)))return json(res,400,{error:'A valid lesson identifier and version are required.'});
 }
 const {data,error}=await client.rpc('lp_personal_lessons',{p_action:action,p_payload:payload});
 if(error){const denied=['28000','42501'].includes(error.code),conflict=error.code==='40001',missing=['PGRST202','42883'].includes(error.code);return json(res,denied?403:conflict?409:missing?503:400,{error:denied?'You do not have access to this personal library.':conflict?'This lesson changed or was removed on another device. Reload the library; your editor text has been kept.':missing?'Cloud lessons are not ready yet. Your browser notes remain untouched.':error.message?.startsWith('Personal library limit:')?error.message:'Could not save this library change. Existing cloud notes were kept.'});}
 return json(res,200,{...data,ownerId:user.id});
 }catch(e){return json(res,e.status||400,{error:e.status?e.message:e.message?.startsWith('Choose a TermQuill')||e.message?.startsWith('Lesson library')?e.message:'Could not complete this request. Your notes were kept.'});}};}
export default createLessonsHandler();
