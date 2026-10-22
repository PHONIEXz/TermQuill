import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {prepareExport,renderExport,exportFilename} from '../lib/paper-export.js';
import {createExportHandler} from '../api/export.js';
import {sampleSpec,samplePaper} from '../lib/sample.js';
import {earlyYearsSample} from '../lib/early-years.js';
import {freshDiagram} from '../lib/diagrams.js';
const request=(format='pdf',copy='student')=>({draft:{spec:sampleSpec,paper:samplePaper},format,copy,reviewed:true});
const response=()=>({status:0,headers:{},writeHead(s,h){this.status=s;Object.assign(this.headers,h);},end(b){this.body=b;}});
const req=body=>({method:'POST',headers:{origin:'https://termquill.test',host:'termquill.test','content-type':'application/json','x-personal-account':'owner'},body});
test('export validates format, review, draft structure and safe copy-specific filenames',()=>{
 for(const patch of [{reviewed:false},{format:'html'},{format:'toString'},{copy:'all'},{draft:{spec:sampleSpec,paper:{...samplePaper,questions:[]}}}])assert.throws(()=>prepareExport({...request(),...patch}));
 const p=prepareExport(request());assert.equal(p.draft.approved,false);assert.match(exportFilename(p.draft,'teacher','pdf'),/marking-guide.pdf$/);p.draft.spec.title='../../\r\nInjected';assert.doesNotMatch(exportFilename(p.draft,'student','pdf'),/[\r\n/]/);
});
test('student PowerPoint excludes answer, criteria, evidence and rationale even in package metadata',async()=>{
 const body=request('pptx'),paper=structuredClone(samplePaper);paper.questions[3].answer='PRIVATE_ANSWER_839';paper.questions[3].marking[0].point='PRIVATE_CRITERION_672';body.draft={spec:sampleSpec,paper};
 const bytes=await renderExport(prepareExport(body)),zip=await JSZip.loadAsync(bytes),xml=(await Promise.all(Object.keys(zip.files).filter(n=>n.endsWith('.xml')).map(n=>zip.file(n).async('string')))).join('\n');
 assert.doesNotMatch(xml,/PRIVATE_ANSWER_839|PRIVATE_CRITERION_672|From the lesson notes|Answer rationale/);assert.match(xml,/STUDENT COPY/);assert.match(xml,/Which statement describes an element/);assert.ok(Object.keys(zip.files).filter(n=>/^ppt\/slides\/slide\d+\.xml$/.test(n)).length>=7);
 const teacher=await JSZip.loadAsync(await renderExport(prepareExport({...body,copy:'teacher'})));const teacherXML=(await Promise.all(Object.keys(teacher.files).filter(n=>/^ppt\/slides\/slide\d+\.xml$/.test(n)).map(n=>teacher.file(n).async('string')))).join('\n');assert.match(teacherXML,/PRIVATE_ANSWER_839/);assert.match(teacherXML,/PRIVATE_CRITERION_672/);assert.match(teacherXML,/From the lesson notes/);
});
test('visual exports include native graph/diagram shapes and editable table text',async()=>{
 const body=request('pptx');body.draft=structuredClone(body.draft);const graph=freshDiagram('graph');graph.style='line';graph.points=[[0,0],[10,20]];body.draft.paper.questions[0].blocks=[graph,freshDiagram(),{type:'table',headers:['Time','Speed'],rows:[['1','2'],['3','4']],caption:'Measured values'}];
 const zip=await JSZip.loadAsync(await renderExport(prepareExport(body))),xml=(await Promise.all(Object.keys(zip.files).filter(n=>/^ppt\/slides\/slide\d+\.xml$/.test(n)).map(n=>zip.file(n).async('string')))).join('\n');assert.match(xml,/Time \(s\)/);assert.match(xml,/Measured values/);assert.match(xml,/prst="ellipse"/);assert.match(xml,/prst="line"/);assert.doesNotMatch(xml,/<p:pic>/);
});
test('A4 PDF renders school branding, visuals and separate teacher and student documents',async()=>{
 const early=earlyYearsSample();for(const copy of ['student','teacher']){const bytes=await renderExport(prepareExport({draft:early,format:'pdf',copy,reviewed:true}));assert.equal(bytes.subarray(0,5).toString(),'%PDF-');assert.ok(bytes.length>10000);assert.match(bytes.toString('latin1'),/595\.28 841\.89/);assert.ok((bytes.toString('latin1').match(/\/Type \/Page\b/g)||[]).length<=4,'no blank pages from footers');}
});
test('endpoint checks origin, account, review and request size before rendering',async()=>{
 let calls=0;const handler=createExportHandler({authenticate:async()=>({user:{id:'owner'}}),limiter:()=>true,render:async()=>{calls++;return Buffer.from('%PDF-test');}});
 for(const [patch,status] of [[{headers:{origin:'https://evil.test',host:'termquill.test'}},403],[{headers:{...req().headers,'x-personal-account':'other'}},409],[{body:{...request(),reviewed:false}},400],[{body:{...request(),padding:'x'.repeat(250001)}},413]]){const r=response();await handler({...req(request()),...patch},r);assert.equal(r.status,status);}
 assert.equal(calls,0);const r=response();await handler(req(request()),r);assert.equal(r.status,200);assert.equal(calls,1);assert.equal(r.headers['Cache-Control'],'no-store');assert.match(r.headers['Content-Disposition'],/student.pdf/);
});
test('export failures keep private content out of error messages and auth remains required',async()=>{
 const r=response();await createExportHandler({authenticate:async()=>{throw Object.assign(new Error('Sign in required'),{status:401});}})(req(request()),r);assert.equal(r.status,401);
 const failed=response();await createExportHandler({authenticate:async()=>({user:{id:'owner'}}),limiter:()=>true,render:async()=>{throw new Error('PRIVATE_SOURCE_TEXT');}})(req(request()),failed);assert.equal(failed.status,422);assert.doesNotMatch(failed.body,/PRIVATE_SOURCE_TEXT/);
});

