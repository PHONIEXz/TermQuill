import {getAccount} from '/account-session.js';
// Progressive enhancement: links remain available if JavaScript does not load.
const header = document.querySelector('.topbar');
const navigation = header?.querySelector('nav');
if (navigation) {
  navigation.id = 'primary-navigation';
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'navigation-toggle outline';
  toggle.textContent = 'Menu';
  toggle.setAttribute('aria-controls', navigation.id);
  toggle.setAttribute('aria-expanded', 'false');
  header.insertBefore(toggle, navigation);
  header.classList.add('navigation-ready');
  const close = () => {
    toggle.setAttribute('aria-expanded', 'false');
    header.classList.remove('navigation-open');
  };
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    header.classList.toggle('navigation-open', open);
  });
  header.addEventListener('keydown', event => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      close();
      toggle.focus();
    }
  });
  navigation.addEventListener('click', event => {
    if (event.target.closest('a')) close();
  });
  // A breakpoint change must not leave focus inside a now-collapsed menu.
  globalThis.matchMedia?.('(max-width: 1100px)').addEventListener('change', event => {
    if (event.matches && navigation.contains(document.activeElement)) toggle.focus();
    close();
  });
}

const accountLink=document.querySelector('[data-nav="login"]');
if(accountLink){const updateAccount=async(refresh=false)=>{try{const user=await getAccount(refresh);accountLink.textContent=user?'My account':'Sign in';accountLink.href=user?'/workspace':'/login';accountLink.setAttribute('aria-label',user?'Open your account workspace':'Sign in to TermQuill');}catch{accountLink.textContent='Sign in';accountLink.href='/login';}};updateAccount();window.addEventListener('storage',e=>{if(e.key==='lessonpress.active-account')updateAccount(true);});}
