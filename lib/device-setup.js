import {cleanLessonPlan} from './coverage.js';
import {cleanObjectivePlan} from './objectives.js';
import {cleanLayout,ICONS} from './visuals.js';
import {EDUCATION_STAGES} from './assessment.js';
export const SETUP_KEY='lessonpress.device-setup.v1';
export const BRANDING_KEY='lessonpress.device-branding.v1';
const choices={educationStage:Object.keys(EDUCATION_STAGES),assessmentMode:['test','exam'],presentation:['standard','primary','early'],sourceMode:['notes','references','topic'],format:['mixed','mcq','short','custom'],difficulty:['mixed','recall','application','custom']};
const lengths={title:100,subject:60,level:50,notes:18000,topicInstructions:6000,formatInstructions:600,difficultyInstructions:600};
function list(value,allowed,max){if(!Array.isArray(value)||value.length>max||new Set(value).size!==value.length||value.some(v=>!allowed.includes(v)))throw new Error('Saved setup has unsupported visual choices.');return [...value];}
export function cleanSetup(value){
 if(!value||value.version!==1||!value.settings||typeof value.settings!=='object')throw new Error('Saved setup is not supported.');
 const settings={};for(const [key,allowed] of Object.entries(choices)){if(!allowed.includes(value.settings[key]))throw new Error('Check the '+key+' setting before saving.');settings[key]=value.settings[key];}
 const generationMode=value.settings.generationMode??'single';if(!['single','batches'].includes(generationMode))throw new Error('Choose a supported generation approach.');if(value.settings.generationMode!==undefined)settings.generationMode=generationMode;
 for(const [key,max] of Object.entries(lengths)){const text=value.settings[key]??'';if(typeof text!=='string'||text.length>max)throw new Error('Check '+key+' before saving.');settings[key]=text;}
 for(const [key,min,max] of [['count',3,20],['marksEach',1,10],['minutes',5,180]]){const n=value.settings[key];if(!Number.isInteger(n)||n<min||n>max)throw new Error('Check '+key+' before saving.');settings[key]=n;}
 settings.visualTasks=list(value.settings.visualTasks??[],['counting','matching','tracing','drawing','table'],5);settings.visualObjects=list(value.settings.visualObjects??[],Object.keys(ICONS),12);
 if(settings.visualTasks.length&&!['short','custom'].includes(settings.format))throw new Error('Choose Written / visual responses for these picture tasks.');
 if(value.settings.lessonPlan!==undefined){if(settings.sourceMode!=='notes')throw new Error('Lesson coverage requires lesson notes.');settings.lessonPlan=cleanLessonPlan(value.settings.lessonPlan,settings.notes);}
 if(value.settings.objectivePlan!==undefined){if(settings.sourceMode!=='notes')throw new Error('An objective blueprint requires lesson notes.');settings.objectivePlan=cleanObjectivePlan(value.settings.objectivePlan,settings.notes,settings.lessonPlan);}
 return {version:1,settings,layout:cleanLayout(value.layout??{}),savedAt:typeof value.savedAt==='string'?value.savedAt:''};
}
export function saveSetup(storage,settings,layout){const value=cleanSetup({version:1,settings,layout,savedAt:new Date().toISOString()});storage.setItem(SETUP_KEY,JSON.stringify(value));return value;}
export function readSetup(storage){const raw=storage.getItem(SETUP_KEY);if(!raw)return null;if(raw.length>100000)throw new Error('Saved setup is too large.');return cleanSetup(JSON.parse(raw));}
export function saveBranding(storage,layout){const value=cleanLayout(layout);storage.setItem(BRANDING_KEY,JSON.stringify(value));return value;}
export function readBranding(storage){const raw=storage.getItem(BRANDING_KEY);if(!raw)return null;if(raw.length>30000)throw new Error('Saved branding is too large.');return cleanLayout(JSON.parse(raw));}
export function forgetSetup(storage){storage.removeItem(SETUP_KEY);storage.removeItem(BRANDING_KEY);}
