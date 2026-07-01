---
name: coding-agent-review-feature
description: >
  Use after all tasks in a plan are implemented — when the user says
  "review this feature", "review the implementation", "/review", or "is
  this done?". Compares the implementation against the approved design doc,
  identifies gaps, checks edge cases, and produces a manual test checklist.
  Does NOT refactor code, merge branches, or deploy.
---

<!-- CODING_AGENT_KIT_MANAGED version=1.2.1 -->

## Prerequisites

Expects two files in `docs/plans/`:
- `*-design.md` — the approved design doc from `coding-agent-brainstorm-feature`
- `*-plan.md` — the implementation plan from `coding-agent-write-plan`, all tasks checked

If the user specifies a feature name or plan file, use that. Otherwise use
the most recently modified pair in `docs/plans/`.

If tasks are not all checked, say so and ask whether to review anyway or
wait until implementation is complete.

---

## Process

### Step 1 — Read everything

Read in this order:
1. The design doc (`*-design.md`) — goal, approach, files affected, out of scope
2. The plan file (`*-plan.md`) — all tasks and their verify steps
3. Every file listed in the plan's "Files affected" section — read the
   actual current content, not what the plan says it should be

Don't skim. The review is only as good as how thoroughly this step is done.

### Step 2 — Feature review (design vs implementation)

Compare the design doc's stated goal and approach against the actual code.
For each item in the design's "Files affected" section, verify it was
actually implemented as described.

Flag as **gap** if:
- Something in the design is missing from the implementation entirely
- Something was implemented differently from the design without explanation
- The "Out of scope" section was violated (something was changed that
  shouldn't have been)

Flag as **note** (not a gap) if:
- A small implementation detail differs from the design but achieves the
  same goal
- Something was simplified in a reasonable way

### Step 3 — Edge case check

Read the code with fresh eyes and look for cases the plan didn't cover:

- What happens with empty/null/undefined inputs?
- What happens if an async operation fails?
- What happens if the user repeats the action twice?
- What happens at the boundary of any loops or conditions?
- Are there any race conditions if two things happen simultaneously?
- Is any user input being used without validation?

Only flag edge cases that are genuinely unhandled — not theoretical ones
that don't apply to this feature's actual inputs.

### Step 4 — Code quality check

Look for issues that would cause real problems — not style preferences:

- Any obvious logic errors?
- Any error states that are swallowed silently?
- Any hardcoded values that should be config or constants?
- Any duplicated logic that was already in the codebase before this feature?
- Any type errors or missing types (if TypeScript)?

Do NOT flag:
- Formatting or style issues (that's what lint is for)
- Refactoring opportunities unrelated to this feature
- Speculative "could be better" observations

### Step 5 — Produce the review report

Output a structured report with these sections:

---

```markdown
# Review: <feature name>

## Status
<One of: ✅ Ready | ⚠️ Minor gaps | ❌ Gaps found>

## Design vs Implementation
<For each item in the design's "Files affected":>
- ✅ `<file>` — implemented as designed
- ⚠️ `<file>` — <note: minor deviation, explain>
- ❌ `<file>` — <gap: what's missing or wrong>

## Edge Cases
<List only genuine unhandled cases found. If none: "None found.">
- ⚠️ <description of unhandled case and where in the code>

## Code Quality
<List only real issues found. If none: "None found.">
- ⚠️ <file>:<line> — <specific issue>

## Manual Test Checklist

Run these manually before considering the feature done:

- [ ] <Happy path: describe the main user action and expected result>
- [ ] <Error case: what happens when input is wrong/empty>
- [ ] <Edge case: boundary condition or unusual but valid input>
- [ ] <Regression: a related existing feature that could have broken>
- [ ] <Any case from the design doc's acceptance criteria if present>

## Recommended Actions
<If status is ✅: "No action needed — run the manual checklist above.">
<If status is ⚠️ or ❌: list specific follow-up tasks, ordered by severity.
  For each gap: suggest whether to fix now (critical) or log as follow-up.>
```

---

### Step 6 — Ask about gaps

If gaps were found, ask the user:
- Fix now → create new tasks in the plan file and use `/implement`
- Log as follow-up → note in `docs/plans/*-design.md` under a new
  "Follow-up" section and close the review
- Ignore → close the review as-is

Don't decide for the user. Present the options clearly.

### Step 7 — Close the review

Once the user decides on gaps (fix / log / ignore):

- If all gaps resolved or accepted: add a closing line to the plan file:
  ```
  ## Review
  Reviewed on YYYY-MM-DD. Status: <Ready | Closed with follow-ups>.
  ```
- Don't delete or modify the design doc — it's a historical record.
