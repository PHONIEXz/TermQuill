# Assessment creation and editing readiness audit

Date: 21 October 2026. Scope: the five agreed assessment chunks. This is a code and regression-test audit, supplemented by official product documentation. It is not an assertion that every device, printer, model response, or factual answer has been independently verified. Findings distinguish confirmed defects, deliberate product limits, and verification gaps. No percentage here establishes 99.9% reliability.

## Where the chunks live

| Chunk | Website location | When it is used |
| --- | --- | --- |
| Creation | Lesson library → Use selected lessons; Assessment studio, steps 1–3 | Before a teacher clicks Create my assessment, and while its output is validated |
| Editing | Assessment studio → Edit questions & review; school paper editor | After generation, during question, answer, rubric, visual or section changes |
| Recovery | Save on this device, My drafts, editable JSON backup; future recovery centre | During unfinished work, refresh/crash, storage failure, device changes or competing tab edits |
| Finished papers | Student paper / Marking guide → Print / save PDF | After review and before classroom distribution |
| Real-use verification | The complete journey across these pages | At the release gate, using representative stages, devices, roles and printed papers |

## 1. Creation accuracy

| Area / when used | Evidence and current gap | Required action / completion check |
| --- | --- | --- |
| Saved lessons, before generating an exam | `prepareLessonCollection` originally concatenated all lessons with no quotas. A model could ignore a lesson. | Add visible balanced/custom allocations, preserve exact body boundaries, derive lesson assignment from matching passage ranges or a unique exact body quote, reject omitted or overrepresented lessons. A count is sampling, not proof of full curriculum coverage. |
| Topic mode with selected visual tasks | `buildTopicPrompt` originally omitted the visual-preference text, although the output validator required those tasks. | Include tasks and preferred objects on the first attempt; test all five task types and early-years defaults. |
| Insufficient lesson material or unseen topic context | The model can return an explicit insufficient-source response. Previously it went through the general repair path. | Stop with a useful source-specific error and no unnecessary second generation call. Preserve the previous paper. |
| Live written-answer rubric generation | A hosted six-question Chemistry example reached source-allocation validation but failed because Q2 marking points did not sum to its assigned marks. The paper was withheld. | Improve rubric output reliability and targeted repair using a controlled live evaluation set. Keep the sum check; do not silently invent or discard marking criteria to force success. |
| MCQ answer and marking guide | Selected option and answer are structurally checked, but model-authored marking text can contradict them. | Construct generated MCQ marking labels from the chosen answer. Independently review whether the chosen answer is actually correct. |
| Layout-only preview before generation | MCQ-only choice previously still showed an illustrative written-response row. | Match the illustrative format to the actual choice, retaining the non-generated label. |
| Stage, class and source suitability | Stage presets are editable and preserve custom source text. They cannot establish that retained material suits the new stage. | Stage-by-stage educator checks; keep the retained-source warning. Do not reject custom class names using a brittle school-name list. |
| Thinking demand and custom instructions | Supported kinds are MCQ/short. Difficulty and custom preferences are prompts, not independently validated cognitive classifications. | Add a teacher-visible assessment blueprint and evaluation cases for recall, understanding, application and analysis. Show unsupported-format limits before generation. |
| Source meaning and answer correctness | Exact quotes, marks, kinds, duplicates and counting/matching geometry are checked. Quote presence does not prove that it supports the answer. | Curated educator-reviewed evaluation set, unsupported-answer and ambiguity checks, worked calculation/unit checks where feasible. Never represent a second model opinion as certification. |
| Coverage of ideas inside a lesson | Per-lesson allocations still permit several questions about one sentence. Exact wording checks do not detect paraphrased duplicates. | Topic/objective-level allocation, semantic repetition review and a readable evidence-to-answer review. Do not advertise complete coverage based on lesson counts. |
| Large exams and long terms | Current generation cap: 20 questions, 18,000 source characters. Oversized collections are rejected without dropping notes. | Design bounded batched generation, cross-batch duplication checks, coverage accounting and recovery before raising caps. |
| Notes and source ingestion | Text notes and saved lessons work; the builder is not a general PDF/DOCX/OCR import pipeline. | A future import preview must check extraction, preserve tables/figures and request confirmation before use. |
| Before provider calls | Some validation is native form validation, some is request validation; valid structure is not source sufficiency. | Test impossible allocations, empty/oversized sources, incompatible tasks and changed lesson boundaries before consuming generation calls. |

## 2. Editing

