// Deterministic file exports. No provider requests, external image fetches or persistence.
import PDFDocument from 'pdfkit';
import SVGtoPDF from 'svg-to-pdfkit';
import {Resvg} from '@resvg/resvg-js';
import {createRequire} from 'node:module';
import {dirname,join} from 'node:path';
import {validateDraft} from './drafts.js';
import {auditAssessment} from './assessment.js';
import {paperTotal,hasAnswerSpace} from './visuals.js';
import {renderDiagram} from './diagrams.js';
import {shapes} from './paper-icons.js';
// Use the package's CommonJS export: its .es.js entry is not marked as ESM in Vercel's runtime.
const require=createRequire(import.meta.url),PptxGenJS=require('pptxgenjs'),fontRoot=dirname(require.resolve('dejavu-fonts-ttf/package.json'));
const fonts={regular:join(fontRoot,'ttf/DejaVuSans.ttf'),bold:join(fontRoot,'ttf/DejaVuSans-Bold.ttf')};
const rgb=s=>{const c=String(s).replace('#','');return c.length===3?[...c].map(x=>x+x).join(''):c;};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export const exportTypes={pdf:'application/pdf',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation'};
export function prepareExport(body){
 if(!body||!Object.hasOwn(exportTypes,body.format)||!['student','teacher'].includes(body.copy))throw new Error('Choose PDF or PowerPoint and a student or teacher copy.');
 if(body.reviewed!==true)throw new Error('Review every question and confirm your review before downloading.');
 const draft=validateDraft(body.draft),issues=auditAssessment(draft.paper,draft.spec);
 if(issues.length)throw new Error('This paper needs corrections before downloading. Open Edit & review.');
 return {draft,format:body.format,copy:body.copy};
}
export function exportFilename(draft,copy,format){const base=draft.spec.title.normalize('NFKD').replace(/[^a-zA-Z0-9 -]/g,'').trim().replace(/[ -]+/g,'-').slice(0,70)||'assessment';return `termquill-${base}-${copy==='teacher'?'marking-guide':'student'}.${format}`;}
// Capture the same fixed geometry used in the live preview. No arbitrary SVG input.
function svgNode(tag){return {tag,attrs:{},children:[],textContent:'',classList:{add(){}},setAttribute(k,v){this.attrs[k]=v;},append(n){this.children.push(n);}};}
const svgDoc={createElementNS:(_ns,tag)=>svgNode(tag)};
function svgString(n){return `<${n.tag} ${Object.entries(n.attrs).map(([k,v])=>`${k}="${esc(v)}"`).join(' ')}>${esc(n.textContent)}${n.children.map(svgString).join('')}</${n.tag}>`;}
function iconSvg(icon){return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">${shapes[icon].map(([tag,attrs])=>`<${tag} ${Object.entries(attrs).map(([k,v])=>`${k}="${esc(v)}"`).join(' ')} fill="none" stroke="#222" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`).join('')}</svg>`;}
function measureDoc(){const d=new PDFDocument({autoFirstPage:false});d.registerFont('regular',fonts.regular).registerFont('bold',fonts.bold);return d;}
// Explicit line wrapping keeps PowerPoint text editable and prevents silent truncation.
function wrap(doc,value,width,size,bold=false){doc.font(bold?'bold':'regular').fontSize(size);const out=[];for(const paragraph of String(value).split('\n')){let line='';for(const word of paragraph.split(/\s+/)){if(!word)continue;const candidate=line?`${line} ${word}`:word;if(doc.widthOfString(candidate)<=width){line=candidate;continue;}if(line)out.push(line);line='';for(const c of word){if(line&&doc.widthOfString(line+c)>width){out.push(line);line='';}line+=c;}}out.push(line);}return out;}
class PaperWriter {
 constructor(format,draft,copy,schoolCopy){this.schoolCopy=schoolCopy;this.format=format;this.draft=draft;this.copy=copy;this.measure=measureDoc();this.margin=36;this.width=format==='pdf'?595.28:960;this.height=format==='pdf'?841.89:540;this.body=format==='pdf'?(draft.paper.layout?.preset==='early'?14:11.5):20;this.y=36;this.pages=0;this.pngCache=new Map();
  if(format==='pdf'){this.pdf=new PDFDocument({size:'A4',margins:{top:36,left:36,right:36,bottom:0},bufferPages:true,autoFirstPage:false,info:{Title:draft.spec.title,Author:'TermQuill',Subject:copy==='teacher'?'Teacher marking guide':'Student assessment'}});this.pdf.registerFont('regular',fonts.regular).registerFont('bold',fonts.bold);this.chunks=[];this.pdf.on('data',c=>this.chunks.push(c));this.done=new Promise((resolve,reject)=>{this.pdf.on('end',()=>resolve(Buffer.concat(this.chunks)));this.pdf.on('error',reject);});}
  else {this.pptx=new PptxGenJS();this.pptx.defineLayout({name:'TERMQUILL',width:960/72,height:540/72});this.pptx.layout='TERMQUILL';this.pptx.author='TermQuill';this.pptx.subject=copy==='teacher'?'Teacher marking guide':'Student assessment';this.pptx.title=draft.spec.title;this.pptx.lang='en-GB';this.pptx.theme={headFontFace:'DejaVu Sans',bodyFontFace:'DejaVu Sans',lang:'en-GB'};}
  this.newPage();
 }
 get usable(){return this.width-2*this.margin;}
 newPage(){if(++this.pages>180)throw new Error('This paper is too long to export. Reduce its content and try again.');this.y=this.margin;if(this.pdf)this.pdf.addPage();else{this.slide=this.pptx.addSlide();this.slide.background={color:'FFFEFA'};}this.textAt(`${this.copy==='teacher'?'TEACHER MARKING GUIDE':'STUDENT COPY'}  /  TermQuill`,this.margin,this.height-25,this.usable-50,9,{color:'666666'});this.textAt(String(this.pages),this.width-70,this.height-25,34,9,{align:'right',color:'666666'});if(this.currentQuestion){this.textAt(`Question ${this.currentQuestion} (continued)`,this.margin,this.y,this.usable,this.body,{bold:true,color:'555555'});this.y+=this.body*1.5+8;}}
 ensure(h){if(this.y+h>this.height-42)this.newPage();}
 textAt(text,x,y,w,size,{bold=false,color='202923',align='left',rotate=0}={}){if(this.pdf){this.pdf.font(bold?'bold':'regular').fontSize(size).fillColor('#'+color).text(String(text),x,y,{width:w,lineBreak:false,align});}else this.slide.addText(String(text),{x:x/72,y:y/72,w:w/72,h:size*1.6/72,fontFace:'DejaVu Sans',fontSize:size,bold,color,align,margin:0,breakLine:false,rotate,lang:'en-GB'});}
 text(value,{size=this.body,bold=false,color='202923',align='left',gap=8}={}){const lines=wrap(this.measure,value,this.usable,size,bold),lineHeight=size*1.48;for(const line of lines){this.ensure(lineHeight);this.textAt(line,this.margin,this.y,this.usable,size,{bold,color,align});this.y+=lineHeight;}this.y+=gap;}
 line(x1,y1,x2,y2,{color='555555',width=1,dash=false}={}){if(this.pdf){this.pdf.save().strokeColor('#'+color).lineWidth(width);if(dash)this.pdf.dash(3,{space:3});this.pdf.moveTo(x1,y1).lineTo(x2,y2).stroke().restore();}else this.slide.addShape(this.pptx.ShapeType.line,{x:Math.min(x1,x2)/72,y:Math.min(y1,y2)/72,w:Math.abs(x2-x1)/72,h:Math.abs(y2-y1)/72,flipV:(x2-x1)*(y2-y1)<0,line:{color,width,...(dash?{dashType:'dash'}:{})}});}
 rect(x,y,w,h,ellipse=false){if(this.pdf){this.pdf.save().lineWidth(1).strokeColor('#333');if(ellipse)this.pdf.ellipse(x+w/2,y+h/2,w/2,h/2).stroke();else this.pdf.rect(x,y,w,h).stroke();this.pdf.restore();}else this.slide.addShape(ellipse?this.pptx.ShapeType.ellipse:this.pptx.ShapeType.rect,{x:x/72,y:y/72,w:w/72,h:h/72,line:{color:'333333',width:1},fill:{color:'FFFFFF',transparency:100}});}
 image(src,x,y,w,h,svg=false,crop='fit'){
  if(this.pdf){if(svg)SVGtoPDF(this.pdf,src,x,y,{width:w,height:h,preserveAspectRatio:'xMidYMid meet'});else{this.pdf.save();if(crop==='square')this.pdf.rect(x,y,w,h).clip();this.pdf.image(Buffer.from(src.split(',')[1],'base64'),x,y,{[crop==='square'?'cover':'fit']:[w,h],align:'center',valign:'center'});this.pdf.restore();}}
  else{let data=src;if(svg){if(!this.pngCache.has(src))this.pngCache.set(src,new Resvg(src,{fitTo:{mode:'width',value:256}}).render().asPng());data='image/png;base64,'+this.pngCache.get(src).toString('base64');}this.slide.addImage({data,x:x/72,y:y/72,w:w/72,h:h/72,sizing:{type:crop==='square'?'cover':'contain',w:w/72,h:h/72}});}
 }
 diagram(b){const node=renderDiagram(svgDoc,b),w=Math.min(this.usable,this.format==='pdf'?500:580),h=w*400/640;this.ensure(h+8);const x=this.margin+(this.usable-w)/2,y=this.y;
  if(this.pdf){node.attrs.xmlns='http://www.w3.org/2000/svg';SVGtoPDF(this.pdf,svgString(node),x,y,{width:w,height:h,fontCallback:()=>fonts.regular});}
  else {const scale=w/640;for(const n of node.children){const a=n.attrs,X=v=>x+Number(v)*scale,Y=v=>y+Number(v)*scale;if(n.tag==='line')this.line(X(a.x1),Y(a.y1),X(a.x2),Y(a.y2),{color:rgb(a.stroke||'#222'),width:Number(a['stroke-width']||1)*scale});else if(n.tag==='polyline'){const points=a.points.split(' ').map(p=>p.split(',').map(Number));for(let i=1;i<points.length;i++)this.line(X(points[i-1][0]),Y(points[i-1][1]),X(points[i][0]),Y(points[i][1]));}else if(n.tag==='circle'){this.slide.addShape(this.pptx.ShapeType.ellipse,{x:(X(a.cx)-a.r*scale)/72,y:(Y(a.cy)-a.r*scale)/72,w:2*a.r*scale/72,h:2*a.r*scale/72,fill:{color:'111111'},line:{color:'111111'}});}else if(n.tag==='rect')this.rect(X(a.x),Y(a.y),a.width*scale,a.height*scale);else if(n.tag==='ellipse')this.rect(X(a.cx-a.rx),Y(a.cy-a.ry),a.rx*2*scale,a.ry*2*scale,true);else if(n.tag==='text'){const size=Number(a['font-size']||14)*scale,tw=Math.max(size*1.2,this.measure.font('regular').fontSize(size).widthOfString(n.textContent)+4),anchor=a['text-anchor'],tx=X(a.x)-(anchor==='middle'?tw/2:anchor==='end'?tw:0);if(a.transform){this.slide.addText(n.textContent,{x:(X(a.x)-125)/72,y:(Y(a.y)-size/2)/72,w:250/72,h:size*1.5/72,fontFace:'DejaVu Sans',fontSize:size,margin:0,align:'center',rotate:270,color:'111111'});}else this.textAt(n.textContent,tx,Y(a.y)-size,tw,size);}}
  }this.y+=h+8;
 }
 table(headers,rows,leftVisuals=[]){const cols=headers.length,cw=this.usable/cols,size=this.format==='pdf'?10:18,pad=7,lineH=size*1.45;
  const row=(cells,header=false,visual=null)=>{const wrapped=cells.map(c=>wrap(this.measure,c,cw-2*pad,size,header)),visualH=visual?60:0,h=Math.max(...wrapped.map(a=>a.length))*lineH+2*pad+visualH;this.ensure(h);const y=this.y;for(let i=0;i<cols;i++){this.rect(this.margin+i*cw,y,cw,h);wrapped[i].forEach((line,j)=>this.textAt(line,this.margin+i*cw+pad,y+pad+j*lineH,cw-2*pad,size,{bold:header}));}if(visual){const src=visual.leftIcon?iconSvg(visual.leftIcon):visual.leftImage.src;this.image(src,this.margin+28,y+h-60,52,52,Boolean(visual.leftIcon));}this.y+=h;};
  row(headers,true);for(let i=0;i<rows.length;i++){const height=Math.max(...rows[i].map(c=>wrap(this.measure,c,cw-2*pad,size).length))*lineH+2*pad+(leftVisuals[i]?60:0);if(this.y+height>this.height-42){this.newPage();row(headers,true);}row(rows[i],false,leftVisuals[i]);}this.y+=12;
 }
 blocks(blocks=[]){for(const b of blocks){if(b.type==='graph'||b.type==='diagram')this.diagram(b);
   else if(b.type==='table')this.table(b.headers,b.rows);
   else if(b.type==='matching'){this.text('Match each number to a letter.',{size:this.body});this.table(['Column A','Column B'],b.pairs.map((p,i)=>[`${i+1}. ${p.leftIcon||p.leftImage?'':p.left}`,`${String.fromCharCode(65+i)}. ${b.pairs[b.order[i]].right}`]),b.pairs.map(p=>p.leftIcon||p.leftImage?p:null));for(const p of b.pairs)if(p.leftImage?.credit)this.credit(p.leftImage.credit);}
   else if(b.type==='picture'||b.type==='image'){const quantity=b.quantity||1,size=({small:36,medium:54,large:80}[b.size]||54)*(this.format==='pptx'?1.4:1),gap=12,per=Math.max(1,Math.floor((this.usable+gap)/(size+gap))),src=b.type==='picture'?iconSvg(b.icon):b.src;for(let i=0;i<quantity;i+=per){this.ensure(size+12);for(let j=i;j<Math.min(quantity,i+per);j++)this.image(src,this.margin+(j-i)*(size+gap),this.y,size,size,b.type==='picture',b.crop);this.y+=size+12;}if(b.credit)this.credit(b.credit);}
   else if(b.type==='lines'){for(let i=0;i<b.count;i++){this.ensure(26);this.y+=22;this.line(this.margin,this.y,this.width-this.margin,this.y,{color:'AAAAAA'});this.y+=4;}}
   else if(b.type==='drawing'){const h=Math.min(b.height*72/25.4,this.height-100);this.ensure(h+24);this.textAt(b.label,this.margin+6,this.y+4,this.usable-12,this.format==='pdf'?10:16,{color:'666666'});this.rect(this.margin,this.y,this.usable,h);this.y+=h+12;}
   else if(b.type==='tracing'){this.text('Trace the outlines.',{size:this.body});const base=Math.max(150,b.text.length*42),w=Math.min(this.usable,(this.format==='pdf'?90:130)*base/90),h=w*90/base;for(let i=0;i<b.rows;i++){this.ensure(h+8);const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${base}" height="90" viewBox="0 0 ${base} 90">${[15,50,80].map(y=>`<line x1="0" x2="${base}" y1="${y}" y2="${y}" stroke="#aaa" stroke-dasharray="4 4"/>`).join('')}<text x="5" y="70" font-size="64" font-family="DejaVu Sans" fill="none" stroke="#555" stroke-width=".8" stroke-dasharray="1 2">${esc(b.text)}</text></svg>`;if(this.pdf)SVGtoPDF(this.pdf,svg,this.margin,this.y,{width:w,height:h,fontCallback:()=>fonts.regular});else{const png=new Resvg(svg,{font:{fontFiles:[fonts.regular],loadSystemFonts:false},fitTo:{mode:'width',value:1800}}).render().asPng();this.slide.addImage({data:'image/png;base64,'+png.toString('base64'),x:this.margin/72,y:this.y/72,w:w/72,h:h/72});}this.y+=h+8;}}
   if(b.caption)this.text(b.caption,{size:this.format==='pdf'?10:17,color:'555555'});
  }}
 credit(c){this.text(`Image: ${c.author} · ${c.license}\n${c.source}`,{size:this.format==='pdf'?8:14,color:'555555'});}
 header(){const {spec,paper,sample}=this.draft,layout=paper.layout||{},h=layout.header||{},align=h.align||'center';if(sample)this.text('SAMPLE ASSESSMENT · Hand-authored example',{size:this.format==='pdf'?10:17,color:'69558E'});
  if(layout.logo){const size=(h.logoSize||20)*72/25.4;this.ensure(size+8);this.image(layout.logo,h.logoAlign==='left'?this.margin:h.logoAlign==='right'?this.width-this.margin-size:(this.width-size)/2,this.y,size,size);this.y+=size+(h.gap??4)*72/25.4;}
  for(const k of h.order||['school','term','title']){const v=k==='title'?spec.title:layout[k==='school'?'schoolName':'term'];if(v)this.text(v,{bold:k!=='term',size:k==='title'?(this.format==='pdf'?20:32):this.body,align});}
  this.text(this.copy==='teacher'?'TEACHER COPY / MARKING GUIDE':'STUDENT COPY',{bold:true,size:this.body,align});this.text(`${spec.subject} · ${spec.level} · ${spec.minutes} minutes · ${paperTotal(paper)} marks`,{align});if(this.copy==='student'&&this.format==='pdf')this.text('Name: ______________________________    Date: ______________',{size:11});if(this.schoolCopy)this.text(`School version ${this.schoolCopy.revision} · ${this.schoolCopy.approved?'SCHOOL-APPROVED VERSION':'DRAFT / NOT SCHOOL-APPROVED'}`,{bold:true,size:this.format==='pdf'?10:17});this.text(paper.instructions);}
 async finish(){const {paper}=this.draft;this.header();for(let i=0;i<paper.questions.length;i++){const q=paper.questions[i];this.currentQuestion=null;if(this.format==='pptx'||q.pageBreakBefore)this.newPage();else this.ensure(85);this.currentQuestion=i+1;if(q.section){this.text(q.section.title,{bold:true});if(q.section.instructions)this.text(q.section.instructions);}
   this.text(`${i+1}. ${q.prompt}   [${q.marks} ${q.marks===1?'mark':'marks'}]`,{bold:true,gap:12});this.blocks(q.blocks);if(q.kind==='mcq')q.options.forEach((o,j)=>this.text(`${'ABCD'[j]}. ${o}`,{gap:4}));
   if(this.copy==='teacher'){this.text(`Expected answer: ${q.kind==='mcq'?'ABCD'[q.correctIndex]+'. ':''}${q.answer}`,{bold:true,color:'254D3D'});q.marking.forEach(p=>this.text(`${p.point} (${p.marks} ${p.marks===1?'mark':'marks'})`,{gap:5}));this.text(q.grounding==='topic'||this.draft.spec.sourceMode==='topic'?`Topic-generated, not source-verified. Answer rationale: ${q.rationale}`:`From the lesson notes: “${q.evidence}”`,{size:this.format==='pdf'?10:17,color:'555555'});}
   else if(q.kind==='short'&&q.answerSpace!=='none'&&!hasAnswerSpace(q)&&this.format==='pdf')this.blocks([{type:'lines',count:3}]);this.y+=16;
  }
  this.text(this.draft.sample?'HAND-AUTHORED EXAMPLE · Adapt and review for your learners':'Teacher review confirmed · Prepared with TermQuill',{size:this.format==='pdf'?9:16,color:'666666'});
  if(this.pdf){this.pdf.end();return this.done;}return Buffer.from(await this.pptx.write({outputType:'nodebuffer',compression:true}));
 }
}
export async function renderExport({draft,format,copy,schoolCopy}){
 // Inspect dimensions before any decoder allocates pixel buffers.
 const probe=measureDoc(),check=src=>{const bytes=Buffer.from(src.split(',')[1],'base64');if(src.startsWith('data:image/png')){if(bytes.length<24||bytes.readUInt32BE(16)>4096||bytes.readUInt32BE(20)>4096)throw new Error('Picture dimensions are too large.');}const image=probe.openImage(bytes);if(!image.width||!image.height||image.width*image.height>16000000||image.width>4096||image.height>4096)throw new Error('Picture dimensions are too large.');};
 if(draft.paper.layout?.logo)check(draft.paper.layout.logo);for(const q of draft.paper.questions)for(const b of q.blocks||[]){if(b.type==='image')check(b.src);if(b.type==='matching')for(const p of b.pairs)if(p.leftImage)check(p.leftImage.src);}
 return new PaperWriter(format,draft,copy,schoolCopy).finish();
}
