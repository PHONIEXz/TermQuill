import {signedIn,cookies} from './school-auth.js';
import {protectedPath,safeNext} from './identity.js';
import {securityHeaders} from './http.js';
export async function authorizePage(req,res,authenticate=signedIn){const url=new URL(req.url,'https://lessonpress.invalid');if(!protectedPath(url.pathname)||url.pathname.startsWith('/school'))return true;
 try{if(authenticate===signedIn&&!cookies(req).lp_access&&!cookies(req).lp_refresh)throw Object.assign(new Error('Sign in required.'),{status:401});await authenticate(req,res);return true;}catch(e){if(e.status===401){res.writeHead(303,{...securityHeaders,Location:'/login?next='+encodeURIComponent(safeNext(url.pathname.replace(/\.html$/,'')+url.search))});res.end();}else{res.writeHead(503,{...securityHeaders,'Content-Type':'text/plain; charset=utf-8'});res.end('Account check is unavailable. Please retry shortly. Your saved work has not been changed.');}return false;}}
