import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import generate from './api/generate.js';
import config from './api/config.js';
import { securityHeaders, json } from './lib/http.js';
const routes = new Map([
  ['/','public/index.html'],['/app.js','public/app.js'],['/styles.css','public/styles.css'],
  ['/assessment.js','lib/assessment.js'],['/sample.js','lib/sample.js'],['/favicon.svg','public/favicon.svg']
]);
export const server = http.createServer(async (req,res) => {
  const path = new URL(req.url,'http://localhost').pathname;
  if (path === '/api/generate') return generate(req,res);
  if (path === '/api/config') return config(req,res);
  if (req.method !== 'GET' && req.method !== 'HEAD') return json(res,405,{error:'Use GET.'});
  const file = routes.get(path);
  if (!file) return json(res,404,{error:'Page not found.'});
  try {
    const body = await readFile(new URL(file,import.meta.url));
    const ext = file.split('.').pop();
    res.writeHead(200,{...securityHeaders,'Content-Type':{html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',svg:'image/svg+xml'}[ext]});
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {json(res,500,{error:'Could not load this page.'});}
});
if (process.argv[1] === fileURLToPath(import.meta.url)) server.listen(Number(process.env.PORT || 3000),'127.0.0.1',() => console.log(`LessonPress: http://127.0.0.1:${server.address().port}`));