| Area / when used | Evidence and current gap | Required action / completion check |
| --- | --- | --- |
| Changing question type | Switching to MCQ replaces existing options/answer; switching back can retain an MCQ-style marking statement. | Preserve or explicitly confirm destructive conversion, build correct written-answer placeholders and explain what changed. |
| Editing a correct MCQ option | State updates its answer/marking, but already-rendered marking text can remain stale until rerender. | Synchronise visible marking fields immediately; test the student and guide outputs together. |
| Adding/removing rubric points | Marking fields edit existing points; there is no complete add/remove/rebalance rubric workflow. | Add granular rubric controls, explicit total and partial-credit checks. |
| Mistakes while editing | Reorder/duplicate/delete and header undo exist; there is no whole-paper undo/redo history. | Bounded reversible history for content, marks, sections, visuals and deletion; preserve focus and selection. |
| Question arrangement and sections | Section starts live on questions; moving a question moves its section marker too. | Preview or explicitly manage section boundaries so reordering cannot create surprising organisation. |
| Visual task editing | Counting/matching keys are derived; table answer cells, captions, tracing and open-ended drawing still need human checking. | Accessibility labels, matching distinguishability and answer-leak checks; classroom/device tests for visual legibility. |
| Mathematical/scientific notation | Core prompts are plain text; there is no dedicated equation/table-of-units authoring system. | Safe notation preview/export support, including chemical formula subscripts, superscripts, fractions and units. |
| New planned papers after manual edits | Requested lesson allocations may legitimately differ after questions are added, removed or reassigned. | Show requested vs current coverage honestly; do not silently rewrite the original plan or block all teacher editing. |

## 3. Recovery and saving

| Area / when used | Evidence and current gap | Required action / completion check |
| --- | --- | --- |
| Network/provider failure | Existing generation keeps the previous paper and has cancel/timeout handling. | Verify transient failure, quota, timeout, cancellation and malformed response together on realistic workflows. |
| Refresh/crash before Save | `beforeunload` warns on dirty work; generated paper content has no general automatic recovery journal. | Account-scoped recovery snapshots with opt-out, visible save state and explicit restore/discard. |
| Half-finished editing | `saveDraft` requires a valid complete draft; temporarily blank answers or invalid marks can prevent saving work. | Keep recovery snapshots separate from publishable/printable validated drafts. |
| Browser/device loss | Personal papers/questions/layouts remain browser-local. Lessons use private cloud storage. | Separate, authorised cloud assessment persistence and backup restoration; keep local/cloud status explicit. |
| Multiple tabs | Personal draft saves do not have a full revision/conflict mechanism comparable to cloud lessons. | Detect stale saves; offer conflict copies instead of silent overwriting. |
| Invalid imports, storage full and deletion | Validation and JSON backup exist; some failures preserve the current paper, but there is no unified recovery centre or draft trash. | Test corrupted/oversized backups, storage denial/full, older schemas and recoverable deletion. |

## 4. Finished papers

| Area / when used | Evidence and current gap | Required action / completion check |
| --- | --- | --- |
| Student vs marking-guide export | Separate views and print review gates exist. | Verify no answers/rationales/internal tools appear on student PDFs, including tables, matching labels and image descriptions. |
| Pagination | A4 print rules, page breaks and keep-together rules exist; there is no measured full-page pagination preview. | Real browser PDF fixtures with long questions, large tables/images and section starts. Handle a question taller than a page. |
| Page numbers and headers | CSS page counters depend on browser support. Browser print headers can add extra content. | Check supported browsers, give accurate print instructions, and test page totals and repeated headings. |
| Writing/drawing spaces | Existing bounded answer spaces do not independently know how much space a particular answer needs. | Teacher-adjustable spacing plus realistic handwritten-answer checks by stage. |
| Branding and paper layout | Header controls save and share geometry; arbitrary whole-page positioning and named layout-template management are not implemented. | Verify logo clarity and extreme allowed settings in PDFs; only expand layout features when print stability is demonstrated. |
| Accessible alternatives | DOM labels exist, but no comprehensive screen-reader or accessible-PDF certification is established. | Keyboard/screen-reader testing and a text-equivalent policy for visual tasks. |

## 5. Real-use verification

| Area / when used | Current evidence boundary | Required action / completion check |
| --- | --- | --- |
| Across all education stages | Stage fixtures and DOM tests exist; that is not broad educator validation. | One recorded end-to-end scenario per stage, with representative visuals and cognitive demand. |
| Model quality | Most regression tests simulate provider responses. | A controlled live evaluation set covering unsupported facts, ambiguous MCQs, calculations, duplicate concepts and weak source material. Record model/version and results. |
| Phones, keyboards and assistive tools | Automated DOM checks do not prove real device usability. | Real narrow-screen, touch, keyboard and screen-reader sessions, including long forms and error recovery. |
| Printing | DOM tests do not inspect printer/PDF page composition. | Export and inspect a matrix of ordinary and stress-case PDFs on supported browsers. |
| School workflow | Role and version tests exist; broad simultaneous real-user use is not established by them. | Teacher-to-reviewer pilot, changes requested, revised copy, approval, printing, reuse and recovery. |
| Reliability target | No measured dataset currently supports a 99.9% creation-success claim. | Define denominators and severity: request acceptance, valid generation, content correctness, recovery and print success. Track them separately. |

