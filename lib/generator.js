import { generateText } from 'ai';
import { createGoogle } from '@ai-sdk/google';
import { buildPrompt, parseModelOutput } from './assessment.js';
import { AppError,providerStatus } from './errors.js';
import { setTimeout as delay } from 'node:timers/promises';

export async function generateAssessment(spec, { key = process.env.GOOGLE_GENERATIVE_AI_API_KEY, model = process.env.GOOGLE_MODEL || 'gemma-4-26b-a4b-it', fallbackModel = process.env.GOOGLE_FALLBACK_MODEL ?? 'gemma-4-31b-it', generate = generateText, signal, sleep = delay } = {}) {
  if (!key) throw new AppError('Generation is not connected yet. Try the sample assessment, or ask the owner to configure the model key.',503,'MODEL_NOT_CONFIGURED');
  if (!/^gemma-[\w.-]+$/.test(model)) throw new AppError('Configure an available Gemma model for this open-model build.',503,'MODEL_CONFIGURATION');
  if (fallbackModel && !/^gemma-[\w.-]+$/.test(fallbackModel)) throw new AppError('Configure a valid Gemma fallback model or leave GOOGLE_FALLBACK_MODEL empty.',503,'MODEL_CONFIGURATION');
  const google = createGoogle({apiKey:key});
  let repair = '', previousOutput = '', transientRetried = false, selectedModel = model, fallbackUsed = false, providerCalls = 0;
  for (let attempt = 0; attempt < 2; attempt++) {
    const call = async () => {
      signal?.throwIfAborted();
      providerCalls++;
      return generate({ model:google(selectedModel), prompt:buildPrompt(spec, repair, previousOutput), maxOutputTokens:Math.min(14000, 1500 + spec.count * 550), maxRetries:0, abortSignal:signal,
        ...(selectedModel.startsWith('gemma-4-') ? {providerOptions:{google:{thinkingConfig:{thinkingLevel:'minimal',includeThoughts:false}}}} : {}) });
    };
    let result;
    while (true) {
      try {result=await call();break;}
      catch(error) {
        if(![500,502,503,504].includes(providerStatus(error)) || signal?.aborted)throw error;
        if(!transientRetried){transientRetried=true;await sleep(1200,undefined,{signal});continue;}
        if(!fallbackUsed && fallbackModel && fallbackModel!==selectedModel){selectedModel=fallbackModel;fallbackUsed=true;continue;}
        throw error;
      }
    }
    try {
      if (result.finishReason === 'length') throw new Error('The response ended before the assessment was complete.');
      return { paper:parseModelOutput(result.text, spec, {generated:true}), model:selectedModel, attempts:attempt + 1, providerCalls, fallbackUsed };
    } catch (error) {
      repair = error.message;
      previousOutput = typeof result.text === 'string' && result.text.length <= 100000 ? result.text : '';
      if (attempt === 1) {const failure=new AppError('The model could not produce a complete assessment that passed the checks. Try fewer questions or more detailed notes. Your previous draft is safe.',422,'ASSESSMENT_VALIDATION');failure.validationChecks=repair;throw failure;}
    }
  }
}
