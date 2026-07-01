---
name: review-feature
description: >
  Use after all tasks in a feature plan are implemented, when the user says
  "review this feature", "review the implementation", or "is this done?".
  Compare the implementation against the approved design, find real gaps, and
  produce a manual test checklist.
---

<!-- CODING_AGENT_KIT_MANAGED version=1.2.0 -->

## Prerequisites

Expect two files in `docs/plans/`:

- `*-design.md` - approved design doc.
- `*-plan.md` - implementation plan with tasks checked.

If tasks are not all checked, ask whether to review anyway.

## Process

### Step 1 - Read Everything

Read in this order:

1. The design doc.
2. The plan file.
3. Every file listed in the plan's affected files.

Review the current code, not only the plan text.

### Step 2 - Compare Design vs Implementation

For every item in the design's files affected section, verify whether it was
implemented as designed.

Flag a gap when:

- A design requirement is missing.
- The implementation differs from the design without explanation.
- The implementation changes something explicitly out of scope.

Treat small equivalent implementation differences as notes, not gaps.

### Step 3 - Check Edge Cases

Look for genuine unhandled cases:

- Empty, null, or undefined inputs.
- Async failures.
- Repeated actions.
- Boundary conditions.
- Race conditions.
- User input used without validation.

Do not flag purely theoretical concerns.

### Step 4 - Check Code Quality

Only report issues that can cause real problems:

- Logic errors.
- Swallowed error states.
- Type errors.
- Hardcoded values that should clearly be configuration.
- Duplicated logic introduced by this feature.

Do not report unrelated style preferences.

### Step 5 - Produce the Review

Use this structure:

```md
# Review: <feature name>

## Status
<Ready | Minor gaps | Gaps found>

## Design vs Implementation
- <file> - <status and reason>

## Edge Cases
<Only genuine unhandled cases, or "None found.">

## Code Quality
<Only real issues, or "None found.">

## Manual Test Checklist
- [ ] <happy path>
- [ ] <error case>
- [ ] <edge case>
- [ ] <regression case>

## Recommended Actions
<No action needed, or ordered follow-up tasks.>
```

### Step 6 - Ask About Gaps

If gaps exist, ask whether to fix now, log as follow-up, or ignore.

### Step 7 - Close the Review

When gaps are resolved or accepted, add a short review status section to the
plan file. Do not delete or rewrite the design doc.
