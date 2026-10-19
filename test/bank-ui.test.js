import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {readBank,writeBank,saveBankQuestion,validateBank,assemblePaper,BANK_KEY} from '../lib/bank.js';
import {saveDraft,readDrafts} from '../lib/drafts.js';
import {earlyYearsSample} from '../lib/early-years.js';
import {installVisuals} from './visual-helpers.js';
const html=(await readFile(new URL('../public/index.html',import.meta.url),'utf8')).replace('data-page="home"','data-page="question-bank"');
const script=(await readFile(new URL('../public/bank-page.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'');
test('bank page searches, selects, assembles and saves a new unreviewed device paper',()=>{
 const dom=new JSDOM(html,{url:'https://lessonpress.test/question-bank',runScripts:'outside-only'}),w=dom.window;try{
 Object.assign(w,{structuredClone,readBank,writeBank,validateBank,assemblePaper,saveDraft});installVisuals(w);const d=earlyYearsSample();for(const i of [0,1,2])saveBankQuestion(w.localStorage,d,i,{topic:i===0?'Counting':'Letters and shapes'});w.eval(script);assert.equal(w.document.querySelectorAll('.bank-card').length,3);
 const search=w.document.getElementById('bank-search');search.value='Counting';search.dispatchEvent(new w.Event('input'));assert.equal(w.document.querySelectorAll('.bank-card').length,1);search.value='';search.dispatchEvent(new w.Event('input'));for(const c of w.document.querySelectorAll('.bank-choice input')){c.checked=true;c.dispatchEvent(new w.Event('change'));}assert.equal(w.document.getElementById('bank-selected').textContent,'3 selected');w.document.getElementById('bank-title').value='Class examination';w.document.getElementById('bank-assemble').dispatchEvent(new w.Event('submit',{cancelable:true}));const saved=readDrafts(w.localStorage);assert.equal(saved.length,1);assert.equal(saved[0].spec.title,'Class examination');assert.equal(saved[0].approved,false);assert.equal(readBank(w.localStorage).length,3);
 }finally{dom.window.close();}
});
