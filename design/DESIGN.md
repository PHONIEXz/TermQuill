# TermQuill design contract

## Standing design preference

Phoniex wants the design approach chosen to suit each project's users and purpose. Use Apple and Geist for restrained product polish, Fluent and Carbon for institutional workflows, Material or Apple conventions for the target mobile platform, editorial layouts for learning, and selective cinematic treatment for portfolios and launches. StyleKit is a source of candidate visual directions; Mobbin is a reference library. External skills and libraries are evaluated when needed, not installed automatically. Keep one coherent identity within each product.

The broader Phoenix UI Playbook is the reusable reference. This contract records its application to TermQuill so future changes do not depend on chat history or a memory feature.

## Direction

Expressive educational studio with practical institutional structure. Forest green anchors cream, peach/coral, lavender, mint and soft blue surfaces. Strong display typography and layered paper artwork make marketing pages distinctive; working pages use solid reading surfaces and the same palette. Preserve 18 px reading/input text and readable controls. Inter variable is self-hosted with its SIL Open Font License, using medium-weight body text and fuller semibold headings. No third-party font request, 3D runtime or animation library.

References informing the design:
- Apple hierarchy and materials: https://developer.apple.com/design/human-interface-guidelines/
- Fluent task navigation: https://fluent2.microsoft.design/components/web/react/core/nav/usage/
- Carbon table structure: https://www.carbondesignsystem.com/building-blocks/core/components/data-table/specifications
- Clear form patterns: https://design-system.service.gov.uk/patterns/question-pages/

Additional GitHub references studied for this increment:
- StyleKit editorial typography and spacing: https://github.com/AnxForever/stylekit/blob/main/lib/styles/editorial.ts (reference blob bc6ba3406330b02fdcde602f1493357074ab886b).
- Auteur purposeful motion, easing and reduced-motion patterns: https://github.com/agiwhitelist/auteur/blob/main/reference/motion.md (reference blob bed1b763cc2682d42a520df8b8ba752d8484c924).

The multicolor direction is an original adaptation, not StyleKit's monochrome editorial theme. No reference code, assets, skill or package is installed or redistributed. These are design references, not dependencies or a claim to reproduce native platform behavior.

## Shared rules

- `public/workspace.css` is the final shared presentation layer after existing page styles. Keep its selectors scoped where behavior differs by page. Existing print protections take precedence over screen presentation.
- Use the named color tokens and a small spacing/radius scale. Default reading text and inputs are 18 px; working labels, navigation and help are at least 16 px. Small decorative section labels may use 14 px. Mobile breakpoints must not shrink working text. Darker secondary text supports reading at normal zoom. Controls aim for at least 44 px height, with visible keyboard focus.
- Navigation links work without JavaScript. `public/navigation.js` progressively adds the compact menu, its expanded state, Escape dismissal and focus handling on breakpoint changes.
- A school has grouped navigation: Your work, Your team, School settings. On large screens it is a rail; on smaller screens it becomes grouped navigation above content.
- The builder has semantic fieldsets for paper details, lesson material and question settings. Manual format and thinking-level fields retain their existing behavior.
- Review puts editable question/answer content beside a distinct supporting-evidence area where space permits. At smaller widths it stacks in source order. Evidence is always present; original notes are expandable.
- School guidance shows its purpose immediately and keeps longer help in native details controls. Required next actions and permission restrictions remain available near their controls.
- Busy states describe actual work, avoid invented progress percentages and respect reduced motion. Error messages, saved drafts, role checks and generation limits keep their current behavior.
- Keep personal drafts distinct from cloud school records. Never add sample schools, reviews or success metrics to make a dashboard look populated.

## Verification boundary

DOM tests and simulated API responses verify interaction logic. They do not establish visual fidelity, actual device usability, live model quality or hosted database availability. Record deployment and verification results in `docs/verification.md`.

## Expressive layer and motion

The hero uses original inline SVG orbit artwork, layered HTML paper and peach/blue annotation cards. Marketing sections use colored surfaces and varied composition. The interactive three-stage example is hand-authored, explicitly illustrative, and never calls an AI endpoint. Its stages support arrows, Home/End, focus and selected-state semantics. Without JavaScript, all example content remains readable.

