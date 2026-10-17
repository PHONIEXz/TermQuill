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
