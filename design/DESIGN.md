# LessonPress design contract

## Standing design preference

Phoniex wants the design approach chosen to suit each project's users and purpose. Use Apple and Geist for restrained product polish, Fluent and Carbon for institutional workflows, Material or Apple conventions for the target mobile platform, editorial layouts for learning, and selective cinematic treatment for portfolios and launches. StyleKit is a source of candidate visual directions; Mobbin is a reference library. External skills and libraries are evaluated when needed, not installed automatically. Keep one coherent identity within each product.

The broader Phoenix UI Playbook is the reusable reference. This contract records its application to LessonPress so future changes do not depend on chat history or a memory feature.

## Direction

Calm educational identity with practical institutional structure. Preserve forest green, warm off-white surfaces and editorial headings. Use system sans-serif text for working controls. No external font request, decorative glass, 3D runtime or animation library.

References informing the design:
- Apple hierarchy and materials: https://developer.apple.com/design/human-interface-guidelines/
- Fluent task navigation: https://fluent2.microsoft.design/components/web/react/core/nav/usage/
- Carbon table structure: https://www.carbondesignsystem.com/building-blocks/core/components/data-table/specifications
- Clear form patterns: https://design-system.service.gov.uk/patterns/question-pages/

These are design references, not dependencies or a claim to reproduce native platform behavior.

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