Motion is limited to hero entry, two gently drifting annotations, one-time section entrances and short state transitions. A header control pauses decorative motion, and system reduced-motion preferences take precedence. There is no scroll hijacking, autoplay media, cursor replacement or animation of text while reading. Content is never hidden waiting for JavaScript or an observer. Longer marketing entrances explain sequence; form interactions remain immediate.

## Typography correction

User feedback: type across the website felt too slim. Use self-hosted Inter for all screen text, including display headings and preview papers. Body/input weight is 500, controls/labels 600, headings 650, hero 700, with 700 for strong emphasis. Preserve 18 px reading sizes and avoid light serif/italic display styles. The original font is sourced from rsms/inter, blob 5a8d3e72ad7ffb62af3b146e1b1f54ab5813a212; the license is public/fonts/Inter-OFL.txt. The hashed font URL can be cached long term. Print body weight stays 400 for clean paper output.

## Visual editor clarity

Edit mode gives the paper the full workspace width and collapses the generation settings into a labelled disclosure. Questions are native disclosures with a prompt summary; the first opens initially and modern browsers keep one open per group. Blue identifies paper-wide settings, lavender identifies visual tools, and mint identifies teacher evidence. Headings and labels carry the same distinctions without relying on colour. Shared visual fields keep each label and control together, including matching pairs and table cells. White student/teacher papers and print styles stay separate from screen-only editor colour.

## Exam documents and reuse

Marks and section starts are labelled blue document controls inside each question. Section headings print on both copies; evidence stays teacher-only. The personal Question bank is a separate task page with a search area and a paper-assembly panel. Browser-only storage, backup content and fresh review requirements are explicit. School approval is never implied by a personal-bank entry.

## Assessment purpose and source

Keep Exam/Test separate from Lesson notes/Past questions. Presets apply only to new generation; the paper editor can change the saved purpose without replacing custom instructions. Past-question selection is a blue source panel with a saved course chooser, searchable labelled references, selection count and explicit data/provider guidance. The original notes field is disabled only while this source is selected. No fake or inaccessible history is displayed.

## School review and shared reuse

School review uses a blue comparison disclosure, mint per-question feedback/check areas and an explicit approved-copy banner/link. Progress is scoped to the reviewer and exact revision in tab storage; it is not an approval record. Comparison pairs exact wording first and otherwise uses position, with this limitation stated. Feedback and comparison are screen-only; print headers distinguish approved and draft copies.

The school bank derives its catalogue from approved versions already accessible to that staff member. Source questions load only on request. A selection-order panel shows the proposed new paper. The server reads the approved source itself and creates an unapproved new draft through existing school RPC permissions. Author/source credit is attribution, not a transferred approval. No fake school content is used to populate the page.

## Verdant-inspired educational landing page (2026-10-19)

The latest user direction supersedes the earlier orbit/studio home hero: closely adapt the layout and choreography of Plainthing Studio’s Verdant Website Animation (Dribbble shot 27820662). The 28.01-second clip was inspected as a motion reference: full-width cinematic hero, oversized lower wordmark, pale sage background, floating central object with glass callouts, staggered feature blocks, a dark green walkthrough, version/workspace rows, translucent values cards, restrained FAQ and oversized footer lettering.

TermQuill uses original generated educational artwork, school-specific content and native DOM/CSS/WAAPI animation. Hero imagery drifts and zooms, the learning garden floats, headlines reveal through line masks, words enter in sequence, and cards stagger on intersection. A passive scroll listener moves only the hero artwork with a bounded transform. There is no scroll hijacking, 3D runtime, external animation dependency, fake usage metric or promise of exact reproduction of pre-rendered 3D footage. Pause motion and device reduced-motion settings disable decorative movement. Content and links stay readable without animation. Working editors, role checks, assessment generation and print styles retain their existing workflow.

Original assets, generated through the built-in image tool:
- `public/images/learning-landscape.webp`: cinematic open ivory book with curved paper terraces, fine green moss, miniature schoolhouse, forest-green pencil, sage ruler and counting blocks; soft studio daylight, quiet upper-left text area, no embedded text or branding.
- `public/images/learning-garden.webp`: isolated transparent open book carrying a miniature school, pencil, ruler, counting cubes and tree, realistic paper and green fabric materials, no text or logo.

