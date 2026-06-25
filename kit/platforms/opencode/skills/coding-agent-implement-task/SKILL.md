---
name: coding-agent-implement-task
description: >
  Use to execute the next task from an approved plan in docs/plans/, or when
  the user says "implement this", "do task N", "continue with the plan",
  "/implement". Executes exactly one task, verifies it, marks it done, and
  stops for review before continuing.
---

<!-- CODING_AGENT_KIT_MANAGED version=1.1.0 -->

## Prerequisites

This skill expects a plan file in `docs/plans/*-plan.md` created by
`coding-agent-write-plan`, with tasks in the checkbox format:

```
## Task N: <title>
- [ ] Status
```

If no plan exists and the request describes a goal rather than a specific
task, use `coding-agent-brainstorm-feature` and `coding-agent-write-plan` first.

## Process

### Step 1 — Find the task

- If the user specifies a plan file or task number, use that.
- Otherwise, use the most recently modified file in `docs/plans/*-plan.md`
  and find the first task with `- [ ] Status` (unchecked), in order.
- If all tasks are checked, say so and stop — nothing to implement.

### Step 2 — Check for drift

Before writing code, quickly check whether the files this task touches still
match what the plan assumes (e.g. the file still exists, the function
signature the plan references is still there).

If something has changed since the plan was written:
- Don't improvise a fix or silently adapt the plan.
- Stop and describe the discrepancy to the user. Ask whether to adjust the
  plan (edit the plan file) or proceed differently.

### Step 3 — Implement

Follow the task's **How** section. Use the code as written in the plan —
this is not a redesign step. If the plan's code needs a small adjustment to
fit (e.g. an import path), make the minimal adjustment and note it in the
report.

### Step 4 — Verify

Run the task's **Verify** step. If it fails, fix the issue within the scope
of this task and re-verify. If it can't be resolved within this task's
scope, stop and report — don't silently expand scope into other tasks.

### Step 5 — Mark done and report

- Update the plan file: change `- [ ] Status` to `- [x] Status` for this task.
- Report using the AGENTS.md Response Format (Done / Files changed /
  Verification / Notes).

### Step 6 — Ask about the next task

After reporting, ask whether to continue with the next unchecked task or
stop here. Don't automatically continue to the next task without
confirmation — each task gets its own review checkpoint.

## Notes

- One task per run. Don't batch multiple tasks into a single `/implement`
  call even if they look related.
- If the plan file has been edited since the last run (tasks added, removed,
  or reordered), follow the current state of the file — the plan is the
  live source of truth.
