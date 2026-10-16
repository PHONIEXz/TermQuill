import {json,readBody,makeLimiter} from '../lib/http.js';
import {authClient,signedIn,setSession,sameOrigin,cookies} from '../lib/school-auth.js';
const allow=makeLimiter(15,600000,300);
export default async function account(req,res){
 try{
  const client=authClient();
  if(req.method==='GET'){
   try{const {user}=await signedIn(req,res,client);return json(res,200,{user:{id:user.id,email:user.email}});}catch(e){if(e.status===401)return json(res,200,{user:null});throw e;}
  }
  if(req.method!=='POST')return json(res,405,{error:'Use GET or POST.'});
  if(!sameOrigin(req))return json(res,403,{error:'Open LessonPress and try again.'});
  if(!allow(req.headers['x-forwarded-for']?.split(',')[0]||req.socket?.remoteAddress||'local'))return json(res,429,{error:'Too many attempts. Wait ten minutes before retrying.'});
  const body=await readBody(req);
  if(body.action==='logout'){
   const token=cookies(req).lp_access;if(token){await client.auth.setSession({access_token:token,refresh_token:cookies(req).lp_refresh||''});await client.auth.signOut({scope:'local'});}setSession(res,null);return json(res,200,{ok:true});
  }
  const email=String(body.email||'').trim().toLowerCase(),password=String(body.password||'');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||password.length<12||password.length>128)return json(res,400,{error:'Use a valid email and a password of 12–128 characters.'});
  if(!['login','signup'].includes(body.action))return json(res,400,{error:'Choose sign in or create account.'});
  const out=body.action==='signup'?await client.auth.signUp({email,password,options:{emailRedirectTo:'https://lessonpress-pi.vercel.app/school'}}):await client.auth.signInWithPassword({email,password});
  if(out.error){const status=out.error.status===429?429:400;return json(res,status,{error:out.error.status===429?'Email or sign-in limit reached. Try again later.':body.action==='login'?'Could not sign in. Check your details and verify your email.':'Could not create an account. Try again or sign in if you already registered.'});}
  if(out.data.session)setSession(res,out.data.session);
  return json(res,200,{ok:true,verifyEmail:!out.data.session,user:out.data.session?{id:out.data.user.id,email:out.data.user.email}:null});
 }catch(e){return json(res,e.status||503,{error:e.status?e.message:'Account service is unavailable. Please try again.'});}
}
