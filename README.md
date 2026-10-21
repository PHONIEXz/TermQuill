# TermQuill

**From lesson notes to a paper you can stand behind.**

Live pilot: https://termquill.vercel.app/

UI direction and future design rules: [design/DESIGN.md](design/DESIGN.md). The interface combines an original multicolor editorial landing page and interactive workflow example with grouped school navigation, a sectioned assessment builder and a distinct supporting-evidence area. Decorative motion can be paused and respects device reduced-motion preferences.

Created by **Paul Ayoade David** for private tutors and classroom teachers. This new project began on October 16, 2026 for DEV's Hacktoberfest Week 2: Side Hustle challenge. Phoenix Offline AI is a separate, paused project.

TermQuill turns teacher-supplied notes into an editable assessment and separate marking guide. Each generated question includes a verbatim supporting quote. Deterministic checks validate question counts, formats, expected answers, duplicates and marking totals. The teacher reviews the content before printing. It is a draft assistant, not a factual certification tool.

## What works in this pilot

- Short-answer, multiple-choice and mixed papers, 3–20 questions.
- Configurable subject, class, time, thinking level and equal marks per question.
- Editable questions, options, expected answers, marking points and source quotes.
- Separate student and teacher views; teacher review confirmation before printing.
- Four real pages: Home (`/`), Create assessment (`/create`), My drafts (`/drafts`), and How it works (`/guide`).
- Browser print / Save as PDF, up to 30 device-local drafts, title/subject/class search, individual removal, JSON export and validated JSON import.
- Existing single-device drafts migrate to the new library. Saved paper URLs reopen the selected paper on the same browser/device; they are not public sharing links.
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

Optional `TERMQUILL_ACCESS_CODE` (legacy `LESSONPRESS_ACCESS_CODE` remains supported) restricts generation to a small invited pilot. It is a shared code, not individual authentication. It stays in tab memory and is sent over the same-origin request header. Use HTTPS on a deployed site.

## Deploy to Vercel

Import the new repository, use the included `vercel.json`, and add `GOOGLE_GENERATIVE_AI_API_KEY`, `GOOGLE_MODEL`, and a pilot access code as server environment variables. Redeploy after changing variables. Build command: `npm run build`. Output: `public`. API functions: `api/`.

The build copies shared validation, draft-storage and sample modules into `public`; do not edit those generated copies. Local development serves the original `lib` files through an explicit allowlist. The public read-only sample needs no account. Working tools and generation require verified Supabase sign-in. School workspaces require the Supabase migrations below.

Before a public launch, add durable rate limits and platform protections. The included limits (8 generations per account/client combination/hour and 100 total/hour) are in-memory per server instance and reset when instances restart; distributed instances do not share them. They are not a reliable account-wide spending cap. Configure provider spending controls separately. Current deployment verification is recorded in `docs/verification.md`.

## Privacy and review

Generation sends the submitted lesson notes and settings to Google. Generation does not persist notes on the app server or log them. Sending a paper to a school explicitly stores its questions and source notes in Supabase. Provider retention is governed by the account's terms; do not claim end-to-end local privacy. Do not submit student names, marks, personal records or sensitive material.

Drafts remain in the tab unless the teacher explicitly saves to browser localStorage, downloads JSON, or sends a copy to a school workspace. LocalStorage is accessible to anyone sharing that browser profile. Removing a draft removes the selected device copy, not downloaded files. Restoring requires structural validation and resets review approval.

Exact quote matching proves only that the quote occurs in the notes. It does not prove the quote supports the answer, the source notes are correct, the MCQ has only one defensible answer, or the assessment is age-appropriate. Duplicate detection catches normalized identical wording, not semantic paraphrases. A teacher must check these. Any edit resets approval. Print views are separated by explicit rendering; the teacher guide contains answers and must be handled accordingly.

## Verification

```bash
npm test
npm run check
npm run build
```

Automated checks include 59 unit, HTTP, DOM and Postgres interaction tests. Provider responses are simulated in tests; they do not establish live Gemma quality, real quota availability or willingness to pay. A production smoke test generated three Chemistry questions on its first attempt in about 67 seconds. This is one successful test, not an accuracy or reliability benchmark. See `docs/verification.md` for current browser evidence and remaining work.

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

