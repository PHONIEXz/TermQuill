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

- Supabase Free resource `lessonpress-schools` provisioned and connected to LessonPress Production and Preview. Configuration names verified without exposing secret values.
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


### Design toolkit applied to LessonPress, 17 October 2026

- Added a shared visual layer with readable working text, larger controls, consistent focus styles, quieter surfaces and an explicit reduced-motion fallback. No external font or animation dependency was added.
- Grouped school navigation into work, team and settings. It becomes a rail on wider screens and grouped links above content on narrow screens. Shared primary navigation progressively gains a compact menu with expanded-state semantics, Escape dismissal and focus handling when the breakpoint changes.
- Divided assessment setup into semantic fieldsets. The question editor separates editable question/answer content from supporting evidence and expandable original notes. School explanations keep their purpose visible and move longer guidance into native expandable help.
- All 77 tests pass, including existing generation/draft/review/print/security checks and new menu interaction tests. Syntax checks and build pass. Shared CSS parses, and all four page templates have unique IDs and valid label targets. Local HTTP tests confirm both new shared assets are served.
- Browser visual verification was unavailable in this session. CSS parsing and DOM tests do not verify actual layout, motion, mobile appearance or printed pagination. No new live model or hosted-account test was performed for this presentation change.
- The cross-project selection preference and LessonPress rules are recorded in design/DESIGN.md and referenced by project guidance. This is durable project documentation, not a claim that an account-level memory was written.


### Reading comfort correction, 17 October 2026

User feedback showed the first design pass still required zoom. Increased default reading/input text to 18 px, working labels/help/navigation to 16 px and secondary-text contrast. Removed smaller mobile text overrides, stacked long question-setting selects, and switched the compact-menu breakpoint to 1100 px to accommodate larger navigation. Print text retains its previous 14 px sizing. Visual/device verification remains unavailable; the user's normal-zoom reading experience needs checking on the deployed update.


### Expressive editorial design, 17 October 2026

- Rebuilt the home hero around deep green, cream, coral, lavender and blue, with original inline SVG artwork, layered paper and gently moving annotations. Extended the palette to builder, drafts, guide, school and directory surfaces while retaining the readability correction.
- Added a clearly labelled hand-authored, three-stage workflow preview. It has tab semantics, arrow/Home/End keyboard control and no model request. Content remains readable if scripts fail.
- Added a visible pause/resume control and live device reduced-motion handling. Scroll entrances enhance visible content once; there is no scroll interception or hidden-until-JS content. Existing form and review behavior is preserved.
- All 80 tests pass, including example interaction/no-network tests and motion preference checks. Syntax and build checks pass. Shared CSS parses; template IDs and controlled-panel references are valid. Live visual checks are recorded separately after deployment.
- GitHub StyleKit/Auteur sources informed typography and motion decisions; implementation and artwork are original and no external runtime was installed. No measured performance score, real school adoption or live model-quality improvement is claimed.

- Production browser check at a 1348 px CSS viewport: inspected the hero and builder, verified 18 px notes text, no horizontal document overflow, hidden home-only example on /create, working preview tabs, and pause/resume state. Loaded the hand-authored assessment and confirmed student-copy questions render. Visual review caught an overlapping paper backing; corrected it so the colored layer sits behind the reading surface and the header has clearance. Actual phone/device behavior and frame-rate measurements remain unverified.


### Fuller typography across LessonPress, 17 October 2026

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