## Reference lessons

- Moodle official Building Quiz documentation: category-based random-question counts, question reuse, sections, grade allocation and whole-quiz preview. Useful pattern: make coverage selection and counts explicit. https://docs.moodle.org/501/en/Building_Quiz
- Formative official Use AI to Generate Questions documentation: teacher review, editing, rejecting and selecting AI suggestions before adding them. Useful pattern: generated content is a proposal with teacher control. https://help.formative.com/en/articles/7054157-use-ai-to-generate-questions

These are documentation reviews, not a claim to have tested either platform's private production workspace or copied its implementation.

## Delivery sequence

Finish the creation controls and source-allocation checks first. Then build the semantic-quality evaluation set and objective-level blueprint; decide whether batching is needed from actual target papers. Proceed to editing, recovery, print verification and the classroom/school pilot in that order. Keep failures and remaining gaps visible instead of increasing a completion percentage after each feature.

## First creation batch implemented

The selected-lesson allocation/source-boundary checks, topic visual preferences, explicit insufficient-source handling, generated MCQ marking-label consistency and MCQ-only illustrative preview are implemented in this batch. Tests: 189 passed. The remaining semantic-quality, objective-level coverage, large-exam, editing, recovery, PDF and real-user items above remain open.

## Live verification outcome

The coverage planner was verified in the signed-in hosted flow using the existing hand-authored SS1 Chemistry example. The first hosted run failed the model-label/source gate. The source-derived fix was deployed, then a second run reached the rubric checks and failed because marking points did not sum to the question marks. Neither invalid paper was accepted or saved. The full suite passes 189 tests, but these live results leave creation robustness open. The next creation priority is rubric consistency and answer-quality evaluation, followed by objective-level coverage and batching. No classroom correctness or 99.9% reliability claim is justified by these results.

### Creation accuracy follow-up, 21 October

Combined validation diagnostics and bounded rubric-only repair are deployed (PR34/35). The hosted six-question Chemistry run then passed structural/source/allocation gates, but manual marking-guide review caught three required table responses for two marks and an unfair either/or criterion. The next fix rejects over-budget generated tables and repairs the complete question/answer/rubric together, with matching guidance in both source modes; it also corrects the Early Years example. Automated evidence: 197 passing tests, syntax and build checks. This is a specific task-budget policy, not a general semantic-quality guarantee. Live inspection remains necessary, and answer-quality, objective-level coverage and large-exam items remain open.

### Local review signals and evaluation baseline, 22 October

A screen-only Question quality review panel now identifies possible lexical repeats with identical expected answers, overused evidence passages, answer numeric literals absent from a source quote, and unclear whole-mark response budgets. Flags link directly to their question editor and update with edits. All are advisory: they neither certify answers nor automatically reject correct calculations or rich-passage reuse. Topic-mode rationales remain explicitly unverified. Nine hand-authored cases across seven education stages record both useful signals and deliberate factual errors these checks miss; this is not an educator-reviewed benchmark. All 210 regression tests pass, plus syntax/build/HTTP helper checks. Controlled live subject review, semantic equivalence beyond wording, objective-level blueprinting and bounded larger-paper generation remain open. Keep the creation chunk open.

Hosted follow-up: the review shortcut and edit refresh passed on the Early Years example. A controlled Primary 4 three-MCQ arithmetic generation passed live with correct independently checked answers, options, quotes and six total marks. The provider completed in one call. No notes, generated papers or bank entries were saved. This narrow result does not close the subject-quality and curriculum-coverage gaps above.

### Objective blueprint and batch implementation, 22 October

Implemented teacher-defined objective labels, source ranges, exact question allocations and a planned/actual report. Planned questions follow application-owned slots and their evidence must lie in the selected range. Objective allocations also match lesson allocations. Changed source/class/subject blocks generation until corrected or the plan is explicitly removed. This does not establish semantic alignment or full syllabus coverage. One objective range stays inside one selected lesson; overlapping ranges are supported but do not prove distinct cognitive demand.

Optional two-batch generation now supports the existing 9–20-question range, partitions quotas/visual tasks, includes earlier questions in the second prompt and validates the combined paper. Exact cross-batch duplicates are rejected. A validated first batch can be opened/downloaded after a second-batch failure when the server returns it; browser/network/hard-timeout crash recovery remains in the later recovery chunk. Limits above 20 questions and 18,000 source characters are unchanged. Seven source-backed stage/subject evaluation controls supplement the earlier quality-signal fixtures, with an explicit opt-in live CLI. 235 tests and required checks pass. Broad educator assessment of factual correctness, ambiguity, partial credit and class suitability is still required before claiming creation reliability.
