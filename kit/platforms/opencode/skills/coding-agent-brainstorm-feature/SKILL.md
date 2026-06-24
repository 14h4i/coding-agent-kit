---
name: coding-agent-brainstorm-feature
description: >
  Use before any non-trivial creative or implementation work — adding a
  feature, building a component, changing behavior, or when the user says
  "let's build X", "I want to add Y", "how should I implement Z". Explores
  intent and requirements through dialogue, proposes approaches, and produces
  an approved design doc before any code is written. Skip for trivial,
  single-file, unambiguous changes — see "When to skip" below.
---

## When to use

Use this skill when a request describes a *goal* rather than a *specific,
unambiguous change*. Signs a request needs brainstorming:

- It could be implemented multiple reasonable ways
- It touches more than one file or crosses a boundary (UI + API, schema + logic)
- The user's phrasing leaves the "how" open ("add a way to...", "I want users to be able to...")

## When to skip

Skip straight to implementation when the request is small, single-file, and
unambiguous — e.g. "rename this variable", "fix this typo", "add a null check
here". Forcing brainstorming on trivial changes wastes the user's time. This
matches AGENTS.md: small, clear tasks don't need planning.

## Process

### Step 1 — Explore context

Read relevant code, existing docs/architecture.md and docs/conventions.md.
Don't ask questions you can answer yourself by reading the codebase.

### Step 2 — Ask clarifying questions

Ask only what's needed to remove real ambiguity. One question at a time,
or a short batch if they're independent. Don't ask about things that have an
obvious default.

### Step 3 — Propose approaches

Present 2-3 possible approaches, each with a one-line tradeoff. If there's
clearly one right approach given the codebase's existing patterns, say so
and explain why — don't manufacture false choices.

### Step 4 — Present the design

Once an approach is chosen, present the design in clear sections:

- **Goal** — what this achieves, in one or two sentences
- **Approach** — the chosen direction and why
- **Files affected** — which files will be created/modified and the
  responsibility of each
- **Out of scope** — anything explicitly NOT being changed

Wait for the user to approve before moving on.

### Step 5 — Save the design doc

Save to `docs/plans/YYYY-MM-DD-<feature-name>-design.md` using the structure
from Step 4.

### Step 6 — Hand off to coding-agent-write-plan

Once the design is approved, use the `coding-agent-write-plan` skill to turn
it into an implementation plan.

## Notes

- This is a dialogue, not a form. Keep it conversational.
- If the user already gave a detailed, unambiguous spec, acknowledge it and
  move straight to Step 4 — don't re-litigate decisions they already made.
