# Verification, October 16, 2026

Story: teacher pastes notes and settings, server requests a Gemma assessment, validates the output, and the browser provides editing, teacher review, and separate printable copies.

| Boundary | Evidence | Limit |
| --- | --- | --- |
| Input and output validation | Automated tests for bad input, duplicates, missing answers, quotes, option validity and marks | Checks do not establish semantic correctness |
| HTTP boundary | Real local HTTP requests cover valid output, invalid JSON, oversized input, methods, access codes, rate limits, redaction and static file allowlist | Generation function is simulated |
| Model orchestration | Tests show one repair attempt, original notes retained, specific safe provider error categories and one transient 5xx retry. Initial live Chemistry smoke test returned three questions in about 67 seconds on the first attempt | One smoke test does not establish subject-wide quality or provider reliability |
| UI behavior | Actual client script runs in JSDOM: sample rendering, student/teacher separation, edits invalidating approval, save/restore, safe text rendering, generation success/failure and cancellation | DOM simulation, not a graphical browser |
| Syntax and build | `npm run check` and `npm run build`; initial GitHub Actions run passed; Vercel production deployment READY | Model configuration and quota remain provider-account dependent |
| Desktop layout and live controls | Cloud browser inspected the live homepage, student paper, teacher guide and editor; editing reset approval; saving/restoring a test draft worked. Student view had six questions and zero teacher-answer elements | Native print pagination and mobile interaction still need a real browser check |

The sample is hand-authored. Tests do not replace teacher trials or establish revenue. No paying users, conversion rate, accuracy rate or teacher time-saving figure has been measured.

Next: retest production after the latency/error-handling update; test at least three subjects and two age levels; inspect generated answers against notes; test mobile browsers and exported PDFs; ask two teachers to prepare a real assessment and record feedback honestly.

Milestone 2 adds Home, Create, My drafts and Guide URLs with active navigation. The suite now contains 43 tests, including route responses, multiple draft saves and updates, removal, legacy migration, capacity limits, search, selected-draft reopening and JSON import validation. Native PDF pagination, real phone testing and teacher trials remain outstanding.

### School Review Pilot, 16 October 2026

- Supabase Free resource `lessonpress-schools` provisioned and connected to TermQuill Production and Preview. Configuration names verified without exposing secret values.
- Migration applied successfully to the actual Supabase database using Vercel's query editor. For editors that accept a single statement only, wrap the migration body (without outer begin/commit) in `do $migration$ begin execute $ddl$ ... $ddl$; end $migration$;`.
- Live SQL smoke verification passed for account identity lookup, school and department creation, invitation acceptance, draft submission, self-approval rejection, independent approval, outsider rejection, and revoked direct table/RPC privileges. Test users and school data were rolled back in a nested exception block. This exercises SQL functions with test identity claims, not a browser login or email delivery.
- Automated suite: 51 tests passing, including PGlite Postgres permissions and UI/HTTP checks. School role and identity checks are performed against database memberships and Supabase Auth. Cookies are HttpOnly and same-site, secure in production; mutations require the same origin.
- Browser confirmation of new page navigation and production account registration is recorded separately after deployment. Email delivery, password recovery, mobile printing, SSO and institutional ownership verification remain outside the completed verification.

- Production school sign-in page loaded with the expected navigation, account form and no application console errors (the browser extension logged its own metadata errors). Supabase Site URL corrected from localhost to the production school page. Custom SMTP is disabled, so wide email verification delivery is a launch blocker. No production account was created or verification email sent by the agent.

- Live browser: Create assessment → hand-authored sample → Send to school → `/school/library` correctly requires sign-in. Registration and signed-in production UI still require the owner to create and verify an account.

### Guided school setup and public pages, 16 October 2026

- Observed the owner's signed-in Principal account at De'Rock Foundation International School. The library had no departments and only a text instruction pointing to a hidden next step; the department form existed on the separate People & departments page.
- Added an accessible, expandable Create your first department control directly in the empty school library and overview, plus a visible list and Add another department control in Departments & people. The form focuses its name field, supports cancellation, checks empty/duplicate names, saves through the existing authorised RPC and reloads the department choices.
- Added an onboarding journey, contextual meaning/benefit/next-step explanations, responsibility hints, human-readable paper statuses, a terminology guide and a detailed school walkthrough. JSON restoration is optional and collapsed for schools with departments. Checkboxes use attached labels.
- Added a fuller public landing page and `/privacy` describing implemented data handling, provider processing, current retention/deletion limitations and a minimal public-support route for arranging private privacy requests. No independent compliance or certification claim. A dedicated private privacy-contact address is not yet published.
- Tests cover department creation from the empty library, focus/expanded state, correct school ID, updated department options and restricted controls for non-principals. Live browser verification is performed after deployment.

- Live browser: owner's Biology department and pending invitation were present during verification. Confirmed the new Add another department control opens the form with focus, rejects an existing Biology name without adding a duplicate, and supports cancellation. Avoided creating an unnecessary test department in the actual school.
- Corrected a discovered select-default bug: invitation responsibility and department now start with valid values (Teacher and the first available department) rather than a blank selection. A regression test covers both.
- Live landing page, privacy navigation and readable policy sections verified. School walkthrough and existing department selection checked through the signed-in browser. Remaining institution-wide email and private-contact limitations remain visible.

- Final browser check caught a landing-only layout rule appearing above the guide heading. Scoped the layout to the home page and added a computed-style regression test for home/create/drafts/guide.

### Manual format and thinking-level input, 17 October 2026

- Added custom choices and conditional, labelled instruction fields with examples and supported-format limits.
- Server validation bounds active custom instructions to 3–600 characters. Preferences are included in generation prompts and preserved by the shared draft validation used for local save/import and school sharing.
- Custom formats allow supported question kinds in different orders. Invalid kinds, wrong counts, answer/option errors, mark totals and unsupported source quotes remain rejected. Exact adherence to custom teaching preferences is not automatically certified.
- Added tests for validation bounds, prompt propagation, custom ordering, invalid kinds/evidence, UI visibility/required state, request payload and save/restore preservation.
- Added a proposed AI roadmap for lesson planning, advisory paper review, curriculum mapping, permission-scoped library discovery and data-grounded planning insights. These proposed capabilities are not presented as deployed features.

