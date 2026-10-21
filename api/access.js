import {signedIn,sameOrigin} from '../lib/school-auth.js';
import {json,readBody,makeLimiter} from '../lib/http.js';
const allow=makeLimiter(60,600000,1000);
export function createAccessHandler({authenticate=signedIn,limiter=allow}={}){return async function access(req,res){try{
 if(!['GET','POST'].includes(req.method))return json(res,405,{error:'Use GET or POST.'});
 if(req.method==='POST'&&!sameOrigin(req))return json(res,403,{error:'Open TermQuill to manage access.'});
 const {client,user}=await authenticate(req,res);
 if(req.headers['x-personal-account']!==user.id)return json(res,409,{error:'Your account changed. Reload before continuing.'});
 if(!limiter(user.id))return json(res,429,{error:'Too many access requests. Wait ten minutes before retrying.'});
 const body=req.method==='GET'?{action:'bootstrap',payload:{}}:await readBody(req);
 if(!['bootstrap','search','set_listing','request_join','queue','review','history'].includes(body?.action))return json(res,400,{error:'Choose an access action.'});
 const {data,error}=await client.rpc('lp_access',{p_action:body.action,p_payload:body.payload||{}});
 if(error){const status=error.code==='42501'?403:error.code==='28000'?401:error.code==='40001'?409:error.code==='22023'?400:503;return json(res,status,{error:status===503?'Access service is unavailable. Refresh the request status before retrying.':error.message});}
 return json(res,200,data);
 }catch(e){return json(res,e.status||503,{error:e.status?e.message:'Could not complete the access request. Refresh before retrying.'});}};}
export default createAccessHandler();
