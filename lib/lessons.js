export const LESSONS_KEY='lessonpress.lessons.v1';
export const LESSON_TRANSFER_KEY='lessonpress.lesson-transfer.v1';
export const MAX_LESSONS=100,MAX_LIBRARY_BYTES=2000000,MAX_COLLECTION_CHARS=18000;
const norm=value=>value.trim().normalize('NFKC').toLowerCase();
function text(value,name,min,max){if(typeof value!=='string'||value.trim().length<min||value.length>max)throw new Error(`${name}: use ${min}–${max} characters.`);return value.trim();}
const bytes=value=>new TextEncoder().encode(JSON.stringify(value)).length;
export function validateLesson(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid lesson note.');
 const year=text(value.year,'School year',9,9);if(!/^\d{4}\/\d{4}$/.test(year)||Number(year.slice(5))!==Number(year.slice(0,4))+1)throw new Error('Use consecutive years, such as 2026/2027.');
 if(!['1','2','3'].includes(String(value.term)))throw new Error('Choose first, second or third term.');
 if(!Number.isInteger(value.week)||value.week<1||value.week>20)throw new Error('Choose a week from 1 to 20.');
 const time=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))?v:new Date().toISOString();
 return {id:typeof value.id==='string'&&/^[\w-]{1,80}$/.test(value.id)?value.id:crypto.randomUUID(),year,level:text(value.level,'Class',2,50),subject:text(value.subject,'Subject',2,60),term:String(value.term),week:value.week,topic:text(value.topic,'Topic',2,100),body:text(value.body,'Lesson notes',120,18000),createdAt:time(value.createdAt),updatedAt:time(value.updatedAt)};
}
export function validateLessons(value){
 if(!value||value.version!==1||value.kind!=='lessonpress-lessons'||!Array.isArray(value.items)||value.items.length>MAX_LESSONS)throw new Error('Choose a LessonPress lesson-library backup with up to 100 notes.');
 if(bytes(value)>MAX_LIBRARY_BYTES)throw new Error('Lesson library exceeds 2 MB. Export smaller collections.');
 if(value.items.some(x=>!x||typeof x.id!=='string'||!/^[-\w]{1,80}$/.test(x.id)))throw new Error('Saved lessons need stable identifiers.');
 const items=value.items.map(validateLesson);if(new Set(items.map(x=>x.id)).size!==items.length)throw new Error('Duplicate lesson identifiers in backup.');return items;
}
export function lessonBackup(items){return {version:1,kind:'lessonpress-lessons',items};}
export function readLessons(storage){const raw=storage.getItem(LESSONS_KEY);if(!raw)return [];if(raw.length>MAX_LIBRARY_BYTES)throw new Error('Lesson library is too large. Restore a smaller backup.');return validateLessons(JSON.parse(raw));}
export function writeLessons(storage,items){const checked=validateLessons(lessonBackup(items));storage.setItem(LESSONS_KEY,JSON.stringify(lessonBackup(checked)));return checked;}
export function saveLesson(storage,value){const checked=validateLesson({...value,updatedAt:new Date().toISOString()}),items=readLessons(storage),index=items.findIndex(x=>x.id===checked.id);if(value.id&&value.updatedAt&&(index<0||items[index].updatedAt!==value.updatedAt))throw new Error('This lesson changed or was removed in another tab. Reload it before editing; your typed text is still in the editor.');if(index<0)items.unshift(checked);else {checked.updatedAt=new Date(Math.max(Date.now(),Date.parse(items[index].updatedAt)+1)).toISOString();items[index]=checked;}writeLessons(storage,items);return checked;}
export function filterLessons(items,filters={}){return items.filter(x=>['year','level','subject','term'].every(k=>!filters[k]||norm(String(x[k]))===norm(String(filters[k])))&&(!filters.query||norm(`${x.topic} ${x.body} week ${x.week}`).includes(norm(filters.query)))).sort((a,b)=>Number(a.term)-Number(b.term)||a.week-b.week||a.topic.localeCompare(b.topic));}
export function mergeLessons(storage,backup){
 const incoming=validateLessons(backup),current=readLessons(storage);let added=0,skipped=0,copied=0;
 const same=(a,b)=>['year','level','subject','term','week','topic','body'].every(k=>String(a[k])===String(b[k]));
 for(const note of incoming){if(current.some(x=>same(x,note))){skipped++;continue;}if(current.some(x=>x.id===note.id)){note.id=crypto.randomUUID();copied++;}current.push(note);added++;}
 writeLessons(storage,current);return {added,skipped,copied};
}
export function prepareLessonCollection(items,ids){
 if(!Array.isArray(ids)||ids.length<1||ids.length>MAX_LESSONS||new Set(ids).size!==ids.length)throw new Error('Choose 1–100 distinct lessons.');
 const selected=ids.map(id=>items.find(x=>x.id===id));if(selected.some(x=>!x))throw new Error('A selected lesson is missing. Return to the library and select again.');
 const notes=selected.map(validateLesson),first=notes[0];if(notes.some(x=>['year','subject','level'].some(k=>norm(x[k])!==norm(first[k]))))throw new Error('Choose lessons from the same school year, subject and class.');
 notes.sort((a,b)=>Number(a.term)-Number(b.term)||a.week-b.week||a.topic.localeCompare(b.topic));
 const termNames={'1':'First term','2':'Second term','3':'Third term'},terms=[...new Set(notes.map(x=>x.term))];
 const heading=`${terms.map(t=>termNames[t]).join(' + ')} · ${first.year}`;
 const combined=notes.map(x=>`LESSON: ${x.topic}\nSchool year: ${x.year} | ${x.level} | ${x.subject} | ${termNames[x.term]} | Week ${x.week}\n\n${x.body}`).join('\n\n-----\n\n');
 if(combined.length>MAX_COLLECTION_CHARS)throw new Error(`These ${notes.length} lessons contain ${combined.length.toLocaleString()} characters including headings. One generation currently allows 18,000. Choose a smaller group; no lessons have been dropped.`);
 return {notes:combined,subject:first.subject,level:first.level,title:`${first.subject} ${terms.length===1?termNames[terms[0]].toLowerCase():'cumulative'} assessment`.slice(0,100),heading,count:notes.length,topics:notes.map(x=>x.topic)};
}
