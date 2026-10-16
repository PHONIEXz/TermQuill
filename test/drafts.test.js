import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleSpec,samplePaper} from '../lib/sample.js';
import {readDrafts,saveDraft,deleteDraft,validateDraft,DRAFTS_KEY} from '../lib/drafts.js';
const fixture=()=>({spec:structuredClone(sampleSpec),paper:structuredClone(samplePaper),approved:true});
function storage(){const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};}
test('saves several drafts and updates an existing paper instead of duplicating it',()=>{
  const s=storage();const a=saveDraft(s,fixture()),b=saveDraft(s,fixture());assert.notEqual(a.id,b.id);assert.equal(readDrafts(s).length,2);
  a.spec.title='Revised title';saveDraft(s,a);const all=readDrafts(s);assert.equal(all.length,2);assert.equal(all[0].spec.title,'Revised title');assert.equal(all[0].approved,false);
});
test('removes only the selected saved paper',()=>{const s=storage(),a=saveDraft(s,fixture()),b=saveDraft(s,fixture());deleteDraft(s,a.id);assert.deepEqual(readDrafts(s).map(d=>d.id),[b.id]);});
test('migrates the original single draft without losing it',()=>{const s=storage();s.setItem('lessonpress.draft.v1',JSON.stringify(fixture()));const all=readDrafts(s);assert.equal(all.length,1);assert.equal(all[0].approved,false);assert.equal(s.getItem('lessonpress.draft.v1'),null);assert.ok(s.getItem(DRAFTS_KEY));});
test('failed migration write preserves the original record',()=>{const raw=JSON.stringify(fixture());const s={getItem:k=>k==='lessonpress.draft.v1'?raw:null,setItem:()=>{throw new Error('Full');},removeItem:()=>assert.fail()};assert.throws(()=>readDrafts(s));assert.equal(s.getItem('lessonpress.draft.v1'),raw);});
test('rejects invalid and oversized saved collections and corrupt imports',()=>{const s=storage();s.setItem(DRAFTS_KEY,'{}');assert.throws(()=>readDrafts(s));s.setItem(DRAFTS_KEY,'x'.repeat(2000001));assert.throws(()=>readDrafts(s));assert.throws(()=>validateDraft({spec:sampleSpec,paper:{}}));});
test('draft cap rejects a new paper without destroying saved work',()=>{const s=storage();for(let i=0;i<30;i++)saveDraft(s,fixture());assert.throws(()=>saveDraft(s,fixture()),/full/);assert.equal(readDrafts(s).length,30);});
