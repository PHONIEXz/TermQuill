// Shared application navigation. The marketing page keeps its own header.
const path=location.pathname.replace(/\/$/,'')||'/';
const page=path.split('/')[1];
if(['create','drafts','question-bank','school','guide','find-schools'].includes(page)){
 const make=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const paths={studio:'M4 3h12l4 4v14H4z M15 3v5h5 M8 12h8 M8 16h5',drafts:'M3 6h7l2 3h9v11H3z M3 6V4h7l2 2',bank:'M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h6v6h-6z',school:'M3 21V9l9-6 9 6v12 M8 21v-7h8v7 M9 8h6',help:'M9 9a3 3 0 1 1 4 3c-1 0-1 1-1 2 M12 17h.01 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',home:'M3 10l9-7 9 7 M5 9v12h14V9 M9 21v-7h6v7',review:'M5 3h14v18H5z M8 8l2 2 5-5 M8 15h8 M8 18h5',people:'M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M2 21v-3a6 6 0 0 1 12 0v3 M17 4a4 4 0 0 1 0 8 M18 15a5 5 0 0 1 4 5',settings:'M4 6h16 M4 12h16 M4 18h16 M8 3v6 M16 9v6 M10 15v6',location:'M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0 M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0'};
 function icon(name){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.setAttribute('class','shell-icon');const p=document.createElementNS(svg.namespaceURI,'path');p.setAttribute('d',paths[name]||paths.studio);p.setAttribute('fill','none');p.setAttribute('stroke','currentColor');p.setAttribute('stroke-width','1.6');p.setAttribute('stroke-linecap','round');p.setAttribute('stroke-linejoin','round');svg.append(p);return svg;}
 const rail=make('aside',undefined,'app-rail');rail.id='application-navigation';rail.setAttribute('aria-label','LessonPress application');
 const brand=make('a',undefined,'shell-brand');brand.href='/';brand.setAttribute('aria-label','LessonPress home');const mark=make('img');mark.src='/favicon.svg';mark.alt='';mark.width=32;mark.height=32;brand.append(mark,make('span','LessonPress'));rail.append(brand);
 const identity=make('div',undefined,'shell-workspace');identity.append(make('span',page==='school'?'SCHOOL WORKSPACE':'YOUR TEACHING STUDIO','shell-kicker'),make('strong',page==='school'?'Prepare together.':'Make room for teaching.'));rail.append(identity);
 const nav=make('nav',undefined,'shell-studio-nav');nav.setAttribute('aria-label','Studio navigation');nav.append(make('p','WORKSPACE','shell-nav-label'));
 for(const [href,label,symbol] of [['/create','Assessment studio','studio'],['/drafts','My drafts','drafts'],['/question-bank','Question library','bank'],['/school','School dashboard','school']]){
  const a=make('a');a.href=href;a.append(icon(symbol),make('span',label));if(href==='/'+page)a.setAttribute('aria-current','page');if(href==='/school')a.className='shell-school-entry';nav.append(a);
 }rail.append(nav);
 const schoolNav=document.querySelector('.school-nav');if(schoolNav){
  for(const a of schoolNav.querySelectorAll('a')){const names={overview:'bank',library:'drafts',bank:'bank',reviews:'review',team:'people',location:'location',trust:'settings'};a.prepend(icon(names[a.dataset.view]));}
  rail.append(schoolNav);
 }
 const foot=make('div',undefined,'shell-rail-footer');const guide=make('a');guide.href='/guide';guide.append(icon('help'),make('span','Help & walkthrough'));if(page==='guide')guide.setAttribute('aria-current','page');const home=make('a');home.href='/';home.append(icon('home'),make('span','Back to website'));foot.append(guide,home,make('p','LESSONPRESS · SCHOOL REVIEW PILOT','shell-kicker'));rail.append(foot);
 const section=({create:'Assessment studio',drafts:'My drafts','question-bank':'Question library',school:'School workspace',guide:'Help & walkthrough','find-schools':'School directory'})[page];
 const sub=page==='school'?({library:'School papers',bank:'Question bank',reviews:'Review & feedback',team:'Departments & people',paper:'Paper workspace',trust:'Trust & activity',location:'School location'})[path.split('/')[2]]||'Overview':'Your workspace';
 const bar=make('header',undefined,'app-shellbar');const toggle=make('button','☰','shell-menu');toggle.type='button';toggle.setAttribute('aria-label','Open workspace navigation');toggle.setAttribute('aria-controls',rail.id);toggle.setAttribute('aria-expanded','false');const breadcrumb=make('div',undefined,'shell-breadcrumb');breadcrumb.append(make('span',section),make('span',' / ','shell-separator'),make('strong',sub));const actions=make('div',undefined,'shell-top-actions');const help=make('a','Quick help');help.href='/guide';const tag=make('span',page==='school'?'School Review Pilot':'Personal studio','shell-context');actions.append(help,tag);bar.append(toggle,breadcrumb,actions);
 document.body.prepend(rail,bar);document.body.classList.add('application-shell');
 const media=globalThis.matchMedia?.('(max-width: 980px)');
 const close=(restore=false)=>{document.body.classList.remove('shell-menu-open');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Open workspace navigation');rail.inert=Boolean(media?.matches);if(restore)toggle.focus();};
 toggle.addEventListener('click',()=>{if(document.body.classList.contains('shell-menu-open'))close();else{document.body.classList.add('shell-menu-open');toggle.setAttribute('aria-expanded','true');toggle.setAttribute('aria-label','Close workspace navigation');rail.inert=false;rail.querySelector('a')?.focus();}});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&document.body.classList.contains('shell-menu-open'))close(true);});rail.addEventListener('click',event=>{if(event.target.closest('a'))close();});
 document.addEventListener('click',event=>{if(document.body.classList.contains('shell-menu-open')&&!rail.contains(event.target)&&!toggle.contains(event.target))close();});
 media?.addEventListener('change',()=>{const restore=Boolean(media.matches)&&rail.contains(document.activeElement);close(restore);});close();
 if(schoolNav){const panel=document.getElementById('workspace-panel');const sync=()=>{document.body.classList.toggle('shell-school-ready',!panel.hidden);};new MutationObserver(sync).observe(panel,{attributes:true,attributeFilter:['hidden']});sync();}
}
