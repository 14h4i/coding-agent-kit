# coding-agent-kit 1.0.4 lifecycle hardening plan

## Task 1: Add managed metadata helpers
- [x] Status

**What** - Modify `src/cli.ts` to add reusable helpers for parsing managed
versions, comparing semver-like versions, removing managed blocks, deleting
directories recursively, and reading npm latest version with a 24-hour cache.

**How** - Add helpers near the existing marker constants and utility helpers.
Use Node built-ins only. Cache npm latest metadata under a file in the user's
home directory. Treat network failures as unavailable and never fail commands
because of npm checks.

**Verify** - Run `npx tsc --noEmit`.

## Task 2: Convert opencode AGENTS to managed block behavior
- [x] Status

**What** - Modify `src/cli.ts` opencode install/update/lang behavior so
`~/.config/opencode/AGENTS.md` uses a managed block with target, version, and
language metadata.

**How** - Add opencode equivalents of the existing Codex AGENTS plan helpers.
Install should create, append, overwrite, or update after confirmation. Update
should replace only the managed block. Lang should update only the managed
block. Existing content outside the block must be preserved.

**Verify** - Use temp HOME installs for empty, existing custom, and existing
managed AGENTS files.

## Task 3: Add version and stale reporting to status
- [x] Status

**What** - Modify `cmdStatus`, `cmdStatusCodex`, and `cmdStatusOpencode` to
show current package version, latest npm version when available, installed file
versions, and stale hints.

**How** - Read versions from managed AGENTS blocks, skill markers, opencode
command markers, and Codex plugin manifest. Mark files stale when installed
version is lower than package version. Suggest `coding-agent-kit update
--target <target>` when stale files exist.

**Verify** - Run status against temp installs and manually alter one managed
version to confirm stale output.

## Task 4: Add uninstall command
- [x] Status

**What** - Add `coding-agent-kit uninstall --target <opencode|codex>` with
`--dry-run` support.

**How** - Codex uninstall removes the managed AGENTS block, managed skills,
local plugin directory, marketplace entry, and optionally calls `codex plugin
remove coding-agent-kit@personal`. opencode uninstall removes the managed
AGENTS block and managed skills/commands. Leave `opencode.json` in place and
print a note.

**Verify** - Use temp HOME installs for both targets, run uninstall dry-run and
real uninstall, then confirm managed files are gone and custom AGENTS content
remains.

## Task 5: Update release metadata and docs
- [x] Status

**What** - Bump to `1.0.4`, update docs and managed markers, and add changelog
notes.

**How** - Update `package.json`, `package-lock.json`, Codex plugin manifest,
all managed skill markers, opencode command markers, README command docs, and
CHANGELOG.

**Verify** - Run `npx tsc --noEmit`, `npm run build`, `npm audit
--audit-level=low`, representative CLI smoke tests, and `npm publish
--dry-run`.
