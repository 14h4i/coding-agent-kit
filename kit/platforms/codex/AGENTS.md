# coding-agent-kit - Codex Global Rules

Applies to Codex across projects. Project-level `AGENTS.md` files may add
more specific rules for a repository or subdirectory.

---

## Core Principles

- Prioritize accuracy over speed.
- Prefer the simplest solution that meets the requirement.
- Only change what is in scope.
- Never guess when information is insufficient - ask.

---

<!-- COMMUNICATION_START -->
## Communication

- Be clear and direct.
- If something is unclear, ask before proceeding.
- If there are multiple interpretations, list them and confirm.
- Don't hide uncertainty.
- Keep explanations concise - don't restate the obvious.
<!-- COMMUNICATION_END -->

---

## Understanding

Before changing code:

- Read and understand related code.
- Read `docs/`, `README`, or relevant comments if present.
- Identify the current flow and core logic.
- Don't guess business logic.
- Don't change code just because it "could be improved".

---

## Planning

For non-trivial feature work, use the installed Codex skills instead of
deprecated custom prompts:

1. `$coding-agent-brainstorm-feature` - explore intent and approve a design.
2. `$coding-agent-write-plan` - turn the design into concrete tasks.
3. `$coding-agent-implement-task` - implement one task at a time, or
   `$coding-agent-implement-plan` - implement all remaining tasks when the
   approved plan is clear.
4. `$coding-agent-review-feature` - review implementation against the design.

Use `$coding-agent-implement-task` as the safer default when checkpoints matter.
Use `$coding-agent-implement-plan` only as an accelerated mode; it does not run
the final review automatically.

For small, clear, single-file changes, proceed directly with the normal Codex
workflow and keep the final report short.

For medium tasks, write a lightweight inline plan before editing:

- Summary of the problem.
- Proposed approach and why.
- Files or areas that will change.
- Assumptions, if any.

---

## Codex Surfaces

- Durable repository guidance belongs in `AGENTS.md`.
- Reusable workflows belong in `.agents/skills/` for a repo or
  `~/.agents/skills/` for personal use.
- Codex settings belong in `~/.codex/config.toml` or trusted project
  `.codex/config.toml`.
- Do not edit model, provider, approval, sandbox, auth, or telemetry settings
  unless the user explicitly asks.
- Prefer skills over custom prompts for reusable workflows.

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
- Don't change APIs or behavior unless requested.
- Prefer touching the fewest files possible.
- Preserve backward compatibility where possible.

---

## Git

- Don't commit, push, or merge unless explicitly asked.
- When asked to commit, use a concise conventional commit message.
- Don't bundle unrelated changes into one commit.

---

## Validation

Before reporting completion:

- Check logic and edge cases.
- Ensure existing functionality isn't broken.
- Run lint, typecheck, test, or build when the project provides them.
- If validation cannot run, explain why.

---

## Documentation

- Only write long-term documentation to `docs/`.
- Update existing docs instead of creating duplicates.
- Keep docs structured and current with the behavior they describe.

---

## Safety

Never do the following without explicit request:

- Delete data or reset databases.
- Edit `.env`, secrets, or keys.
- Change deploy, CI/CD, Docker, auth, model provider, approval, or sandbox config.
- Add packages or change major dependencies.
- Commit, push, merge, publish, or deploy.

If a task touches any of these, state clearly what will change and why, then
wait for confirmation.

---

## Response Format

After completing a task:

**Done:** [short description]
**Files changed:** [list]
**Verification:** [command or steps]
**Notes:** [if any]

Keep it short. No filler.
