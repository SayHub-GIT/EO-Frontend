# Project agent instructions

<!-- antislop:start -->
Anti-Slop v3.2.20 is installed project-locally under `.agents/skills/`.

For every implementation task, load `.agents/skills/antislop/SKILL.md` first.

For UI or visual work, also load:
- `.agents/skills/antislop-ui/SKILL.md`
- `.agents/skills/antislop-human/SKILL.md`
- `.agents/skills/antislop-layoutmobile/SKILL.md`

For user-facing copy, labels, headings, CTA text, empty states, or help text, also load:
- `.agents/skills/antislop-copywriting/SKILL.md`

When creating or editing code comments, also load:
- `.agents/skills/antislop-code/SKILL.md`

Use Anti-Slop in **During** mode for new EO work unless the user explicitly asks for an audit of existing output. Run its Delivery Gate before shipping UI/copy work.

Anti-Slop is a filter, not a replacement for project direction. For EO:
- preserve the existing Vuexy admin design system and component language;
- use the approved Figma screens as the visual source of truth when a matching design exists;
- do not introduce generic AI styling just to make a screen look "modern";
- do not replace working EO behavior merely to satisfy a visual preference;
- accessibility, responsive behavior, real data/states, and existing RBAC remain functional requirements.
<!-- antislop:end -->
