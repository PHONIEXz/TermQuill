import {validateProfile,publicUser} from '../lib/identity.js';
import {json,readBody,makeLimiter} from '../lib/http.js';
import {authClient,signedIn,setSession,sameOrigin,cookies,educatorStatus} from '../lib/school-auth.js';
const allow=makeLimiter(15,600000,300);
export default async function account(req,res){
 try{
  const client=authClient();
  if(req.method==='GET'){
   try{const {user,client:scoped}=await signedIn(req,res,client);return json(res,200,{user:publicUser(user),educator:await educatorStatus(scoped)});}catch(e){if(e.status===401)return json(res,200,{user:null});throw e;}
  }
  if(req.method!=='POST')return json(res,405,{error:'Use GET or POST.'});
  if(!sameOrigin(req))return json(res,403,{error:'Open LessonPress and try again.'});
  if(!allow(req.headers['x-forwarded-for']?.split(',')[0]||req.socket?.remoteAddress||'local'))return json(res,429,{error:'Too many attempts. Wait ten minutes before retrying.'});
  const body=await readBody(req);
  if(body.action==='logout'){
   const token=cookies(req).lp_access;if(token){await client.auth.setSession({access_token:token,refresh_token:cookies(req).lp_refresh||''});await client.auth.signOut({scope:'local'});}setSession(res,null);return json(res,200,{ok:true});
  }
  if(body.action==='profile'){
   const profile=validateProfile(body),{user,token}=await signedIn(req,res,client);
   const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_PUBLISHABLE_KEY||process.env.SUPABASE_ANON_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
   const response=await fetch(new URL('/auth/v1/user',url),{method:'PUT',headers:{apikey:key,Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({data:profile}),signal:AbortSignal.timeout(15000)});
   if(!response.ok)return json(res,503,{error:'Could not save your profile. Please retry.'});
   return json(res,200,{user:publicUser({...user,user_metadata:{...user.user_metadata,...profile}})});
  }
  const email=String(body.email||'').trim().toLowerCase(),password=String(body.password||'');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||password.length<12||password.length>128)return json(res,400,{error:'Use a valid email and a password of 12–128 characters.'});
  if(!['login','signup'].includes(body.action))return json(res,400,{error:'Choose sign in or create account.'});
  const profile=body.action==='signup'?validateProfile(body):null;
  const out=body.action==='signup'?await client.auth.signUp({email,password,options:{emailRedirectTo:'https://lessonpress-pi.vercel.app/school',data:profile}}):await client.auth.signInWithPassword({email,password});
  if(out.error){const status=out.error.status===429?429:400;return json(res,status,{error:out.error.status===429?'Email or sign-in limit reached. Try again later.':body.action==='login'?'Could not sign in. Check your details and verify your email.':'Could not create an account. Try again or sign in if you already registered.'});}
  if(out.data.session)setSession(res,out.data.session);
  return json(res,200,{ok:true,verifyEmail:!out.data.session,user:out.data.session?publicUser(out.data.user):null});
 }catch(e){return json(res,e.status||503,{error:e.status?e.message:'Account service is unavailable. Please try again.'});}
}
