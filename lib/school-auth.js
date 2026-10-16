import {createClient} from '@supabase/supabase-js';
export function authClient(env=process.env,token) {
 const url=env.SUPABASE_URL||env.NEXT_PUBLIC_SUPABASE_URL;
 const key=env.SUPABASE_PUBLISHABLE_KEY||env.SUPABASE_ANON_KEY||env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!key)throw Object.assign(new Error('School accounts are not configured yet.'),{status:503});
 return createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false},global:{headers:token?{Authorization:`Bearer ${token}`}:{},fetch:(url,opts)=>fetch(url,{...opts,signal:AbortSignal.timeout(15000)})}});
}
export function cookies(req){const result={};for(const item of (req.headers.cookie||'').split(';')){const i=item.indexOf('=');if(i>0){try{result[item.slice(0,i).trim()]=decodeURIComponent(item.slice(i+1));}catch{}}}return result;}
export function setSession(res,session,secure=process.env.NODE_ENV==='production'||Boolean(process.env.VERCEL)){
 const flags=`; HttpOnly; SameSite=Lax; Path=/${secure?'; Secure':''}`;
 res.setHeader('Set-Cookie',[
  `lp_access=${encodeURIComponent(session?.access_token||'')}; Max-Age=${session?Math.min(session.expires_in||3600,3600):0}${flags}`,
  `lp_refresh=${encodeURIComponent(session?.refresh_token||'')}; Max-Age=${session?604800:0}${flags}`
 ]);
}
export function sameOrigin(req){
 const origin=req.headers.origin;
 if(!origin)return false;
 try{return new URL(origin).host===req.headers.host&&['https:','http:'].includes(new URL(origin).protocol);}catch{return false;}
}
export async function signedIn(req,res,client=authClient()){
 const jar=cookies(req);let token=jar.lp_access;let user;
 if(token){const out=await client.auth.getUser(token);if(!out.error)user=out.data.user;}
 if(!user&&jar.lp_refresh){const out=await client.auth.refreshSession({refresh_token:jar.lp_refresh});if(!out.error&&out.data.session){token=out.data.session.access_token;const verified=await client.auth.getUser(token);if(!verified.error){user=verified.data.user;setSession(res,out.data.session);}}}
 if(!user||!user.email_confirmed_at)throw Object.assign(new Error('Sign in with your verified email to continue.'),{status:401});
 // RPC identity is derived by PostgREST from the verified token, never from a body user_id.
 const scoped=authClient(process.env,token);
 return {client:scoped,user,token};
}
