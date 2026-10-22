import {freshDiagram,renderDiagram} from '/diagrams.js';
import {mediaPicker} from '/media-picker.js';
import {ICONS,PRESETS,MAX_IMAGE_LENGTH,setVisualAnswer} from '/visuals.js';
import {iconElement} from '/paper-blocks.js';
function node(doc,tag,text,cls){const e=doc.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
function field(box,label,value,{type='text',max=160,min,limit,options,event='input'}={},change=()=>{}){
 const d=box.ownerDocument,wrap=node(d,'div',undefined,`visual-field${type==='checkbox'?' visual-check':''}`),l=node(d,'label',label),e=d.createElement(options?'select':type==='textarea'?'textarea':'input');e.id=`visual-${crypto.randomUUID()}`;l.htmlFor=e.id;
 if(options)for(const [v,t] of options){const o=node(d,'option',t);o.value=v;e.append(o);}
 else if(type!=='textarea')e.type=type;
 if(type==='checkbox')e.checked=Boolean(value);else e.value=value??'';
 if(!options&&['text','textarea'].includes(type))e.maxLength=max;
 if(min!==undefined)e.min=min;if(limit!==undefined)e.max=limit;
 e.addEventListener(options||type==='checkbox'||type==='file'?'change':event,()=>change(type==='number'?Number(e.value):type==='checkbox'?e.checked:e.value,e));wrap.append(l,e);box.append(wrap);return e;
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
export function layoutEditor(box,paper,onChange,{onError=()=>{},onBusy=()=>{},isBusy=()=>false,includeLogo=true,includeStyle=true}={}){
 const d=box.ownerDocument,panel=node(d,'fieldset',undefined,'layout-panel');panel.append(node(d,'legend','Paper layout & header'));panel.append(node(d,'p','Applies to the whole paper. Set the reading size and heading here.','visual-hint'));const layout=paper.layout??={preset:'standard',schoolName:'',term:''};
 if(includeStyle)field(panel,'Paper style',layout.preset,{options:Object.entries(PRESETS)},v=>{layout.preset=v;onChange();});
 field(panel,'School name (optional)',layout.schoolName,{max:100},v=>{layout.schoolName=v;onChange();});field(panel,'Term / exam heading (optional)',layout.term,{max:60},v=>{layout.term=v;onChange();});
 const defaults=()=>({align:'center',logoAlign:'center',logoSize:20,gap:4,order:['school','term','title']});
 const tools=node(d,'section',undefined,'header-tools');tools.append(node(d,'h3','Logo & header designer'),node(d,'p','Choose positions, drag heading rows or use their move buttons. This layout applies to both printed copies.','visual-hint'));panel.append(tools);
 let dragging=null;const history=[],controls=node(d,'div',undefined,'header-controls'),sample=node(d,'div',undefined,'header-layout-sample'),status=node(d,'p',undefined,'visual-hint');status.setAttribute('role','status');sample.setAttribute('aria-label','Live header layout preview');
 const commit=fn=>{if(isBusy())return;history.push(structuredClone(layout.header||defaults()));if(history.length>30)history.shift();fn();onChange();draw();};
 function draw(){const focusedLabel=controls.contains(d.activeElement)?d.activeElement.labels?.[0]?.textContent:null,focusedButton=controls.contains(d.activeElement)&&d.activeElement.tagName==='BUTTON'?(d.activeElement.getAttribute('aria-label')||d.activeElement.textContent):null;controls.replaceChildren();sample.replaceChildren();const h=layout.header||defaults();
  for(const [key,label,options] of [['align','Header alignment',[['left','Left'],['center','Centre'],['right','Right']]],['logoAlign','Logo position',[['left','Left'],['center','Centre'],['right','Right']]]])field(controls,label,h[key],{options},v=>commit(()=>{(layout.header??=defaults())[key]=v;}));
  for(const [key,label,min,max] of [['logoSize','Logo size (mm)',12,32],['gap','Header spacing (mm)',0,12]])field(controls,label,h[key],{type:'number',min,limit:max,event:'change'},(v,input)=>{if(!Number.isInteger(v)||v<min||v>max){input.setCustomValidity(`Use a whole number from ${min} to ${max}.`);input.reportValidity();return;}input.setCustomValidity('');commit(()=>{(layout.header??=defaults())[key]=v;});});
  const rows=node(d,'div',undefined,'header-order');controls.append(rows);const labels={school:'School name',term:'Term / exam heading',title:'Assessment title'};
  h.order.forEach((key,i)=>{const row=node(d,'div',undefined,'header-order-row');row.draggable=true;row.dataset.headerItem=key;row.addEventListener('dragstart',e=>{if(isBusy()){e.preventDefault();return;}dragging=key;e.dataTransfer?.setData('text/plain',key);});row.addEventListener('dragend',()=>{dragging=null;});row.addEventListener('dragover',e=>{if(dragging&&!isBusy())e.preventDefault();});row.addEventListener('drop',e=>{e.preventDefault();if(!dragging||isBusy()||dragging===key)return;const source=dragging;dragging=null;commit(()=>{const a=(layout.header??=defaults()).order;a.splice(a.indexOf(source),1);a.splice(i,0,source);});status.textContent=`${labels[source]} moved to row ${i+1}.`;});row.append(node(d,'span',labels[key]));for(const [delta,label] of [[-1,'up'],[1,'down']]){const move=button(row,`Move ${labels[key]} ${label}`,()=>{commit(()=>{const a=(layout.header??=defaults()).order;[a[i],a[i+delta]]=[a[i+delta],a[i]];});status.textContent=`${labels[key]} moved ${label}.`;controls.querySelectorAll('.header-order-row')[i+delta]?.querySelector('button:not(:disabled)')?.focus();},i+delta<0||i+delta>2);move.setAttribute('aria-label',move.textContent);move.title=move.textContent;move.textContent=delta<0?'↑':'↓';}rows.append(row);});
  button(controls,'Undo layout change',()=>{if(isBusy()||!history.length)return;layout.header=history.pop();onChange();draw();status.textContent='Previous layout restored.';},!history.length);
  button(controls,'Reset header layout',()=>commit(()=>{layout.header=defaults();}));
  sample.style.textAlign=h.align;sample.style.gap=`${h.gap}mm`;
  if(layout.logo){const img=node(d,'img');img.src=layout.logo;img.alt='School logo layout preview';img.style.cssText=`width:${h.logoSize}mm;height:${h.logoSize}mm;object-fit:contain;margin:${h.logoAlign==='left'?'0 auto 0 0':h.logoAlign==='right'?'0 0 0 auto':'0 auto'}`;sample.append(img);}else sample.append(node(d,'p','Upload a logo to preview its position.','visual-hint'));
  if(focusedButton){const b=[...controls.querySelectorAll('button')].find(b=>(b.getAttribute('aria-label')||b.textContent)===focusedButton&&!b.disabled);b?.focus();}
  if(focusedLabel){const label=[...controls.querySelectorAll('label')].find(l=>l.textContent===focusedLabel);if(label)d.getElementById(label.htmlFor)?.focus();}
  for(const key of h.order)sample.append(node(d,key==='title'?'strong':'p',key==='school'?(layout.schoolName||'School name'):key==='term'?(layout.term||'Term / exam heading'):'Assessment title'));
 }
 tools.append(sample,controls,node(d,'p','Layout example only. Open Student copy or Marking guide to see the complete paper. Changes save with your paper and device setup.','visual-hint'),status);draw();
 panel.addEventListener('input',e=>{if(!controls.contains(e.target))draw();});
 if(includeLogo)logoEditor(panel,layout,()=>{onChange();draw();},{onError,onBusy,isBusy});
 panel.append(node(d,'p','Early Years uses larger questions, line illustrations and generous answer spaces. Check the class, language and printed size before use.','visual-hint'));box.append(panel);
}
const blockLabels={graph:'Scaled graph / plotting grid',diagram:'Labelled diagram / arrows & shapes',picture:'Illustrations / counting',image:'Uploaded picture',table:'Table',matching:'Matching columns',tracing:'Tracing outlines',drawing:'Drawing / colouring space',lines:'Writing lines'};
function objectField(box,label,value,change,{textOnly=false}={}){const input=field(box,label,value,{options:[...(textOnly?[['','Text only']]:[]),...Object.entries(ICONS)]},change);const search=field(box,'Search '+label.toLowerCase(),'',{type:'text',max:60},query=>{for(const option of input.options)option.hidden=Boolean(query)&&!option.textContent.toLowerCase().includes(query.toLowerCase())&&option.value!==input.value;});search.placeholder='Type an object name';return input;}
function freshBlock(type){
 if(type==='graph'||type==='diagram')return freshDiagram(type);
 if(type==='picture')return {type,icon:'apple',quantity:3,size:'medium',caption:'',task:'illustration'};
 if(type==='table')return {type,caption:'',headers:['Item','Answer'],rows:[['',''],['','']]};
 if(type==='matching')return {type,pairs:[{left:'Circle',right:'Round'},{left:'Square',right:'Four equal sides'}],order:[1,0]};
 if(type==='tracing')return {type,text:'A B C',rows:2};
 if(type==='drawing')return {type,height:50,label:'Draw here.'};
 return {type:'lines',count:3};
}
export function blockEditor(box,q,{onChange=()=>{},onError=()=>{},isBusy=()=>false,onBusy=()=>{}}={}){
 const d=box.ownerDocument,section=node(d,'details',undefined,'visual-editor');section.open=Boolean(q.blocks?.length);const summary=node(d,'summary','Pictures, tables, graphs & answer spaces');summary.append(node(d,'span',`${q.blocks?.length||0} added`,'visual-count'));section.append(summary);box.append(section);
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
    objectField(fs,'Object',b.icon,v=>{b.icon=v;changed();thumb.replaceChildren(iconElement(d,v));});
    bind('Number of objects','quantity',{type:'number',min:1,limit:20});bind('Picture size','size',{options:[['small','Small'],['medium','Medium'],['large','Large']]});
    field(fs,'Picture task',b.task,{options:[['illustration','Illustration only'],['count','Count these objects (automatic answer)']]},v=>{
     if(v==='count'&&(q.kind!=='short'||(q.blocks||[]).some(other=>other!==b&&(other.type==='matching'||other.task==='count')))){onError('Use a written-response question with one counting or matching task.');refresh();return;}
     b.task=v;changed();
    });bind('Caption (optional)','caption');
   }
   if(b.type==='image'){
    field(fs,'Number of picture copies',b.quantity??1,{type:'number',min:1,limit:20},v=>{b.quantity=v;changed();});
    fs.append(node(d,'p','For counting, use one isolated object per picture. The automatic key counts picture copies, not the objects inside a photograph.','visual-hint'));field(fs,'Picture task',b.task||'illustration',{options:[['illustration','Illustration only'],['count','Count picture copies (automatic answer)']]},v=>{if(v==='count'&&(q.kind!=='short'||q.blocks.some(other=>other!==b&&(other.type==='matching'||other.task==='count')))){onError('Use a written-response question with one counting or matching task.');refresh();return;}b.task=v;b.quantity??=1;changed();});
    const img=node(d,'img',undefined,'block-thumb');img.src=b.src;img.alt=b.alt;fs.append(img);
    bind('Picture description (for accessibility; do not reveal the answer)','alt');bind('Caption (optional)','caption');bind('Picture size','size',{options:[['small','Small'],['medium','Medium'],['large','Large']]});bind('Crop','crop',{options:[['fit','Show whole picture'],['square','Square centre crop']]});
    fs.append(node(d,'p','Uploaded pictures are compressed copies embedded in this paper. Use your own pictures or ones you have permission to use.','visual-hint'));
   }
   if(b.type==='graph'||b.type==='diagram')diagramFields(fs,b,changed,isBusy);
   if(b.type==='table'){
    bind('Table caption (optional)','caption');
    const cells=(values,label)=>{const row=node(d,'div',undefined,`table-edit-row table-edit-cols-${values.length}`);values.forEach((v,j)=>field(row,`${label}, column ${j+1}`,v,{max:label==='Heading'?80:160},value=>{values[j]=value;onChange();}));fs.append(row);};
    cells(b.headers,'Heading');b.rows.forEach((row,j)=>cells(row,`Row ${j+1}`));
    const tools=node(d,'div',undefined,'block-controls');
    button(tools,'Add row',()=>{b.rows.push(b.headers.map(()=>''));changed();refresh();},b.rows.length>=8);button(tools,'Remove last row',()=>{b.rows.pop();changed();refresh();},b.rows.length<=1);
    button(tools,'Add column',()=>{b.headers.push('');b.rows.forEach(r=>r.push(''));changed();refresh();},b.headers.length>=4);button(tools,'Remove last column',()=>{b.headers.pop();b.rows.forEach(r=>r.pop());changed();refresh();},b.headers.length<=1);fs.append(tools);
   }
   if(b.type==='matching'){
    b.pairs.forEach((p,j)=>{const pair=node(d,'fieldset',undefined,'matching-pair');pair.append(node(d,'legend',`Pair ${j+1}`));objectField(pair,`Pair ${j+1}: left picture`,p.leftIcon||'',v=>{delete p.leftImage;if(v){p.leftIcon=v;p.left=ICONS[v];leftField.value=p.left;leftField.readOnly=true;}else{delete p.leftIcon;leftField.readOnly=false;}changed();},{textOnly:true});const leftField=field(pair,`Pair ${j+1}: left`,p.left,{max:80},v=>{p.left=v;changed();});leftField.readOnly=Boolean(p.leftIcon);if(p.leftImage){const thumb=node(d,'img',undefined,'block-thumb');thumb.src=p.leftImage.src;thumb.alt='Selected matching picture';pair.append(thumb);button(pair,'Remove matching picture',()=>{delete p.leftImage;changed();refresh();});}pair.append(node(d,'p','The left text names this item in the answer key. A selected picture replaces that text on the student paper.','visual-hint'));mediaPicker(pair,picture=>{p.leftImage=picture;delete p.leftIcon;changed();refresh();},{compress:compressPicture,onBusy,onError,isBusy});const pairUpload=node(d,'input');pairUpload.type='file';pairUpload.accept='image/png,image/jpeg';pairUpload.setAttribute('aria-label',`Upload picture for pair ${j+1}`);pairUpload.addEventListener('change',async()=>{const file=pairUpload.files?.[0];if(!file||isBusy())return;onBusy(true);try{p.leftImage={type:'image',src:await compressPicture(file),alt:'Teacher-supplied matching illustration',size:'small',crop:'fit',caption:''};delete p.leftIcon;changed();refresh();}catch(e){onError(e.message);}finally{onBusy(false);}});pair.append(pairUpload);field(pair,`Pair ${j+1}: correct match`,p.right,{max:80},v=>{p.right=v;changed();});fs.append(pair);});
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
  mediaPicker(body,picture=>{if(q.blocks?.length>=6)throw new Error('Use at most six blocks per question.');(q.blocks??=[]).push(picture);section.open=true;changed();refresh();},{compress:compressPicture,onBusy,onError,isBusy});
 }
 refresh();return section;
}
function diagramFields(fs,b,onChange,isBusy){
 const d=fs.ownerDocument,preview=node(d,'div',undefined,'diagram-live-preview'),status=node(d,'p',undefined,'visual-hint');status.setAttribute('role','status');
 fs.append(node(d,'p','Teacher-authored visual · available for any subject or stage. Coordinates and values are checked; scientific meaning and answer correctness need your review. Labels and captions print on both copies, so keep answers out.','visual-hint'),preview,status);
 const draw=()=>{preview.replaceChildren();try{preview.append(renderDiagram(d,b));status.textContent='Live preview · shared by student paper and marking guide.';}catch(e){status.textContent=e.message;}};
 const change=fn=>v=>{if(isBusy())return;fn(v);onChange();draw();};
 field(fs,'Visual caption (optional)',b.caption,{},change(v=>b.caption=v));field(fs,'Accessible visual description',b.description,{max:300,type:'textarea'},change(v=>b.description=v));
 if(b.type==='graph'){
  for(const key of ['x','y']){const group=node(d,'fieldset');group.append(node(d,'legend',key.toUpperCase()+' axis'));field(group,'Axis label including units',b[key].label,{max:60},change(v=>b[key].label=v));for(const prop of ['min','max','step']){const input=field(group,prop==='step'?'Grid interval':prop==='min'?'Minimum value':'Maximum value',b[key][prop],{type:'number'},change(v=>b[key][prop]=v));input.step='any';}fs.append(group);}
  field(fs,'Graph display',b.style,{options:[['blank','Blank plotting grid'],['points','Data points'],['line','Join points in entered order']]},change(v=>b.style=v));
  fs.append(node(d,'p','Blank grids hide stored points. Joined lines follow the entered point order; this does not calculate a best-fit line.','visual-hint'));
  const rows=node(d,'div');fs.append(rows);const drawRows=()=>{rows.replaceChildren();b.points.forEach((p,i)=>{const row=node(d,'fieldset');row.append(node(d,'legend','Point '+(i+1)));for(const [j,key] of ['X','Y'].entries()){const input=field(row,key+' value',p[j],{type:'number'},change(v=>p[j]=v));input.step='any';}button(row,'Remove point '+(i+1),()=>{if(isBusy())return;b.points.splice(i,1);onChange();drawRows();draw();});rows.append(row);});button(rows,'Add data point',()=>{if(isBusy())return;b.points.push([b.x.min,b.y.min]);onChange();drawRows();draw();},b.points.length>=30);};drawRows();
 }else{
  fs.append(node(d,'p','Positions use a 0–100 canvas. Shapes use their top-left position and width/height. Arrows use start and end positions. Add labels for diagrams, geometry, maps, timelines or scientific sketches.','visual-hint'));
  const rows=node(d,'div');fs.append(rows);const drawRows=()=>{rows.replaceChildren();b.parts.forEach((p,i)=>{const row=node(d,'fieldset');row.append(node(d,'legend','Element '+(i+1)));field(row,'Element type',p.kind,{options:[['line','Line'],['arrow','Arrow'],['rectangle','Rectangle'],['circle','Ellipse / circle'],['text','Label']]},v=>{if(isBusy())return;p.kind=v;if(['line','arrow'].includes(v)){p.x2??=80;p.y2??=50;}if(['rectangle','circle'].includes(v)){p.width??=20;p.height??=20;}onChange();drawRows();draw();});field(row,'Element label',p.label,{max:60},change(v=>p.label=v));for(const key of ['x','y',...(['line','arrow'].includes(p.kind)?['x2','y2']:['rectangle','circle'].includes(p.kind)?['width','height']:[])]){const input=field(row,key.toUpperCase(),p[key],{type:'number',min:0,limit:100},change(v=>p[key]=v));input.step='any';}button(row,'Remove element '+(i+1),()=>{if(isBusy())return;b.parts.splice(i,1);onChange();drawRows();draw();},b.parts.length<=1);rows.append(row);});button(rows,'Add diagram element',()=>{if(isBusy())return;b.parts.push({kind:'text',x:50,y:20,label:'Label'});onChange();drawRows();draw();},b.parts.length>=24);};drawRows();
 }draw();
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
