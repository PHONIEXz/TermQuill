import {CREATION_CASES,evaluateReference} from '../evaluation/creation-cases.js';
import {generateAssessment} from '../lib/generator.js';
import {parseModelOutput,validateRequest} from '../lib/assessment.js';
const args=process.argv.slice(2),live=args.includes('--live'),caseIndex=args.indexOf('--case'),name=caseIndex>=0?args[caseIndex+1]:null;
if(args.some(a=>!['--live','--case',name].includes(a))||caseIndex>=0&&!name)throw new Error('Usage: npm run evaluate:creation -- [--case primary] [--live]');
const cases=name?CREATION_CASES.filter(c=>c.id===name):CREATION_CASES;if(!cases.length)throw new Error('Unknown education-stage case.');
for(const fixture of cases){const spec=validateRequest(fixture.spec,{forGeneration:true});try{
 const result=live?await generateAssessment(spec,{signal:AbortSignal.timeout(105000)}):{paper:parseModelOutput(JSON.stringify(fixture.paper),spec,{generated:true}),model:'Hand-authored reference control',providerCalls:0};
 console.log(JSON.stringify({...evaluateReference(result.paper,fixture),mode:live?'live':'reference-control',model:result.model,providerCalls:result.providerCalls,paper:result.paper}));
 }catch(error){console.log(JSON.stringify({case:fixture.id,mode:live?'live':'reference-control',completed:false,code:error.code||'EVALUATION_FAILED',message:error.code?error.message:'Evaluation failed; check the provider configuration and connection.'}));process.exitCode=1;}}
