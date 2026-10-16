import { timingSafeEqual, createHash } from 'node:crypto';
export const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
  'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'no-referrer', 'X-Frame-Options':'DENY', 'Permissions-Policy':'camera=(), microphone=(), geolocation=()', 'Cache-Control':'no-store'
};
export function json(res, status, value) { res.writeHead(status, {...securityHeaders, 'Content-Type':'application/json; charset=utf-8'}); res.end(JSON.stringify(value)); }
export async function readBody(req) {
  // Vercel may have already parsed the body. Apply an independent size cap.
  if (req.body !== undefined) {
    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    if (Buffer.byteLength(raw) > 100000) throw Object.assign(new Error('Request too large.'), {status:413});
    return typeof req.body === 'string' ? JSON.parse(raw) : req.body;
  }
  let size = 0; const chunks = [];
  for await (const chunk of req) {
    size += Buffer.byteLength(chunk);
    if (size > 100000) throw Object.assign(new Error('Request too large.'), {status:413});
    chunks.push(Buffer.from(chunk));
  }
  try { return JSON.parse(Buffer.concat(chunks).toString()); }
  catch { throw Object.assign(new Error('Send valid JSON.'), {status:400}); }
}
export function authorized(req, code = process.env.LESSONPRESS_ACCESS_CODE) {
  if (!code) return true;
  const hash = value => createHash('sha256').update(value).digest();
  return timingSafeEqual(hash(String(req.headers['x-access-code'] || '')),hash(code));
}
export function makeLimiter(limit = 8, windowMs = 3600000, globalLimit = 100) {
  const buckets = new Map(); let all = {count:0, until:0};
  return (key, now = Date.now()) => {
    for (const [k,v] of buckets) if (v.until <= now) buckets.delete(k);
    if (now >= all.until) all = {count:0, until:now + windowMs};
    if (all.count >= globalLimit) return false;
    let bucket = buckets.get(key);
    if (!bucket) { if (buckets.size >= 10000) return false; bucket = {count:0,until:now + windowMs}; buckets.set(key,bucket); }
    if (bucket.count >= limit) return false;
    bucket.count++; all.count++; return true;
  };
}
