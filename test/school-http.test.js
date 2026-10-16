import test from 'node:test';
import assert from 'node:assert/strict';
import {server} from '../server.js';
import {setSession,sameOrigin} from '../lib/school-auth.js';
test('school HTTP routes deny unauthenticated, forged and cross-site requests',async()=>{
 const oldUrl=process.env.SUPABASE_URL,oldKey=process.env.SUPABASE_PUBLISHABLE_KEY;process.env.SUPABASE_URL='https://school-test.supabase.co';process.env.SUPABASE_PUBLISHABLE_KEY='test-publishable-key';
 const nativeFetch=global.fetch;let calls=[],verified=false;global.fetch=async(url,opts)=>{
  if(String(url).startsWith('https://school-test.supabase.co')){calls.push({url:String(url),headers:opts.headers,body:opts.body});if(verified){return new Response(JSON.stringify(String(url).includes('/auth/v1/user')?{id:'00000000-0000-4000-8000-000000000001',email:'verified@example.com',email_confirmed_at:new Date().toISOString()}:{schools:[]}),{status:200,headers:{'Content-Type':'application/json'}});}return new Response(JSON.stringify({msg:'Invalid token',code:'bad_jwt'}),{status:401,headers:{'Content-Type':'application/json'}});}return nativeFetch(url,opts);
 };
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`;
 try{
  for(const path of ['/school','/school/library','/school/reviews','/school/team','/school/paper','/school.js','/school.css'])assert.equal((await fetch(origin+path)).status,200);
  let r=await fetch(origin+'/api/account');assert.deepEqual(await r.json(),{user:null});
  r=await fetch(origin+'/api/school',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify({action:'bootstrap'})});assert.equal(r.status,401);
  r=await fetch(origin+'/api/school',{method:'POST',headers:{origin:'https://evil.test','Content-Type':'application/json'},body:JSON.stringify({action:'bootstrap'})});assert.equal(r.status,403);
  r=await fetch(origin+'/api/school',{method:'POST',headers:{origin,cookie:'lp_access=forged-token','Content-Type':'application/json'},body:JSON.stringify({action:'dashboard',payload:{user_id:'admin',role:'principal'}})});assert.equal(r.status,401);assert.equal(calls.length,1);assert.match(calls[0].url,/auth\/v1\/user/);
  r=await fetch(origin+'/api/account',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify({action:'signup',email:'teacher@example.com',password:'short'})});assert.equal(r.status,400);assert.equal(calls.length,1);
  verified=true;r=await fetch(origin+'/api/school',{method:'POST',headers:{origin,cookie:'lp_access=verified-token','Content-Type':'application/json'},body:JSON.stringify({action:'bootstrap',payload:{role:'principal'}})});assert.equal(r.status,200);assert.deepEqual(await r.json(),{schools:[]});const rpcCall=calls.find(c=>c.url.includes('/rest/v1/rpc/'));assert.ok(rpcCall);assert.equal(new Headers(rpcCall.headers).get('Authorization'),'Bearer verified-token');assert.equal(JSON.parse(rpcCall.body).p_action,'bootstrap');
 }finally{await new Promise(resolve=>server.close(resolve));global.fetch=nativeFetch;if(oldUrl===undefined)delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=oldUrl;if(oldKey===undefined)delete process.env.SUPABASE_PUBLISHABLE_KEY;else process.env.SUPABASE_PUBLISHABLE_KEY=oldKey;}
});
test('session cookies are HttpOnly, secure, same-site and cleared on logout',()=>{let headers;setSession({setHeader:(key,value)=>headers=value},{access_token:'a',refresh_token:'r',expires_in:3600},true);for(const h of headers){assert.match(h,/HttpOnly/);assert.match(h,/SameSite=Lax/);assert.match(h,/Secure/);assert.match(h,/Path=\//);}setSession({setHeader:(key,value)=>headers=value},null,true);for(const h of headers)assert.match(h,/Max-Age=0/);assert.equal(sameOrigin({headers:{origin:'https://evil.test',host:'lessonpress.test'}}),false);});
