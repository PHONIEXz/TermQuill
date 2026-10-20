import educator from './api/educator.js';
import lessons from './api/lessons.js';
import {authorizePage} from './lib/page-access.js';
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
 ...['login','signup','workspace','demo'].flatMap(name=>[[`/${name}`,`public/${name}.html`],[`/${name}.html`,`public/${name}.html`]]),...['account-session.js','account-page.js','workspace-page.js','demo-page.js','account.css'].map(name=>['/'+name,'public/'+name]),
 ['/educator-panel.js','public/educator-panel.js'],['/cloud-lessons.js','public/cloud-lessons.js'],['/lessons','public/lessons.html'],['/lessons-page.js','public/lessons-page.js'],['/lessons.css','public/lessons.css'],['/app-shell.js','public/app-shell.js'],['/app-shell.css','public/app-shell.css'],['/verdant.css','public/verdant.css'],
  ...['/school','/school/bank','/school/library','/school/reviews','/school/team','/school/paper','/school/trust','/school/location'].map(path=>[path,'public/school.html']),['/school.js','public/school.js'],['/school.css','public/school.css'],
  ['/find-schools','public/find-schools.html'],['/places.js','public/places.js'],['/places.css','public/places.css'],['/location.js','lib/location.js'],
  ['/privacy','public/privacy.html'],['/landing.css','public/landing.css'],['/','public/index.html'],['/create','public/index.html'],['/drafts','public/index.html'],['/guide','public/index.html'],['/question-bank','public/index.html'],['/bank-page.js','public/bank-page.js'],['/app.js','public/app.js'],['/styles.css','public/styles.css'],['/workspace.css','public/workspace.css'],['/navigation.js','public/navigation.js'],['/experience.js','public/experience.js'],['/fonts/InterVariable-5a8d3e72.woff2','public/fonts/InterVariable-5a8d3e72.woff2'],['/fonts/Inter-OFL.txt','public/fonts/Inter-OFL.txt'],
  ...['educator','identity','personal-import','visuals','early-years','bank','references','review','lessons'].map(name=>[`/${name}.js`,`lib/${name}.js`]),...['paper-blocks.js','paper-blocks.css','visual-editor.js','reference-picker.js','school-review.js','school-bank-view.js'].map(name=>[`/${name}`,`public/${name}`]),
  ['/assessment.js','lib/assessment.js'],['/drafts.js','lib/drafts.js'],['/sample.js','lib/sample.js'],['/favicon.svg','public/favicon.svg']
]);
export const server = http.createServer(async (req,res) => {
  const path = new URL(req.url,'http://localhost').pathname.replace(/\/$/,'')||'/';
  if (path === '/api/educator') return educator(req,res);
  if (path === '/api/lessons') return lessons(req,res);
  if (path === '/api/generate') return generate(req,res);
  if (path === '/api/config') return config(req,res);
  if (path === '/api/account') return account(req,res);
  if (path === '/api/places') return places(req,res);
  if (path === '/api/school') return school(req,res);
  if (req.method !== 'GET' && req.method !== 'HEAD') return json(res,405,{error:'Use GET.'});
  if(!await authorizePage(req,res))return;
  const file = routes.get(path);
  if (!file) return json(res,404,{error:'Page not found.'});
  try {
    let body = await readFile(new URL(file,import.meta.url));
    if(file==='public/index.html')body=Buffer.from(body.toString().replace('data-page="home"',`data-page="${path==='/'?'home':path.slice(1)}"${['/create','/drafts','/question-bank'].includes(path)?' class="account-pending"':''}`));
    const ext = file.split('.').pop();
    res.writeHead(200,{...securityHeaders,'Content-Type':{html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',svg:'image/svg+xml',woff2:'font/woff2',txt:'text/plain; charset=utf-8'}[ext]});
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {json(res,500,{error:'Could not load this page.'});}
});
if (process.argv[1] === fileURLToPath(import.meta.url)) server.listen(Number(process.env.PORT || 3000),'127.0.0.1',() => console.log(`TermQuill: http://127.0.0.1:${server.address().port}`));
