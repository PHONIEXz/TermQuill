import {hasMatchingInstruction} from './visuals.js';
// Review prompts only. Lexical overlap and missing numerals cannot establish
// whether an answer is true, supported, age-appropriate or pedagogically sound.
const text=value=>typeof value==='string'?value:'';
const normalized=value=>text(value).normalize('NFKC').toLocaleLowerCase('en').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const stop=new Set('a an the is are was were be being been of for to in on at by as and or with from what which who why how does do did explain define describe state name identify give term mean meaning briefly following based according lesson notes answer'.split(' '));
const tokens=value=>new Set(normalized(value).split(' ').filter(t=>t&&!stop.has(t)));
function numericLiterals(value){return [...text(value).matchAll(/(?<![\p{L}\p{N}.])[-+−]?\d+(?:\.\d+)?(?![\p{L}\p{N}]|\.\d)/gu)].map(m=>m[0].replace('−','-').replace(/^\+/,''));}
export function qualityReview(paper,spec={}){
 const questions=Array.isArray(paper?.questions)?paper.questions.slice(0,20):[],findings=[],quotes=new Map();let topicCount=0;
 const add=(code,indices,message,action)=>findings.push({code,indices,message,action});
 for(const [i,q] of questions.entries()){
  if(!q||typeof q!=='object')continue;
  const topic=spec.sourceMode==='topic'||q.grounding==='topic';if(topic)topicCount++;
  const blocks=Array.isArray(q.blocks)?q.blocks:[],automatic=blocks.some(b=>b?.type==='matching'||(['picture','image'].includes(b?.type)&&b.task==='count'));
  const matching=blocks.find(b=>b?.type==='matching');
  if(matching&&!hasMatchingInstruction(q.prompt))add('matching-prompt',[i],'The visual task asks for matching but the question does not clearly request it.','Make the prompt and its matching task ask for the same response.');
  if(matching&&!topic&&text(q.evidence).trim()&&Array.isArray(matching.pairs)){const support=tokens(q.evidence);if(matching.pairs.some(p=>[...tokens(p?.left),...tokens(p?.right)].some(t=>!support.has(t))))add('matching-support',[i],'Some matching terms are absent from the supporting quote.','Check every pair against the lesson. A wider quote or a valid paraphrase may explain the difference.');}
  if(!topic&&text(q.evidence).trim()){
   const key=normalized(q.evidence);if(!quotes.has(key))quotes.set(key,[]);quotes.get(key).push(i);
   if(!automatic){const supplied=new Set(numericLiterals(q.evidence)),extra=[...new Set(numericLiterals(q.answer))].filter(n=>!supplied.has(n));
    if(extra.length)add('check-values',[i],'The answer includes a number that is absent from its supporting quote.','Check the calculation, units and supporting passage. A new calculated value can be valid.');}
  }
  const blanks=blocks.filter(b=>b?.type==='table').reduce((n,b)=>n+(Array.isArray(b.rows)?b.rows.flat().filter(c=>typeof c==='string'&&!c.trim()).length:0),0);
  const pairs=blocks.filter(b=>b?.type==='matching').reduce((n,b)=>n+(Array.isArray(b.pairs)?b.pairs.length:0),0);
  if(Number.isInteger(q.marks)&&blanks+pairs>q.marks)add('check-partial-credit',[i],'There are more table responses or matches than available whole marks.','Make the scoring of every required response explicit. Consider fewer tasks or more marks.');
  if(q.kind==='short'&&/\bhow many\b/i.test(text(q.prompt))&&/\b(sweets|pencils|books|apples|balls|children|pupils|people|flowers|stars|objects|items)\b/i.test(text(q.answer))&&Array.isArray(q.marking)&&q.marking.some(p=>/\bunit\b/i.test(text(p?.point))))add('count-unit-credit',[i],'A counting answer awards separate credit for its item name or unit.','Check that the rubric rewards actual working or the correct count. Repeating an item name already in the question may not justify a separate mark.');
 }
 for(let i=0;i<questions.length;i++)for(let j=i+1;j<questions.length;j++){
  const a=questions[i],b=questions[j];if(!a||!b||!normalized(a.answer)||normalized(a.answer)!==normalized(b.answer)||JSON.stringify(numericLiterals(a.answer))!==JSON.stringify(numericLiterals(b.answer))||normalized(a.prompt)===normalized(b.prompt))continue;
  const x=tokens(a.prompt),y=tokens(b.prompt),shared=[...x].filter(t=>y.has(t)).length;
  if(shared&&2*shared/(x.size+y.size)>=.8)add('possible-repeat',[i,j],'These questions have the same expected answer and closely overlapping wording.','Check whether they assess the same idea. Keep both only if the learning purpose differs.');
 }
 for(const indices of quotes.values())if(indices.length>=3)add('reused-passage',indices,'Three or more questions use the same supporting passage.','Check that they assess different taught ideas. Reusing a rich passage can be appropriate.');
 return {findings,topicCount};
}
