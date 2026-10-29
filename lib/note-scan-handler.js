import {requireEducator,sameOrigin} from '../lib/school-auth.js';
import {json,readBody,makeLimiter,authorized} from '../lib/http.js';
import {scanImages,transcribeNotes} from '../lib/note-scan.js';
import {randomUUID} from 'node:crypto';
export const maxDuration=120;
const allow=makeLimiter(12,3600000,60);
export function createScanHandler({authenticate=requireEducator,transcribe=transcribeNotes,limiter=allow}={}){return async(req,res)=>{try{
 if(req.method!=='POST')return json(res,405,{error:'Use POST.'});if(!sameOrigin(req))return json(res,403,{error:'Open TermQuill to scan notes.'});if(!(req.headers['content-type']||'').startsWith('application/json'))return json(res,415,{error:'Send JSON.'});
 const account=await authenticate(req,res);if(req.headers['x-personal-account']!==account.user.id)return json(res,409,{error:'Your account changed. Reload before scanning.'});if(!authorized(req))return json(res,401,{error:'Enter the pilot access code.'});
 const body=await readBody(req,3500000);if(body.consent!==true||!['google','groq','automatic'].includes(body.provider))return json(res,400,{error:'Choose a provider and consent to sending these photos.'});const images=scanImages(body.images);if(!limiter(account.user.id))return json(res,429,{error:'Photo-reading limit reached. Try later or type your notes.'});
 const out=await transcribe(images,{provider:body.provider,signal:AbortSignal.timeout(105000)});return json(res,200,{...out,ownerId:account.user.id});
 }catch(e){if(e.status&&e.status<500)return json(res,e.status,{error:e.message});const reference=randomUUID(),code=e.statusCode||e.status;console.warn(JSON.stringify({event:'note_scan_failed',reference,status:code||0}));return json(res,code===429?429:503,{error:`The photo reader is unavailable${code===429?' because of provider quota':''}. Your notes are unchanged. Try another provider or type your notes. Reference: ${reference}`});}};}
export default createScanHandler();
