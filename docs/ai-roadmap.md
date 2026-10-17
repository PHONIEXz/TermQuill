# LessonPress AI workflow proposals

Status: proposed, not implemented. The deployed AI feature remains assessment generation, now including manual format and thinking-level preferences.

The aim is useful assistance at each teaching stage. An AI button is not needed for deterministic school administration. Keep department creation, invitations, role changes and permissions explicit and predictable.

| Order | Workflow | Teacher action | AI assistance | Human control |
| --- | --- | --- | --- | --- |
| 1 | Lesson planning | Add topic, class, available time and teaching notes | Suggest learning objectives, a teaching sequence, examples, activities and an exit question | Teacher edits and saves a version before using it or making an assessment |
| 2 | Paper review | Choose Suggest improvements on an authorised paper | Flag ambiguous questions, unsupported answers, repetitive wording and mismatched thinking demand; cite the source passage | Suggestions are advisory. Authors accept changes individually into a new draft; reviewers can add comments, never silently edit or approve |
| 3 | Curriculum mapping | Supply a selected, versioned syllabus or official objectives | Suggest which objective each lesson/question addresses and flag apparent gaps | Teacher confirms mappings. No automatic accreditation or compliance claim |
| 4 | Department library | Search a topic within an authorised school/department | Retrieve relevant approved papers and summarise what each covers, with links to exact versions | Apply membership and paper visibility rules before retrieval; no cross-school corpus or access through prompt instructions |
| 5 | School planning insights | Select a date range and aggregate activity | Summarise review queues and repeated content gaps with links to supporting records | Keep claims tied to observed data. Do not rate teacher quality from activity counts or invent student mastery data |
| Later | Rubric feedback | Teacher provides rubric and an authorised submission | Suggest criterion-level feedback with evidence | Requires a separate student-data/privacy design, rubric calibration and teacher approval before any grade is released |

## Shared implementation rules

- Each action states what content goes to the provider. Do not automatically send all school records in every request.
- Authorise server-side and in the database before selecting content for a model. Never trust a client-supplied role.
- Treat notes, library passages and model outputs as untrusted data. Render text safely; never execute model-produced code or permission changes.
- Use bounded requests, cancellation, cost/rate limits and existing provider error handling. On failure, retain the previous draft.
- Keep suggestions separate from saved content. Applying changes creates a new version and resets the review state; model output cannot create approval records.
- Evaluate on teacher-written examples across subjects. Measure usefulness, factual support and required editing, rather than claiming that more AI features imply higher quality.
- Complete production email delivery and a private support/privacy contact before broad institutional adoption. Revisit the privacy policy for each new data flow.