Full generation prompts are preserved in `design/landing-art-prompts.md`. WebP assets are local and together under 400 KB. Non-home route templates remove their image sources to avoid downloading decorative home artwork while preparing papers.

## Class Panel application shell and dashboard (2026-10-19)

The user selected UIX Alii’s Class Panel Dashboard SaaS UI Design Concept (Dribbble shot 26840183) as the primary internal-page reference. Adapt the compact permanent navigation rail, breadcrumb header, modular status cards, tables and clear task hierarchy to TermQuill. Sage/cream surfaces, deep-green selection and original line icons connect the application to its Verdant-inspired landing page. This is an assessment preparation tool, not a school ERP: do not add student, payment or attendance widgets just because the reference has them.

The progressive application shell covers the assessment studio, personal drafts, question library, school routes, guide and school directory. The homepage keeps its marketing navigation. Existing school navigation nodes move into the shared rail, retaining permission-scoped school URLs and active states. On narrow screens, a labelled button opens the drawer; closed navigation is inert, Escape restores button focus, and breakpoint changes close it safely. Links remain available through the original header without shell JavaScript. Print removes both shell elements and restores full paper width.

The school overview is a command centre using only the existing access-scoped dashboard response: visible papers, drafts/changes, submitted versions, papers with an approved copy, recent work, current-status distribution, review queue, tools, setup checklist and activity. Earlier approved copies and later drafts are explicitly distinguished; no fabricated history, comparison percentages, metrics or charts. Dedicated lesson-note/document and examination-studio interaction redesigns follow this foundation rather than presenting unimplemented tools as navigation items.


## Term-organised lesson library (2026-10-20)

A dedicated lesson workspace extends the Class Panel shell. A searchable catalogue sits beside the metadata/editor/reading-preview workspace, using the same sage, cream and deep-green palette and readable form sizes. Notes carry school year, class, subject, term, week, topic and complete plain-text content. On narrow screens the editor stacks above the catalogue. This is a personal, browser-local foundation: up to 100 notes and 2 MB with explicit JSON backup/import; it is not school-synced storage. No student-record fields or artificial example lessons are added.

Teachers can filter a term and select saved lessons for the existing exam/test builder. Selections must share a school year, subject and class; multiple terms are permitted for cumulative sources. Complete notes are ordered by term/week, labelled and checked against the current 18,000-character generation limit including headings. Oversized sources stop with an explanation; nothing is silently dropped. This source handoff does not generate automatically and does not yet guarantee per-topic question allocation or full-term coverage. Those require the next assessment-blueprint/batched-generation stage.

Saving preserves stable IDs and detects stale edits; failed writes retain the editor and saved data. Removing has one-step undo. Backup import validates the entire file before writing, skips identical notes and preserves conflicting edits as separate copies. Reading preview uses text nodes, not HTML from stored notes.


## Account identity and workspace entry (2026-10-20)

A public read-only sample is separate from signed-in working tools. Login/signup share the cream/sage Class Panel typography and educational paper motif. `/workspace` names the personal workspace after its user and lists actual school memberships without auto-creating a school. School entry uses invitation links; authorised school creation is a distinct setup path. Self-described occupation is explanatory only, never a permission grant. School labels distinguish teacher, department-head and management workspaces.

The personal library remains browser-local in this milestone, under per-account keys. Explain its lack of cloud syncing and encryption. Earlier anonymous notes are not claimed automatically: a dedicated ownership-confirmed copy action validates and preserves original records. Keep personal vs school visibility clear next to the entry points and school tools.


## Personal cloud lessons and educator access (2026-10-20)

The lesson library now saves to a private per-account cloud collection. Browser-note copying and backup import are explicit upload actions; original local notes remain. Show connection state, a refresh control and successful-save acknowledgement. Keep editor text on failures; stable new-note IDs and server versions prevent duplicate retry writes and stale overwrites. Selection is rechecked in the library and builder. Recently removed lessons can be recovered for seven days and count towards limits. No offline-sync claim. Drafts and saved questions remain account-scoped browser storage in this milestone.

