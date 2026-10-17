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
