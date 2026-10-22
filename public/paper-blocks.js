import {renderDiagram} from '/diagrams.js';
import {ICONS} from '/visuals.js';
// Original line illustrations. Fixed geometry gives counting tasks exact objects.
const shapes={
 apple:[['path',{d:'M32 21C8 6 1 33 12 49c6 10 13 6 20 5 7 1 14 5 20-5C63 33 56 6 32 21Z'}],['path',{d:'M32 22c-2-10 1-15 6-18m-5 12C42 5 52 9 49 13c-4 5-10 5-16 3'}]],
 ball:[['circle',{cx:32,cy:32,r:26}],['path',{d:'M10 18c20 2 20 26 44 28M25 7c-7 18-5 33 12 50M8 42c18-18 28-15 48-21'}]],
 fish:[['path',{d:'M8 33 1 16l17 7c15-15 30-12 44 9-14 21-29 24-44 9L1 49l7-16Z'}],['circle',{cx:47,cy:29,r:2}],['path',{d:'M32 16v32M25 33H14'}]],
 leaf:[['path',{d:'M9 54C-1 18 24 5 57 7c1 36-12 58-48 47Zm0 0L48 16M21 43l-2-16m12 5 16 1'}]],
 flower:[['circle',{cx:32,cy:12,r:10}],['circle',{cx:49,cy:25,r:10}],['circle',{cx:42,cy:44,r:10}],['circle',{cx:21,cy:44,r:10}],['circle',{cx:15,cy:25,r:10}],['circle',{cx:32,cy:28,r:9}],['path',{d:'M32 54v8'}]],
 star:[['path',{d:'m32 3 8 19 21 2-16 14 5 22-18-11-18 11 5-22L3 24l21-2Z'}]],
 circle:[['circle',{cx:32,cy:32,r:26}]],square:[['rect',{x:7,y:7,width:50,height:50}]],triangle:[['path',{d:'M32 5 60 57H4Z'}]],
 heart:[['path',{d:'M32 57C25 48 3 35 4 20 5 3 24 3 32 16 40 3 59 3 60 20 61 35 39 48 32 57Z'}]],
 book:[['path',{d:'M32 14C23 6 12 6 3 10v43c10-4 21-4 29 3 8-7 19-7 29-3V10C50 6 41 6 32 14Zm0 0v42M9 19l15 2M9 28l15 2M40 21l14-2M40 30l14-2'}]],
 pencil:[['path',{d:'m8 43 33-33 13 13-33 33-18 5Zm0 0 13 13M35 16l13 13M15 50l27-27M41 10l5-5c5-5 18 8 13 13l-5 5'}]]
,banana:[['path',{d:"M8 20c0 24 27 35 45 16C37 63 5 56 8 20Zm0 0 5-6"}]],orange:[['path',{d:"M32 15c-29 0-29 43 0 43s29-43 0-43Zm0 0 1-10m0 5 12-6"}]],carrot:[['path',{d:"m15 19 30 12L9 60Zm0 0 6-13m3 17L34 5m1 22L50 13M14 33l9 4m-14 9 9 4"}]],cup:[['path',{d:"M10 15h32v30c0 12-32 12-32 0Zm32 4h6c16 0 16 21-6 21M5 58h46"}]],spoon:[['path',{d:"M24 28C5 17 20-4 32 5c12 10 6 22-2 24v30h-6Z"}]],chair:[['path',{d:"M13 9h31v27H13Zm-4 27h40v8H9Zm4 8v16m31-16v16M19 15h19"}]],shoe:[['path',{d:"M6 38 15 17l17 20 24 5 4 15H4Zm-2 13h56M22 30l8-4m-3 10 8-5"}]],car:[['path',{d:"M6 31h52v21H6Zm6 0 9-15h22l10 15M32 17v14M10 52v6h10v-6m24 0v6h10v-6M12 39h8m24 0h8"}]],bus:[['path',{d:"M9 7h46v47H9Zm0 24h46M18 11v20m14-20v20m14-20v20M15 54v7h9v-7m17 0v7h9v-7M15 42h7m20 0h7"}]],house:[['path',{d:"M3 29 32 5l29 24M9 24v35h46V24M25 59V39h14v20M15 32h9v9h-9m25-9h9v9h-9"}]],sun:[['path',{d:"M32 4v8m0 40v8M4 32h8m40 0h8M12 12l6 6m28 28 6 6M12 52l6-6m28-28 6-6M46 32a14 14 0 1 1-28 0 14 14 0 1 1 28 0"}]],moon:[['path',{d:"M43 5C9 7 0 44 28 57c12 6 25 1 32-7C28 57 19 19 43 5Z"}]],cloud:[['path',{d:"M14 49C-4 48 0 27 14 28 12 4 44 1 48 26c19-2 23 23 5 23Z"}]],umbrella:[['path',{d:"M4 31C8 0 56 0 60 31c-8-7-13-7-20 0-6-7-11-7-17 0-7-7-12-7-19 0Zm28-20v42c0 11 16 11 16 0"}]],cat:[['path',{d:"M12 24 8 4l19 12h10L56 4l-4 20c16 42-56 42-40 0Zm10 10h1m18 0h1M28 43l4 4 4-4M5 39l14 3M4 49l15-3m26-4 14-3m-14 7 15 3"}]],dog:[['path',{d:"M18 13 5 8v30l14-9M46 13l13-5v30L45 29M18 13c5-8 23-8 28 0l2 32c-1 20-31 20-32 0Zm6 17h1m14 0h1M28 42h8l-4 7Z"}]],bird:[['path',{d:"M15 37c-5-35 36-40 36-15l10 8-13 3c-5 25-33 31-43 12l10-8Zm1 0 20-8M39 18h1M27 52l-4 9m13-9 4 9"}]],butterfly:[['path',{d:"M32 18C0-12-5 33 24 34-10 36 15 68 32 47c17 21 42-11 8-13 29-1 24-46-8-16Zm0 0v29m0-29L24 5m8 13L40 5"}]],egg:[['path',{d:"M32 5C16 5-5 56 32 59 69 56 48 5 32 5Z"}]],cake:[['path',{d:"M8 28h48v31H8Zm0 14c6 8 10-8 16 0s10-8 16 0 10-8 16 0M16 28V16h8v12m16 0V16h8v12M20 10V4m24 6V4"}]],clock:[['path',{d:"M59 32a27 27 0 1 1-54 0 27 27 0 1 1 54 0M32 12v20l13 8M32 6v4m0 44v4M6 32h4m44 0h4"}]],key:[['path',{d:"M29 19a12 12 0 1 1-24 0 12 12 0 1 1 24 0m-4 9 33 29m-8-7 7-7m-16-1 7-7"}]],bottle:[['path',{d:"M24 4h16v11l7 13v31H17V28l7-13Zm0 7h16M17 34h30v14H17"}]],bag:[['path',{d:"M13 20h38v39H13Zm9 0V10c0-8 20-8 20 0v10M19 36h26v15H19M8 27v25m48-25v25"}]],ruler:[['path',{d:"M6 18h52v28H6Zm8 0v12m8-12v7m8-7v12m8-12v7m8-7v12"}]],diamond:[['path',{d:"M32 4 59 32 32 60 5 32Z"}]],oval:[['path',{d:"M59 32a27 18 0 1 1-54 0 27 18 0 1 1 54 0"}]],rectangle:[['path',{d:"M4 16h56v32H4Z"}]],hexagon:[['path',{d:"M18 6h28l14 26-14 26H18L4 32Z"}]],pentagon:[['path',{d:"M32 4 60 25 49 59H15L4 25Z"}]],kite:[['path',{d:"M32 3 54 24 32 46 10 24Zm0 0v43M10 24h44M32 46c15 4-8 8 2 15"}]],boat:[['path',{d:"M3 41h58L48 58H16Zm29 0V4L9 34h23m3-25 18 25H35"}]],plane:[['path',{d:"M29 4h6l3 23 23 12v7L38 38l-1 14 8 6v4l-13-4-13 4v-4l8-6-1-14-23 8v-7l23-12Z"}]],rocket:[['path',{d:"M32 3C13 17 17 42 22 49h20c5-7 9-32-10-46ZM20 32 6 48l15-5m22-11 15 16-15-5M27 54l5 9 5-9M40 24a8 8 0 1 1-16 0 8 8 0 1 1 16 0"}]],ladder:[['path',{d:"M14 4v56m36-56v56M14 13h36M14 26h36M14 39h36M14 52h36"}]],hammer:[['path',{d:"M7 10h33l16 12-9 8-13-9H7Zm17 11h10v39H24"}]],scissors:[['path',{d:"M26 39 51 5m-25 20 25 34M26 43a10 10 0 1 1-20 0 10 10 0 1 1 20 0m0-22a10 10 0 1 1-20 0 10 10 0 1 1 20 0"}]],water_drop:[['path',{d:"M32 3C23 20 8 31 9 43c1 25 45 25 46 0 1-12-14-23-23-40Z"}]],hand:[['path',{d:"M19 36V13c0-7 8-7 8 0v19-24c0-7 8-7 8 0v24-18c0-7 8-7 8 0v20-11c0-7 8-7 8 0v22c0 24-30 24-37 9L6 39c-3-7 6-10 13-3Z"}]],eye:[['path',{d:"M3 32c13-25 45-25 58 0-13 25-45 25-58 0Zm40 0a11 11 0 1 1-22 0 11 11 0 1 1 22 0"}]],ear:[['path',{d:"M20 42C-3-1 64-10 53 30c-4 11-16 7-16 23 0 13-20 12-20-2M25 32c-14-22 22-29 19-8-2 9-11 6-12 17"}]],hand_tree:[['path',{d:"M27 60V39H12c-19-12-4-26 4-25C15-4 48-4 48 14c20 4 20 23 3 25H37v21ZM27 44l-8-9m18 10 8-10"}]],cube:[['path',{d:"M32 4 58 18v29L32 61 6 47V18Zm0 29 26-15M32 33 6 18m26 15v28"}]],cylinder:[['path',{d:"M8 13c0-12 48-12 48 0v38c0 13-48 13-48 0Zm0 0c0 13 48 13 48 0M8 51c0-13 48-13 48 0"}]]
};
function el(doc,tag,text,cls){const e=doc.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
export function iconElement(doc,icon){
 const ns='http://www.w3.org/2000/svg',svg=doc.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 64 64');svg.setAttribute('role','img');svg.setAttribute('aria-label',ICONS[icon]);
 for(const [tag,attrs] of shapes[icon]||[]){const n=doc.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));n.setAttribute('fill','none');n.setAttribute('stroke','currentColor');n.setAttribute('stroke-width','2.5');n.setAttribute('stroke-linejoin','round');n.setAttribute('stroke-linecap','round');svg.append(n);}return svg;
}
export function renderBlocks(target,q,{teacher=false}={}){
 const doc=target.ownerDocument;
 for(const b of q.blocks||[]){
  const block=el(doc,'div',undefined,`paper-block block-${b.type}`);
  if(b.type==='graph'||b.type==='diagram'){try{block.append(renderDiagram(doc,b));if(b.caption)block.append(el(doc,'p',b.caption,'block-caption'));}catch(e){block.append(el(doc,'p',e.message,'diagram-error'));}}
  if(b.type==='picture'){
   const objects=el(doc,'div',undefined,`count-objects size-${b.size}${b.quantity===1?' single-object':''}`);objects.setAttribute('role','group');objects.setAttribute('aria-label',b.task==='count'?'Count these objects':'Illustrations');
   for(let i=0;i<b.quantity;i++)objects.append(iconElement(doc,b.icon));block.append(objects);
   if(b.caption)block.append(el(doc,'p',b.caption,'block-caption'));
  }
  if(b.type==='image'){
   const pictures=el(doc,'div',undefined,`image-copies${b.task==='count'?' count-objects image-count size-'+b.size:''}`);if(b.task==='count'){pictures.setAttribute('role','group');pictures.setAttribute('aria-label','Count these picture copies');}for(let i=0;i<(b.quantity||1);i++){const img=doc.createElement('img');img.src=b.src;img.alt=b.alt;img.className=`paper-image size-${b.size} crop-${b.crop}`;img.decoding='async';pictures.append(img);}block.append(pictures);if(b.credit){const credit=el(doc,'p',`Image: ${b.credit.author} · ${b.credit.license} · `,'image-credit'),link=el(doc,'a','Wikimedia Commons source');link.href=b.credit.source;link.target='_blank';link.rel='noopener noreferrer';credit.append(link);block.append(credit);}if(b.caption)block.append(el(doc,'p',b.caption,'block-caption'));
  }
  if(b.type==='table'){
   const table=doc.createElement('table');table.className='question-table';
   if(b.caption)table.append(el(doc,'caption',b.caption));
   const head=doc.createElement('thead'),tr=doc.createElement('tr');for(const h of b.headers){const th=el(doc,'th',h);th.scope='col';tr.append(th);}head.append(tr);table.append(head);
   const body=doc.createElement('tbody');for(const row of b.rows){const tr=doc.createElement('tr');for(const c of row)tr.append(el(doc,'td',c||'\u00a0'));body.append(tr);}table.append(body);block.append(table);
  }
  if(b.type==='matching'){
   const table=doc.createElement('table');table.className='question-table matching-table';const caption=el(doc,'caption',teacher?'Matching task (answer key follows)':'Match each number to a letter.');table.append(caption);
   const head=doc.createElement('thead'),tr=doc.createElement('tr');for(const t of ['Column A','Column B']){const h=el(doc,'th',t);h.scope='col';tr.append(h);}head.append(tr);table.append(head);
   const body=doc.createElement('tbody');b.pairs.forEach((p,i)=>{const tr=doc.createElement('tr'),left=el(doc,'td',p.leftIcon||p.leftImage?`${i+1}. `:`${i+1}. ${p.left}`);if(p.leftImage)renderBlocks(left,{blocks:[p.leftImage]},{teacher});else if(p.leftIcon)left.append(iconElement(doc,p.leftIcon));tr.append(left,el(doc,'td',`${String.fromCharCode(65+i)}. ${b.pairs[b.order[i]].right}`));body.append(tr);});table.append(body);block.append(table);
  }
  if(b.type==='tracing'){
   block.append(el(doc,'span','Trace the outlines.','trace-instruction'));
   for(let i=0;i<b.rows;i++){
    const ns='http://www.w3.org/2000/svg',svg=doc.createElementNS(ns,'svg');svg.setAttribute('viewBox',`0 0 ${Math.max(150,b.text.length*42)} 90`);svg.setAttribute('role','img');svg.setAttribute('aria-label',`Trace ${b.text}`);
    for(const y of [15,50,80]){const line=doc.createElementNS(ns,'line');for(const [k,v] of Object.entries({x1:0,x2:Math.max(150,b.text.length*42),y1:y,y2:y,stroke:'#b7b7b7','stroke-width':1,'stroke-dasharray':'4 4'}))line.setAttribute(k,String(v));svg.append(line);}
    const t=doc.createElementNS(ns,'text');t.textContent=b.text;for(const [k,v] of Object.entries({x:5,y:70,'font-size':64,'font-family':'Arial, sans-serif',fill:'none',stroke:'#555','stroke-width':'.8','stroke-dasharray':'1 2'}))t.setAttribute(k,String(v));svg.append(t);block.append(svg);
   }
  }
  if(b.type==='drawing'){block.classList.add(`drawing-height-${b.height}`);block.append(el(doc,'span',b.label,'drawing-label'));}
  if(b.type==='lines')for(let i=0;i<b.count;i++)block.append(el(doc,'div',undefined,'writing-rule'));
  target.append(block);
 }
}
export function applyPaperLayout(target,layout={}){target.classList.remove('paper-standard','paper-primary','paper-early');target.classList.add(`paper-${layout.preset||'standard'}`);const h=layout.header||{};target.style.setProperty('--header-align',h.align||'center');target.style.setProperty('--logo-margin',h.logoAlign==='left'?'0 auto 0 0':h.logoAlign==='right'?'0 0 0 auto':'0 auto');target.style.setProperty('--logo-size',`${h.logoSize||20}mm`);target.style.setProperty('--header-gap',`${h.gap??4}mm`);for(const [i,k] of (h.order||['school','term','title']).entries())target.style.setProperty('--order-'+k,i+1);}
export async function assertPicturesReady(target){
 const images=[...target.querySelectorAll('img.paper-image')];
 try{await Promise.all(images.map(img=>typeof img.decode==='function'?img.decode():Promise.resolve()));}catch{throw new Error('A picture could not be loaded. Replace it before printing.');}
 if(images.some(img=>!img.complete||!img.naturalWidth))throw new Error('A picture is not ready. Wait for it to load or replace it before printing.');
}

export function renderSection(target,q){if(!q.section)return;const d=target.ownerDocument,head=el(d,'header',undefined,'exam-section');head.append(el(d,'h3',q.section.title));if(q.section.instructions)head.append(el(d,'p',q.section.instructions));target.append(head);}
export function renderLogo(target,layout){if(layout?.logo){const img=target.ownerDocument.createElement('img');img.src=layout.logo;img.alt='School logo';img.className='paper-image school-logo';target.prepend(img);}}