The personal dashboard places an educator-access panel before its working tools. A professional request collects teaching context without government IDs or student data. Profile descriptions and email verification never grant educator authority. Independently verified school membership or an operator-reviewed application can unlock tools. Operator exceptions are distinctly labelled, never presented as educator or school verification. Pending users keep public-demo, account and invitation access. Validation asks for corrections, never infers dishonesty from a typo.

## TermQuill identity (2026-10-20)

The user selected TermQuill as the public product name. Use the exact capitalisation TermQuill across navigation, account pages, document UI, privacy copy and help. Tagline: “From what you teach to what you assess.” The deep-green rounded mark combines an ivory T and a sage quill. Keep the existing palette and motion. Technical storage/backup/database identifiers remain stable for compatibility.

## Instructions / topic assessment source (2026-10-20)

Add a clearly labelled source choice distinct from supplied notes and saved note-based references. A blue brief panel collects 20–6,000 characters and a stage selector covers early years, primary, secondary, vocational, undergraduate, postgraduate and adult education, with a free-text specific class/course. Stage changes suggest Early Years/Primary/Standard paper style without locking the visual editor. Topic mode never claims supplied-note evidence: every topic question retains a generated answer rationale and visible independent-check label in editor, teacher copy, banks and school review. Student copies exclude rationales. Saved topic provenance survives backup, restoration and mixed-source bank assembly; topic-only questions are excluded from note-based fresh-reference generation. No browsing, curriculum certification or universal subject-accuracy claim.

## Creator reviews and staff discovery (2026-10-21)

The signed-in Access & requests page remains reachable before educator approval. It uses the shared sage/cream shell, readable form cards and separate creator-only review queues for educators, school identity and staff membership. All claims are plain text; school registration and identity verification are visibly distinct. Require a meaningful decision reason, preserve forms on errors, and present pending/clarification/approved states honestly. The creator role never certifies the creator’s educator identity. No self-approval. Registered schools explicitly opt into signed-in discovery of names and departments; the public location map remains separate. Staff requests grant teacher role in a verified school and specified department only after review. Personal lesson contents never appear in these queues.

## Education-stage defaults (2026-10-21)

Changing Education stage applies an editable starting class/course, paper style, question format, thinking level, marks per question and stage-specific Exam/Test count and duration. Stock subject/title examples follow the stage while teacher-written alternatives remain. Retain notes, topic/custom instructions, logos and the current preview paper. Announce what changed and ask the teacher to check retained source suitability; these defaults are not curriculum requirements. Restoring saved papers does not reapply presets.

## Stage examples and visual task selection (2026-10-21)

Provide seven original lesson-note examples with complete facts and assessment-ready scenarios. Saving examples is explicit and duplicate-safe; the owner-requested seed is restricted to the named creator account. The builder can load an example for the selected stage with matching visual preferences. Do not silently replace existing source text. Selected visual task types are visible before generation; generated output must include them, while teacher editing remains free to remove tasks afterwards. Familiar-object search uses original local line drawings with exact counting quantities.

The existing picture editor includes a separate external Commons search disclosure. Do not call it unlimited, child-safe, curriculum-verified or an AI image generator. Search queries alone reach the provider; image previews are explicit and selected copies are compressed/embedded with source and licence credit. Matching pictures hide their answer-key names on the student paper. No arbitrary remote image URL or SVG import. Existing size, page, count and sharing limits remain.

## Guided assessment builder (2026-10-21)

Progressively enhance Create assessment into three steps: choose class, add material, shape questions. Preserve all fields and sources when navigating. A labelled layout-only sample previews titles, marks, time and selected response spaces without claiming generated questions. Purple selection cards and lavender preview surfaces complement sage defaults, cream forms and blue advanced options. Keep text labels, pressed/current semantics and keyboard focus so colour never carries meaning alone. Invalid fields open their owning step and disclosure. Optional branding and difficulty/style controls use disclosures. New generations open the student paper first, with separate edit/review and marking-guide actions; printing remains review-gated. Save feedback uses actual draft state, never a button click. Without the enhancement module the complete original form remains usable.

## Visual polish and content refinement (2026-10-21)

