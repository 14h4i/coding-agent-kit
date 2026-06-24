---
name: coding-agent-write-plan
description: >
  Use after a design has been approved, or when the user says "write a plan",
  "break this down into tasks", or asks for a concrete implementation plan.
  Produce a file-by-file plan with executable tasks and no placeholders.
---

<!-- CODING_AGENT_KIT_MANAGED version=1.0.4 -->

## Prerequisites

Expect one of:

- A design doc from `$coding-agent-brainstorm-feature`.
- A clear, unambiguous spec from the user.

If neither exists and the request is non-trivial, use
`$coding-agent-brainstorm-feature` first.

## Process

### Step 1 - Map Files

List every file that will be created or modified and each file's
responsibility. Get this decomposition right before writing tasks.

### Step 2 - Break Into Tasks

Each task should be small enough to implement and verify independently.

Use this format:

```md
## Task N: <short title>
- [ ] Status

**What** - file(s) touched and the change.

**How** - actual code or exact edits, not vague instructions.

**Verify** - command, test, or manual check.
```

The checkbox is mechanical. `$coding-agent-implement-task` flips it when the
task is done.

### Step 3 - Avoid Plan Failures

Do not write:

- TBD, TODO, or "fill in later".
- "Add validation" without the actual validation.
- "Add error handling" without the actual behavior.
- "Write tests" without the test shape.
- "Similar to Task N".
- References to undefined types, functions, or files.

### Step 4 - Self-Review

Check:

- Every design requirement maps to a task.
- Every task has concrete implementation details.
- File responsibilities remain coherent.
- The plan stays within scope.

### Step 5 - Save

Save to `docs/plans/YYYY-MM-DD-<feature-name>-plan.md`.

## After the Plan

Use `$coding-agent-implement-task` to execute one task at a time. If the plan
needs to change mid-work, edit the plan file directly and leave completed tasks
checked.