- First live custom example was rejected after both validation attempts. Tightened the prompt with exact supported kind labels and complete per-kind JSON examples. Final validation failures now log the bounded structural-check messages only, without raw model output or lesson content, so rejection causes can be diagnosed. Live retest follows deployment.
- Retest identified a non-contiguous evidence quote in Q2. Clarified continuous verbatim evidence and supplied bounded rejected output as untrusted data during the single repair attempt. A regression test verifies repair context and continued rejection of stitched quotes. All 60 tests, syntax checks and build pass; a final live retest follows deployment.
- The model repeated the copying error. Generation now requests numbered source-range IDs and the application derives the quote from the original notes using application-owned offsets. Invalid, reversed, fractional, missing and overlong ranges are rejected. Persisted papers retain the original evidence-string schema and exact-quote audit; selecting a valid range does not certify that it supports the answer. All 61 tests, syntax checks and build pass. Final live verification pending deployment.
- Production deployment of the source-selection change is READY and GitHub checks passed. Both manual fields were verified in the live browser with the requested values. The final live generation attempt failed with PROVIDER_BUSY after the existing bounded provider recovery path. A successful live model response for this final change remains unverified; automated generation, UI and persistence tests pass. No sample was substituted for the failed model response.

### School pilot trust increment, 17 October 2026

- Added `/school/trust` with independently reviewed school-verification requests, a principal-only activity browser, event filters, keyset pagination, loaded-record search and clearly scoped JSON export.
- New invitations require a verified school and are limited atomically to 20 per school per hour in Postgres. Existing staff and invitations retain their original validity checks. The operator-only verification decision function and original workspace implementation cannot be executed by application roles. Staff cannot approve their own school's identity.
- New saves, submissions, reviews and print requests identify the relevant revision. Print-request visibility reuses the authorised paper/revision lookup. It records a request to open the print dialog, not a completed print.
- All 65 tests, syntax checks and build pass. Tests exercise direct DB/RPC bypass attempts, cross-school activity denial, unapproved revision denial, invitation cap/reset, verification guidance, escaped activity text, request submission, HTTP error mapping and version-specific print requests.
- Migration 002 applied successfully through the managed query editor. A hosted smoke test checked the core review flow, school isolation, operator/bypass-function denial and print audit output. Its fixtures rolled back successfully; query editor read-only mode was restored. The actual owner school was not auto-verified and no invitation was sent.
- No custom sender domain or email integration was present. Marketplace CLI discovery required CLI authentication; no email provider, billing or DNS changes were made. Automatic invitations, recovery, principal MFA, broader durable quotas, full school export/deletion and verified paid AI configuration remain outstanding. See `docs/pilot-operations.md`.

- Signed-in production browser: verified real school status and request guidance, activity event filtering, empty-result search, disabled empty export and downloaded JSON containing exactly the two selected department events. No owner-school verification request or decision was fabricated. Updated setup guidance to lead unverified schools to verification before invitations; activity timestamps now include the browser timezone.

### Optional school location and nearby directory, 17 October 2026

- Added reusable location helpers, an explicit one-shot device lookup, cancellation/error handling and manual coordinates/marker-link import. Added `/school/location` and `/find-schools` with purpose-specific explanations and no automatic device lookup.
- Private school points require principal access and explicit school-point confirmation. Public listing defaults off, requires a verified school and returns only rounded public location/name/area. New SQL retains membership checks, denies staff edits/direct table access and uses version checks with a private sequence to prevent stale edits after remove/recreate.
- Nearby requests use coarse search bounds; precise origin and distance calculations stay in page memory. No AI prompts, background watching or browser storage of a search point. External map links are user-initiated and identify their recipient.
- All 75 tests pass, plus syntax and build checks. Hosted migration 003 and rollback-only SQL verification passed. Temporary point/listing fixtures were rolled back, and the query editor returned to read-only mode. No actual school point, real GPS fix or public listing was created by the agent.


### Design toolkit applied to TermQuill, 17 October 2026

- Added a shared visual layer with readable working text, larger controls, consistent focus styles, quieter surfaces and an explicit reduced-motion fallback. No external font or animation dependency was added.
- Grouped school navigation into work, team and settings. It becomes a rail on wider screens and grouped links above content on narrow screens. Shared primary navigation progressively gains a compact menu with expanded-state semantics, Escape dismissal and focus handling when the breakpoint changes.
- Divided assessment setup into semantic fieldsets. The question editor separates editable question/answer content from supporting evidence and expandable original notes. School explanations keep their purpose visible and move longer guidance into native expandable help.
- All 77 tests pass, including existing generation/draft/review/print/security checks and new menu interaction tests. Syntax checks and build pass. Shared CSS parses, and all four page templates have unique IDs and valid label targets. Local HTTP tests confirm both new shared assets are served.
- Browser visual verification was unavailable in this session. CSS parsing and DOM tests do not verify actual layout, motion, mobile appearance or printed pagination. No new live model or hosted-account test was performed for this presentation change.
- The cross-project selection preference and TermQuill rules are recorded in design/DESIGN.md and referenced by project guidance. This is durable project documentation, not a claim that an account-level memory was written.


### Reading comfort correction, 17 October 2026

User feedback showed the first design pass still required zoom. Increased default reading/input text to 18 px, working labels/help/navigation to 16 px and secondary-text contrast. Removed smaller mobile text overrides, stacked long question-setting selects, and switched the compact-menu breakpoint to 1100 px to accommodate larger navigation. Print text retains its previous 14 px sizing. Visual/device verification remains unavailable; the user's normal-zoom reading experience needs checking on the deployed update.


### Expressive editorial design, 17 October 2026