## Milestone 2: teacher workspace

Separate pages and multiple saved drafts make the create → review → save → reopen → print workflow usable across sessions. Saving updates the same draft rather than silently adding duplicates. Imported papers get a new ID and always need review. Unsaved papers show a warning before leaving the creator. This personal draft library uses browser storage. Verified accounts separate personal browser storage; the School Review Pilot adds distinct school-owned cloud records.

Next milestone: classroom pilot. Review outputs in Chemistry, Basic Science and one non-science subject; inspect student/teacher PDFs; check a real phone; collect feedback from two teachers and measure preparation/editing time without inventing results.

## School Review Pilot

School accounts use Supabase Auth. All working tools require verified sign-in. `/workspace` is the personal entry point; `/login` and `/signup` are separate account pages. `/demo` is a public read-only sample. `/school`, `/school/library`, `/school/reviews`, `/school/team` and `/school/paper` provide school management, a departmental library and independent approval.

Apply `migrations/001_school_review.sql`, then `migrations/002_pilot_trust.sql` and `migrations/003_school_locations.sql` to the provisioned Supabase database before deploying. The Vercel Marketplace integration supplies `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` (legacy anon keys are also supported). The app never uses the service-role key or database password. For local development, put the public URL/key in your private `.env`.

Accounts require email verification and a password of at least 12 characters. The Supabase Auth production Site URL is configured as `https://termquill.vercel.app/school`. Configure a production SMTP sender before inviting users outside the Supabase team. Built-in email delivery is limited and should not be treated as production email. The existing email confirmation redirect remains `/school`; after verification its account guard leads to `/login`. Users can also open `/login` directly. Password recovery, SSO, MFA and principal transfer are not implemented in this pilot.

A principal creates a school, departments and email-bound invitation links for teachers or department heads. Invitations expire after seven days, are single use and can be revoked. The app displays a link for the principal to share; it does not send invitations. School creation does not verify institutional ownership. Principals request an independent check on School trust & activity; only the platform operator can record a decision after checking school identity and authority. New invitations require verification, with a persistent database limit of 20 per school per hour. Existing invitations retain their prior validity rules. One account can create at most three schools in this pilot.

Use **Send to school** from the assessment builder, or import a TermQuill JSON file in the department library. This explicitly uploads the questions and source notes to Supabase. Personal drafts remain in browser storage. School staff must avoid student records and confidential live exam material during the pilot. Removing a member removes workspace access but preserves their school papers and audit records.

Permissions are checked in the database on every call, from verified Supabase user identity and current membership, never client role metadata. Principals oversee all school departments; department heads review their own department; teachers can edit their own papers and read the approved copy of their department's other papers. Direct table access is revoked; RLS is enabled without permissive table policies. A public invoker RPC wraps the guarded private-schema function with an empty search path. Anonymous callers cannot execute it. The private schema must not be added to Supabase's exposed schemas.

Each save appends a version, preserving prior copies. Submitted papers lock editing. An independent principal or department head can comment, request changes or approve the current version. An author cannot approve their own paper. Review decisions include the expected revision so stale reviews fail. Editing an approved paper creates a draft while the earlier approved version remains available to the department. These records are append-only through the app; database administrators retain database access.

`test/school-db.test.js` runs the migration in the PGlite Postgres engine, with test Auth identities, and exercises school/department isolation, restricted invitations, review roles, self-approval denial, stale versions, immutable approved copies, removed membership and direct access denial. These tests do not prove email delivery or a signed-in production browser flow. Account rate limits are per server instance plus Supabase's provider limits, not a distributed abuse-control system.

Curriculum accreditation/compliance, students, grading, mastery analytics, LTI, gradebook/calendar sync and real-time coauthoring are later milestones. No enterprise readiness or automatic factual correctness is claimed.


## Guided setup and public pages

The home page explains personal preparation versus school collaboration. `/guide#school-guide` walks through departments, invitations, papers and review decisions. `/privacy` describes current data handling, providers, browser storage, school access, retention and privacy-request limitations.

The principal can use **Create your first department** directly in an empty School papers page or school overview. The form opens inline; **Save department** updates the department choices immediately. **Departments & people** lists existing departments and provides **Add another department**. Teachers and department heads receive guidance to ask the principal instead of an unauthorised creation control. Restoring a JSON backup is optional, not a required starting step.

