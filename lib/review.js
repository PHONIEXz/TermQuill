const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const fields={kind:'Question type',prompt:'Question wording',marks:'Marks',options:'Answer options',correctIndex:'Correct option',answer:'Expected answer',marking:'Marking points',evidence:'Source evidence',blocks:'Pictures, tables & answer spaces',section:'Section heading / instructions',pageBreakBefore:'Page break',answerSpace:'Default answer space',source:'Source credit'};
export function compareRevisions(before,after){
 const old=before.paper.questions,next=after.paper.questions,used=new Set(),matches=new Map();
 // Reserve exact wording matches before positional fallbacks, so a moved
 // question is not accidentally consumed by a rewritten neighbour.
 next.forEach((q,i)=>{const j=old.findIndex((v,j)=>!used.has(j)&&v.prompt===q.prompt);if(j>=0){used.add(j);matches.set(i,j);}});
 next.forEach((q,i)=>{if(matches.has(i))return;const j=!used.has(i)&&i<old.length?i:old.findIndex((_,j)=>!used.has(j));if(j>=0){used.add(j);matches.set(i,j);}});
 const questions=next.map((q,i)=>{const j=matches.get(i),previous=j===undefined?null:old[j];const changed=previous?Object.entries(fields).filter(([key])=>!equal(previous[key],q[key])).map(([,label])=>label):[];return {before:previous,after:q,beforeIndex:j??null,afterIndex:i,changed,status:!previous?'added':changed.length?'changed':j!==i?'moved':'unchanged'};});
 old.forEach((q,j)=>{if(!used.has(j))questions.push({before:q,after:null,beforeIndex:j,afterIndex:null,changed:[],status:'removed'});});
 const metadata=[];for(const [key,label] of Object.entries({title:'Paper title',subject:'Subject',level:'Class',minutes:'Duration',assessmentMode:'Exam / Test',notes:'Original source notes',format:'Question format',difficulty:'Thinking level',formatInstructions:'Custom question format',difficultyInstructions:'Custom thinking level'}))if(!equal(before.spec[key],after.spec[key]))metadata.push({label,before:before.spec[key]??'',after:after.spec[key]??''});
 for(const [key,label] of Object.entries({instructions:'Student instructions',layout:'Paper heading, logo & style',markingMode:'Marking arrangement'}))if(!equal(before.paper[key],after.paper[key])){const layout=v=>`${v?.schoolName||'No school heading'} · ${v?.term||'No exam heading'} · ${v?.preset||'standard'} · ${v?.logo?'Logo supplied':'No logo'}`;metadata.push({label,before:key==='layout'?layout(before.paper[key]):before.paper[key]??'',after:key==='layout'?layout(after.paper[key]):after.paper[key]??'',...(key==='layout'?{beforeLogo:before.paper.layout?.logo,afterLogo:after.paper.layout?.logo}:{})});}
 return {questions,metadata};
}
export function progressKey({schoolId,paperId,revision,userId}){return `lessonpress.review.${schoolId}.${paperId}.${revision}.${userId}`;}
export function readProgress(storage,identity,count){try{const raw=storage.getItem(progressKey(identity));if(!raw||raw.length>200)return new Set();const list=JSON.parse(raw);if(!Array.isArray(list)||list.length>20||list.some(n=>!Number.isInteger(n)||n<1||n>count))return new Set();return new Set(list);}catch{return new Set();}}
export function writeProgress(storage,identity,checked){try{storage.setItem(progressKey(identity),JSON.stringify([...checked]));return true;}catch{return false;}}
