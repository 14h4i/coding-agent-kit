# coding-agent-kit 1.0.4 lifecycle hardening design

## Goal

Make the kit safer to maintain after installation by improving lifecycle
commands:

- opencode should use a managed AGENTS block like Codex.
- status should report installed versions and stale files.
- status should optionally report whether a newer npm package is available.
- uninstall should remove only kit-managed files and content.

## Approach

Keep the existing single-file CLI structure for this release and add small
helpers around the current platform-specific commands. Avoid a larger adapter
refactor until a third platform is added.

Use managed markers as the source of truth:

- AGENTS blocks expose target, version, and language.
- skill files use `CODING_AGENT_KIT_MANAGED version=x.y.z`.
- opencode command files will get a managed marker comment.
- Codex plugin version comes from `.codex-plugin/plugin.json`.

Uninstall should be conservative:

- Remove managed AGENTS blocks.
- Remove managed skill and command folders/files.
- Remove Codex plugin files and marketplace entry.
- Ask before calling `codex plugin remove coding-agent-kit@personal`.
- Leave opencode.json in place by default.

## Files affected

- `src/cli.ts` - CLI behavior, managed block helpers, status, uninstall.
- `kit/platforms/opencode/commands/*.md` - managed markers for safe removal and status.
- `README.md` - command and lifecycle docs.
- `CHANGELOG.md` - 1.0.4 release notes.
- `package.json` / `package-lock.json` - version bump.
- Codex plugin metadata and skill markers - version bump.

## Out of scope

- No `doctor` command.
- No platform adapter refactor.
- No new package dependencies.
- No automatic removal of user-modified `opencode.json` keys.
