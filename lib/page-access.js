import {signedIn,cookies,requireEducator} from './school-auth.js';
import {protectedPath,safeNext} from './identity.js';
import {securityHeaders} from './http.js';
export async function authorizePage(req,res,authenticate){const url=new URL(req.url,'https://lessonpress.invalid');if(!protectedPath(url.pathname)||url.pathname.startsWith('/school'))return true;
 authenticate??=url.pathname.replace(/\.html$/,'').replace(/\/$/,'')==='/workspace'?signedIn:requireEducator;
 try{if((authenticate===signedIn||authenticate===requireEducator)&&!cookies(req).lp_access&&!cookies(req).lp_refresh)throw Object.assign(new Error('Sign in required.'),{status:401});await authenticate(req,res);return true;}catch(e){if(e.status===401||e.status===403){res.writeHead(303,{...securityHeaders,Location:e.status===403?'/workspace?educator=required':'/login?next='+encodeURIComponent(safeNext(url.pathname.replace(/\.html$/,'')+url.search))});res.end();}else{res.writeHead(503,{...securityHeaders,'Content-Type':'text/plain; charset=utf-8'});res.end('Account check is unavailable. Please retry shortly. Your saved work has not been changed.');}return false;}}