- Rebuilt the home hero around deep green, cream, coral, lavender and blue, with original inline SVG artwork, layered paper and gently moving annotations. Extended the palette to builder, drafts, guide, school and directory surfaces while retaining the readability correction.
- Added a clearly labelled hand-authored, three-stage workflow preview. It has tab semantics, arrow/Home/End keyboard control and no model request. Content remains readable if scripts fail.
- Added a visible pause/resume control and live device reduced-motion handling. Scroll entrances enhance visible content once; there is no scroll interception or hidden-until-JS content. Existing form and review behavior is preserved.
- All 80 tests pass, including example interaction/no-network tests and motion preference checks. Syntax and build checks pass. Shared CSS parses; template IDs and controlled-panel references are valid. Live visual checks are recorded separately after deployment.
- GitHub StyleKit/Auteur sources informed typography and motion decisions; implementation and artwork are original and no external runtime was installed. No measured performance score, real school adoption or live model-quality improvement is claimed.

- Production browser check at a 1348 px CSS viewport: inspected the hero and builder, verified 18 px notes text, no horizontal document overflow, hidden home-only example on /create, working preview tabs, and pause/resume state. Loaded the hand-authored assessment and confirmed student-copy questions render. Visual review caught an overlapping paper backing; corrected it so the colored layer sits behind the reading surface and the header has clearance. Actual phone/device behavior and frame-rate measurements remain unverified.


### Fuller typography across TermQuill, 17 October 2026

Replaced light serif/italic display text and platform-dependent screen fonts with self-hosted Inter variable. Body/input weight 500, labels/controls 600, headings 650 and hero 700 preserve hierarchy without reducing reading sizes. Included the original SIL Open Font License, verified the downloaded WOFF2 bytes against their Git blob hash, and added a hashed long-cache font asset with preload hints. No font-service CSP exception is needed. All 80 tests, syntax checks and build pass. The HTTP test also checks font MIME and WOFF2 magic bytes. Live font loading and layout are checked after deployment.

## October 19: focused evidence and consistent local review

- Live production audit before the fix: a fresh three-question Chemistry MCQ paper succeeded with `gemma-4-26b-a4b-it`, one provider call and no fallback. Answers B/C/D and six marks matched the supplied lesson. Student view omitted answers/evidence; teacher view included them. Local save, restore and reopening worked. This is one successful example, not an accuracy benchmark.
- Replaced arbitrary 500-character evidence blocks with sentence/line passages. Source IDs still resolve to one verbatim continuous slice; unusually long sentences retain a bounded word-boundary fallback. Existing saved evidence is left intact rather than silently changed.
- Saving a paper now preserves the current tab's teacher approval and refreshes the preview consistently. Persisted/imported/reopened copies still require fresh review. Failed storage writes preserve the current paper.
- `npm test`: 84 passing tests, including focused sentence selection, exact multi-sentence whitespace, long/line-based notes, save-after-approval in both print views, reopened review reset, edits and failed storage writes. `npm run check`, `npm run build` and `git diff --check` pass.
- School sign-in was already valid. The school is not verified, so new invitations remain restricted; no verification request, staff invitation or approval was fabricated. Native print/PDF pagination remains unverified.


## October 19: visual exam editor

- Added versioned visual blocks, one shared renderer and editor for personal and school papers, and a hand-authored Early Years example. Existing text papers remain valid.
- 97 Node test runner checks pass (including the helper module load); syntax/build/diff checks pass. Regressions cover exact object counts, derived matching permutations/keys, safe text rendering, raster-only embedded images, bounded table/block schemas, save/reopen, review invalidation, question reordering and byte-based school size limits.
- School UI simulation preserves visual blocks through editing and separates the teacher key from the student copy. The real PGlite Postgres test preserves an approved illustrated version while its author saves a new draft. This does not prove live independent reviewer accounts or email delivery.
- Uploads remain compressed embedded raster images, bounded by existing paper/import/device/school limits. No new paid service, external image tracker, image-generation service or storage bucket is provisioned.
- Browser and print rendering verification recorded after staging; native printer output and real-phone use remain separate checks.

- Preview browser check: the Early Years sample showed exactly three apple SVG objects, two tables, two tracing rows and no teacher answer blocks in the student copy. A real 480×320 PNG fixture compressed to 8,314 data-URL characters, loaded in the preview and survived save/library/reopen with review reset. The preview has no AI credentials, so live generation is checked only on production.
- A4 print CSS was rendered with WeasyPrint and inspected through Poppler images: three student pages and four teacher pages, with legible tables, line drawings, tracing and drawing space. Corrected screen backgrounds/min-height leaking into print. This is a paged-renderer check, not a claim that a physical printer or Chrome native PDF dialog was tested.

- Production AI verification succeeded for a three-task custom Early Years request: count apples, match shapes and trace A B C, with correct derived keys. The model initially aligned the matching column with its answers; generated matching blocks now receive a deterministic rotation if any correct pair is already aligned. Teacher-saved permutations remain unchanged.

- Signed-in production school save succeeded for a clearly labelled visual verification draft containing all sample blocks plus an embedded PNG. The school student copy loaded the picture and eight blocks with no evidence/answer sections; the marking guide displayed all six evidence sections and the matching key. The verification draft remains a draft; it was not submitted or self-approved.

- Matching pairs can use a validated built-in left-hand picture instead of text. The Early Years example uses circle, square and triangle pictures, with a separate right-column description and a derived teacher key.

## Exam documents and question bank (2026-10-19)

104 checks, syntax checks and build passed. Live preview verified a question changed from 1 to 5 marks, paper total recalculated from 6 to 10, a named section with instructions, three checked questions saved through the dialog, selection and assembly in chosen order, and a reopened unreviewed 3-question / 7-mark paper with exact counting/matching/tracing content. All content was synthetic, clearly labelled verification material in the preview browser.

Actual rendered application DOM was checked with WeasyPrint and Poppler: a 3-page student copy and 4-page teacher copy had consecutive Page X of Y footers, section headings and correct totals; all seven pages were visually inspected. This establishes the paged layout in that renderer, not Chrome's native print dialog or a physical printer. Browser page-margin implementation is based on Chrome's official print-margins documentation (Chrome 131+). Real-phone and physical-printer trials remain outstanding.

Question bank is browser-local (50 entries / 2 MB), not cloud sync or school approval. Import validation and failed-write preservation are tested. Logo validation/recovery is covered by shared raster image checks; real school logo and institutional acceptance still need classroom trial. Remaining milestones are in ROADMAP.md.

## Exam/Test and reference sources (2026-10-19)

