import {readFile} from 'node:fs/promises';
import * as visuals from '../lib/visuals.js';
import {earlyYearsSample} from '../lib/early-years.js';
const modules=[['paper-blocks',['renderBlocks','applyPaperLayout','iconElement']],['visual-editor',['blockEditor','layoutEditor','compressPicture']]];
const sources=await Promise.all(modules.map(async([name,exports])=>[(await readFile(new URL(`../public/${name}.js`,import.meta.url),'utf8')).replace(/^import .*;\n/gm,'').replace(/export (function|async function) /g,'$1 '),exports]));
export function installVisuals(w){Object.assign(w,visuals,{earlyYearsSample});for(const [source,exports] of sources)w.eval(`(()=>{${source}\nObject.assign(window,{${exports.join(',')}});})()`);}
