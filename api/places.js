import {authClient,sameOrigin} from '../lib/school-auth.js';
import {json,readBody,makeLimiter} from '../lib/http.js';
const allow=makeLimiter(60,600000,1000);
export default async function places(req,res){
 if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return json(res,405,{error:'Use GET or POST.'});}
 if(req.headers['sec-fetch-site']==='cross-site'||(req.headers.origin&&!sameOrigin(req)))return json(res,403,{error:'Open TermQuill to search the school directory.'});
 if(req.method==='POST'&&!(req.headers['content-type']||'').startsWith('application/json'))return json(res,415,{error:'Send a JSON directory search.'});
 const address=process.env.VERCEL?String(req.headers['x-vercel-forwarded-for']||'unknown').split(',')[0]:req.socket?.remoteAddress||'local';
 if(!allow(address)){res.setHeader('Retry-After','600');return json(res,429,{error:'Too many directory requests. Please try again in ten minutes.'});}
 try{const input=req.method==='POST'?await readBody(req):{};if(!input||typeof input!=='object'||Array.isArray(input))return json(res,400,{error:'Check the directory search.'});
 const {data,error}=await authClient().rpc('lp_public_places',{p_query:input});if(error)return json(res,400,{error:'Could not load the directory. Check the search and try again.'});return json(res,200,data);
 }catch(e){if(e.status)return json(res,e.status,{error:'Check the directory search.'});return json(res,503,{error:'The school directory is unavailable. Try again later.'});}
}