109 checks passed, including legacy compatibility, Exam/Test defaults, reference selection without pasted notes, retrieval from saved papers, bank/history deduplication, source preservation, mismatched-class and size rejection, explicit corruption warnings, and rejection of generated exact copies. Syntax/build and live preview checks accompany the release. This mode generates fresh questions using original notes retained with the selected history, rather than treating earlier AI answers as factual evidence. Native timed student testing is outside this increment.

## School review and approved-source bank (2026-10-19)

115 checks passed, including UI approval gating by per-question review progress, inline feedback, read-only comparison, approved-copy links/stamps, and school-bank identifier-only requests. Real PGlite/Postgres checks reused only the approved revision while a later private draft existed, retained source/author credit, created a new unapproved draft, rejected unapproved source revisions and disallowed target departments, and confirmed failed reuse created no paper. Existing isolation, self-approval, revision concurrency and immutable-copy checks remain.

Review progress is tab-local, not cloud-synced or a server-recorded review attestation. Comparing rewritten/reordered questions uses an explicitly labelled positional fallback. Real independent teacher review, real-phone and physical-printer trials remain required; synthetic checks do not establish classroom acceptance. Live authenticated verification is reported separately after release.

## Discoverable school-logo upload (2026-10-19)

A visible School logo panel is available before generation and in every builder view, with Upload / Change / Remove actions and a thumbnail. Logo data is attached locally after AI generation and retained by draft validation, device saving and school versions. School paper authors have a direct logo shortcut to the new-version editor. Both school copies place the logo before the paper heading. No school-wide logo default is implied.

116 automated checks pass, including real upload-control binding with isolated bitmap/canvas fixtures, no image in provider requests, student/teacher rendering, save/restore, removal invalidating review, school shortcut focus and school-version retention. Syntax, build and whitespace checks pass. Live browser upload/layout results are recorded in the release response. Physical printing remains unverified.

## Educational cinematic landing (2026-10-19)

118 checks pass, including accessible line/word choreography, reduced-motion behaviour, keyboard operation of the illustrative workflow and all existing assessment/school checks. Syntax, build and whitespace checks pass. The home page uses two original local WebP assets (153,468 and 217,036 bytes). Non-home route builds replace their image sources to avoid fetching decorative artwork in the editor.

The Verdant reference clip was inspected; its original footage/assets are not distributed. Native CSS/WAAPI recreates reveal, stagger, floating and bounded scroll choreography; the artwork is not a frame-for-frame 3D video recreation. No scrolling is intercepted. Content remains visible when JavaScript, IntersectionObserver or animation APIs are absent. Pause and OS reduced-motion controls disable decorative effects.

The protected preview redirected to Vercel sign-in and automatic approval review blocked observation of that private origin. No private Vercel browser account was opened. Public production visual verification follows release; it will be recorded in the pull request and release response. Physical-device usability remains a separate validation boundary.

Public production verification at `82611f68cfd9fc913da993607f6b579e92db989d`: both artworks decoded, desktop document width remained within the viewport, transform matrices changed between observations for the hero and floating garden, scroll entries marked five elements entered, the walkthrough switched to its question panel, and Pause motion changed both artwork animation names to `none`. Screenshots captured hero, garden/callouts and walkthrough. The 390px iframe check was blocked by the app’s existing anti-framing policy; that protection was retained and the temporary test page removed. Actual mobile-device visual validation remains pending.

## Class Panel shell and school dashboard (2026-10-19)

121 checks pass, including the shared shell’s task-specific navigation, homepage exclusion, mobile drawer inert/focus/Escape/breakpoint behaviour, school-navigation relocation, genuine scoped paper counts, latest-version pipeline totals, escaped titles, recent-paper links and review queue. Existing school UI tests execute with the shell mounted, retaining authenticated/unauthenticated visibility, version editing, question visuals and print-review checks. Syntax, build and whitespace checks pass. No database migrations, permissions, paper records or auth changes are included. Live production visual and navigation checks accompany release; real-phone and physical-printer verification remain outside these DOM tests.


### Lesson library foundation — 2026-10-20

127 automated tests pass, including lesson metadata/identity, atomic writes and quota failures, stale edits, backup merge/idempotence, complete ordered collection sources, mixed-course/oversized-source rejection, safe reading previews, save/edit/remove/undo, term filtering and builder handoff without automatic generation. `npm run check`, `npm run build` and `git diff --check` pass. Live UI verification follows deployment. This release deliberately uses browser-local storage; cloud school sharing and assessment coverage allocation remain follow-up work.


### Account and workspace entry foundation — 2026-10-20

Working tools now require verified sign-in. Personal collections are account-scoped on the device, with ownership-confirmed legacy copying; this is not cloud personal storage or encrypted browser storage. Public sample access remains read-only. Existing database school membership and invitation checks are retained. Self-described occupation is never used for authority.

Automated checks cover page/auth failures, verified generation identity before provider use, same-origin requests, allowed profile metadata, forged-token rejection, account-specific storage and stale contexts, legacy-copy ownership/idempotence/conflict handling, named personal dashboards and membership-derived roles. Existing paper, school role/approval and UI regression suites remain required. Live production verification follows release; no real school membership, invitation or paper is modified as part of verification.

### Private cloud lessons and educator approval — 2026-10-20

Migrations 004 and 005 are applied to the existing TermQuill Supabase project. Postgres tests cover private ownership, stale writes, atomic imports, quotas, removal/restoration, explicit approval, verified-school invitations, self-approval denial and direct-access denial. A live transactional smoke test verified cloud save, isolation, stale-write rejection, removal, restoration and duplicate import; all synthetic fixtures were rolled back. No existing user lessons or school papers were migrated automatically.

The proposed existing-owner operator exception was rejected by automatic approval review because explicit authorisation is required for that production privilege grant. No operator record was created. The owner remains subject to the same educator gate until explicitly approved. This blocks live owner-account cloud writing, not the implemented request form, public demo, or automated/transactional checks.

Supabase advisories were inspected. RLS without policies is intentional default-deny because direct table grants are revoked; the narrowly exposed RPCs enforce identity and role checks. Their SECURITY DEFINER warnings are expected and were reviewed. Existing leaked-password protection remains disabled: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection . No auth-service configuration or billing tier was changed.

