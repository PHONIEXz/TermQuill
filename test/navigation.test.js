import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';

const script = await readFile(new URL('../public/navigation.js', import.meta.url), 'utf8');

test('compact navigation opens, closes with Escape, and restores toggle focus', () => {
  const dom = new JSDOM('<header class="topbar"><a class="brand" href="/">LessonPress</a><nav aria-label="Main navigation"><a href="/create">Create assessment</a></nav></header>', {runScripts:'outside-only'});
  try {
    const w = dom.window;
    let breakpointChanged;
    w.matchMedia = () => ({addEventListener: (event, handler) => {breakpointChanged = handler;}});
    w.eval(script);
    const header = w.document.querySelector('header');
    const toggle = w.document.querySelector('button');
    const link = w.document.querySelector('nav a');
    assert.equal(toggle.getAttribute('aria-controls'), w.document.querySelector('nav').id);
    toggle.click();
    assert.equal(toggle.getAttribute('aria-expanded'), 'true');
    assert.ok(header.classList.contains('navigation-open'));
    link.focus();
    link.dispatchEvent(new w.KeyboardEvent('keydown', {key:'Escape', bubbles:true}));
    assert.equal(toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(w.document.activeElement, toggle);
    toggle.click();
    link.focus();
    breakpointChanged({matches:true});
    assert.equal(toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(w.document.activeElement, toggle);
    // A link remains a normal navigable anchor, with no click interception.
    const event = new w.MouseEvent('click', {bubbles:true, cancelable:true});
    toggle.click();
    link.addEventListener('click', e => e.preventDefault(), {once:true});
    link.dispatchEvent(event);
    assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  } finally {dom.window.close();}
});

test('every page loads the shared navigation and presentation assets', async () => {
  for (const name of ['index', 'school', 'privacy', 'find-schools']) {
    const html = await readFile(new URL(`../public/${name}.html`, import.meta.url), 'utf8');
    const dom = new JSDOM(html);
    try {
      assert.equal(dom.window.document.querySelectorAll('script[src="/navigation.js"]').length, 1);
      assert.equal(dom.window.document.querySelectorAll('link[href="/workspace.css"]').length, 1);
    } finally {dom.window.close();}
  }
});
