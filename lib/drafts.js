import {validateRequest,parseModelOutput} from './assessment.js';
export const DRAFTS_KEY='lessonpress.drafts.v2';
const LEGACY_KEY='lessonpress.draft.v1';
export function validateDraft(value) {
  if(!value||typeof value!=='object')throw new Error('Invalid draft file.');
  const spec=validateRequest(value.spec),paper=parseModelOutput(JSON.stringify(value.paper),spec);
  return {id:typeof value.id==='string'&&/^[\w-]{1,80}$/.test(value.id)?value.id:crypto.randomUUID(),spec,paper,approved:false,sample:value.sample===true,model:typeof value.model==='string'?value.model.slice(0,100):'Imported draft',savedAt:typeof value.savedAt==='string'&&Number.isFinite(Date.parse(value.savedAt))?value.savedAt:new Date().toISOString()};
}
export function readDrafts(storage) {
  const raw=storage.getItem(DRAFTS_KEY);
  if(raw){
    if(raw.length>2000000)throw new Error('Saved drafts are too large.');
    const items=JSON.parse(raw);if(!Array.isArray(items)||items.length>30)throw new Error('Invalid draft collection.');
    return items.map(validateDraft);
  }
  const legacy=storage.getItem(LEGACY_KEY);
  if(!legacy)return [];
  if(legacy.length>200000)throw new Error('Invalid legacy draft.');
  const draft=validateDraft(JSON.parse(legacy));
  // Copy first; remove the legacy record only after the new record is saved.
  storage.setItem(DRAFTS_KEY,JSON.stringify([draft]));storage.removeItem(LEGACY_KEY);
  return [draft];
}
export function saveDraft(storage,value) {
  const draft=validateDraft({...value,savedAt:new Date().toISOString()}),items=readDrafts(storage),index=items.findIndex(d=>d.id===draft.id);
  if(index>=0)items.splice(index,1);
  if(items.length>=30)throw new Error('Your device library is full (30 drafts). Export and remove a draft before saving another.');
  items.unshift(draft);const raw=JSON.stringify(items);if(raw.length>2000000)throw new Error('Draft storage is full. Export a backup first.');
  storage.setItem(DRAFTS_KEY,raw);return draft;
}
export function deleteDraft(storage,id) {
  const items=readDrafts(storage).filter(d=>d.id!==id);storage.setItem(DRAFTS_KEY,JSON.stringify(items));
}
