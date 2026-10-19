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
  if(b.type==='picture'){
   const objects=el(doc,'div',undefined,`count-objects size-${b.size}${b.quantity===1?' single-object':''}`);objects.setAttribute('role','group');objects.setAttribute('aria-label',b.task==='count'?'Count these objects':'Illustrations');
   for(let i=0;i<b.quantity;i++)objects.append(iconElement(doc,b.icon));block.append(objects);
   if(b.caption)block.append(el(doc,'p',b.caption,'block-caption'));
  }
  if(b.type==='image'){
   const img=doc.createElement('img');img.src=b.src;img.alt=b.alt;img.className=`paper-image size-${b.size} crop-${b.crop}`;img.decoding='async';block.append(img);if(b.caption)block.append(el(doc,'p',b.caption,'block-caption'));
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
   const body=doc.createElement('tbody');b.pairs.forEach((p,i)=>{const tr=doc.createElement('tr'),left=el(doc,'td',p.leftIcon?`${i+1}. `:`${i+1}. ${p.left}`);if(p.leftIcon)left.append(iconElement(doc,p.leftIcon));tr.append(left,el(doc,'td',`${String.fromCharCode(65+i)}. ${b.pairs[b.order[i]].right}`));body.append(tr);});table.append(body);block.append(table);
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
export function applyPaperLayout(target,layout={}){target.classList.remove('paper-standard','paper-primary','paper-early');target.classList.add(`paper-${layout.preset||'standard'}`);}
export async function assertPicturesReady(target){
 const images=[...target.querySelectorAll('img.paper-image')];
 try{await Promise.all(images.map(img=>typeof img.decode==='function'?img.decode():Promise.resolve()));}catch{throw new Error('A picture could not be loaded. Replace it before printing.');}
 if(images.some(img=>!img.complete||!img.naturalWidth))throw new Error('A picture is not ready. Wait for it to load or replace it before printing.');
}

export function renderSection(target,q){if(!q.section)return;const d=target.ownerDocument,head=el(d,'header',undefined,'exam-section');head.append(el(d,'h3',q.section.title));if(q.section.instructions)head.append(el(d,'p',q.section.instructions));target.append(head);}
export function renderLogo(target,layout){if(layout?.logo){const img=target.ownerDocument.createElement('img');img.src=layout.logo;img.alt='School logo';img.className='paper-image school-logo';target.append(img);}}
