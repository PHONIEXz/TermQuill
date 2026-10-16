import { copyFile } from 'node:fs/promises';
for (const name of ['assessment','sample']) await copyFile(new URL(`../lib/${name}.js`,import.meta.url),new URL(`../public/${name}.js`,import.meta.url));
console.log('Browser modules prepared.');