Retain the established palette and artwork. Use `public/polish.css` as the final screen-only finish across source page templates: consistent 11px control / 16px card radii, restrained shadows, clear type hierarchy, generous control spacing and subtle hover/focus feedback. Preserve 18px form/reading text, reduced-motion preferences and printed paper geometry. Shorten primary copy and move secondary storage/privacy guidance into native disclosures without removing it. Guided setup uses compact step labels, one visible choice per setting and real illustrative response-space geometry rather than text punctuation. No new AI, auth or database behaviour is introduced.

## Device setup and persistent branding (2026-10-21)

School logo/name/heading changes save automatically through account-scoped browser storage with explicit success/failure feedback. A distinct Save setup on this device action persists the current generation settings and source text without requiring a generated paper. Restore this setup before explicit paper/sample/lesson handoffs so those retain precedence. Past-question selections are reselected after reopening. Keep paper saving and cloud lessons distinct. Forget saved setup removes only the two local setup/branding records, preserving the current paper and saved drafts. Never persist access codes, auth data or review approval in this setup.

## Logo and header designer (2026-10-21)

A bounded paper layout tool controls text alignment, independent logo alignment, 12–32 mm logo size, 0–12 mm header spacing and school/term/title order. Native drag rows have explicit move buttons for keyboard and touch use. Reordering also changes document reading order. A labelled header-only example updates immediately; the complete student and teacher previews share the same print geometry. Undo and reset affect layout only. Changes invalidate paper review, persist with drafts and account-scoped device branding, and carry into new papers without replacing chosen stage styles. School copies use the same header structure and validations. This milestone does not add arbitrary absolute positioning or whole-page canvas editing.

## Creation accuracy and lesson coverage (2026-10-21)

Saved lesson collections retain exact body offsets and a visible per-lesson question plan in question settings. Start with balanced allocations; teachers can change each count and rebalance. Every selected lesson requires at least one question, within the existing 20-question and 18,000-character limits. Notes, subject or class changes invalidate the source snapshot until restored, reselected or explicitly detached. Topic/past-reference modes remain separate. Validate allocations before provider calls and derive assignments from passage boundaries or unique exact body quotes and check counts, allowing the existing one-repair limit. Preserve plans in drafts and device setup; newly bank-assembled papers drop obsolete allocations. A screen-only requested/current coverage disclosure reflects later edits without implying semantic verification or complete syllabus coverage. Source quotes prove text presence, not answer validity. Topic-mode visual preferences are sent on the first attempt; explicit insufficient-source responses stop without another provider call. Generated MCQ marking labels derive from the selected answer.

## Question quality review (2026-10-22)

A compact lavender disclosure above the preview lists advisory review prompts and exact-question editor links. Open it automatically when signals exist; preserve the teacher's disclosure choice while editing. Keep the explanation that signals are not a correctness score and that clean results still need factual review. Recompute from current paper content without retaining a score or adding provider calls. Use readable 16–18 px text, 44 px actions and text labels rather than colour alone. Keep the entire panel outside the printed paper and exclude it with print CSS. Editing a flagged question retains the existing review-reset behavior.

## Objective blueprint and batch recovery (2026-10-22)

Step 3 has an optional blue objective disclosure: teacher label, source start/end passages with quote preview, question allocation and explicit removal. Source ranges refer to complete supplied text; saved-lesson ranges remain within one lesson. Preserve edits and surface allocation/source mismatch without silently discarding a plan. Source/count reports stay outside printed copies and make semantic-review limits explicit. Generation approach lives under More options; two batches require 9–20 questions and disclose extra provider requests. An amber completed-batch panel appears only for a validated returned partial result, with explicit open/download actions and an incomplete label. Keep the old paper until a full generation succeeds or the teacher chooses to open the partial. No fake progress percentage or automatic saving is introduced.

## Assessment editing and structured visuals (2026-10-22)

The question editor adds explicit in-tab undo/redo, marking-criterion add/remove controls with live allocation totals, and objective reassignment with evidence-boundary reminders. Undo never restores approval and is separate from saving. Preserve existing keyboard/touch move controls and coverage warnings after duplication/removal. MCQ keys remain derived from the correct option.

