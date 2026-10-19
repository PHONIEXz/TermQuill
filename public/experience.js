// Original LessonPress interactions. Design references are recorded in design/DESIGN.md.
const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
let paused = false;
const header = document.querySelector('.topbar');
const motionButton = document.createElement('button');
motionButton.type = 'button';
motionButton.className = 'motion-toggle quiet';
function syncMotion() {
  const reduced = paused || Boolean(reducedMotion?.matches);
  document.documentElement.dataset.motion = reduced ? 'reduced' : 'full';
  motionButton.textContent = reducedMotion?.matches ? 'Reduced motion' : paused ? 'Resume motion' : 'Pause motion';
  motionButton.disabled = Boolean(reducedMotion?.matches);
  motionButton.title = reducedMotion?.matches ? 'Following your device’s reduced-motion setting' : 'Control decorative animation';
  if (reduced) for (const animation of document.getAnimations?.() || []) animation.cancel();
}
motionButton.addEventListener('click', () => { paused = !paused; syncMotion(); });
header?.append(motionButton);
syncMotion();
reducedMotion?.addEventListener('change', syncMotion);

// Each explanation remains readable without this module. Only the interactive
// version collapses the other stages once event handlers have been attached.
const demo = document.querySelector('.workflow-demo');
if (demo) {
  const buttons = [...demo.querySelectorAll('[data-demo-step]')];
  const panels = [...demo.querySelectorAll('[data-demo-panel]')];
  const activate = index => {
    buttons.forEach((button, i) => {
      button.setAttribute('aria-selected', String(i === index));
      button.tabIndex = i === index ? 0 : -1;
    });
    panels.forEach((panel, i) => {panel.hidden = i !== index;});
    const current = panels[index];
    if (document.documentElement.dataset.motion === 'full') {
      current.animate?.([{opacity:.45, transform:'translateY(8px)'}, {opacity:1, transform:'translateY(0)'}], {duration:220, easing:'ease-out'});
    }
  };
  buttons.forEach((button, index) => {
    button.setAttribute('role', 'tab');
    button.addEventListener('click', () => activate(index));
    button.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % buttons.length;
      if (event.key === 'ArrowLeft') next = (index + buttons.length - 1) % buttons.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = buttons.length - 1;
      if (next === undefined) return;
      event.preventDefault(); activate(next); buttons[next].focus();
    });
  });
  demo.querySelector('.demo-tabs').setAttribute('role', 'tablist');
  for (const panel of panels) panel.setAttribute('role', 'tabpanel');
  activate(0);
}

// Enhance already-visible content. Nothing is hidden while waiting for JS or
// an observer callback, and each entrance runs only once.
if (globalThis.IntersectionObserver) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      if (document.documentElement.dataset.motion === 'full') {
        entry.target.animate?.([{opacity:.6, transform:'translateY(18px)'}, {opacity:1, transform:'translateY(0)'}], {duration:520, easing:'cubic-bezier(.2,.8,.2,1)'});
      }
      observer.unobserve(entry.target);
    }
  }, {threshold:.08});
  for (const section of document.querySelectorAll('.landing-section, .page-intro, .school-panel, .places-controls')) observer.observe(section);
}

// Verdant-inspired landing choreography, implemented with native web animations.
// The artwork is original; motion does not block reading or change scroll position.
if (document.body.dataset.page === 'home') {
  const ease = 'cubic-bezier(.22,1,.36,1)';
  const enter = (target, delay = 0) => {
    target.dataset.entered = 'true';
    if (document.documentElement.dataset.motion !== 'full') return;
    const lines = [...target.querySelectorAll(':scope > .vl-line > span')];
    if (lines.length) {
      lines.forEach((line, index) => line.animate?.([
        {transform:'translateY(115%)',opacity:.2},
        {transform:'translateY(0)',opacity:1}
      ], {duration:1100, delay:delay + index * 130, easing:ease, fill:'backwards'}));
    } else {
      target.animate?.([
        {transform:'translateY(38px)',opacity:.12,clipPath:'inset(0 0 18% 0)'},
        {transform:'translateY(0)',opacity:1,clipPath:'inset(0 0 0% 0)'}
      ], {duration:1000, delay, easing:ease, fill:'backwards'});
    }
  };
  for (const heading of document.querySelectorAll('h2[data-reveal]')) {
    const content = [...heading.childNodes];
    const groups = [[]];
    for (const child of content) {
      if (child.nodeName === 'BR') groups.push([]); else groups.at(-1).push(child);
    }
    heading.replaceChildren();
    for (const group of groups) {
      const mask = document.createElement('span'); mask.className = 'vl-line';
      const line = document.createElement('span');line.append(...group);mask.append(line);heading.append(mask);
    }
  }
  const statement = document.querySelector('[data-word-reveal]');
  if (statement) {
    // Preserve a coherent accessible sentence while staggering the visual words.
    const text = statement.textContent.trim();
    statement.setAttribute('aria-label', text);statement.replaceChildren();
    text.split(/\s+/).forEach((word, index) => {
      if(index)statement.append(document.createTextNode(' '));
      const span=document.createElement('span');span.textContent=word;span.setAttribute('aria-hidden','true');statement.append(span);
    });
  }
  const wordEntrance = () => {
    if (!statement || document.documentElement.dataset.motion !== 'full') return;
    [...statement.querySelectorAll('span')].forEach((word,index) => word.animate?.([
      {color:'#939b87',opacity:.3,transform:'translateY(8px)'},
      {color:'#28301f',opacity:1,transform:'translateY(0)'}
    ], {duration:650,delay:index*24,easing:ease,fill:'backwards'}));
  };
  const title=document.querySelector('.vl-hero h1');if(title)enter(title,120);
  document.querySelectorAll('.vl-wordmark>span').forEach((part,index) => {
    if(document.documentElement.dataset.motion==='full')part.animate?.([
      {transform:`translateY(${index?110:-110}%)`,opacity:0},
      {transform:'translateY(0)',opacity:1}
    ],{duration:1400,delay:350+index*100,easing:ease,fill:'backwards'});
  });
  const targets=[...document.querySelectorAll('[data-reveal]')].filter(el=>el!==title);
  if(globalThis.IntersectionObserver){
    const reveals=new IntersectionObserver(entries=>{
      let stagger=0;
      for(const entry of entries){
        if(!entry.isIntersecting)continue;
        if(entry.target===statement)wordEntrance();else enter(entry.target,stagger++*65);
        reveals.unobserve(entry.target);
      }
    },{threshold:.14});
    targets.forEach(el=>reveals.observe(el));if(statement)reveals.observe(statement);
  }
  const hero=document.querySelector('.vl-hero');
  let scheduled=false;
  const updateLandscape=()=>{
    scheduled=false;if(!hero)return;
    const rect=hero.getBoundingClientRect();
    const y=document.documentElement.dataset.motion==='full'&&rect.bottom>0?Math.max(-55,Math.min(75,-rect.top*.12)):0;
    hero.style.setProperty('--vl-parallax',`${y.toFixed(1)}px`);
  };
  if(globalThis.requestAnimationFrame){
    addEventListener('scroll',()=>{if(!scheduled){scheduled=true;requestAnimationFrame(updateLandscape);}},{passive:true});
    motionButton.addEventListener('click',updateLandscape);
    reducedMotion?.addEventListener('change',updateLandscape);
    updateLandscape();
  }
}
