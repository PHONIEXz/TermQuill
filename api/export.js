import {requireEducator,sameOrigin} from '../lib/school-auth.js';
import {readBody,json,makeLimiter,securityHeaders} from '../lib/http.js';
import {prepareExport,renderExport,exportFilename,exportTypes} from '../lib/paper-export.js';
const allow=makeLimiter(30,600000,1000);
export function createExportHandler({authenticate=requireEducator,limiter=allow,render=renderExport}={}){return async(req,res)=>{try{
 if(req.method!=='POST')return json(res,405,{error:'Use POST.'});
 if(!sameOrigin(req))return json(res,403,{error:'Open TermQuill to download your paper.'});
 if(!(req.headers['content-type']||'').startsWith('application/json'))return json(res,415,{error:'Send JSON.'});
 const {user,client}=await authenticate(req,res);
 if(req.headers['x-personal-account']!==user.id)return json(res,409,{error:'Your signed-in account changed. Reload before downloading.'});
 if(!limiter(user.id))return json(res,429,{error:'Too many downloads. Wait a few minutes and try again.'});
 let prepared;try{const body=await readBody(req,250000);let schoolCopy=null;
  if(body.schoolRef){const ref=body.schoolRef,uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;if(!uuid.test(ref.schoolId)||!uuid.test(ref.paperId)||!Number.isSafeInteger(ref.revision)||ref.revision<1)throw new Error('Choose a valid school paper version.');
   const {data,error}=await client.rpc('lp_workspace',{p_action:'paper',p_payload:{school_id:ref.schoolId,paper_id:ref.paperId,revision:ref.revision}});if(error||!data?.content)throw Object.assign(new Error('You cannot access this school paper version. Reload the school workspace.'),{status:403});
   // Fetch exact, access-scoped version. Never trust a posted school approval label.
   body.draft=data.content;schoolCopy={revision:data.revision,approved:data.approved_revision===data.revision};
  }
  prepared=prepareExport(body);if(schoolCopy)prepared.schoolCopy=schoolCopy;}catch(e){return json(res,e.status||400,{error:e.status===413?'This paper is too large to download. Reduce its pictures or content.':e.message});}
 let bytes;try{bytes=await render(prepared);}catch{return json(res,422,{error:'The file could not be created. Check that pictures open correctly, then try again. Your draft is unchanged. Browser Print / PDF is still available.'});}
 res.writeHead(200,{...securityHeaders,'Content-Type':exportTypes[prepared.format],'Content-Disposition':`attachment; filename="${exportFilename(prepared.draft,prepared.copy,prepared.format)}"`,'Content-Length':bytes.length});res.end(bytes);
 }catch(e){return json(res,e.status||500,{error:e.status?e.message:'Could not download this paper. Your draft is unchanged.'});}};}
export default createExportHandler();