Before broad institutional adoption, publish a dedicated private support/privacy contact and finish production email configuration. The current privacy page uses minimal project-support contact to arrange a private channel and explicitly asks users not to post private records in GitHub issues.


## Manual assessment preferences

In Question format or Thinking level, choose **Describe my own** to enter 3–600 characters of instructions. The request is validated server-side, included in the model prompt, and kept with saved/imported/shared drafts. Inactive fields are excluded. Preset choices retain deterministic type ordering; a custom format allows the model to choose the ordering of supported four-option MCQ and written-response questions. Counts, marks, evidence and answer checks still apply. Exact compliance with custom wording, proportions or cognitive demand remains a teacher review task. Visual questions are supported through the structured blocks below. Picture uploads are teacher-supplied PNG/JPEG files; audio and online interactive tests are not supported.

See `docs/ai-roadmap.md` for proposed AI workflows beyond assessment generation. These are plans, not deployed features.


## School pilot trust controls

`/school/trust` explains verification and provides principals with activity pagination, event filters, search within loaded records and JSON downloads of those matching records. This is not a complete school-data export. Each page contains up to 50 events. New paper-save, submission, review and print-request events identify a revision. Print records report a request, not completed physical printing. Old events remain unchanged and can lack revision metadata. Staff can view the school verification status, but cannot read school-wide activity or submit verification decisions.

Migration 002 adds a guarded wrapper around the original workspace implementation. The original implementation and the operator verification function are not executable by application roles. New verification and invitation-usage tables have RLS and no direct application access. See `docs/pilot-operations.md` for operator checks and outstanding production dependencies.


## Optional location features

`/school/location` lets principals review and save a private school point, using one-time device geolocation, manual coordinates or a parsed OpenStreetMap marker link. The point is visible to current authorised school members. Changing or deleting a point requires principal permission and the expected location version. The app records location action/version/visibility metadata without copying coordinates into audit details. Location versions use a private sequence to avoid stale-version collisions after removal and recreation.

`/find-schools` is a public, opt-in school directory. Only independently verified schools with an explicitly enabled public listing appear. The public RPC returns school ID/name/area and coordinates rounded to three decimals, never account emails, private source/accuracy, notes or full-precision points. Listings are school-supplied, not GPS-verified. Browse/search is paginated; nearby results are ordered among currently loaded schools and use approximate straight-line distances.

`lib/location.js` is a reusable, side-effect-free location toolkit: coordinate validation, one-shot permission-based device lookup with timeout/cancellation, error messages, map-link parsing, coarse search bounds and Haversine distance. A device position is requested only from explicit button handlers. Search positions stay in page memory; coarse bounding areas based on a tenth-degree grid go to the directory API. There is no background tracking or location history. Precise school points are sent only on confirmed school saves. No location is added to model prompts.

Maps use user-opened HTTPS OpenStreetMap links, not automatically loaded map tiles. The link shares the selected school/preview point with OpenStreetMap and never includes a nearby visitor's origin. Principals can move a marker in OpenStreetMap's Share panel and import its full marker link locally. The app does not fetch imported URLs.

Permissions-Policy permits same-origin geolocation while retaining camera/microphone restrictions. HTTPS and browser permission are still required. `scripts/verify-location-db.js` generates a rollback-only hosted smoke test. Tests use synthetic locations; an actual device GPS fix must be checked by a user on their own device. See `/privacy#location` and `docs/location-design.md`.


## Visual papers and Early Years (October 19)

Choose **Open Early Years example** in Create assessment for a hand-authored, editable six-question paper. The example is explicitly labelled; it is not live AI output or a claim of curriculum suitability. Standard, Primary and Early Years presentation presets control reading size; the teacher still chooses the class and checks suitability.

