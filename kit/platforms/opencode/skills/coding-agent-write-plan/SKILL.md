---
name: coding-agent-write-plan
description: >
  Use after a design has been approved (typically via coding-agent-brainstorm-feature),
  or when the user says "write a plan", "break this down into tasks", "/plan".
  Turns an approved design into a concrete, file-by-file implementation plan
  with no placeholders — every step is something an engineer could execute
  without guessing.
---

<!-- CODING_AGENT_KIT_MANAGED version=1.2.1 -->

## Prerequisites

This skill expects a design — either:
- A design doc from `coding-agent-brainstorm-feature` (docs/plans/*-design.md), or
- A clear, unambiguous spec the user already provided

If neither exists and the request is non-trivial, use `coding-agent-brainstorm-feature`
first.

## Process

### Step 1 — Map files and responsibilities

Before defining tasks, list every file that will be created or modified and
what each one is responsible for. Each file should have one clear purpose.
This is where decomposition decisions get made — get this right before
splitting into tasks.

### Step 2 — Break into tasks

Each task should be small enough to execute and verify independently
(roughly: a focused chunk of work, not "build the whole feature"). Number
tasks sequentially (Task 1, Task 2, ...) — `/implement` uses this order and
the checkbox state to find the next task to do.

For each task, write:

```
## Task N: <short title>
- [ ] Status

**What** — the file(s) touched and the change

**How** — actual code for the change, not a description of it

**Verify** — how to confirm this task worked (a command, a manual check, or
a test)
```

The `- [ ] Status` checkbox is mechanical: `/implement` flips it to `- [x] Status`
once the task is done and verified. Don't add any other meaning to it.

### Step 3 — Never write these

These are plan failures — if you catch yourself writing any of these, stop
and write the real thing instead:

- "TBD", "TODO", "implement later", "fill in details"
- "Add appropriate error handling" / "add validation" / "handle edge cases"
  without showing the actual code
- "Write tests for the above" without the actual test code
- "Similar to Task N" — write out the code in full; don't make the reader
  cross-reference
- Steps that describe what to do without showing how (code required for code steps)
- References to types, functions, or methods not defined anywhere in the plan

### Step 4 — Self-review

After writing the plan, check it against the design with fresh eyes:

- Does every part of the design map to at least one task?
- Does every task have real code, not a description?
- Are file responsibilities from Step 1 still consistent with the tasks?
- Is anything in the plan referencing something that doesn't exist yet and
  isn't defined elsewhere in the plan?

Fix issues inline before presenting the plan.

### Step 5 — Save the plan

Save to `docs/plans/YYYY-MM-DD-<feature-name>-plan.md`.

## After the plan

Use `/implement` to execute tasks one at a time, with a review checkpoint
after each one. This is the safer default.

Use `/implement-plan` only when the approved plan is clear and the user wants
all remaining unchecked tasks implemented in one run. After either
implementation mode, use `/review` for the final feature review.

The plan file is the source of truth for "what" — AGENTS.md governs "how to
work" (scope control, validation, response format).

If the plan needs to change mid-implementation (the design was wrong, the
codebase shifted), edit the plan file directly — update or add tasks, leave
completed ones checked. `/implement` reads the current state of the file each
time, so edits take effect on the next run.
