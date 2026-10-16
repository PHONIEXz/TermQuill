import { generateText } from 'ai';
import { createGoogle } from '@ai-sdk/google';
import { buildPrompt, parseModelOutput } from './assessment.js';

export async function generateAssessment(spec, { key = process.env.GOOGLE_GENERATIVE_AI_API_KEY, model = process.env.GOOGLE_MODEL || 'gemma-4-26b-a4b-it', generate = generateText, signal } = {}) {
  if (!key) throw Object.assign(new Error('Generation is not connected yet. Try the sample assessment, or ask the owner to configure the model key.'), {status:503});
  if (!/^gemma-[\w.-]+$/.test(model)) throw Object.assign(new Error('Configure an available Gemma model for this open-model build.'), {status:503});
  const google = createGoogle({apiKey:key});
  let repair = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await generate({ model:google(model), prompt:buildPrompt(spec, repair), maxOutputTokens:Math.min(14000, 1500 + spec.count * 550), maxRetries:0, abortSignal:signal });
    try {
      if (result.finishReason === 'length') throw new Error('The response ended before the assessment was complete.');
      return { paper:parseModelOutput(result.text, spec), model, attempts:attempt + 1 };
    } catch (error) {
      repair = error.message;
      if (attempt === 1) throw Object.assign(new Error('The model could not produce a complete assessment that passed the checks. Try fewer questions or more detailed notes. Your previous draft is safe.'), {status:422});
    }
  }
}
