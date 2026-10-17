// Shared browser/server location rules. No polling, storage or network side effects.
export function coordinates(latitude,longitude){
 if(typeof latitude!=='number'||typeof longitude!=='number'||!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180)throw new Error('Enter a latitude from -90 to 90 and a longitude from -180 to 180.');
 return {latitude:Math.round(latitude*1e6)/1e6,longitude:Math.round(longitude*1e6)/1e6};
}
export function manualCoordinates(latitude,longitude){
 if(String(latitude).trim()===''||String(longitude).trim()==='')throw new Error('Enter both coordinates, or choose Use my location.');
 return coordinates(Number(latitude),Number(longitude));
}
export function locateDevice({geolocation=globalThis.navigator?.geolocation,secure=globalThis.isSecureContext,signal}={}){
 if(!secure)return Promise.reject(new Error('Device location needs a secure HTTPS connection. You can enter coordinates manually.'));
 if(!geolocation)return Promise.reject(new Error('This browser cannot provide device location. Enter coordinates manually instead.'));
 return new Promise((resolve,reject)=>{
  let settled=false;
  const finish=(fn,value)=>{if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',cancel);fn(value);};
  const cancel=()=>finish(reject,new Error('Location request cancelled.'));
  const timer=setTimeout(()=>finish(reject,new Error('Location took too long. Try again or enter coordinates manually.')),20000);
  if(signal?.aborted){cancel();return;}signal?.addEventListener('abort',cancel,{once:true});
  try{geolocation.getCurrentPosition(position=>{try{const p=coordinates(position.coords.latitude,position.coords.longitude);const a=position.coords.accuracy;finish(resolve,{...p,accuracy:typeof a==='number'&&Number.isFinite(a)&&a>=0?a:null});}catch(e){finish(reject,e);}},error=>finish(reject,new Error(({1:'Location permission was denied. You can allow it in browser settings, or enter coordinates manually.',2:'Your device could not find its location. Try again or enter coordinates manually.',3:'Location took too long. Try again or enter coordinates manually.'})[error.code]||'Could not get a location. Enter coordinates manually instead.')),{enableHighAccuracy:true,timeout:15000,maximumAge:0});}catch{finish(reject,new Error('Device location is unavailable. Enter coordinates manually instead.'));}
 });
}
export function distanceKm(a,b){const r=x=>x*Math.PI/180,dlat=r(b.latitude-a.latitude),dlon=r(b.longitude-a.longitude);const h=Math.sin(dlat/2)**2+Math.cos(r(a.latitude))*Math.cos(r(b.latitude))*Math.sin(dlon/2)**2;return 6371.0088*2*Math.asin(Math.sqrt(Math.max(0,Math.min(1,h))));}
export function mapUrl(point){const p=coordinates(point.latitude,point.longitude);return `https://www.openstreetmap.org/?mlat=${p.latitude}&mlon=${p.longitude}#map=16/${p.latitude}/${p.longitude}`;}
export function fromMapUrl(value){let u;try{u=new URL(value);}catch{throw new Error('Paste a full OpenStreetMap link with a marker.');}if(u.protocol!=='https:'||!['openstreetmap.org','www.openstreetmap.org'].includes(u.hostname)||u.username||u.password||u.port)throw new Error('Use an HTTPS OpenStreetMap marker link.');const latitude=u.searchParams.get('mlat'),longitude=u.searchParams.get('mlon');if(latitude===null||longitude===null)throw new Error('In OpenStreetMap, choose Share and Include marker, then copy its full link.');return manualCoordinates(latitude,longitude);}
export function searchArea(point,radiusKm=50){
 const p=coordinates(point.latitude,point.longitude);if(![25,50,100].includes(radiusKm))throw new Error('Choose a supported distance.');
 // Search with a coarse grid rather than transmitting a visitor's precise GPS fix.
 const lat=Math.round(p.latitude*10)/10,lon=Math.round(p.longitude*10)/10;
 const dlat=(radiusKm+20)/111,dlon=(radiusKm+20)/(111*Math.max(.01,Math.cos(lat*Math.PI/180)));
 const allLongitudes=lat+dlat>=90||lat-dlat<=-90||dlon>=180;
 const wrap=n=>((n+180)%360+360)%360-180;
 return {south:Math.max(-90,lat-dlat),north:Math.min(90,lat+dlat),west:allLongitudes?-180:wrap(lon-dlon),east:allLongitudes?180:wrap(lon+dlon)};
}
export function validateSchoolLocation(value){
 const p=coordinates(value.latitude,value.longitude);
 if(typeof value.area!=='string'||value.area.trim().length<2||value.area.length>100)throw new Error('Enter the town or area in 2–100 characters.');
 if(typeof value.public_listing!=='boolean'||value.confirmed_school!==true)throw new Error('Confirm that this point belongs to your school and choose its visibility.');
 if(!Number.isInteger(value.expected_version)||value.expected_version<0)throw new Error('Reload the school location before saving.');
 if(!['manual','device'].includes(value.source))throw new Error('Choose a supported location source.');
 if(value.accuracy!==null&&(typeof value.accuracy!=='number'||!Number.isFinite(value.accuracy)||value.accuracy<0||value.accuracy>1e7))throw new Error('Check the location accuracy.');
 return {...p,area:value.area.trim(),public_listing:value.public_listing,confirmed_school:true,expected_version:value.expected_version,source:value.source,accuracy:value.source==='device'?value.accuracy:null};
}
