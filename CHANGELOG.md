# Changelog

## [1.2.0] - 2026-07-01

### Added

- Added `implement-plan` as an accelerated implementation skill for Codex,
  opencode, Antigravity, and Claude.
- Added the opencode `/implement-plan` command.

### Changed

- Clarified when to use one-task implementation versus full-plan
  implementation across README, global guidance, and plan/implement skills.
- Bumped package version, managed file markers, and plugin manifests to
  `1.2.0`.

## [1.1.0] - 2026-06-25

### Added

- Added `antigravity` target with native Google Antigravity plugin installs for
  app/editor and CLI surfaces.
- Added `claude` target with a Claude Code skills-directory plugin and managed
  global `CLAUDE.md` guidance block.
- Added install, update, uninstall, status, and language support for
  `antigravity` and `claude`.

### Changed

- Bumped managed file markers and plugin manifests to `1.1.0`.
- Documented native install paths and workflow invocation for all supported
  targets.

## [1.0.4] - 2026-06-24

### Added

- Added `uninstall --target <opencode|codex>` for removing kit-managed files
  and blocks.
- Added installed version and stale file reporting to `status`.
- Added npm latest-version checks to `status` with a local cache.

### Changed

- Changed opencode `AGENTS.md` installs to use a managed block with append,
  overwrite, and cancel choices.
- Added managed markers to opencode skills and commands for safer status and
  uninstall behavior.

## [1.0.3] - 2026-06-24

### Changed

- Added an optional Codex plugin record install/refresh prompt when the
  `codex` command is available.
- Pinned `esbuild` to a patched version through npm overrides.

## [1.0.2] - 2026-06-24

### Changed

- Improved Codex install UX for existing `~/.codex/AGENTS.md` files with
  append, overwrite, and cancel choices.
- Broadened Codex detection to include command, app, IDE extension, and config
  signals.
- Clarified README guidance for Codex app, IDE extension, and command-line
  plugin usage.

## [1.0.1] - 2026-06-24

### Changed

- Updated README wording for the one-platform-at-a-time install flow.

## [1.0.0] - 2026-06-24

Initial release of `coding-agent-kit`.

### Added

- `coding-agent-kit` CLI with `install`, `update`, `status`, `lang`, and
  `help` commands.
- Per-platform install flow with `--target codex` or `--target opencode`.
- `--dry-run` support for previewing file writes.
- `--force` support for replacing conflicting managed Codex skills.
- Codex global guidance block for `~/.codex/AGENTS.md`.
- Codex personal skills under `~/.agents/skills/`.
- Local Codex plugin bundle and personal marketplace entry.
- opencode global AGENTS, `coding-agent-*` skills, commands, and
  `opencode.json` setup.
- Platform-oriented source layout under `kit/platforms/` with shared language
  overlays under `kit/shared/`.
- Communication language overlays for `en`, `vi`, `ja`, `ko`, `zh`, `es`,
  `fr`, and `de`.
