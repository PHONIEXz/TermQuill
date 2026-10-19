import {ICONS,PRESETS,MAX_IMAGE_LENGTH,setVisualAnswer} from '/visuals.js';
import {iconElement} from '/paper-blocks.js';
function node(doc,tag,text,cls){const e=doc.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
function field(box,label,value,{type='text',max=160,min,limit,options}={},change=()=>{}){
 const d=box.ownerDocument,wrap=node(d,'div',undefined,`visual-field${type==='checkbox'?' visual-check':''}`),l=node(d,'label',label),e=d.createElement(options?'select':type==='textarea'?'textarea':'input');e.id=`visual-${crypto.randomUUID()}`;l.htmlFor=e.id;
 if(options)for(const [v,t] of options){const o=node(d,'option',t);o.value=v;e.append(o);}
 else if(type!=='textarea')e.type=type;
 if(type==='checkbox')e.checked=Boolean(value);else e.value=value??'';
 if(!options&&['text','textarea'].includes(type))e.maxLength=max;
 if(min!==undefined)e.min=min;if(limit!==undefined)e.max=limit;
 e.addEventListener(options||type==='checkbox'||type==='file'?'change':'input',()=>change(type==='number'?Number(e.value):type==='checkbox'?e.checked:e.value,e));wrap.append(l,e);box.append(wrap);return e;
}
function button(box,label,fn,disabled=false){const b=node(box.ownerDocument,'button',label);b.type='button';if(label.startsWith('Remove'))b.classList.add('remove-control');b.disabled=disabled;b.addEventListener('click',fn);box.append(b);return b;}
export function logoEditor(box,layout,onChange,{onError=()=>{},onBusy=()=>{},isBusy=()=>false}={}){
 const d=box.ownerDocument,logo=node(d,'section',undefined,'logo-editor');logo.setAttribute('aria-label','School logo');
 logo.append(node(d,'h3','School logo'),node(d,'p','Appears on the student paper and marking guide, including Print / PDF. PNG or JPEG, up to 4 MB. Saved with this paper; not sent to the AI.','visual-hint'));
 const thumb=node(d,'div'),status=node(d,'p',undefined,'visual-hint');status.setAttribute('role','status');
 const upload=node(d,'input');upload.type='file';upload.accept='image/png,image/jpeg';upload.hidden=true;upload.setAttribute('aria-label','Choose school logo file');
 const actions=node(d,'div',undefined,'logo-actions');
 const choose=button(actions,'Upload school logo',()=>{if(!isBusy())upload.click();});choose.className='outline logo-upload';
 const remove=button(actions,'Remove logo',()=>{if(isBusy())return;delete layout.logo;refresh();onChange();});
 function refresh(){thumb.replaceChildren();if(layout.logo){const img=node(d,'img',undefined,'block-thumb');img.src=layout.logo;img.alt='Current school logo';thumb.append(img);}choose.textContent=layout.logo?'Change school logo':'Upload school logo';remove.disabled=!layout.logo;status.textContent=layout.logo?'Logo added · included on both copies.':'No logo added yet. Optional.';}
 upload.addEventListener('change',async()=>{const file=upload.files?.[0];if(!file||isBusy())return;choose.disabled=true;remove.disabled=true;onBusy(true);status.textContent='Preparing school logo…';try{const image=await compressPicture(file);layout.logo=image;onChange();onError('');}catch(e){onError(e.message);}finally{refresh();onBusy(false);choose.disabled=false;upload.value='';}});
 logo.append(thumb,actions,upload,status);box.append(logo);refresh();return choose;
}
export function layoutEditor(box,paper,onChange,{onError=()=>{},onBusy=()=>{},isBusy=()=>false,includeLogo=true}={}){
 const d=box.ownerDocument,panel=node(d,'fieldset',undefined,'layout-panel');panel.append(node(d,'legend','Paper layout & header'));panel.append(node(d,'p','Applies to the whole paper. Set the reading size and heading here.','visual-hint'));const layout=paper.layout??={preset:'standard',schoolName:'',term:''};
 field(panel,'Paper style',layout.preset,{options:Object.entries(PRESETS)},v=>{layout.preset=v;onChange();});
 field(panel,'School name (optional)',layout.schoolName,{max:100},v=>{layout.schoolName=v;onChange();});field(panel,'Term / exam heading (optional)',layout.term,{max:60},v=>{layout.term=v;onChange();});
 if(includeLogo)logoEditor(panel,layout,onChange,{onError,onBusy,isBusy});
 panel.append(node(d,'p','Early Years uses larger questions, line illustrations and generous answer spaces. Check the class, language and printed size before use.','visual-hint'));box.append(panel);
}
const blockLabels={picture:'Illustrations / counting',image:'Uploaded picture',table:'Table',matching:'Matching columns',tracing:'Tracing outlines',drawing:'Drawing / colouring space',lines:'Writing lines'};
function freshBlock(type){
 if(type==='picture')return {type,icon:'apple',quantity:3,size:'medium',caption:'',task:'illustration'};
 if(type==='table')return {type,caption:'',headers:['Item','Answer'],rows:[['',''],['','']]};
 if(type==='matching')return {type,pairs:[{left:'Circle',right:'Round'},{left:'Square',right:'Four equal sides'}],order:[1,0]};
 if(type==='tracing')return {type,text:'A B C',rows:2};
 if(type==='drawing')return {type,height:50,label:'Draw here.'};
 return {type:'lines',count:3};
}
export function blockEditor(box,q,{onChange=()=>{},onError=()=>{},isBusy=()=>false,onBusy=()=>{}}={}){
 const d=box.ownerDocument,section=node(d,'details',undefined,'visual-editor');section.open=Boolean(q.blocks?.length);const summary=node(d,'summary','Pictures, tables & answer spaces');summary.append(node(d,'span',`${q.blocks?.length||0} added`,'visual-count'));section.append(summary);box.append(section);
 const body=node(d,'div');section.append(body);
 function changed(){try{setVisualAnswer(q);}catch(e){onError(e.message);}onChange();}
 function refresh(){
  body.replaceChildren();summary.querySelector('.visual-count').textContent=`${q.blocks?.length||0} added`;
  body.append(node(d,'p','These blocks appear on both copies. Keep answers out of captions, picture descriptions and table cells. Counting and matching tasks update their answer keys automatically.','visual-hint'));
  field(body,'Default answer space',q.answerSpace||'auto',{options:[['auto','Automatic writing lines'],['none','No extra answer space']]},v=>{q.answerSpace=v;onChange();});
  field(body,'Start this question on a new printed page',q.pageBreakBefore,{type:'checkbox'},v=>{q.pageBreakBefore=v;onChange();});
  (q.blocks||[]).forEach((b,i)=>{
   const fs=node(d,'fieldset',undefined,'block-editor');fs.append(node(d,'legend',`${i+1}. ${blockLabels[b.type]}`));const controls=node(d,'div',undefined,'block-controls');
   button(controls,'Move block up',()=>{[q.blocks[i-1],q.blocks[i]]=[q.blocks[i],q.blocks[i-1]];changed();refresh();},i===0);
   button(controls,'Move block down',()=>{[q.blocks[i+1],q.blocks[i]]=[q.blocks[i],q.blocks[i+1]];changed();refresh();},i===q.blocks.length-1);
   button(controls,'Remove block',()=>{q.blocks.splice(i,1);changed();refresh();});fs.append(controls);
   const bind=(label,key,opts={})=>field(fs,label,b[key],opts,v=>{b[key]=v;changed();});
   if(b.type==='picture'){
    const thumb=node(d,'div',undefined,'count-objects size-small');thumb.append(iconElement(d,b.icon));fs.append(thumb);
    field(fs,'Object',b.icon,{options:Object.entries(ICONS)},v=>{b.icon=v;changed();thumb.replaceChildren(iconElement(d,v));});
    bind('Number of objects','quantity',{type:'number',min:1,limit:20});bind('Picture size','size',{options:[['small','Small'],['medium','Medium'],['large','Large']]});
    field(fs,'Picture task',b.task,{options:[['illustration','Illustration only'],['count','Count these objects (automatic answer)']]},v=>{
     if(v==='count'&&(q.kind!=='short'||(q.blocks||[]).some(other=>other!==b&&(other.type==='matching'||other.task==='count')))){onError('Use a written-response question with one counting or matching task.');refresh();return;}
     b.task=v;changed();
    });bind('Caption (optional)','caption');
   }
   if(b.type==='image'){
    const img=node(d,'img',undefined,'block-thumb');img.src=b.src;img.alt=b.alt;fs.append(img);
    bind('Picture description (for accessibility; do not reveal the answer)','alt');bind('Caption (optional)','caption');bind('Picture size','size',{options:[['small','Small'],['medium','Medium'],['large','Large']]});bind('Crop','crop',{options:[['fit','Show whole picture'],['square','Square centre crop']]});
    fs.append(node(d,'p','Uploaded pictures are compressed copies embedded in this paper. Use your own pictures or ones you have permission to use.','visual-hint'));
   }
   if(b.type==='table'){
    bind('Table caption (optional)','caption');
    const cells=(values,label)=>{const row=node(d,'div',undefined,`table-edit-row table-edit-cols-${values.length}`);values.forEach((v,j)=>field(row,`${label}, column ${j+1}`,v,{max:label==='Heading'?80:160},value=>{values[j]=value;onChange();}));fs.append(row);};
    cells(b.headers,'Heading');b.rows.forEach((row,j)=>cells(row,`Row ${j+1}`));
    const tools=node(d,'div',undefined,'block-controls');
    button(tools,'Add row',()=>{b.rows.push(b.headers.map(()=>''));changed();refresh();},b.rows.length>=8);button(tools,'Remove last row',()=>{b.rows.pop();changed();refresh();},b.rows.length<=1);
    button(tools,'Add column',()=>{b.headers.push('');b.rows.forEach(r=>r.push(''));changed();refresh();},b.headers.length>=4);button(tools,'Remove last column',()=>{b.headers.pop();b.rows.forEach(r=>r.pop());changed();refresh();},b.headers.length<=1);fs.append(tools);
   }
   if(b.type==='matching'){
    b.pairs.forEach((p,j)=>{const pair=node(d,'fieldset',undefined,'matching-pair');pair.append(node(d,'legend',`Pair ${j+1}`));field(pair,`Pair ${j+1}: left picture`,p.leftIcon||'',{options:[['','Text only'],...Object.entries(ICONS)]},v=>{if(v){p.leftIcon=v;p.left=ICONS[v];leftField.value=p.left;leftField.readOnly=true;}else{delete p.leftIcon;leftField.readOnly=false;}changed();});const leftField=field(pair,`Pair ${j+1}: left`,p.left,{max:80},v=>{p.left=v;changed();});leftField.readOnly=Boolean(p.leftIcon);field(pair,`Pair ${j+1}: correct match`,p.right,{max:80},v=>{p.right=v;changed();});fs.append(pair);});
    const tools=node(d,'div',undefined,'block-controls'),reset=()=>{b.order=b.pairs.map((_,j)=>(j+1)%b.pairs.length);changed();refresh();};
    button(tools,'Add pair',()=>{b.pairs.push({left:`Item ${b.pairs.length+1}`,right:`Match ${b.pairs.length+1}`});reset();},b.pairs.length>=6);button(tools,'Remove last pair',()=>{b.pairs.pop();reset();},b.pairs.length<=2);button(tools,'Rotate right column',()=>{b.order.push(b.order.shift());changed();refresh();});fs.append(tools);
   }
   if(b.type==='tracing'){bind('Text to trace','text',{max:32});bind('Practice rows','rows',{type:'number',min:1,limit:3});fs.append(node(d,'p','Outlines are practice guides, not a handwriting curriculum. Check the letter forms used by your school.','visual-hint'));}
   if(b.type==='drawing'){bind('Box instruction (optional)','label',{max:100});bind('Box height in mm','height',{type:'number',min:25,limit:90});}
   if(b.type==='lines')bind('Writing lines','count',{type:'number',min:1,limit:8});
   body.append(fs);
  });
  const add=node(d,'div',undefined,'visual-add');add.append(node(d,'p','Choose what the pupil should see or use.','visual-hint'));const type=field(add,'Add a block','picture',{options:Object.entries(blockLabels)});
  button(add,'Add selected block',()=>{
   if(isBusy())return;
   if(type.value==='image'){upload.click();return;}
   if(q.blocks?.length>=6){onError('Use at most six blocks per question.');return;}
   if(type.value==='matching'&&(q.kind!=='short'||q.blocks?.some(b=>b.type==='matching'||b.task==='count'))){onError('Matching needs a written-response question without another counting or matching task.');return;}
   (q.blocks??=[]).push(freshBlock(type.value));section.open=true;changed();refresh();
  },q.blocks?.length>=6);body.append(add);
  const upload=node(d,'input');upload.type='file';upload.accept='image/png,image/jpeg';upload.hidden=true;upload.setAttribute('aria-label','Upload PNG or JPEG picture');
  upload.addEventListener('change',async()=>{
   const file=upload.files?.[0];if(!file||isBusy())return;
   if(q.blocks?.length>=6){onError('Use at most six blocks per question.');return;}
   onBusy(true);try{const src=await compressPicture(file);(q.blocks??=[]).push({type:'image',src,alt:'Teacher-supplied picture',size:'medium',crop:'fit',caption:''});section.open=true;changed();refresh();onError('');}catch(e){onError(e.message);}finally{onBusy(false);upload.value='';}
  });body.append(upload);
 }
 refresh();return section;
}
function imageDimensions(bytes){
 const a=new Uint8Array(bytes),v=new DataView(bytes);
 if(a.length>=24&&a[0]===137&&a[1]===80&&a[2]===78&&a[3]===71)return [v.getUint32(16),v.getUint32(20)];
 if(a[0]===255&&a[1]===216){let i=2;while(i+8<a.length){if(a[i]!==255)break;const marker=a[i+1];if(marker===218||marker===217)break;const length=v.getUint16(i+2);if(length<2||i+2+length>a.length)break;if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker))return [v.getUint16(i+7),v.getUint16(i+5)];i+=length+2;}}
 throw new Error('Choose a valid PNG or JPEG picture.');
}
export async function compressPicture(file){
 if(!['image/png','image/jpeg'].includes(file.type)||file.size>4000000)throw new Error('Choose a PNG or JPEG picture under 4 MB.');
 const [w,h]=imageDimensions(await file.arrayBuffer());if(!w||!h||w*h>16000000||w>8192||h>8192)throw new Error('Use a picture up to 16 megapixels and 8,192 pixels per side.');
 const bitmap=await createImageBitmap(file);
 try{
  for(const max of [640,480,320]){
   const scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
   const png=canvas.toDataURL('image/png');if(png.length<=MAX_IMAGE_LENGTH)return png;
   for(const quality of [.8,.6,.4]){const jpg=canvas.toDataURL('image/jpeg',quality);if(jpg.length<=MAX_IMAGE_LENGTH)return jpg;}
  }
  throw new Error('This picture is too detailed. Crop or simplify it, then upload again.');
 }finally{bitmap.close();}
}

export function questionDocumentEditor(box,q,paper,onChange){
 const d=box.ownerDocument,panel=node(d,'fieldset',undefined,'question-document');panel.append(node(d,'legend','Marks & section'));
 field(panel,'Total marks for this question',q.marks,{type:'number',min:1,limit:100},v=>{q.marks=v;paper.markingMode='individual';if(q.marking?.length===1)q.marking[0].marks=v;setVisualAnswer(q);onChange();});
 const toggle=field(panel,'Start a new exam section here',Boolean(q.section),{type:'checkbox'},on=>{if(on)q.section={title:'Section A',instructions:''};else delete q.section;onChange();refresh();});
 const section=node(d,'div',undefined,'section-fields');panel.append(section);function refresh(){section.replaceChildren();if(q.section){field(section,'Section heading',q.section.title,{max:80},v=>{q.section.title=v;onChange();});field(section,'Section instructions',q.section.instructions,{type:'textarea',max:400},v=>{q.section.instructions=v;onChange();});}}refresh();box.append(panel);
}
