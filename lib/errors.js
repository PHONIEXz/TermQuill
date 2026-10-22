export class AppError extends Error {
  constructor(message,status,code) {super(message);this.name='AppError';this.status=status;this.code=code;}
}
export function providerStatus(error) {
  for(let e=error,depth=0;e&&depth<4;e=e.cause,depth++) {
    const n=e.statusCode ?? e.status;
    if(Number.isInteger(n)&&n>=400&&n<=599)return n;
  }
  return null;
}
export function publicFailure(error,aborted=false) {
  if(aborted)return {status:504,code:'GENERATION_TIMEOUT',error:'Generation reached its time limit before a complete checked paper was ready. Save your setup before retrying. Any previous paper remains unchanged in this tab.'};
  if(error instanceof AppError)return {status:error.status,code:error.code,error:error.message};
  const status=providerStatus(error);
  if(status===429)return {status:429,code:'PROVIDER_QUOTA',error:'Google has reached a rate or quota limit for this model. Wait before retrying and check the model’s quota in Google AI Studio. Your previous draft is safe.'};
  if(status===401||status===403)return {status:503,code:'PROVIDER_ACCESS',error:'Google rejected the model credentials or access permissions. The owner should check the API key, restrictions and model access in Google AI Studio, then redeploy if the key changes. Your previous draft is safe.'};
  if(status===404)return {status:503,code:'MODEL_UNAVAILABLE',error:'The configured Gemma model is unavailable to this account or endpoint. The owner should check GOOGLE_MODEL against the models available in Google AI Studio. Your previous draft is safe.'};
  if(status===400||status===422)return {status:502,code:'PROVIDER_REQUEST',error:'Google rejected the generation settings or content. Try different lesson notes; if it persists, the owner should inspect the diagnostic code in the server logs. Your previous draft is safe.'};
  if(status&&status>=500)return {status:503,code:'PROVIDER_BUSY',error:'Google’s model service returned a server error, and the available recovery attempts did not succeed. Try again later. Your previous draft is safe.'};
  return {status:502,code:'PROVIDER_CONNECTION',error:'The model provider could not finish this request. Try again shortly. Your previous draft is safe.'};
}
