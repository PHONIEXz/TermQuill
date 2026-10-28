import {GENERATION_BUDGET_MS} from '../lib/generation-timing.js';
import {requireEducator,sameOrigin} from '../lib/school-auth.js';
import { validateRequest } from '../lib/assessment.js';
import { generateAssessment } from '../lib/generator.js';
import { authorized, json, makeLimiter, readBody } from '../lib/http.js';
import { publicFailure,providerStatus } from '../lib/errors.js';
import { randomUUID } from 'node:crypto';
import {COMPLETED_BATCH} from '../lib/batches.js';
export const maxDuration = 300;
const allow = makeLimiter();
export function createHandler({generate = generateAssessment, limiter = allow, authenticate = requireEducator, timeoutMs=GENERATION_BUDGET_MS} = {}) {
  return async function handler(req, res) {
    if (req.method !== 'POST') { res.setHeader('Allow','POST'); return json(res,405,{error:'Use POST.'}); }
    if (req.headers['sec-fetch-site'] === 'cross-site') return json(res,403,{error:'Open TermQuill directly to generate an assessment.'});
    if (!(req.headers['content-type'] || '').startsWith('application/json')) return json(res,415,{error:'Send JSON.'});
    if (!sameOrigin(req)) return json(res,403,{error:'Open TermQuill directly to generate an assessment.'});
    let account;try{account=await authenticate(req,res);}catch(e){return json(res,e.status||503,{error:e.status===403?e.message:e.status===401?'Sign in with your verified email before generating an assessment.':'Account check is unavailable. Please retry.'});}
    if (!authorized(req)) return json(res,401,{error:'Enter the pilot access code supplied by the owner.'});
    // Vercel sets x-vercel-forwarded-for. Locally use the actual socket address.
    const address = process.env.VERCEL ? String(req.headers['x-vercel-forwarded-for'] || 'unknown').split(',')[0] : req.socket.remoteAddress;
    if (!limiter(account.user.id+':'+address)) { res.setHeader('Retry-After','3600'); return json(res,429,{error:'Generation limit reached. Try again in an hour; you can still edit and print your draft.'}); }
    let spec,provider;
    try { const body=await readBody(req);provider=body.provider??'google';if(!['google','groq','automatic'].includes(provider))throw new Error('Choose a supported AI provider.');if(provider!=='google'&&body.providerConsent!==true)throw new Error('Confirm permission to send this request to the selected provider.');spec = validateRequest(body,{forGeneration:true}); }
    catch (error) { return json(res,error.status || 400,{error:error.message}); }
    const startedAt=Date.now();let providerCalls=0,completedBatches=0,lastModel=null;
    const onProgress=event=>{if(event.event==='provider_call'){providerCalls++;lastModel=event.model;}if(event.event==='batch_completed')completedBatches++;};
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const disconnect = () => { if (!res.writableEnded) controller.abort(); };
    res.on('close',disconnect);
    try {
      const result = await generate(spec,{signal:controller.signal,onProgress,provider});
      console.info(JSON.stringify({event:'generation_completed',model:result.model,fallbackUsed:result.fallbackUsed===true,providerCalls:result.providerCalls,batches:result.batches||1}));
      if (!res.destroyed) json(res,200,{...result,spec,generatedAt:new Date().toISOString()});
    } catch (error) {
      const failure=publicFailure(error,controller.signal.aborted),requestId=randomUUID();
      // Log only whitelisted diagnostic values, never the raw provider error,
      // response body, request headers, lesson notes, or API key.
      console.warn(JSON.stringify({event:'generation_failed',requestId,code:failure.code,providerStatus:providerStatus(error),elapsedMs:Date.now()-startedAt,questionCount:spec.count,generationMode:spec.generationMode||'single',providerCalls,completedBatches,lastModel,...(failure.code==='ASSESSMENT_VALIDATION'&&typeof error.validationChecks==='string'?{validationChecks:error.validationChecks.slice(0,1200)}:{})}));
      if(failure.code==='PROVIDER_QUOTA')res.setHeader('Retry-After','60');
      if (!res.destroyed) json(res,failure.status,{error:failure.error,code:failure.code,requestId,...(error[COMPLETED_BATCH]?{partialDraft:error[COMPLETED_BATCH]}:{})});
    } finally {clearTimeout(timer);res.off('close',disconnect);}
  };
}
export default createHandler();
