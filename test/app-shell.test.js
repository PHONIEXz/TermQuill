import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
const source=await readFile(new URL('../public/app-shell.js',import.meta.url),'utf8');
function setup(path,mobile=false){const dom=new JSDOM(html,{url:`https://lessonpress.test${path}`,runScripts:'outside-only'}),w=dom.window;const media={matches:mobile,addEventListener:(event,fn)=>{media.change=fn;}};w.matchMedia=()=>media;w.eval(source);return {dom,w,media};}
test('shell gives each internal task real navigation while home retains its landing header',()=>{
 for(const [path,label] of [['/workspace','My workspace'],['/lessons','Lesson library'],['/create','Assessment studio'],['/drafts','My drafts'],['/question-bank','Question library']]){const {dom,w}=setup(path);try{assert.ok(w.document.body.classList.contains('application-shell'));const active=w.document.querySelector('.shell-studio-nav a[aria-current=page]');assert.equal(active.textContent,label);assert.equal(active.getAttribute('href'),path);assert.equal(w.document.querySelector('.shell-brand').getAttribute('href'),'/');assert.match(w.document.querySelector('.shell-breadcrumb').textContent,new RegExp(label));}finally{dom.window.close();}}
 const {dom,w}=setup('/');try{assert.equal(w.document.querySelector('.app-rail'),null);assert.equal(w.document.body.classList.contains('application-shell'),false);}finally{dom.window.close();}
});
test('mobile rail is inert when closed, opens with keyboard focus and Escape returns focus',()=>{
 const {dom,w,media}=setup('/create',true);try{const rail=w.document.querySelector('.app-rail'),toggle=w.document.querySelector('.shell-menu');assert.equal(rail.inert,true);toggle.click();assert.equal(toggle.getAttribute('aria-expanded'),'true');assert.equal(rail.inert,false);assert.equal(w.document.activeElement,rail.querySelector('a'));w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(toggle.getAttribute('aria-expanded'),'false');assert.equal(w.document.activeElement,toggle);toggle.click();rail.querySelector('a').focus();media.change();assert.equal(w.document.activeElement,toggle);assert.equal(rail.inert,true);}finally{dom.window.close();}
});
