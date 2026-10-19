import { copyFile,readFile,writeFile,mkdir } from 'node:fs/promises';
for (const name of ['assessment','sample','drafts','location','visuals','early-years','bank']) await copyFile(new URL(`../lib/${name}.js`,import.meta.url),new URL(`../public/${name}.js`,import.meta.url));
const template=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
for(const page of ['create','drafts','guide','question-bank'])await writeFile(new URL(`../public/${page}.html`,import.meta.url),template.replace('data-page="home"',`data-page="${page}"`));
console.log('Browser modules prepared.');

await mkdir(new URL('../public/school/',import.meta.url),{recursive:true});
for(const page of ['library','reviews','team','paper','trust','location'])await copyFile(new URL('../public/school.html',import.meta.url),new URL(`../public/school/${page}.html`,import.meta.url));
