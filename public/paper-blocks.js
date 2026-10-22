import {renderDiagram} from '/diagrams.js';
import {ICONS} from '/visuals.js';
// Original line illustrations. Fixed geometry gives counting tasks exact objects.
import {shapes} from '/paper-icons.js';

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
