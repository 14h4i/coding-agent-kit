---
name: coding-agent-brainstorm-feature
description: >
  Use before non-trivial creative or implementation work in Codex - adding a
  feature, building a component, changing behavior, or when the user says
  "let's build X", "I want to add Y", or "how should I implement Z". Explore
  intent, compare approaches, and produce an approved design doc before code.
---

<!-- CODING_AGENT_KIT_MANAGED version=1.2.0 -->

## When to Use

Use this skill when a request describes a goal rather than a specific,
unambiguous change.

Signals:

- It could be implemented multiple reasonable ways.
- It touches more than one file or crosses a boundary.
- The user leaves the implementation approach open.

Skip this skill for small, single-file, unambiguous edits.

## Process

### Step 1 - Explore Context

Read relevant code, `README.md`, and existing docs before asking questions.
Do not ask questions that can be answered by inspecting the repository.

### Step 2 - Ask Clarifying Questions

Ask only what is needed to remove real ambiguity. Use one question at a time,
or a short batch when the questions are independent.

### Step 3 - Propose Approaches

Present 2-3 approaches with a one-line tradeoff each. If the codebase clearly
points to one approach, say so and explain why.

### Step 4 - Present the Design

Once an approach is chosen, present:

- **Goal** - what this achieves.
- **Approach** - chosen direction and why.
- **Files affected** - files to create or modify and their responsibilities.
- **Out of scope** - what will not change.

Wait for approval before moving on.

### Step 5 - Save the Design Doc

Save to `docs/plans/YYYY-MM-DD-<feature-name>-design.md`.

### Step 6 - Hand Off

After approval, use `$coding-agent-write-plan` to produce the implementation
plan.

## Notes

- Keep the conversation practical.
- If the user already provided a clear spec, move directly to the design.