## TermQuill rename, 20 October 2026

Public labels, titles, navigation, account/privacy/help screens, printed-paper attribution and download filenames now use TermQuill. The favicon is an original T/quill SVG. Existing storage keys, backup kind identifiers, database schema, environment variable names and deployment URL remain unchanged for compatibility. All 145 tests, syntax checks, build and diff checks pass.

## Instructions / topic generation, 20 October 2026

All 154 tests, syntax checks, build and diff checks pass. Added coverage verifies every education stage, brief bounds, omission of inactive notes, mandatory rationales, rejection of fabricated source-evidence claims, preservation of note-mode source checks, bounded repair, draft/bank/import round trips, mixed-source assembly, review comparison, API validation, stage-specific examples, supported visual tools and student/teacher separation in both personal and school papers. Provider responses are mocked for this milestone; live model quality and subject suitability are not established by these checks. No production privilege grants, auth changes or database migration are included. The existing owner account remains educator-gated pending separately authorised access.

## Educator form submission feedback, 20 October 2026

The reported owner submission had no saved application record. A production database request/status smoke test using a temporary synthetic identity returned pending; all records were rolled back. The precise input that blocked the user's original browser submission was not observable. Replaced silent browser-only constraint handling with explicit validated submission feedback adjacent to the submit controls, focused correction/service errors, a Saving request busy state and clear saved/manual-review receipt. Failed submissions preserve entered details. Pending requests use Update educator request. RPC failures log only action and error code, never profile fields. No access/verification grant is included. Added a UI regression test covering validation, busy state, failed retry and success acknowledgement.

## 2026-10-21 — TermQuill infrastructure and reference-field feedback

Renamed GitHub repository to PHONIEXz/TermQuill, Vercel project to termquill and the existing Supabase project display name to TermQuill. Attached verified termquill.vercel.app; retained the old hostname for browser-local backup export. Updated Auth Site URL and exact confirmation destinations, preserving the old destination for existing confirmation links. Stable resource IDs, database schema, stored records and backup identifiers remain unchanged.

Educator validation identifies its failing field, focuses/highlights it, preserves input, and explains that the optional public reference accepts a complete HTTPS link or blank. API returns safe field metadata. Added regression coverage for invalid/blank links and field focus. All 156 tests, syntax checks and build passed before publication; no educator approval or operator privilege was granted.

## 2026-10-21 — Creator access centre and school staff requests

Built signed-in `/access`, reachable before educator approval, with creator-only educator/school/join queues, written reasons, stale-version checks and recent decision history. Added opt-in registered school discovery and department-scoped teacher requests. Existing public-map consent and personal lesson boundaries remain unchanged. New private tables have RLS with direct client grants revoked; a public invoker RPC calls a private definer function that verifies identity and operator membership for administrative actions. No service key in the browser or API.

The user explicitly authorised creator review access for paulexdavid15@gmail.com. Its existing verified Auth ID was checked and the operator record granted only to that account. Production read-only transaction confirmed operator=true and queue access. No applicant was approved, school verified, invitation sent or private lesson read during setup.

160 tests passed, including database allow/deny cases (ordinary users cannot review/grant roles/read private requests; self-review denied; wrong departments and stale decisions rejected; teacher-only membership after school verification), HTTP origin/account binding and DOM request/review flows. Syntax checks and build passed. Supabase security advisor reported no new exposed definer endpoint; pre-existing public directory/educator endpoints and password-protection advisories remain outside this change. RLS-without-policy notices are intentional deny-by-default tables accessed through checked RPCs. Live UI release verification follows deployment.

## 2026-10-21 — Education-stage assessment defaults

Fixed stage selection retaining SS1 and secondary question defaults. All seven stages now apply editable class, presentation, format, difficulty, marks and Exam/Test count/duration presets. Stock subject/title examples adapt; custom wording and source text remain. Stage changes clear incompatible past-question selections and announce the change without changing an existing preview. Saved papers restore their actual settings. Regression coverage exercises every stage, Kindergarten marking/style, stage-aware Exam/Test durations, source preservation and restore. Topic-generation mocks now honour the requested marks instead of returning secondary marks for every stage.

## 2026-10-21 — Examples, visual task preferences and teaching-image search

Saved seven original stage examples into the explicitly named creator account’s personal cloud library through the existing checked import RPC; verified seven active example records. Added explicit duplicate-safe import for other accounts and a stage-example source loader. Expanded original printable geometry from 12 to 56 objects, with local search in generation preferences and picture/matching editors. Added validated visual-task/object preferences to generation prompts and generated-result checks.

Added educator-gated Commons search and explicit raster preview/selection. Live provider search for apple fruit returned 10 supported results from 12 source records with pagination; a licensed preview downloaded successfully. Fixed new Wikimedia thumbnail tracking parameters by removing them before host/path validation. Search sends no lesson notes. Selected assets remain embedded compressed rasters with retained author/licence/source credits. Download redirects, unrecognised hosts/licences, unsupported formats and over-limit bytes fail closed. Counted images and picture matching retain automatic keys and student/teacher separation.

Regression checks cover all original icon geometry, saved examples and duplicate-safe import, generation task coverage, object controls and actual request payload, auth/origin protection, provider URL/licence/pagination and byte checks, deliberate preview-before-selection, image credits in draft/bank round trips, and matching answer-name concealment. Unit/browser-DOM checks and provider integration are distinct from live model-quality review. Authenticated visual browser checks remain blocked by the existing incomplete sign-in.

## 2026-10-21 — Guided assessment setup

Added a three-step progressive assessment form with retained source/settings state, labelled layout-only preview, selectable question-style cards, class-based recommended reset and optional branding/difficulty/style disclosures. Purple/lavender accents connect the green/cream workspace. Generated papers open the student copy first, with explicit editing, marking-guide and print actions; structural/teacher review gates remain. Device-save feedback follows actual paper dirty/saved state, and explains the separate lesson-cloud and school-sharing actions. Corrected outdated anonymous-draft copy.

