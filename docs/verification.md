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
