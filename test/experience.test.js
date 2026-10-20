import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';

const html = await readFile(new URL('../public/index.html',import.meta.url),'utf8');
const script = await readFile(new URL('../public/experience.js',import.meta.url),'utf8');
function setup(matches=false) {
  const dom = new JSDOM(html,{runScripts:'outside-only'});
  const w=dom.window;
  const media={matches,addEventListener:(type,fn)=>{media.change=fn;}};
  w.matchMedia=()=>media;
  w.fetch=()=>assert.fail('An illustrative preview must not call an API');
  w.eval(script);
  return {dom,w,media};
}
test('workflow example changes panels by click and keyboard without an AI request',()=>{
  const {dom,w}=setup();
  try {
    const buttons=[...w.document.querySelectorAll('[data-demo-step]')];
    const panels=[...w.document.querySelectorAll('[data-demo-panel]')];
    assert.equal(panels.filter(p=>!p.hidden).length,1);
    buttons[1].click();
    assert.equal(buttons[1].getAttribute('aria-selected'),'true');
    assert.equal(panels[0].hidden,true);
    assert.match(panels[1].textContent,/Filtration/);
    buttons[1].dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));
    assert.equal(w.document.activeElement,buttons[2]);
    assert.equal(panels[2].hidden,false);
    buttons[2].dispatchEvent(new w.KeyboardEvent('keydown',{key:'Home',bubbles:true,cancelable:true}));
    assert.equal(w.document.activeElement,buttons[0]);
    assert.equal(panels[0].hidden,false);
  } finally {dom.window.close();}
});
test('motion can be paused and resumes only when device preferences permit it',()=>{
  const {dom,w,media}=setup();
  try {
    const button=w.document.querySelector('.motion-toggle');
    assert.equal(w.document.documentElement.dataset.motion,'full');
    button.click();
    assert.equal(w.document.documentElement.dataset.motion,'reduced');
    assert.equal(button.textContent,'Resume motion');
    button.click();
    assert.equal(w.document.documentElement.dataset.motion,'full');
    media.matches=true;media.change();
    assert.equal(w.document.documentElement.dataset.motion,'reduced');
    assert.equal(button.disabled,true);
  } finally {dom.window.close();}
});
test('system reduced motion takes precedence and preview content exists without scripts',()=>{
  const {dom,w}=setup(true);
  try {assert.equal(w.document.documentElement.dataset.motion,'reduced');assert.equal(w.document.querySelector('.motion-toggle').disabled,true);} finally {dom.window.close();}
  const plain=new JSDOM(html);
  try {assert.equal(plain.window.document.querySelectorAll('[data-demo-panel][hidden]').length,0);assert.match(plain.window.document.querySelector('.workflow-demo').textContent,/hand-authored/);} finally {plain.window.close();}
});

test('landing reveal choreography preserves accessible text and observes only once',()=>{
 const dom=new JSDOM(html,{runScripts:'outside-only'}),w=dom.window,calls=[],observers=[];
 try{
  w.matchMedia=()=>({matches:false,addEventListener(){}});
  w.Element.prototype.animate=function(frames,options){calls.push({element:this,frames,options});};
  w.IntersectionObserver=class{constructor(fn){this.fn=fn;this.targets=[];this.removed=[];observers.push(this);}observe(el){this.targets.push(el);}unobserve(el){this.removed.push(el);}};
  w.eval(script);
  const title=w.document.querySelector('.vl-hero h1');assert.ok(calls.some(c=>title.contains(c.element)&&c.frames[0].transform==='translateY(115%)'));
  const statement=w.document.querySelector('[data-word-reveal]');assert.match(statement.getAttribute('aria-label'),/Great teaching/);assert.ok([...statement.querySelectorAll('span')].every(s=>s.getAttribute('aria-hidden')==='true'));
  const observer=observers.find(o=>o.targets.includes(statement)),heading=w.document.getElementById('vl-solutions-heading');observer.fn([{target:heading,isIntersecting:true},{target:statement,isIntersecting:true}]);
  assert.ok(observer.removed.includes(heading));assert.ok(observer.removed.includes(statement));assert.equal(heading.dataset.entered,'true');assert.ok(calls.some(c=>statement.contains(c.element)&&c.options.delay>0));
 }finally{dom.window.close();}
});
test('reduced motion avoids entrance animations while home links and examples remain usable',()=>{
 const dom=new JSDOM(html,{runScripts:'outside-only'}),w=dom.window;
 try{
  w.matchMedia=()=>({matches:true,addEventListener(){}});w.Element.prototype.animate=()=>assert.fail('Reduced motion must not run entrance animation');w.eval(script);
  assert.equal(w.document.querySelector('.vl-hero a[href="/workspace"]').textContent.includes('Create'),true);assert.match(w.document.querySelector('.vl-faq').textContent,/Nursery/);
  w.document.querySelector('[data-demo-step="2"]').click();assert.equal(w.document.querySelector('[data-demo-panel="2"]').hidden,false);
 }finally{dom.window.close();}
});