test('school export fetches access-scoped revision and derives approval only from stored version',async()=>{
 const schoolRef={schoolId:'11111111-1111-4111-8111-111111111111',paperId:'22222222-2222-4222-8222-222222222222',revision:2};let exported;const client={rpc:async(name,args)=>{assert.equal(name,'lp_workspace');assert.equal(args.p_action,'paper');assert.equal(args.p_payload.revision,2);return {data:{content:{spec:sampleSpec,paper:samplePaper},revision:2,approved_revision:1}};}};
 const handler=createExportHandler({authenticate:async()=>({user:{id:'owner'},client}),limiter:()=>true,render:async p=>{exported=p;return Buffer.from('file');}}),r=response();await handler(req({...request(),schoolRef,draft:{malicious:true},schoolCopy:{approved:true}}),r);assert.equal(r.status,200);assert.equal(exported.schoolCopy.approved,false);assert.equal(exported.schoolCopy.revision,2);assert.equal(exported.draft.spec.title,sampleSpec.title);
 const denied=response();await createExportHandler({authenticate:async()=>({user:{id:'owner'},client:{rpc:async()=>({error:{message:'PRIVATE_DATABASE_DETAILS'}})}}),limiter:()=>true})(req({...request(),schoolRef}),denied);assert.equal(denied.status,403);assert.doesNotMatch(denied.body,/PRIVATE_DATABASE_DETAILS/);
});
test('Early Years PowerPoint preserves the exact counting pictures and tracing tasks',async()=>{
 const zip=await JSZip.loadAsync(await renderExport(prepareExport({draft:earlyYearsSample(),format:'pptx',copy:'student',reviewed:true})));const xml=(await Promise.all(Object.keys(zip.files).filter(n=>/^ppt\/slides\/slide\d+\.xml$/.test(n)).map(n=>zip.file(n).async('string')))).join('\n');assert.match(xml,/Trace the outlines/);assert.match(xml,/Column A/);assert.ok((xml.match(/<p:pic>/g)||[]).length>=8);assert.doesNotMatch(xml,/Expected answer|From the lesson notes/);
});
