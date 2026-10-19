# LessonPress design contract

## Standing design preference

Phoniex wants the design approach chosen to suit each project's users and purpose. Use Apple and Geist for restrained product polish, Fluent and Carbon for institutional workflows, Material or Apple conventions for the target mobile platform, editorial layouts for learning, and selective cinematic treatment for portfolios and launches. StyleKit is a source of candidate visual directions; Mobbin is a reference library. External skills and libraries are evaluated when needed, not installed automatically. Keep one coherent identity within each product.

The broader Phoenix UI Playbook is the reusable reference. This contract records its application to LessonPress so future changes do not depend on chat history or a memory feature.

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
