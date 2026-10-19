// Versioned, bounded paper content shared by the browser and server.
export const ICONS={apple:'Apple',ball:'Ball',fish:'Fish',leaf:'Leaf',flower:'Flower',star:'Star',circle:'Circle',square:'Square',triangle:'Triangle',heart:'Heart',book:'Book',pencil:'Pencil'};
export const PRESETS={standard:'Standard',primary:'Primary',early:'Early Years'};
export const MAX_IMAGE_LENGTH=24000;
const sizes=['small','medium','large'];
function text(value,max,empty=false){if(typeof value!=='string'||value.length>max||(!empty&&!value.trim()))throw new Error(`Use ${empty?'up to':'1–'}${max} characters for visual text.`);return value;}
function integer(value,min,max){if(!Number.isInteger(value)||value<min||value>max)throw new Error(`Choose a whole number from ${min} to ${max}.`);return value;}
function choice(value,options){if(!options.includes(value))throw new Error('Choose a supported visual setting.');return value;}
export function cleanLayout(value){
 if(value===undefined)return undefined;
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid paper layout.');
 return {preset:choice(value.preset||'standard',Object.keys(PRESETS)),schoolName:text(value.schoolName??'',100,true),term:text(value.term??'',60,true)};
}
export function cleanBlocks(value){
 if(value===undefined)return undefined;
 if(!Array.isArray(value)||value.length>6)throw new Error('Use at most six visual blocks per question.');
 return value.map(b=>{
  if(!b||typeof b!=='object'||Array.isArray(b))throw new Error('Invalid visual block.');
  const type=b.type;
  if(type==='picture')return {type,icon:choice(b.icon,Object.keys(ICONS)),quantity:integer(b.quantity,1,20),size:choice(b.size||'medium',sizes),caption:text(b.caption??'',160,true),task:choice(b.task||'illustration',['illustration','count'])};
  if(type==='image'){
   // Raster-only, embedded assets: no SVG, HTML, URLs or remote tracking requests.
   if(typeof b.src!=='string'||b.src.length>MAX_IMAGE_LENGTH||!/^data:image\/(?:png|jpeg);base64,(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(b.src))throw new Error('Upload a compressed PNG or JPEG picture (under 18 KB).');
   const encoded=b.src.split(',')[1];
   if((b.src.startsWith('data:image/png')&&!encoded.startsWith('iVBORw0KGgo'))||(b.src.startsWith('data:image/jpeg')&&!encoded.startsWith('/9j/')))throw new Error('The picture does not match its file type.');
   return {type,src:b.src,alt:text(b.alt,160),size:choice(b.size||'medium',sizes),crop:choice(b.crop||'fit',['fit','square']),caption:text(b.caption??'',160,true)};
  }
  if(type==='table'){
   if(!Array.isArray(b.headers)||b.headers.length<1||b.headers.length>4||!Array.isArray(b.rows)||b.rows.length<1||b.rows.length>8)throw new Error('Tables need 1–4 columns and 1–8 rows.');
   const headers=b.headers.map(h=>text(h,80,true));
   const rows=b.rows.map(row=>{if(!Array.isArray(row)||row.length!==headers.length)throw new Error('Each table row needs the same number of cells as the headings.');return row.map(c=>text(c,160,true));});
   return {type,caption:text(b.caption??'',160,true),headers,rows};
  }
  if(type==='matching'){
   if(!Array.isArray(b.pairs)||b.pairs.length<2||b.pairs.length>6)throw new Error('Matching needs 2–6 pairs.');
   const pairs=b.pairs.map(p=>{const leftIcon=p?.leftIcon?choice(p.leftIcon,Object.keys(ICONS)):null;return {left:leftIcon?ICONS[leftIcon]:text(p?.left,80),right:text(p?.right,80),...(leftIcon?{leftIcon}:{})};});
   if(new Set(pairs.map(p=>p.left.trim().toLowerCase())).size!==pairs.length||new Set(pairs.map(p=>p.right.trim().toLowerCase())).size!==pairs.length)throw new Error('Use distinct items on each side of a matching question.');
   const order=b.order??pairs.map((_,i)=>(i+1)%pairs.length);
   if(!Array.isArray(order)||order.length!==pairs.length||new Set(order).size!==pairs.length||order.some(i=>!Number.isInteger(i)||i<0||i>=pairs.length))throw new Error('Invalid matching order.');
   return {type,pairs,order:[...order]};
  }
  if(type==='tracing')return {type,text:text(b.text,32),rows:integer(b.rows??2,1,3)};
  if(type==='drawing')return {type,height:integer(b.height??50,25,90),label:text(b.label??'Draw here.',100,true)};
  if(type==='lines')return {type,count:integer(b.count??3,1,8)};
  throw new Error('Unsupported visual block.');
 });
}
export function visualAnswer(blocks){
 const tasks=(blocks||[]).filter(b=>b.type==='matching'||(b.type==='picture'&&b.task==='count'));
 if(tasks.length>1)throw new Error('Use one counting or matching task per question. Other pictures can be illustrations.');
 const b=tasks[0];
 if(!b)return null;
 return b.type==='picture'?String(b.quantity):b.pairs.map((p,i)=>`${i+1}–${String.fromCharCode(65+b.order.indexOf(i))}: ${p.left} = ${p.right}`).join('; ');
}
export function auditVisualQuestion(q){
 try{
  const blocks=cleanBlocks(q.blocks),answer=visualAnswer(blocks);
  if(answer!==null&&(q.kind!=='short'||q.answer!==answer))return ['The counting or matching answer must match the visual task. Use a written-response question and update its answer.'];
  if(answer!==null&&(q.marking?.length!==1||q.marking[0]?.point!==visualMarkingPoint(blocks)||q.marking[0]?.marks!==q.marks))return ['The counting or matching marking key must agree with the visual task.'];
  return [];
 }catch(e){return [e.message];}
}
export function hasAnswerSpace(q){return (q.blocks||[]).some(b=>['lines','drawing','tracing','matching'].includes(b.type));}
export function visualMarkingPoint(blocks){const b=(blocks||[]).find(b=>b.type==='matching'||b.task==='count');return b?.type==='matching'?b.pairs.map((_,i)=>`${i+1}–${String.fromCharCode(65+b.order.indexOf(i))}`).join('; '):b?String(b.quantity):null;}
export function setVisualAnswer(q){const answer=visualAnswer(q.blocks);if(answer!==null){q.answer=answer;const point=visualMarkingPoint(q.blocks);if(!Array.isArray(q.marking)||!q.marking.length)q.marking=[{point,marks:q.marks}];else{q.marking[0].point=point;q.marking[0].marks=q.marks;q.marking.splice(1);}}}
export function assertSchoolSize(content){
 // jsonb adds separator spaces. Pretty JSON is a conservative estimate, with
 // headroom below the existing 90 KB database cap and 100 KB HTTP cap.
 if(new TextEncoder().encode(JSON.stringify(content,null,1)).length>85000)throw Object.assign(new Error('This illustrated paper is too large for school sharing. Remove a picture or use a simpler crop; your device draft is unchanged.'),{status:413});
}