Added step-navigation, validation disclosure/focus, early-submit interception, card/form agreement, safe preview text, busy-state, honest save-state and non-create-page isolation checks. Existing generation flows now exercise the enhancement alongside the real app module and verify student-first output, teacher-only rationale separation and review-gated printing. Full suite, syntax/build and deployment checks are recorded at release; DOM tests do not establish real teacher usability or live model accuracy.

## 2026-10-21 — Visual polish and content refinement

Applied a shared screen-only finishing layer across landing, account, studio, library, school and access templates. Normalised card/control geometry, spacing, type hierarchy, subtle elevation, focus and hover treatment while preserving the palette, artwork and print rules. Shortened landing/studio copy, clarified cloud lessons versus device papers, and moved supplementary workspace/library guidance into native disclosures. Removed duplicate visible mode/format selectors in the enhanced builder, retained their real form values and events, shortened step tabs and replaced punctuation-based layout illustrations with DOM shapes, response lines and a table. Draft actions appear only when a paper exists.

The current production studio and landing page were inspected in the cloud browser before changes. Reference content was available through web retrieval; its screenshot was restricted by browser credential protection. Full automated regression suite and final hosted visual checks follow this change. No model call, privilege grant or database migration is required.

Hosted visual follow-up: production landing/studio/library were reachable with the existing signed-in session. The library loaded seven cloud notes and retained its writing controls. Stage selection changed the illustrative paper to Kindergarten counting/matching/tracing/drawing/table layouts. This exposed an accidental shared-row visibility rule concealing the style cards; moved the cards outside that row and added a regression assertion. Collapsed the library example introduction to bring working tools higher on the page. No generation or cloud write was performed during UI inspection.

## 2026-10-21 — Compatible visual-task and format choices

Fixed visual preferences remaining checked when a teacher chose Multiple choice or A balanced mix, which triggered the format validation error at generation. Both the native selector and enhanced cards now clear incompatible picture tasks with a visible live announcement. Selecting a picture task switches to Written / visual responses; an existing custom format remains selected and its instructions are retained. Notes and current papers are unchanged. Backend validation remains strict. Regression covers both selection orders, Early Years defaults, pressed-card state, custom instruction preservation and actual generation request payloads.

## 2026-10-21 — Device setup and branding persistence

Added validated account-scoped device setup/branding records. Logo and school name/heading changes save locally with honest status; Save setup on this device explicitly includes current form settings and source text. Restore precedes explicit saved-paper/sample/lesson handoffs. Reuse branding on new generations, including when another paper is already open. Forget removes saved preferences without modifying an open paper or saved drafts. Original cloud lesson and paper-save flows remain separate. Whitelists exclude auth/access-code/model/review fields; corrupted records and storage failures preserve current entries and report failure.

Regression covers account isolation, invalid/corrupt data, denied image URLs, failed writes, saved-source/settings/logo restoration before generation, paper precedence, removed-logo precedence and forget behaviour. No migration or external profile change is involved.

## 2026-10-21 — Visible question-library saving

Added Save to question library to the paper toolbar and per-question actions on student and marking-guide previews, retaining the editor action. The toolbar opens a selection dialog with editable topic/term and an explicit content-review confirmation. Selected questions are validated before one account-scoped device write; duplicates are skipped, capacity/storage errors keep the dialog and existing library intact. Saving does not approve the paper. Controls remain off printed papers and are unavailable without a paper or during generation/picture work. Regression covers preview availability, review confirmation, saved selection contents, duplicates, empty/invalid selections and atomic failure.

### Logo and header designer, 2026-10-21

Added independent text/logo alignment, bounded physical logo size and spacing, school/term/title ordering with native drag and keyboard/touch move buttons, labelled header-only preview, undo and reset. Layout is validated server/client-side, saved with drafts and account-scoped device branding, carried to new papers, and rendered in shared school copies. DOM reading order follows the selected order. Review invalidation is unchanged.

Validation: full suite 182/182 passed; focused assessment, school and visual suites 58/58 passed; syntax checks, production build and whitespace checks passed. Includes malformed size/order rejection, draft round-trip, editor undo/reset, preview geometry, branding restore and full-paper precedence. DOM checks do not establish physical printer output or mobile drag behavior. No cloud school records or user question-library entries were created by these tests.

### Creation accuracy audit and first fixes, 2026-10-21

Recorded the five-chunk audit in `docs/assessment-readiness-audit.md`. Added selected-lesson allocations, exact source-body tracking, generated assignment/range/count checks, editable planning and changed-source preflight, requested/current coverage, device/draft persistence and bank reassembly compatibility. Fixed first-attempt topic visual preferences, MCQ marking label consistency, unnecessary insufficient-source repair and the MCQ-only illustrative preview.

Validation: 189 tests passed, including seven new coverage/UI cases; syntax checks, build and whitespace checks passed. Source fixtures verify structural attribution, not whether each answer is semantically supported. This release does not establish 99.9% reliability, complete curriculum coverage, physical PDF pagination or a classroom pilot.

Live verification found that relying on model-supplied lesson IDs could reject otherwise attributable output. Assignment now derives from validated source passage boundaries or a uniquely matching body quote; ambiguous quotes require explicit passage IDs. Deliberately wrong model IDs cannot change the source-derived assignment. Added a regression for exact and ambiguous quotes; full suite now 189 passed.

Hosted production check on the source-derived build: the existing SS1 Chemistry example loaded a six-question plan successfully. The second live generation passed coverage attribution and was rejected at rubric validation (Q2 marking-point total mismatch). No invalid paper was accepted, no cloud notes changed and no generated question was saved to the user library. This is a remaining creation-quality issue, not a successful end-to-end generation claim.

### Creation rubric repair, 21 October 2026

Story: a teacher selects saved lessons, sets an allocation, creates an assessment through `/api/generate`, and receives only a structurally valid paper and matching marking guide. Source/coverage and requested-visual failures previously threw before rubric auditing, so one repair could receive an incomplete fault list. Collect those faults together with the assessment audit before the existing single repair. Include numeric expected/found rubric totals, explicit per-question rubric arithmetic guidance in both source modes, and meaningful marking-error feedback after rejection. Keep wrong totals, strings and fractions rejected; never redistribute marks or invent criteria automatically. Offer only lesson-body passages to planned generation, with schema examples using a real offered passage ID.

