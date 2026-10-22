// Hand-authored reference cases. Pattern matches aid review; they do not
// establish general factual correctness, curriculum alignment or age suitability.
import {auditAssessment} from '../lib/assessment.js';
import {objectiveReport} from '../lib/objectives.js';
const definitions=[
 ['early','Early learning','Kindergarten',[
  ['Count exactly three apples.','Three apples are shown together. Counting each apple once gives 3 apples.','How many apples are shown?','3','^(3|three)$'],
  ['Name the shape that is round.','A circle is round and has no corners. A triangle has three straight sides.','Which shape is round?','Circle','circle'],
  ['State the number of corners on a square.','A square has four equal straight sides and 4 corners. Count each corner once.','How many corners does a square have?','4','^(4|four)$']]],
 ['primary','Mathematics','Primary 4',[
  ['Calculate 7 plus 5.','Addition combines quantities. Seven plus five equals 12. Check by counting on from seven.','What is 7 + 5?','12','\\b(12|twelve)\\b'],
  ['Share 20 pencils equally among 4 pupils.','Division shares a total equally. Sharing 20 pencils among 4 pupils gives each pupil 5 pencils.','How many pencils does each pupil receive?','5 pencils','\\b(5|five)\\b'],
  ['Calculate the perimeter of the given rectangle with units.','The perimeter is the distance around a rectangle. With length 4 cm and width 3 cm, the perimeter is 4 + 3 + 4 + 3 = 14 cm.','Find the perimeter of a rectangle 4 cm long and 3 cm wide.','14 cm','\\b14\\s*(cm|centimet)']]],
 ['secondary','Chemistry','SS1',[
  ['Identify the combination in a compound as chemical.','A compound contains different elements chemically combined in fixed proportions. Water is a compound.','How are elements combined in a compound?','Chemically combined.','chemical'],
  ['Choose the method to recover both water and salt from salt water.','Simple distillation collects water by evaporation and condensation. Salt remains as residue, allowing both materials to be recovered.','Which method recovers both water and salt from salt water?','Simple distillation.','distillation'],
  ['Name the tool for separating iron filings from sand.','A magnet attracts iron filings. Dry sand is not magnetic, so a magnet can separate iron filings from dry sand.','Which tool separates iron filings from dry sand?','A magnet.','magnet']]],
 ['vocational','Workshop practice','Technical foundation',[
  ['Select the tool that measures an external diameter.','A vernier caliper can measure an external diameter. Read the scale carefully and record the measurement with its unit.','Which tool can measure an external diameter?','A vernier caliper.','caliper'],
  ['State the required action before servicing an electrically powered tool.','Before servicing an electrically powered tool, isolate it from its power supply and follow the approved workshop procedure.','What must happen to the power supply before servicing a powered tool?','Isolate the tool from its power supply.','isolat|disconnect'],
  ['Explain the purpose of an expansion gap.','An expansion gap allows a material to expand when heated. Without adequate space, thermal expansion can cause buckling.','Why is an expansion gap provided?','To allow thermal expansion and reduce buckling.','expan']]],
 ['undergraduate','Mechanics','First-year physics',[
  ['Calculate speed from the supplied distance and time, with units.','Speed equals distance divided by time. A body travels 100 m in 20 s, giving a speed of 5 m/s.','Find the speed of a body that travels 100 m in 20 s.','5 m/s','\\b5\\s*(m/s|met)'],
  ['Calculate net force from mass and acceleration, with units.','For constant mass, net force equals mass times acceleration. A mass of 2 kg accelerating at 3 m/s squared has a net force of 6 N.','Find the net force on a 2 kg mass accelerating at 3 m/s squared.','6 N','\\b6\\s*(N|newton)'],
  ['Calculate work for force parallel to displacement, with units.','Work equals force times displacement when they act in the same direction. A force of 10 N through 4 m does 40 J of work.','Find the work done by a 10 N force acting along a displacement of 4 m.','40 J','\\b40\\s*(J|joule)']]],
 ['postgraduate','Research methods','Postgraduate research',[
  ['Calculate the descriptive mean change for group A.','Group A has a mean pre-test score of 45 and a mean post-test score of 65. Its descriptive mean change is 20 points.','What is the mean change from 45 to 65 points?','20 points','\\b(20|twenty)\\b'],
  ['Explain why this comparison does not establish causation.','The two comparison groups were not randomly allocated and had different instructors. Their observed differences do not establish causation.','Does this comparison establish causation? Explain briefly.','No. Non-random allocation and instructor differences may confound the result.','\\b(no|not|cannot|doesn.t)\\b'],
  ['State why a valid p-value cannot be calculated from the supplied summaries alone.','Only group means are supplied, with no standard deviations or individual-level data. These summaries do not support calculation of a valid p-value.','Can a valid p-value be calculated from the group means alone?','No. Variation estimates or suitable individual-level data are missing.','\\b(no|not|cannot|missing|insufficient)\\b']]],
 ['adult','Everyday numeracy','Adult education',[
  ['Calculate the result of increasing 100 by ten percent.','Ten percent of 100 is 10. Increasing 100 by ten percent gives 110. This is a hypothetical arithmetic example.','Increase 100 by ten percent.','110','\\b110\\b'],
  ['Calculate the discounted price of 200 after a twenty-five percent discount.','Twenty-five percent of 200 is 50. Subtracting a discount of 50 from 200 gives a final price of 150.','Find the price after a twenty-five percent discount on 200.','150','\\b150\\b'],
  ['Calculate the remainder after the stated expenses.','A hypothetical monthly budget has income of 1000 and expenses of 750. Subtracting expenses leaves 250.','How much remains after expenses of 750 from income of 1000?','250','\\b250\\b']]]
];
export const CREATION_CASES=definitions.map(([id,subject,level,items])=>{
 const notes=items.map(i=>i[1]).join('\n\n'),spec={title:subject+' reference assessment',subject,level,notes,count:3,marksEach:2,minutes:15,difficulty:'mixed',format:'short',sourceMode:'notes',educationStage:id,presentation:id==='early'?'early':'standard',...(id==='early'?{visualTasks:['counting']}:{}),objectivePlan:items.map(([label,quote],i)=>({id:id+'-'+i,label,start:notes.indexOf(quote),end:notes.indexOf(quote)+quote.length,questions:1}))};
 const paper={instructions:'Answer all questions.',questions:items.map(([,evidence,prompt,answer],i)=>({kind:'short',prompt,answer,evidence,marks:2,marking:[{point:answer,marks:2}],options:[],correctIndex:null,...(id==='early'&&i===0?{blocks:[{type:'picture',icon:'apple',quantity:3,size:'large',task:'count'}]}:{})}))};return{id,spec,paper,patterns:items.map(i=>i[4])};
});
export function evaluateReference(paper,fixture){return{case:fixture.id,structuralIssues:auditAssessment(paper,fixture.spec),objectiveCoverage:objectiveReport(paper,fixture.spec),referenceChecks:fixture.patterns.map((pattern,i)=>({question:i+1,referenceMatched:new RegExp(pattern,'i').test(paper.questions[i]?.answer||'')})),interpretation:'Reference matches are limited checks, not factual certification. Independently review wording, all MCQ alternatives, working, partial credit and stage suitability.'};}
