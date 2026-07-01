---
name: coding-agent-implement-plan
description: >
  Use to execute all remaining unchecked tasks from an approved plan in
  docs/plans/, or when the user says "implement the plan", "finish the plan",
  "run all tasks", or "continue end to end". Implement tasks sequentially,
  verify each task, mark each task done, run final validation, and stop before
  the separate review-feature step.
---

<!-- CODING_AGENT_KIT_MANAGED version=1.2.1 -->

## Prerequisites

Expect a plan file in `docs/plans/*-plan.md` created by
`$coding-agent-write-plan`, with tasks in this format:

```md
## Task N: <title>
- [ ] Status
```

Use this skill only when the user wants all remaining plan tasks implemented
without a review checkpoint after every task. For the safer default workflow,
use `$coding-agent-implement-task` one task at a time.

If no plan exists and the request is still a broad goal, use
`$coding-agent-brainstorm-feature` and `$coding-agent-write-plan` first.

## Process

### Step 1 - Select the Plan

- If the user specifies a plan file, use it.
- Otherwise, use the most recently modified `docs/plans/*-plan.md`.
- Read the whole plan before editing.
- Find every task with `- [ ] Status`, in order.
- If every task is checked, report that nothing remains and suggest
  `$coding-agent-review-feature`.

Stop if any remaining task lacks concrete **What**, **How**, or **Verify**
sections.

### Step 2 - Check Batch Safety

Before editing, confirm the remaining tasks can be executed as written.
Stop and ask the user before proceeding if any task requires:

- A scope change or redesign.
- Ambiguous product or business decisions.
- New dependencies, services, credentials, or secrets.
- Database resets, destructive migrations, deploys, CI/CD, Docker, auth,
  provider, model, sandbox, telemetry, or protected configuration changes.
- External systems or privileged actions not already approved in the plan.
- Repository state that has drifted from the plan's assumptions.

### Step 3 - Implement Tasks Sequentially

For each unchecked task, in plan order:

1. Re-check that the files and assumptions for that task still match the repo.
2. Follow the task's **How** section.
3. Run the task's **Verify** step.
4. If verification fails, fix only within that task's scope and rerun it.
5. Change `- [ ] Status` to `- [x] Status` only after verification passes.

Do not start a later task until the current task is verified and marked done.
If a failure cannot be fixed within the current task's scope, stop, leave that
task unchecked, and report what remains.

### Step 4 - Final Validation

After all remaining tasks are checked, run the relevant broader validation for
the repository, such as lint, typecheck, tests, build, or the command specified
by project docs.

If final validation fails, fix it only when the fix is inside the approved
plan's scope. Otherwise, stop and report the gap.

### Step 5 - Report and Stop

Report:

- Tasks completed.
- Files changed.
- Verification commands and results.
- Remaining tasks or blockers, if any.
- A reminder to run `$coding-agent-review-feature` for the final feature
  review.

Do not run `$coding-agent-review-feature` automatically.

## Notes

- This is an accelerated implementation mode.
- The plan file is the source of truth.
- Do not redesign the feature while implementing the plan.