Automated evidence: all 193 tests passed; syntax, build and whitespace checks passed. New tests cover combined source/visual/rubric faults, 1/2/5/10-mark rubrics, invalid mark representations, failed repair feedback and exclusion of metadata passages. Hosted verification remains separate; this does not establish factual correctness or completion of the entire creation chunk.

### Targeted rubric repair follow-up

The first live run with combined diagnostics still rejected Q2 (expected 2 marks, rubric total 3). For a first-attempt failure consisting only of rubric problems, the existing second call now requests patches for those question numbers alone. Apply only their marking fields and revalidate the whole original paper. If a model repeats a full paper, require unchanged wording/answer for the repaired questions and ignore unrelated changes. Reject missing, duplicate or unexpected repair identities and incorrect totals. Mixed faults retain the complete-paper repair path. Provider retry limits and factual-review requirements are unchanged.

All 195 tests passed, along with syntax/build/whitespace checks. Includes partial-patch success, full-paper-response compatibility, preservation of unrelated content, and rejection of answer changes or invalid repairs. Hosted success is not inferred from these tests.

### Live rubric inspection and table task budget

Production PR35 generated the six-question, twelve-mark SS1 Chemistry paper with requested drawing/table tasks and matching lesson allocation. Inspection found a semantic weakness despite valid arithmetic: three required symbols in two marks, with the rubric accepting copper OR oxygen for one required point. Do not count this as educator-quality success. Generated tables now allow at most one independent blank response per available whole mark across all table blocks in a question. An over-budget table enters full-question repair, never rubric-only patching. Both prompt modes require every required response to receive credit rather than an either/or substitution. Legacy teacher drafts remain readable; this policy applies to new generated output. The hand-authored Early Years example now supplies two worked entries and asks for one missing number for its one mark. This bounded check does not detect every semantic scoring error in free-text or other visual tasks.

All 197 tests pass, plus syntax/build/whitespace checks. Regressions cover notes/topic generation, whitespace blanks, combined table blocks, preserved legacy drafts, and full-question repair selection. Final hosted verification follows deployment; automated tests do not establish classroom correctness.

### Question-quality review, 22 October 2026

Story: a signed-in teacher creates a paper, sees bounded review signals beside its preview, opens the exact flagged question, edits it, and sees updated signals while student/teacher print copies retain only document content. Add local advisory checks for closely overlapping wording with identical answers, three or more uses of one source passage, new numeric literals in note-based answers, and response/matching tasks exceeding whole-mark budgets. These checks do not decide truth, causal validity, curriculum coverage or general semantic equivalence. Valid derived answers and rich-passage reuse can be flagged; deliberately false nonnumeric answers can remain unflagged. Topic rationales explicitly require independent checking. No new provider requests, data uploads or stored quality scores.

Nine hand-authored evaluation fixtures cover all seven education stages, including correct derived values, deliberately wrong answers, repeated tasks and valid reuse. These are engineering fixtures, not independent educator review or live-model accuracy measurements. Both generation prompts now explicitly ask for worked/unit checks, exactly one defensible MCQ option and distinct tasks. Add local development routes for imported builder helpers and new quality modules.

Automated evidence: all 210 tests passed; syntax/build/whitespace checks passed. UI regression confirms advisory status, exact-question focus, edit refresh, approval reset and separation from student paper content. HTTP smoke check returned 200 JavaScript for all six builder/quality helper routes. Production baseline was unexpectedly serving commit 6144ffd while main was 77fa690; the current release must restore the latest main and verify canonical alias and UI after deployment. Hosted outcome remains separate from this test evidence.

Hosted outcome on commit 0888767: canonical production alias restored the latest code, including PR36's table budget. The signed-in Early Years example displayed a Q2 matching-response scoring prompt; Review Q2 focused and opened question index 1. Changing its total from one to three marks cleared the prompt and kept approval false. No example was saved to a device or school. One live Primary 4 generation then returned three MCQs with six total marks. Independently inspected 7+5=12, 20/4=5 pencils and perimeter 2*(4+3)=14 cm; all choices had one correct option, with matching marking labels and supporting quotes. Runtime event generation_completed used gemma-4-26b-a4b-it, providerCalls=1, fallbackUsed=false. This is one controlled arithmetic case, not a subject-wide accuracy benchmark. Follow-up corrects singular wording in the review summary; 210 tests and syntax/build checks still pass.

### Objective blueprint and controlled batches, 22 October 2026

Story: a teacher selects term lessons or supplies notes, names learning objectives with exact supporting source ranges and question counts, creates a paper, and reviews planned versus actual coverage before editing/printing or sending to school. Source-backed objectives apply to notes, with each range inside one selected lesson when a lesson plan exists. API validation checks identifiers, bounded source ranges, complete passages, total allocations and per-lesson totals before a provider call. The model follows fixed objective slots; the application assigns objective IDs and rejects evidence outside each slot's source range. This checks evidence attribution and counts, not semantic objective alignment or curriculum completeness. Overlapping anchors are allowed and remain explicitly teacher-defined. Source examples and offered passages respect the selected ranges. Edited/reordered papers retain an honest coverage report; drafts/device setup retain the plan, while bank reassembly/reference generation discard obsolete assignments. School copies display source/allocation reports without printing them.

An optional two-batch mode covers 9–20 questions with two sequential bounded requests; the original twenty-question and 18,000-character ceilings remain. Partition lesson/objective quotas and required visuals, preserve global mixed-format order, include earlier tasks in the second prompt, and revalidate the whole combined paper. Exact duplicate wording or invalid combined allocations fail rather than accepting a partial final paper. Each request retains bounded repair/transient retry behavior; this can use more calls and time. If the second batch fails and the server can respond, return only the validated first batch through a private Symbol-keyed recovery path. UI preserves the previous paper and offers explicit open/download actions; recovered papers are labelled incomplete and unreviewed. This is not autosave or crash recovery: browser cancellation, connection loss, hard function termination and refresh can still lose in-memory work. No automatic cloud/device draft writes or permission changes.

