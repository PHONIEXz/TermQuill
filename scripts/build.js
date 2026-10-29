import { copyFile,readFile,writeFile,mkdir } from 'node:fs/promises';
for (const name of ['term-plans','showcases','paper-icons','generation-timing','diagrams','edit-history','objectives','quality','coverage','device-setup','lesson-examples','educator','identity','personal-import','assessment','sample','drafts','location','visuals','early-years','bank','references','review','lessons']) await copyFile(new URL(`../lib/${name}.js`,import.meta.url),new URL(`../public/${name}.js`,import.meta.url));
const template=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
for(const page of ['create','drafts','guide','question-bank'])await writeFile(new URL(`../public/${page}.html`,import.meta.url),template.replace('data-page="home"',`data-page="${page}"${page==='guide'?'':' class="account-pending"'}`).replaceAll(/src="(\/images\/learning-[^"]+)"/g,'data-home-src="$1"'));
console.log('Browser modules prepared.');

await mkdir(new URL('../public/school/',import.meta.url),{recursive:true});
for(const page of ['library','bank','reviews','team','paper','trust','location'])await copyFile(new URL('../public/school.html',import.meta.url),new URL(`../public/school/${page}.html`,import.meta.url));

const {SHOWCASES,showcaseDraft}=await import('../lib/showcases.js');
const {renderExport}=await import('../lib/paper-export.js');
await mkdir(new URL('../public/examples/',import.meta.url),{recursive:true});
for(const s of SHOWCASES)for(const format of ['pdf','pptx'])for(const copy of ['student','teacher'])await writeFile(new URL(`../public/examples/${s.id}-${copy}.${format}`,import.meta.url),await renderExport({draft:showcaseDraft(s.id),format,copy}));
console.log('Seven showcases and 28 example exports prepared.');
