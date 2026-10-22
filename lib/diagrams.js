// Teacher-authored, deterministic visuals. Geometry is checked, subject meaning is not.
const num=(v,min,max)=>{if(!Number.isFinite(v)||v<min||v>max)throw new Error(`Use a number from ${min} to ${max} in the diagram.`);return v;};
const label=(v,max=100)=>{if(typeof v!=='string'||v.length>max)throw new Error(`Use up to ${max} characters for a diagram label.`);return v;};
export function cleanDiagram(b){
 const base={type:b.type,caption:label(b.caption??'',160),description:label(b.description??'',300)};
 if(b.type==='graph'){
  const axis=a=>{if(!a||typeof a!=='object')throw new Error('Set both graph axes.');const min=num(a.min,-100000,100000),max=num(a.max,-100000,100000),step=num(a.step,.0001,100000);if(max<=min||(max-min)/step>20||(max-min)/step<1)throw new Error('Graph axes need increasing bounds and 1–20 grid intervals.');return {label:label(a.label,60),min,max,step};};
  const x=axis(b.x),y=axis(b.y);if(!['points','line','blank'].includes(b.style))throw new Error('Choose points, line or blank graph.');
  if(!Array.isArray(b.points)||b.points.length>30)throw new Error('Use at most 30 graph points.');
  if(b.style!=='blank'&&b.points.length<(b.style==='line'?2:1))throw new Error('Add at least one data point, or two for a joined line. Use blank for a plotting grid.');
  const points=b.points.map(p=>{if(!Array.isArray(p)||p.length!==2)throw new Error('Each graph point needs x and y values.');return [num(p[0],x.min,x.max),num(p[1],y.min,y.max)];});
  return {...base,x,y,style:b.style,points};
 }
 if(b.type!=='diagram'||!Array.isArray(b.parts)||!b.parts.length||b.parts.length>24)throw new Error('A diagram needs 1–24 shapes, arrows or labels.');
 return {...base,parts:b.parts.map(p=>{if(!['line','arrow','rectangle','circle','text'].includes(p?.kind))throw new Error('Choose a supported diagram element.');const part={kind:p.kind,x:num(p.x,0,100),y:num(p.y,0,100),label:label(p.label??'',60)};if(['line','arrow'].includes(p.kind)){part.x2=num(p.x2,0,100);part.y2=num(p.y2,0,100);}if(['rectangle','circle'].includes(p.kind)){part.width=num(p.width,1,100);part.height=num(p.height,1,100);if(p.x+part.width>100||p.y+part.height>100)throw new Error('Keep each shape inside the diagram.');}return part;})};
}
export function freshDiagram(type='diagram'){
 if(type==='graph')return {type,caption:'',description:'Graph with labelled axes. Check the values and units.',x:{label:'Time (s)',min:0,max:10,step:1},y:{label:'Distance (m)',min:0,max:20,step:2},style:'blank',points:[]};
 return {type:'diagram',caption:'',description:'Teacher-authored diagram. Add a description without revealing the answer.',parts:[{kind:'rectangle',x:35,y:40,width:30,height:25,label:''},{kind:'arrow',x:65,y:52,x2:90,y2:52,label:'F'}]};
}
export function renderDiagram(doc,raw){
 const b=cleanDiagram(raw),ns='http://www.w3.org/2000/svg',svg=doc.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 640 400');svg.setAttribute('role','img');svg.setAttribute('aria-label',b.description||b.caption||'Teacher-authored assessment diagram');svg.classList.add('assessment-diagram');
 const add=(tag,attrs,text)=>{const e=doc.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));if(text!==undefined)e.textContent=text;svg.append(e);return e;};
 const line=(x1,y1,x2,y2,color='#222',width=2)=>add('line',{x1,y1,x2,y2,stroke:color,'stroke-width':width});
 const text=(x,y,value,anchor='middle')=>add('text',{x,y,fill:'#111','font-size':14,'text-anchor':anchor,'font-family':'Arial, sans-serif'},value);
 const title=doc.createElementNS(ns,'title');title.textContent=b.description||'Assessment visual';svg.append(title);
 if(b.type==='graph'){
  const X=v=>80+(v-b.x.min)/(b.x.max-b.x.min)*500,Y=v=>330-(v-b.y.min)/(b.y.max-b.y.min)*280;
  for(let i=0;i<=Math.floor((b.x.max-b.x.min)/b.x.step+1e-8);i++){const v=b.x.min+i*b.x.step,x=X(v);line(x,50,x,330,'#aaa',.7);text(x,350,String(Number(v.toPrecision(7))));}
  for(let i=0;i<=Math.floor((b.y.max-b.y.min)/b.y.step+1e-8);i++){const v=b.y.min+i*b.y.step,y=Y(v);line(80,y,580,y,'#aaa',.7);text(70,y+4,String(Number(v.toPrecision(7))),'end');}
  line(80,50,80,330);line(80,330,580,330);text(330,385,b.x.label);const yl=text(18,190,b.y.label);yl.setAttribute('transform','rotate(-90 18 190)');
  if(b.style!=='blank'){if(b.style==='line'&&b.points.length>1)add('polyline',{points:b.points.map(p=>`${X(p[0])},${Y(p[1])}`).join(' '),fill:'none',stroke:'#111','stroke-width':2});for(const [x,y] of b.points)add('circle',{cx:X(x),cy:Y(y),r:3,fill:'#111'});}
 }else for(const p of b.parts){const x=30+p.x*5.8,y=30+p.y*3.3;
  if(['line','arrow'].includes(p.kind)){const x2=30+p.x2*5.8,y2=30+p.y2*3.3;line(x,y,x2,y2);if(p.kind==='arrow'){const a=Math.atan2(y2-y,x2-x);for(const s of [-1,1])line(x2,y2,x2-11*Math.cos(a+s*.45),y2-11*Math.sin(a+s*.45));}if(p.label)text((x+x2)/2,(y+y2)/2-9,p.label);}
  else if(p.kind==='text')text(x,y,p.label);
  else{const w=p.width*5.8,h=p.height*3.3;add(p.kind==='circle'?'ellipse':'rect',p.kind==='circle'?{cx:x+w/2,cy:y+h/2,rx:w/2,ry:h/2,fill:'none',stroke:'#111','stroke-width':2}:{x,y,width:w,height:h,fill:'none',stroke:'#111','stroke-width':2});if(p.label)text(x+w/2,y+h/2+5,p.label);}
 }
 return svg;
}
