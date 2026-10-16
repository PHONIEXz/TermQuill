import { json } from '../lib/http.js';
export default function config(req,res) {
  if (req.method !== 'GET') return json(res,405,{error:'Use GET.'});
  json(res,200,{configured:Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY),accessRequired:Boolean(process.env.LESSONPRESS_ACCESS_CODE),model:process.env.GOOGLE_MODEL || 'gemma-4-26b-a4b-it'});
}
