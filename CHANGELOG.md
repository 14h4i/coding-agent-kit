# Changelog

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