Added seven source-backed, hand-authored subject/stage reference cases and a controlled evaluation CLI: `npm run evaluate:creation` runs reference controls with zero provider calls; `npm run evaluate:creation -- --live --case primary` explicitly runs one hosted-model evaluation using local configured credentials. Reference pattern matches do not certify factual accuracy. Independently inspect answers, all alternatives, working, partial credit, age suitability and semantic alignment. All seven reference controls match their 21 expected answers and objective allocations; this is engineering control evidence, not live-model accuracy data.

Automated evidence: 235 tests pass; syntax/build/whitespace checks pass; objective browser-module HTTP routes return 200. Includes stale-source refusal, source-slot enforcement, forged-ID resistance, overlapping anchors, reordering, persistence, bank/reference compatibility, bounded 9/12/20-question batches, topic rationales, quota/cancel/duplicate recovery, recovery-data redaction, and explicit incomplete-draft opening. Hosted verification follows deployment and must be reported separately.

Hosted blueprint/batch outcome on commit 65af573: a signed-in Primary 4 paper completed with nine questions, eighteen marks, three named objectives allocated three questions each, five MCQs followed by four written questions, and matching source-range coverage. Independently checked answers: 12, 17, 7, 5 pencils, 6 books, 4 sweets, 20 cm, 12 cm and 14 cm. All five MCQs had one defensible option and marking totals matched. Runtime recorded gemma-4-26b-a4b-it, providerCalls=2, batches=2, fallbackUsed=false. One counted-item rubric separately credited the noun “sweets”; add stronger generation guidance and an advisory counted-unit review signal rather than claiming all rubrics were pedagogically sound.

The first Early Years run displayed three apples correctly and answered square corners as four, but inserted an unrequested matching task into “Which shape is round?” with a quote covering only the circle fact. This passed the older structural checks and failed manual task review. New generation now refuses unselected response-task types when the teacher supplies a task selection, requires matching prompts to request matching, and reminds the model that evidence must support all pairs. Advisory review flags legacy matching/prompt disagreement or missing matching terms without treating lexical checks as factual certification. Legacy teacher layouts remain readable/editable. Objective-report punctuation is also refined. All 239 tests pass, including the observed failure modes, syntax/build/whitespace checks. Hosted retesting follows deployment.

Build note: default npm ci stalled retrieving locked artifacts; npm ci --offline reported an uncached zod tarball. The same-source preview/production built successfully using the previous installed dependency cache with deployment-only npm install --offline. No dependency versions, lockfile, secrets or persistent project settings changed. Record this environment limitation separately from application test results.

## Editing chunk and visual authoring foundation, 22 October

Adds bounded in-tab undo/redo for paper/spec edits, marking criterion addition/removal and budget feedback, derived MCQ key consistency, paper-title editing and objective reassignment. Existing insertion/removal/reordering continues to update the actual paper. New subject-neutral structured graph and labelled diagram blocks are teacher-authored in the editor, available at every education stage. Data/geometry validation, safe SVG DOM rendering, accessible labels and shared student/teacher/print rendering apply. Blank grids hide stored points; line graphs connect in entered order rather than calculating best fit. No automatic model generation of the new types or complete scientific-symbol collection is claimed. Classroom correctness, full specialist diagram families and actual exported-PDF verification remain open. Regression and hosted interaction verification recorded with the release outcome.

## Larger-paper timeout correction, 22 October

Owner references 4421b3f0-68f1-4f6d-89d4-4e2b1c20c1f3 and 7c5790af-adc3-4fd1-8fe9-a45c21bd7a02 respectively resolve to provider HTTP 500 and the application deadline on production. The old 105-second budget covered both sequential batches, provider retries and output repairs. This was inadequate headroom; the old failure event did not identify the completed stage. It does not establish which batch failed or prove provider health.

Generation now has a 270-second application deadline, 285-second browser allowance and 300-second function limit. Each provider call gets a 65-second cancellation budget so a stalled call can enter the existing bounded retry/fallback path. No extra retry counts, bypassed validation or quota retries are introduced. Cancellation remains immediate; checked first-batch recovery still returns when available before the platform cutoff. Failure events record only elapsed time, question count, generation mode, call count, completed batches and model identifier in addition to the existing safe diagnostics. Source notes, prompts, answers, keys and raw provider errors are excluded. This improves recovery/headroom, not provider uptime or durable recovery after browser/network loss.

## Rubric repair protocol correction, 22 October

Reference a9d0a13d-1cb9-46ed-be7c-7ac7fe13c808 reached a checked first batch, then failed in the second batch after three total provider calls because the rubric-repair reply was incomplete JSON. Raw provider replies were not logged, so this does not establish why that reply was malformed. Inspection found rubric-only prompts incorrectly appended the normal batch context, which asks for a batch of assessment questions. Rubric repairs now omit that conflicting context, include a concrete JSON envelope with the exact requested question identities, and retain the original rejected assessment for merging. One additional format-recovery attempt is allowed only when that rubric-only reply is malformed JSON or explicitly truncated. Other validation failures retain the original bounded repair policy. No marks are invented, rescaled or accepted with incorrect totals; every recovered result passes the original full checks. Reported question numbers now include the batch offset. Tests cover recovery without contradictory instructions, original content preservation, bounded repeated failure, correct global numbering and retained first-batch recovery.

## Objective source repair follow-up, 22 October

Reference 12e24678-567b-460d-8443-30d1402fca2f requested 20 questions in single-request mode and failed after two provider calls with several source ranges outside their assigned objectives. Earlier 15-question batched owner attempts also failed this boundary. This is distinct from quota or rubric-format failure. Raw notes/output are not logged, so we cannot establish whether the teacher's selected passages were adequate or which source facts each rejected question actually used.

Prompts now enumerate every application-owned question slot and its permitted passage IDs. For source-range-only failures, repair requests isolate affected complete questions with their objective, required kind/marks and only the selected source passages. They may replace question/answer/rubric together when the original task is on the wrong topic; merely attaching an unrelated quote is prohibited. Exact patch identities are required, unaffected questions/instructions are preserved, and the complete merged paper still passes all source, objective, count, visual and marking checks. There is one repair attempt; no automatic reassignment or acceptance of out-of-range evidence. Failure messages identify affected global question numbers and objective-source selections instead of generic advice alone. This checks source boundaries, not semantic or curriculum correctness.
