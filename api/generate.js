import { validateRequest } from '../lib/assessment.js';
import { generateAssessment } from '../lib/generator.js';
import { authorized, json, makeLimiter, readBody } from '../lib/http.js';
import { publicFailure,providerStatus } from '../lib/errors.js';
import { randomUUID } from 'node:crypto';
export const maxDuration = 120;
const allow = makeLimiter();
export function createHandler({generate = generateAssessment, limiter = allow} = {}) {
  return async function handler(req, res) {
    if (req.method !== 'POST') { res.setHeader('Allow','POST'); return json(res,405,{error:'Use POST.'}); }
    if (req.headers['sec-fetch-site'] === 'cross-site') return json(res,403,{error:'Open LessonPress directly to generate an assessment.'});
    if (!(req.headers['content-type'] || '').startsWith('application/json')) return json(res,415,{error:'Send JSON.'});
    if (!authorized(req)) return json(res,401,{error:'Enter the pilot access code supplied by the owner.'});
    // Vercel sets x-vercel-forwarded-for. Locally use the actual socket address.
    const address = process.env.VERCEL ? String(req.headers['x-vercel-forwarded-for'] || 'unknown').split(',')[0] : req.socket.remoteAddress;
    if (!limiter(address)) { res.setHeader('Retry-After','3600'); return json(res,429,{error:'Generation limit reached. Try again in an hour; you can still edit and print your draft.'}); }
    let spec;
    try { spec = validateRequest(await readBody(req)); }
    catch (error) { return json(res,error.status || 400,{error:error.message}); }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 105000);
    const disconnect = () => { if (!res.writableEnded) controller.abort(); };
    res.on('close',disconnect);
    try {
      const result = await generate(spec,{signal:controller.signal});
      if (!res.destroyed) json(res,200,{...result,spec,generatedAt:new Date().toISOString()});
    } catch (error) {
      const failure=publicFailure(error,controller.signal.aborted),requestId=randomUUID();
      // Log only whitelisted diagnostic values, never the raw provider error,
      // response body, request headers, lesson notes, or API key.
      console.warn(JSON.stringify({event:'generation_failed',requestId,code:failure.code,providerStatus:providerStatus(error)}));
      if(failure.code==='PROVIDER_QUOTA')res.setHeader('Retry-After','60');
      if (!res.destroyed) json(res,failure.status,{error:failure.error,code:failure.code,requestId});
    } finally {clearTimeout(timer);res.off('close',disconnect);}
  };
}
export default createHandler();
