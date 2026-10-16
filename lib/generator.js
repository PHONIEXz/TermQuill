import { generateText } from 'ai';
import { createGoogle } from '@ai-sdk/google';
import { buildPrompt, parseModelOutput } from './assessment.js';
import { AppError,providerStatus } from './errors.js';
import { setTimeout as delay } from 'node:timers/promises';

export async function generateAssessment(spec, { key = process.env.GOOGLE_GENERATIVE_AI_API_KEY, model = process.env.GOOGLE_MODEL || 'gemma-4-26b-a4b-it', generate = generateText, signal } = {}) {
  if (!key) throw new AppError('Generation is not connected yet. Try the sample assessment, or ask the owner to configure the model key.',503,'MODEL_NOT_CONFIGURED');
  if (!/^gemma-[\w.-]+$/.test(model)) throw new AppError('Configure an available Gemma model for this open-model build.',503,'MODEL_CONFIGURATION');
  const google = createGoogle({apiKey:key});
  let repair = '', transientRetried = false;
  for (let attempt = 0; attempt < 2; attempt++) {
    const options = { model:google(model), prompt:buildPrompt(spec, repair), maxOutputTokens:Math.min(14000, 1500 + spec.count * 550), maxRetries:0, abortSignal:signal,
      // Gemma 4 supports minimal to disable its optional thinking pass.
      ...(model.startsWith('gemma-4-') ? {providerOptions:{google:{thinkingConfig:{thinkingLevel:'minimal',includeThoughts:false}}}} : {}) };
    let result;
    try {result=await generate(options);}
    catch(error) {
      if(transientRetried || ![500,502,503,504].includes(providerStatus(error)) || signal?.aborted)throw error;
      transientRetried=true;
      await delay(800,undefined,{signal});
      result=await generate(options);
    }
    try {
      if (result.finishReason === 'length') throw new Error('The response ended before the assessment was complete.');
      return { paper:parseModelOutput(result.text, spec), model, attempts:attempt + 1 };
    } catch (error) {
      repair = error.message;
      if (attempt === 1) throw new AppError('The model could not produce a complete assessment that passed the checks. Try fewer questions or more detailed notes. Your previous draft is safe.',422,'ASSESSMENT_VALIDATION');
    }
  }
}
