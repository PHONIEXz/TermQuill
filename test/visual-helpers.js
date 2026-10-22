import * as timing from '../lib/generation-timing.js';
import * as diagrams from '../lib/diagrams.js';
import {EditHistory} from '../lib/edit-history.js';
import * as objectives from '../lib/objectives.js';
import {sourcePassages} from '../lib/assessment.js';
import * as coverage from '../lib/coverage.js';
import {qualityReview} from '../lib/quality.js';
import {LESSON_EXAMPLES,exampleLessons,exampleVisualTasks} from '../lib/lesson-examples.js';
import {readFile} from 'node:fs/promises';
import * as reviewHelpers from '../lib/review.js';
import * as referenceHelpers from '../lib/references.js';
import {readBank} from '../lib/bank.js';
import {readDrafts} from '../lib/drafts.js';
import * as visuals from '../lib/visuals.js';
import {earlyYearsSample} from '../lib/early-years.js';
const modules=[['objective-plan',['initObjectivePlan','renderObjectiveCoverage']],['quality-review',['renderQualityReview']],['creation-plan',['initCreationPlan','renderCoverage']],['media-picker',['mediaPicker']],['school-review',['mountSchoolReview']],['school-bank-view',['mountSchoolBank']],['reference-picker',['initReferencePicker']],['paper-blocks',['renderBlocks','applyPaperLayout','iconElement','assertPicturesReady','renderSection','renderLogo']],['visual-editor',['blockEditor','layoutEditor','logoEditor','compressPicture','questionDocumentEditor']]];
const sources=await Promise.all(modules.map(async([name,exports])=>[(await readFile(new URL(`../public/${name}.js`,import.meta.url),'utf8')).replace(/^import .*;\n/gm,'').replace(/export (function|async function) /g,'$1 '),exports]));
export function installVisuals(w){Object.assign(w,timing,{EditHistory},diagrams,objectives,{sourcePassages},coverage,visuals,referenceHelpers,reviewHelpers,{qualityReview,LESSON_EXAMPLES,exampleLessons,exampleVisualTasks},{earlyYearsSample,readBank,readDrafts});for(const [source,exports] of sources)w.eval(`(()=>{${source}\nObject.assign(window,{${exports.join(',')}});})()`);}
