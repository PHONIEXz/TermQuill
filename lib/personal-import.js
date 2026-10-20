import {readLessons,mergeLessons,lessonBackup} from './lessons.js';
import {readDrafts,validateDraft,DRAFTS_KEY} from './drafts.js';
import {readBank,writeBank} from './bank.js';
// Older draft readers migrate automatically. Read a snapshot so claiming old work never changes it.
const snapshot=storage=>{const cache=new Map();return {getItem:k=>cache.has(k)?cache.get(k):storage.getItem(k),setItem:(k,v)=>cache.set(k,v),removeItem:k=>cache.set(k,null)};};
export function legacySummary(storage){const source=snapshot(storage),result={lessons:0,drafts:0,questions:0,errors:[]};for(const [key,read] of [['lessons',readLessons],['drafts',readDrafts],['questions',readBank]])try{result[key]=read(source).length;}catch{result.errors.push(key);}return result;}
const contentKey=item=>JSON.stringify(Object.fromEntries(Object.entries(item).filter(([k])=>!['id','savedAt','createdAt','updatedAt'].includes(k))));
function mergeItems(current,incoming){const out=[...current],seen=new Set(current.map(contentKey));let added=0;for(const item of incoming){if(seen.has(contentKey(item)))continue;const copy={...item};if(out.some(x=>x.id===copy.id))copy.id=crypto.randomUUID();seen.add(contentKey(copy));out.push(copy);added++;}return {items:out,added};}
export function importLegacy(storage,destination,confirmed){if(confirmed!==true)throw new Error('Confirm this earlier work belongs to you before importing.');const source=snapshot(storage),report={lessons:0,drafts:0,questions:0,errors:[]};
 for(const kind of ['lessons','drafts','questions'])try{
  if(kind==='lessons'){report.lessons=mergeLessons(destination,lessonBackup(readLessons(source))).added;continue;}
  const read=kind==='drafts'?readDrafts:readBank,incoming=read(source);if(!incoming.length)continue;const merged=mergeItems(read(destination),incoming);
  if(kind==='questions')writeBank(destination,merged.items);else{if(merged.items.length>30)throw new Error('30-draft limit reached.');const raw=JSON.stringify(merged.items.map(validateDraft));if(raw.length>2000000)throw new Error('Draft storage limit reached.');destination.setItem(DRAFTS_KEY,raw);}report[kind]=merged.added;
 }catch(e){report.errors.push(`${kind}: ${e.message}`);}return report;
}
