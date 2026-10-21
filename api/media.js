import {requireEducator,sameOrigin} from '../lib/school-auth.js';
import {json,readBody,makeLimiter} from '../lib/http.js';
import {searchMedia,loadMedia} from '../lib/media.js';
const allow=makeLimiter(60,3600000,1000);
export function createMediaHandler({authenticate=requireEducator,search=searchMedia,load=loadMedia,limiter=allow}={}){return async(req,res)=>{try{if(req.method!=='POST')return json(res,405,{error:'Use POST.'});if(!sameOrigin(req))return json(res,403,{error:'Open TermQuill to search for pictures.'});const {user}=await authenticate(req,res);if(!limiter(user.id))return json(res,429,{error:'Image search limit reached. Try again in an hour, or use built-in objects and uploads.'});const body=await readBody(req);if(body.action==='search')return json(res,200,await search(body));if(body.action==='preview')return json(res,200,await load(body.id));return json(res,400,{error:'Choose search or preview.'});}catch(e){return json(res,e.status||503,{error:e.status?e.message:'Image search could not finish. Try again or use an uploaded picture.'});}};}
export default createMediaHandler();