- Each question can contain up to six structured blocks: original line illustrations (12 objects/shapes), exact counts (1–20 objects), embedded pictures, tables (1–4 columns / 1–8 rows), matching columns (2–6 pairs), tracing outlines, drawing boxes and writing lines.
- Add, duplicate, reorder or remove questions within the existing 3–20-question limit. Reordering enables teacher-arranged format validation. Duplicate questions must be changed before approval.
- School name, term/exam heading and per-question print page breaks are editable. Student papers omit answer keys and lesson quotes. Matching uses a saved right-column permutation, so displayed letters and answer keys agree. Counting/matching keys and their marking points are derived from the blocks; edits invalidate approval.
- PNG/JPEG files under 4 MB and 16 megapixels are decoded and compressed on the teacher's device. A stored picture is at most 24,000 data-URL characters (about 18 KB). The teacher can choose size and whole-picture or square centre crop. No remote image URLs, uploaded SVG or executable content is allowed. Uploaded pictures are not sent to the AI for image recognition.
- Pictures are embedded in the saved paper, not external links. Personal drafts/JSON keep them locally; sending a paper to school stores them in its existing versioned JSON record. A conservative encoded-byte check protects the existing 90 KB school record limit; large illustrated papers must be simplified before sharing. Device storage and JSON import limits still apply. A dedicated asset bucket is a future scaling step, not a prerequisite or a provisioned service.
- Generated Early Years/Primary/custom-format requests can use the supported visual schema. Notes remain the factual source, structural validation still runs, and unsupported blocks are rejected. Teacher uploads happen after generation. The model does not produce arbitrary SVG/HTML or generated raster artwork.

Tracing uses simple outline practice text, not a handwriting curriculum. Tables/captions/image descriptions are teacher-visible content on the student copy: do not put answers in them. Preview every paper, check black-and-white legibility and browser print pagination, and adapt tasks for your learners. Cloud school roles and immutable approved versions keep their existing rules.

### Exam documents and personal question bank

Edit & review supports school logo uploads, per-question marks (1–100), and section headings/instructions. Marking points must still add up to the question marks. Generation stays uniform according to its Marks each setting; edited papers can explicitly use individual marks. Printed page totals come from actual question marks. Numbered print margins require a supporting browser (Chrome 131+); inspect preview and turn off the browser's own headers/footers if duplicated.

Save question to bank stores a checked question, exact source notes, visual blocks and answer on this browser. `/question-bank` supports subject/class/topic/term search, up to 50 entries, private JSON backup import/export and assembly of 3–20 questions from one subject/class. Assembly creates an unreviewed device draft. Browser storage is not cloud sync or school approval. Existing school copies and approvals remain separate.

Remaining institutional work and verification limits are tracked in `docs/ROADMAP.md`.

### Exam/Test and reference generation

Exam and Test are editable paper purposes with fresh-generation count/duration presets. They persist through device drafts, bank assembly and school versions. They are not online proctored or timed student sessions.

The builder separates purpose from source. Past questions loads structurally validated saved papers and question-bank entries from this browser, deduplicates matching wording and lets the teacher choose 1–10 references for one subject/class. The original retained lesson notes are used as bounded source material (18,000 characters); teachers need not paste notes again. Selected wording is untrusted prompt data, and newly generated questions must still cite exact source passages. Exact copies of selected reference wording are rejected during generation.

No cross-account history or automatic school-paper retrieval is added. No history means this option requires a saved/imported paper or bank entry. Existing direct-note and legacy paper flows remain valid. Online generation/provider quota still applies; exact-question bank assembly remains the non-generating reuse option.

### School review and approved question reuse

School paper pages can compare accessible versions, including changed wording, answers, marks, source evidence and visuals. Exact question wording is matched first; remaining questions use positional pairing, so rewrites combined with reorder need manual review. Question feedback appears beside its question and in the feedback list. Reviewers can tick each question before the UI enables approval; progress is tab-local and scoped to school/paper/revision/user. It is a review aid, not a server-recorded attestation. Existing database role, self-approval and version-concurrency checks remain authoritative.

Approved-copy links and printed headers distinguish approved versions from new drafts. `/school/bank` lists approved source papers allowed by the existing school/department permissions. Select 3–20 questions from one subject/class and up to five papers. The server re-reads each exact source under the signed-in user's permissions, verifies it is the current approved copy, and creates a new draft through the existing save RPC. Source questions are never accepted from client-authored answers. Source credit preserves paper/version/question/author identifiers; it does not confer approval on an adapted question. Metadata attribution is not a cryptographic certificate. No database migration or new storage policy is required.


