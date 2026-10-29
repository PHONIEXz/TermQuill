import {requireEducator,sameOrigin} from '../lib/school-auth.js';
import {json,readBody,makeLimiter} from '../lib/http.js';
import {validateTermState} from '../lib/term-plans.js';
const allow=makeLimiter(60,600000,1000);
export function createTermHandler({authenticate=requireEducator,limiter=allow}={}){return async(req,res)=>{try{
 if(!['GET','POST'].includes(req.method))return json(res,405,{error:'Use GET or POST.'});if(req.method==='POST'&&!sameOrigin(req))return json(res,403,{error:'Open TermQuill to save your plan.'});const {client,user}=await authenticate(req,res);if(req.headers['x-personal-account']!==user.id)return json(res,409,{error:'Your account changed. Reload to continue.'});let action='get',payload={};
 if(req.method==='POST'){if(!(req.headers['content-type']||'').startsWith('application/json'))return json(res,415,{error:'Send JSON.'});if(!limiter(user.id))return json(res,429,{error:'Too many changes. Try again shortly.'});const b=await readBody(req,50000);if(!Number.isSafeInteger(b.expectedVersion)||b.expectedVersion<0)throw new Error('Reload your term settings before saving.');payload={state:validateTermState(b.state),expectedVersion:b.expectedVersion};action='save';}
 const {data,error}=await client.rpc('lp_term_workspace',{p_action:action,p_payload:payload});if(error)return json(res,error.code==='40001'?409:503,{error:error.code==='40001'?'Term settings changed on another device. Reload before saving.':'Term settings could not be confirmed. Your notes are unchanged.'});return json(res,200,{...data,ownerId:user.id,emailDelivery:false});
 }catch(e){return json(res,e.status||400,{error:e.status?e.message:e.message||'Could not save these settings.'});}};}
export default createTermHandler();
