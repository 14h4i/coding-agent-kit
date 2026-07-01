---
name: coding-agent-implement-task
description: >
  Use to execute the next task from an approved plan in docs/plans/, or when
  the user says "implement this", "do task N", or "continue with the plan".
  Implement exactly one task, verify it, mark it done, and stop for review.
---

<!-- CODING_AGENT_KIT_MANAGED version=1.2.0 -->

## Prerequisites

Expect a plan file in `docs/plans/*-plan.md` created by
`$coding-agent-write-plan`, with tasks in this format:

```md
## Task N: <title>
- [ ] Status
```

If no plan exists and the request is still a broad goal, use
`$coding-agent-brainstorm-feature` and `$coding-agent-write-plan` first.

## Process

### Step 1 - Find the Task

- If the user specifies a plan file or task number, use it.
- Otherwise, use the most recently modified `docs/plans/*-plan.md`.
- Find the first task with `- [ ] Status`.
- If every task is checked, report that nothing remains.

### Step 2 - Check for Drift

Before editing, verify that files and assumptions in the task still match the
current repository. If something has drifted, stop and ask whether to adjust
the plan or proceed differently.

### Step 3 - Implement

Follow the task's **How** section. Make only the minimal adjustments needed to
fit the current codebase.

### Step 4 - Verify

Run the task's **Verify** step. If it fails, fix the issue within the task's
scope and rerun validation. If the failure requires a wider change, stop and
report it.

### Step 5 - Mark Done and Report

Change `- [ ] Status` to `- [x] Status` for that task.

Report:

- What changed.
- Files changed.
- Verification command or reason validation could not run.
- Any note the user needs.

### Step 6 - Stop

Ask whether to continue with the next unchecked task. Do not automatically
start the next task.

## Notes

- One task per run.
- The current plan file is the source of truth.
- Use `$coding-agent-implement-plan` only when the user explicitly wants all
  remaining unchecked tasks implemented in one run.