### Accounts and personal workspace (2026-10-20)

`middleware.js` gates personal application pages on Vercel; the local server applies the same page check. Browser modules re-check identity before reading private collections. Generation independently verifies identity and same-origin requests before provider access; school RPCs continue to enforce verified identity and database membership. Public HTML and JavaScript are not treated as a data security boundary.

Signup stores a display name and self-described occupation in Auth metadata. Metadata never grants a school role; existing school membership remains authoritative. Personal lessons, drafts, question-bank items, transfers and school preferences use account-specific browser keys. Other tabs lock/reload when the active account changes. Browser storage remains unencrypted and is not protection against someone controlling the browser profile or developer tools. The later personal-cloud-lessons milestone below adds cloud storage for lessons; drafts and questions remain browser-local.

My workspace offers an explicit ownership-confirmed copy of earlier anonymous browser work. It validates each collection, preserves originals, skips identical content, keeps conflicting IDs as separate copies and reports partial failures by collection. School creation is a separate authorised setup path with an acknowledgement; teachers normally join with an email-bound invitation. No invitations are sent automatically.


### Private cloud lesson library and educator-only tools

Apply migrations 004 and 005 after 001–003. `lp_personal_lessons` derives ownership from `auth.uid()` and serialises per-account writes. Active plus recoverable notes are capped at 100 / 2 MB. Saves, removals and restores use server-issued versions; imports validate first and commit atomically, skip identical content and preserve conflicting identifiers as copies. Removed notes remain recoverable seven days and are pruned on later writes. Original browser notes are uploaded only through an explicit copy/import action. Drafts and question-bank records remain browser-local.

Educator access is independent of profile occupation and email verification. `lp_educator` accepts requests and returns only the current user's status. Verified membership of an independently verified school grants access; independent educators require manual review. `lessonpress.review_educator` is callable only by the database owner/service role and records a review history. Operators must independently check professional context before approval; form accuracy alone proves nothing. No automatic school email or review notification is sent. Corrections are allowed; there is no typo-based dishonesty classifier.

A separately approved `app_operators` record provides owner testing access, without certifying professional or institutional status. Never seed one automatically from self-declared roles. The existing owner's proposed exception requires explicit approval; it has not been granted by this change. Normal accounts cannot write their own approvals or operator records. Both page/API checks and database RPC gates enforce access. Pending users can open their account, use the public demo and accept an invitation. Private personal notes are not visible to school managers through the application.

## Brand identity

The product is **TermQuill**: “From what you teach to what you assess.” Renamed from LessonPress on 20 October 2026. The existing GitHub repository, deployment address, environment variable names, database schema, browser storage keys, event names and backup identifiers remain compatible. They are implementation identifiers, not the public product name. Existing backups and saved work do not need conversion. No new domain has been purchased or connected.

## Instructions / topic source

Choose **Instructions / topic · no notes required** in Create assessment. Select an education stage (Nursery / Kindergarten, Primary, Secondary, vocational, undergraduate, postgraduate or adult education), enter the exact class/course and a 20–6,000-character brief. No lesson notes are sent in this mode. Existing question counts, marks, formats, paper styles, visual blocks, logo/picture uploads, editing, personal saving, school sharing/review and printing remain available. Topic-generated questions carry answer rationales, not supplied-note quotes, and require independent factual review. No browsing, live facts, guaranteed syllabus alignment or universal subject accuracy is provided.

Draft/import/bank/school round trips preserve per-question topic provenance, including papers assembled from both note-based and topic questions. Student copies exclude rationales. Fresh generation from saved past-question references continues to use only questions with retained lesson-note evidence; topic questions remain reusable through bank assembly. The educator access requirement is unchanged.

### TermQuill infrastructure (2026-10-21)

Canonical site: https://termquill.vercel.app/. Repository: https://github.com/PHONIEXz/TermQuill. Vercel project: `termquill`. Supabase display name: `TermQuill`; existing project reference, database schema and browser backup identifiers stay stable. Exact old and new `/school` confirmation destinations remain allowed; no wildcard redirects. The old hostname remains available to export personal browser-local drafts and question-bank backups before importing on the new hostname. Cloud lessons use the same account after signing in again. No automatic cross-origin storage transfer.
