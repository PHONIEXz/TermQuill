const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!key) {console.error('Set GOOGLE_GENERATIVE_AI_API_KEY in .env first.');process.exit(1);}
const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models',{headers:{'x-goog-api-key':key}});
if (!response.ok) {console.error(`Model discovery failed (${response.status}). Check your account and API access.`);process.exit(1);}
const data = await response.json();
for (const model of data.models || []) if (model.name.includes('/gemma-')) console.log(model.name.replace('models/',''));
if (data.nextPageToken) console.log('Additional model pages exist. Use Google model discovery to inspect the full catalog.');
