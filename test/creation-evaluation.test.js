import test from 'node:test';import assert from 'node:assert/strict';
import {CREATION_CASES,evaluateReference} from '../evaluation/creation-cases.js';
import {parseModelOutput,validateRequest} from '../lib/assessment.js';
for(const fixture of CREATION_CASES)test('source-backed reference evaluation: '+fixture.id,()=>{
 const spec=validateRequest(fixture.spec,{forGeneration:true}),paper=parseModelOutput(JSON.stringify(fixture.paper),spec,{generated:true}),report=evaluateReference(paper,fixture);assert.deepEqual(report.structuralIssues,[]);assert.equal(report.objectiveCoverage.matches,true);assert.ok(report.referenceChecks.every(r=>r.referenceMatched));
 const wrong=structuredClone(paper);wrong.questions[0].answer='Unsupported incorrect response';assert.equal(evaluateReference(wrong,fixture).referenceChecks[0].referenceMatched,false);assert.match(report.interpretation,/not factual certification/);
});
