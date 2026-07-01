# AGENTS.md — Global Rules

Applies to all projects. Per-project AGENTS.md overrides or extends these.

---

## Core Principles

- Prioritize accuracy over speed.
- Prefer the simplest solution that meets the requirement.
- Only change what is in scope.
- Never guess when information is insufficient — ask.

---

<!-- COMMUNICATION_START -->
## Communication

- Be clear and direct.
- If something is unclear, ask before proceeding.
- If there are multiple interpretations, list them and confirm.
- Don't hide uncertainty.
- Keep explanations concise — don't restate the obvious.
<!-- COMMUNICATION_END -->

---

## Understanding

Before changing code:

- Read and understand related code.
- Read docs/, README, or relevant comments if present.
- Identify the current flow and core logic.
- Don't guess business logic.
- Don't change code just because it "could be improved".

---

## Planning

For non-trivial feature work — adding a feature, changing behavior, or
anything where the implementation could go multiple ways — use the
`coding-agent-brainstorm-feature` skill before writing code, then
`coding-agent-write-plan` to turn the approved design into a task-by-task
plan, then `coding-agent-implement-task` to execute it one task at a time or
`coding-agent-implement-plan` to execute all remaining tasks when the approved
plan is clear, then `coding-agent-review-feature` to close the loop.

Full workflow:
1. `/brainstorm` — explore intent, approve design doc
2. `/plan` — break design into tasks with real code
3. `/implement` (repeat) — one task at a time, verify each
   or `/implement-plan` — accelerated mode for all remaining tasks
4. `/review` — compare implementation vs design, get manual test checklist

Use `/implement` as the safer default when checkpoints matter. Use
`/implement-plan` only as an accelerated mode; it does not run `/review`
automatically.

For small, clear, single-file changes, skip all of this and proceed directly.

For everything in between (a task touching 3+ files with a clear, agreed
direction), a lightweight inline plan is enough:
- A summary of the problem.
- The proposed approach and why it was chosen.
- Files/areas that will change.
- Any assumptions made.

---

## Simplicity

- Prefer the simplest solution.
- Don't add abstractions, config, layers, or services unless truly needed.
- Don't rewrite code that's working fine.

---

## Scope Control

- Only change what was requested.
- Don't refactor, rename, or reformat code outside the scope.
- Match the existing style of the project.

---

## Implementation

- Build on the existing system, don't rewrite it.
- Don't change APIs/behavior unless requested.
- Prefer touching the fewest files possible.
- Preserve backward compatibility where possible.

---

## Git

- Don't commit, push, or merge unless explicitly asked.
- When asked to commit, use the format `type(scope): short description`.
- Don't bundle unrelated changes into one commit.

---

## Validation

Before reporting completion:

- Check logic and edge cases.
- Ensure existing functionality isn't broken.
- Run lint/typecheck/test if the project has them — don't skip this.

---

## Documentation

- Only write to docs/ what has long-term value.
- Update existing docs instead of creating new files.
- Avoid duplicate or outdated documentation.

---

## Safety

Never do the following without explicit request:

- Delete data, reset databases.
- Edit .env, secrets, or keys.
- Change deploy, CI/CD, or Docker config.
- Add packages or change major dependencies.
- Commit, push, merge, or deploy.

If a task touches any of these, state clearly what will change, why, and only
proceed once confirmed.

---

## Response Format

After completing a task:

**Done:** [short description]
**Files changed:** [list]
**Verification:** [command or steps to check]
**Notes:** [if any]

Keep it short. No filler.