Visual blocks include a shared, subject-neutral graph and labelled diagram authoring foundation at every stage. Graphs have numeric axes/units, bounded grid intervals, data points and optional straight segments in entered order, or blank plotting grids. The diagram canvas uses bounded positions for lines, arrows, rectangles, ellipses and labels. Form controls and an inline white live preview are deliberate accessible alternatives to a drag-only canvas. Keep descriptions distinct from answer keys, preserve the exact same geometry on student/teacher copies, and print in monochrome. Do not advertise automatic scientific-diagram correctness, a best-fit calculation, complete circuit-symbol libraries or arbitrary subject coverage as implemented.


## PDF and PowerPoint downloads (2026-10-22)

Assessment preview offers explicit file downloads alongside browser Print / PDF. The selected student/marking-guide tab determines the copy, and both require current structural checks and teacher review. Label the copy on the button and within every output page. Never include answer keys, marking criteria, source quotes or rationale in student file text, notes or metadata. PDF uses flowing A4 pages with header layout, embedded logo, figures and answer spaces. PowerPoint adapts the paper into question and continuation slides, with editable text, table cells and scientific diagram primitives. Images and tracing are retained as images. Exporting uses an authenticated same-origin server request with bounded, validated content, in-memory rendering and no AI/provider request or new persistence. JSON remains the format for restoring a paper to TermQuill. Export does not certify factual correctness or school approval.

School paper downloads fetch the exact revision again through the caller's access-scoped school RPC. Only this stored revision can supply the school approval label. Downloading does not create a print activity record.

## Room-inspired organisation (October 28)

User requests The Unfinished Room’s spacious, grouped presentation without copying its colours. Keep TermQuill forest/sage/cream with blue generation panels. Give setup and output separate bounded surfaces, wider reading space, consistent panel/action spacing and clear selected tabs. Expand paper view hides setup reversibly; the same button restores it and Escape returns focus. Narrow screens stack naturally. Existing page navigation, roles, consent, saved work and print geometry remain intact. Marketing retains its educational artwork.

## Top navigation correction (October 28)

Explicit user correction: remove the fixed sidebar entirely. Brand, current-page breadcrumb and a labelled Hide/Show navigation control live at the top. Navigation opens in normal document flow beneath the header as wrapping links; school-specific links remain permission-scoped. Desktop starts open, small screens start closed, and Escape closes with focus restored. Main content uses the recovered width. This supersedes the permanent Class Panel rail direction.

## Paper workspace space allocation (October 29)

Create and Question bank recover horizontal working space up to 1680 px. The closing accountability notice remains readable at 16 px but uses compact padding and no paragraph margins. Reduce main bottom padding and footer padding so support copy does not consume the editing area. Keep natural document scrolling, responsive stacking and print rules.

## Navy workspace palette (October 29)

User rejected the washed-out sage workspace palette. Internal application pages now use deep navy ink (#202d49), cobalt primary actions (#2949a3), white paper and surfaces, soft blue generation panels and restrained violet editing/evidence tools. Teal remains only for review/approval context. Keep the existing typography, compact footer, top navigation, spacing, focus treatment and white exported papers. This supersedes the forest/sage internal colour direction; the established landing artwork remains separate.

## Book and quill identity (October 29)

Replace the old green T tile with the navy open-book and rising quill mark. Cobalt page edges and a violet tip connect it to the workspace palette. Use the same SVG in navigation, public headers and browser favicons, with a versioned URL to refresh cached icons. Keep the TermQuill wordmark as selectable accessible text. The production SVG is a compact adaptation of an original generated concept and is independent of school logos printed on assessments.

## Task focus correction (October 29)

User clarified that colour changes did not solve overload. The primary requirement is one focused working pane, clear choice groups and supporting tools available on demand. Navigation now starts collapsed on all screen sizes. Lesson library and writing are separate reversible task views; changing views preserves unsaved text and selection. The writer gives the lesson title and full-width notes priority. Class/term metadata has a labelled summary and opens automatically on validation failure. Catalogue filters and backup/example tools use explicit disclosures. Assessment assembly appears only after selection. Editing a saved note opens the writing view.

Assessment setup and paper editing/preview are separate task views, with existing three-step setup preserved. Generation reveals the result/progress pane; a newly loaded paper reveals its preview. Validation brings the relevant setup step back into view. Error and status messages stay outside either hidden pane. Extra device preferences and recommendations are collapsed. No cloud-save, provider, role, approval, export or draft semantics change.
