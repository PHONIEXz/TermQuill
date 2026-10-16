# LessonPress

**From lesson notes to a paper you can stand behind.**

Live pilot: https://lessonpress-pi.vercel.app/

Created by **Paul Ayoade David** for private tutors and classroom teachers. This new project began on October 16, 2026 for DEV's Hacktoberfest Week 2: Side Hustle challenge. Phoenix Offline AI is a separate, paused project.

LessonPress turns teacher-supplied notes into an editable assessment and separate marking guide. Each generated question includes a verbatim supporting quote. Deterministic checks validate question counts, formats, expected answers, duplicates and marking totals. The teacher reviews the content before printing. It is a draft assistant, not a factual certification tool.

## What works in this pilot

- Short-answer, multiple-choice and mixed papers, 3–20 questions.
- Configurable subject, class, time, thinking level and equal marks per question.
- Editable questions, options, expected answers, marking points and source quotes.
- Separate student and teacher views; teacher review confirmation before printing.
- Browser print / Save as PDF, optional device-local draft saving and JSON export.
- A clearly labelled, hand-authored Chemistry sample with no account or API key needed.
- Hosted Gemma integration through Vercel AI SDK's Google provider, with at most one repair attempt if output fails validation.
- Server-side credentials, bounded requests, restrictive CSP, access-code option and per-instance rate limits.

There is no payment collection, login, subscription billing, PDF/Word upload, OCR or claimed paying customer in this pilot.

## Run locally

Requires Node.js 22.9+ (Node 24 recommended). No Python, Docker or local model download required.

```bash
npm ci
cp .env.example .env
npm start
```

Open http://127.0.0.1:3000. The sample works immediately. For real generation, configure `GOOGLE_GENERATIVE_AI_API_KEY` in `.env` using your own Google AI Studio key. Never paste a key into the browser, a DEV post or GitHub.

The initial model is `gemma-4-26b-a4b-it`, listed in Google's Gemma-on-Gemini-API documentation on the build date. Set `GOOGLE_MODEL` to an available Gemma model in your account. Run `npm run models` to check access. Quotas, regional availability and billing depend on your provider account; no unlimited-free claim is made. Model listing alone does not prove a generation request will succeed.

Optional `LESSONPRESS_ACCESS_CODE` restricts generation to a small invited pilot. It is a shared code, not individual authentication. It stays in tab memory and is sent over the same-origin request header. Use HTTPS on a deployed site.

## Deploy to Vercel

Import the new repository, use the included `vercel.json`, and add `GOOGLE_GENERATIVE_AI_API_KEY`, `GOOGLE_MODEL`, and a pilot access code as server environment variables. Redeploy after changing variables. Build command: `npm run build`. Output: `public`. API functions: `api/`.

The build copies shared validation and sample modules into `public`; do not edit those generated copies. Local development serves the original `lib` files through an explicit allowlist. No database is required.

Before a public launch, add durable rate limits and platform protections. The included limits (8 generations per client/hour and 100 total/hour) are in-memory per server instance and reset when instances restart; distributed instances do not share them. They are not a reliable account-wide spending cap. Configure provider spending controls separately. The deployed Vercel path still needs a real deployment smoke test.

## Privacy and review

Generation sends the submitted lesson notes and settings to Google. This app does not persist them on the server or log them. Provider retention is governed by the account's terms; do not claim end-to-end local privacy. Do not submit student names, marks, personal records or sensitive material.

Drafts remain in the tab unless the teacher explicitly saves to browser localStorage or downloads JSON. LocalStorage is accessible to anyone sharing that browser profile. Clear saved draft removes the device copy, not downloaded files. Restoring requires structural validation and resets review approval.

Exact quote matching proves only that the quote occurs in the notes. It does not prove the quote supports the answer, the source notes are correct, the MCQ has only one defensible answer, or the assessment is age-appropriate. Duplicate detection catches normalized identical wording, not semantic paraphrases. A teacher must check these. Any edit resets approval. Print views are separated by explicit rendering; the teacher guide contains answers and must be handled accordingly.

## Verification

```bash
npm test
npm run check
npm run build
```

Automated checks include 33 unit, HTTP and DOM interaction tests. Provider responses are simulated in tests; they do not establish live Gemma quality, real quota availability or willingness to pay. A production smoke test generated three Chemistry questions on its first attempt in about 67 seconds. This is one successful test, not an accuracy or reliability benchmark. See `docs/verification.md` for current browser evidence and remaining work.

Gemma 4 requests use `thinkingLevel: minimal` to avoid the optional thinking pass for this structured drafting task. A provider 5xx response gets one short retry, within the existing overall timeout. Quota (429) and access errors are not blindly retried. Safe error codes distinguish quota, access, unavailable model, rejected request, timeout and connectivity failures. Logs include a random request reference and status code, never raw provider messages, keys or notes. The UI displays that reference for investigation. A provider quota remains an account/provider constraint; application retries cannot remove it.

## Why open models

The assessment generation path uses Gemma, an open-weight model, rather than merely using AI to write the app. The model is configured server-side and can be changed independently of the editor and validation layer. Hosting it through an API avoids asking a teacher's laptop to hold model weights. This implementation depends on Google's hosted service; a local or alternative-provider adapter is future work.

App code is MIT licensed. Gemma weights and Google's hosted service have their own terms; this repository does not redistribute model weights.

## Contest and next milestones

Official challenge: https://dev.to/challenges/hacktoberfest-week2-2026-10-12

Target a narrow paid use case: tutors who repeatedly prepare tests from their own notes. The next milestones are configuring and testing real generation on several subjects, testing with actual teachers, measuring preparation/editing time and collecting honest feedback on whether it is worth paying for. Price and demand remain hypotheses.

Submission needs a working demo or video, public code link and an English DEV write-up using the official template. Writing quality is weighted most heavily. Publish before the official deadline and note any commits after that deadline in this README. Do not claim a sale or user test that has not happened.

AI coding assistance was used. Paul Ayoade David owns the product direction and review. Third-party runtime dependencies are listed in `package.json` and `package-lock.json`; no code was copied from earlier Phoenix projects.

Provider recovery: after two transient 5xx errors from the primary Gemma, the app switches once to `gemma-4-31b-it` on the same Google service. Set `GOOGLE_FALLBACK_MODEL` to a different available Gemma or to an empty value to disable. Quota, access and invalid-request failures do not trigger fallback. Successful responses report the actual model, fallback use and provider call count. One structural repair is still allowed, with at most four total provider calls and the existing 105-second overall deadline. This is not a cross-provider outage solution and cannot guarantee availability.
