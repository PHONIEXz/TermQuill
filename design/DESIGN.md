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
