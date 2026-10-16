# Verification, October 16, 2026

Story: teacher pastes notes and settings, server requests a Gemma assessment, validates the output, and the browser provides editing, teacher review, and separate printable copies.

| Boundary | Evidence | Limit |
| --- | --- | --- |
| Input and output validation | Automated tests for bad input, duplicates, missing answers, quotes, option validity and marks | Checks do not establish semantic correctness |
| HTTP boundary | Real local HTTP requests cover valid output, invalid JSON, oversized input, methods, access codes, rate limits, redaction and static file allowlist | Generation function is simulated |
| Model orchestration | Tests show one repair attempt, original notes retained and honest failure after invalid responses | No live key configured; actual quality and availability unverified |
| UI behavior | Actual client script runs in JSDOM: sample rendering, student/teacher separation, edits invalidating approval, save/restore, safe text rendering, generation success/failure and cancellation | DOM simulation, not a graphical browser |
| Syntax and build | `npm run check` and `npm run build` | Vercel production deployment not performed |
| Desktop/mobile layout and PDF | Responsive CSS and print styles implemented | Chromium download failed in this environment, so visual layout, native print pagination and mobile interaction still need a real browser check |

The sample is hand-authored. Tests do not replace teacher trials or establish revenue. No paying users, conversion rate, accuracy rate or teacher time-saving figure has been measured.

Next: connect a server-side model key; test at least three subjects and two age levels; inspect generated answers against notes; test desktop and mobile browsers and exported PDFs; ask two teachers to prepare a real assessment and record feedback honestly.
