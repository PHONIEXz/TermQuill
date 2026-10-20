import {authorizePage} from './lib/page-access.js';
// Pages are an entry gate; APIs independently verify identity and school RPCs enforce roles.
export const config={runtime:'nodejs',matcher:['/workspace','/workspace.html','/lessons','/lessons.html','/create','/create.html','/drafts','/drafts.html','/question-bank','/question-bank.html']};
export default async function middleware(request){const headers=new Headers({'Cache-Control':'no-store'});let status=200,body;const response={setHeader:(key,value)=>{headers.delete(key);for(const part of Array.isArray(value)?value:[value])headers.append(key,part);},writeHead:(code,values)=>{status=code;for(const [key,value] of Object.entries(values))headers.set(key,value);},end:value=>{body=value;}};
 const url=new URL(request.url);if(await authorizePage({url:url.pathname+url.search,headers:Object.fromEntries(request.headers)},response))headers.set('x-middleware-next','1');return new Response(body??null,{status,headers});}
