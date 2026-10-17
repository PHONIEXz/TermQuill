import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import generate from './api/generate.js';
import config from './api/config.js';
import account from './api/account.js';
import places from './api/places.js';
import school from './api/school.js';
import { securityHeaders, json } from './lib/http.js';
const routes = new Map([
  ...['/school','/school/library','/school/reviews','/school/team','/school/paper','/school/trust','/school/location'].map(path=>[path,'public/school.html']),['/school.js','public/school.js'],['/school.css','public/school.css'],
  ['/find-schools','public/find-schools.html'],['/places.js','public/places.js'],['/places.css','public/places.css'],['/location.js','lib/location.js'],
  ['/privacy','public/privacy.html'],['/landing.css','public/landing.css'],['/','public/index.html'],['/create','public/index.html'],['/drafts','public/index.html'],['/guide','public/index.html'],['/app.js','public/app.js'],['/styles.css','public/styles.css'],
  ['/assessment.js','lib/assessment.js'],['/drafts.js','lib/drafts.js'],['/sample.js','lib/sample.js'],['/favicon.svg','public/favicon.svg']
]);
export const server = http.createServer(async (req,res) => {
  const path = new URL(req.url,'http://localhost').pathname.replace(/\/$/,'')||'/';
  if (path === '/api/generate') return generate(req,res);
  if (path === '/api/config') return config(req,res);
  if (path === '/api/account') return account(req,res);
  if (path === '/api/places') return places(req,res);
  if (path === '/api/school') return school(req,res);
  if (req.method !== 'GET' && req.method !== 'HEAD') return json(res,405,{error:'Use GET.'});
  const file = routes.get(path);
  if (!file) return json(res,404,{error:'Page not found.'});
  try {
    let body = await readFile(new URL(file,import.meta.url));
    if(file==='public/index.html')body=Buffer.from(body.toString().replace('data-page="home"',`data-page="${path==='/'?'home':path.slice(1)}"`));
    const ext = file.split('.').pop();
    res.writeHead(200,{...securityHeaders,'Content-Type':{html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',svg:'image/svg+xml'}[ext]});
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {json(res,500,{error:'Could not load this page.'});}
});
if (process.argv[1] === fileURLToPath(import.meta.url)) server.listen(Number(process.env.PORT || 3000),'127.0.0.1',() => console.log(`LessonPress: http://127.0.0.1:${server.address().port}`));
