import {locateDevice,manualCoordinates,searchArea,distanceKm,mapUrl} from '/location.js';
const $=id=>document.getElementById(id),el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
let anchor=null,rows=[],cursor=null,geoController=null,fetchController=null,requestVersion=0;
const radius=()=>Number($('radius').value);
function locationMessage(text){$('location-status').textContent=text;}
function showError(text=''){$('directory-error').textContent=text;$('directory-error').hidden=!text;}
function render(){
 const target=$('school-results');target.replaceChildren();let found=rows.map(s=>({...s,distance:anchor?distanceKm(anchor,s):null}));
 if(anchor)found=found.filter(s=>s.distance<=radius()).sort((a,b)=>a.distance-b.distance||a.name.localeCompare(b.name));else found.sort((a,b)=>a.name.localeCompare(b.name));
 $('results-status').textContent=`${found.length} ${anchor?'nearby ':''}schools shown · ${rows.length} records loaded${cursor?' · More available':''}`;
 for(const s of found){const card=el('article',undefined,'school-card');card.append(el('p','SCHOOL IDENTITY CHECKED','eyebrow'),el('h3',s.name),el('p',s.area));if(anchor)card.append(el('p',`About ${s.distance<1?s.distance.toFixed(1):Math.round(s.distance)} km in a straight line`,'places-distance'));card.append(el('p','Approximate public point supplied by the school. Confirm directions with the school before travelling.','field-help'));const map=el('a','View school pin in OpenStreetMap ↗','school-link');map.href=mapUrl(s);map.target='_blank';map.rel='noopener noreferrer';card.append(map,el('p','Opening the map shares this school point with OpenStreetMap. It does not include your search position.','field-help'));target.append(card);}
 if(!found.length){const empty=el('article',undefined,'places-empty');empty.append(el('h3',anchor?'No listed schools in this distance yet.':'No listed schools match yet.'),el('p',cursor?'There are more records to load. You can also change the town, distance or search point.':'Only schools that have opted in after verification appear here. An empty result does not mean there are no schools in the area. Try a wider search or return as more schools join.'));target.append(empty);}
 $('load-places').hidden=!cursor;$('forget-location').hidden=!anchor;
}
async function load(reset=true){
 const version=++requestVersion;fetchController?.abort();fetchController=new AbortController();showError();$('results-status').textContent='Searching listed schools…';$('load-places').disabled=true;
 const input={search:$('place-query').value.trim(),...(anchor?{area:searchArea(anchor,radius())}:{}),...(!reset&&cursor?{after_id:cursor}:{})};
 try{const r=await fetch('/api/places',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input),signal:AbortSignal.any([fetchController.signal,AbortSignal.timeout(20000)])});const out=await r.json();if(version!==requestVersion)return;if(!r.ok)throw new Error(out.error||'Could not load the directory.');if(!Array.isArray(out.schools))throw new Error('The directory returned an incomplete response. Try again.');rows=reset?out.schools:[...rows,...out.schools];cursor=out.next_after;render();}
 catch(e){if(version!==requestVersion||e.name==='AbortError')return;showError(e.name==='TimeoutError'?'The directory took too long. Try searching again.':e.message);$('results-status').textContent='Search could not finish. Previous results remain below.';}
 finally{if(version===requestVersion)$('load-places').disabled=false;}
}
$('directory-search').addEventListener('submit',e=>{e.preventDefault();load(true);});
$('nearby').addEventListener('click',async()=>{if(geoController)return;geoController=new AbortController();$('nearby').disabled=true;$('cancel-location').hidden=false;locationMessage('Waiting for browser permission and one device position…');try{const p=await locateDevice({signal:geoController.signal});anchor=p;$('search-latitude').value=p.latitude;$('search-longitude').value=p.longitude;locationMessage(`One-time search point ready${p.accuracy===null?'':`; reported accuracy about ${Math.round(p.accuracy)} metres`}. Only an approximate search area is sent to LessonPress. Your precise position is not saved.`);await load(true);}catch(e){locationMessage(e.message);}finally{geoController=null;$('nearby').disabled=false;$('cancel-location').hidden=true;}});
$('cancel-location').addEventListener('click',()=>geoController?.abort());
$('manual-search').addEventListener('submit',e=>{e.preventDefault();try{geoController?.abort();anchor=manualCoordinates($('search-latitude').value,$('search-longitude').value);locationMessage('Manual search point ready. Only an approximate search area is sent to LessonPress. This point is not saved as a school location.');load(true);}catch(e){showError(e.message);}});
$('forget-location').addEventListener('click',()=>{geoController?.abort();anchor=null;$('search-latitude').value='';$('search-longitude').value='';locationMessage('Search position cleared from this page. You can browse without GPS.');load(true);});
$('radius').addEventListener('change',()=>{if(anchor)load(true);});$('load-places').addEventListener('click',()=>load(false));
window.addEventListener('pagehide',()=>{geoController?.abort();fetchController?.abort();anchor=null;});
load(true);
