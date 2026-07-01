# coding-agent-kit

[![npm version](https://img.shields.io/npm/v/coding-agent-kit)](https://www.npmjs.com/package/coding-agent-kit)
[![license](https://img.shields.io/npm/l/coding-agent-kit)](LICENSE)
[![node](https://img.shields.io/node/v/coding-agent-kit)](package.json)

Setup kit for coding agents. Install once, then use structured project
understanding, planning, implementation, and review workflows across projects.

Supported targets:

- [Codex](https://developers.openai.com/codex)
- [opencode](https://opencode.ai)
- [Google Antigravity](https://antigravity.google/docs)
- [Claude Code](https://code.claude.com/docs/en/overview)

`coding-agent-kit` installs one platform at a time.

---

## What's Included

### Codex

- Managed global guidance block in `~/.codex/AGENTS.md`
- 9 personal Codex skills in `~/.agents/skills/`
- A local Codex plugin at `~/plugins/coding-agent-kit`
- A personal marketplace entry in `~/.agents/plugins/marketplace.json`
- Language overlay for the Communication section

Codex skill names are prefixed to avoid collisions:

- `coding-agent-scan-project`
- `coding-agent-write-docs`
- `coding-agent-setup-project`
- `coding-agent-skill-creator`
- `coding-agent-brainstorm-feature`
- `coding-agent-write-plan`
- `coding-agent-implement-task`
- `coding-agent-implement-plan`
- `coding-agent-review-feature`

Skills generated later for a specific project should follow that project's
domain and naming conventions instead of using the `coding-agent-` prefix.

The Codex installer does not edit `~/.codex/config.toml`, model provider,
approval policy, sandbox mode, auth, telemetry, MCP servers, or hooks.

Skills are installed directly so they work immediately. The plugin is also made
available in the personal marketplace for the Codex plugin UI and sharing flow.

### opencode

- Managed global guidance block in `~/.config/opencode/AGENTS.md`
- `opencode.json` with safe default permissions
- 9 global skills using the same `coding-agent-*` prefix
- 8 global commands:
  `/init-existing`, `/init-new`, `/skill-new`, `/brainstorm`, `/plan`,
  `/implement`, `/implement-plan`, `/review`
- Language overlay for the Communication section

### Antigravity

- Native Antigravity plugin with `plugin.json`, `skills/`, and `rules/`
- App/editor plugin path: `~/.gemini/config/plugins/coding-agent-kit/`
- CLI plugin path: `~/.gemini/antigravity-cli/plugins/coding-agent-kit/`
- 9 plugin skills using platform-native names such as `scan-project`,
  `write-plan`, `implement-task`, and `implement-plan`
- Language overlay for the plugin rule's Communication section

The Antigravity installer does not edit settings, hooks, sidecars, MCP,
permissions, sandbox, model, auth, telemetry, or provider configuration.

### Claude

- Managed global guidance block in `~/.claude/CLAUDE.md`
- Native Claude Code skills-directory plugin at
  `~/.claude/skills/coding-agent-kit/`
- 9 plugin skills exposed through the `coding-agent-kit` namespace
- Language overlay for the Communication section

The Claude installer does not edit settings, hooks, monitors, MCP, permissions,
sandbox, model, auth, telemetry, or provider configuration.

---

## Requirements

- Node.js 18+
- Codex app, IDE extension, or CLI for the `codex` target
- opencode installed for the `opencode` target
- Antigravity app/editor or CLI for the `antigravity` target
- Claude Code CLI, app, or IDE extension for the `claude` target

---

## Install

```bash
npm install -g coding-agent-kit
```

Install for Codex:

```bash
coding-agent-kit install --target codex
```

Install for opencode:

```bash
coding-agent-kit install --target opencode
```

Install for Antigravity:

```bash
coding-agent-kit install --target antigravity
```

Install for Claude Code:

```bash
coding-agent-kit install --target claude
```

Preview changes without writing files:

```bash
coding-agent-kit install --target codex --dry-run
```

---

## Commands

```bash
coding-agent-kit install --target <opencode|codex|antigravity|claude>
coding-agent-kit update --target <opencode|codex|antigravity|claude>
coding-agent-kit uninstall --target <opencode|codex|antigravity|claude>
coding-agent-kit status
coding-agent-kit status --target <opencode|codex|antigravity|claude>
coding-agent-kit lang <en|vi|ja|ko|zh|es|fr|de> --target <opencode|codex|antigravity|claude>
coding-agent-kit help
```

Options:

```bash
--lang <en|vi|ja|ko|zh|es|fr|de>
--target <opencode|codex|antigravity|claude>
--dry-run
--force
```

`--force` replaces conflicting managed destinations where supported. Use it
only when an existing `coding-agent-kit` destination is not marked as managed
but you still want the kit to overwrite it.

---

## Language

The Communication section can be set independently from the rest of the kit:

| Code | Language |
|---|---|
| `en` | English (default) |
| `vi` | Tiếng Việt |
| `ja` | 日本語 |
| `ko` | 한국어 |
| `zh` | 中文（简体） |
| `es` | Español |
| `fr` | Français |
| `de` | Deutsch |

Examples:

```bash
coding-agent-kit install --target codex --lang vi
coding-agent-kit install --target opencode --lang ja
coding-agent-kit install --target antigravity --lang vi
coding-agent-kit install --target claude --lang vi

coding-agent-kit lang ko --target codex
coding-agent-kit lang en --target opencode
coding-agent-kit lang vi --target antigravity
coding-agent-kit lang vi --target claude
```

Everything else stays in English so the technical instructions remain easy to
maintain and extend.

---

## Codex Workflow

### Existing Project

```bash
cd your-project
codex
```

Then ask Codex to use:

```text
$coding-agent-scan-project
```

It scans the codebase and creates or updates:

- `docs/architecture.md`
- `docs/conventions.md`
- `docs/flows.md`
- `docs/plans/`
- project `AGENTS.md`
- optional repo-scoped skills under `.agents/skills/` after confirmation

It does not create `.opencode/` files or project `.codex/config.toml` unless
you explicitly ask for a config change.

### New Project

Use:

```text
$coding-agent-setup-project
```

The skill gathers requirements, proposes a stack and structure, waits for
confirmation, scaffolds the project, then runs the project scan workflow.

### Feature Workflow

```text
$coding-agent-brainstorm-feature
$coding-agent-write-plan
```

Choose one implementation mode after the plan is approved:

- `$coding-agent-implement-task` handles one task at a time and stops for a
  review checkpoint. This is the safer default.
- `$coding-agent-implement-plan` handles all remaining tasks sequentially,
  verifies each one, then stops before the final review.

Use `$coding-agent-review-feature` after implementation to review the full
feature against the design.

```text
$coding-agent-review-feature
```

---

## opencode Workflow

### Existing Project

```bash
cd your-project
opencode
/init-existing
```

### New Project

```bash
mkdir my-project && cd my-project
opencode
/init-new
```

### Feature Workflow

```text
/brainstorm
/plan
```

Use `/implement` for one task at a time. Use `/implement-plan` only when the
plan is clear and you want all remaining tasks completed in one run. Run
`/review` after either implementation mode.

```text
/review
```

---

## Antigravity Workflow

After installing:

```bash
coding-agent-kit install --target antigravity
```

Restart Antigravity or start a new Antigravity CLI session. Use the plugin
skills by their native names:

```text
scan-project
setup-project
brainstorm-feature
write-plan
implement-task
implement-plan
review-feature
```

Use `implement-task` for one task at a time. Use `implement-plan` only when the
plan is clear and you want all remaining tasks completed in one run. Run
`review-feature` after either implementation mode.

The scan workflow creates or updates project docs and
`.agents/rules/project-guidance.md`. It does not edit Antigravity settings,
hooks, sidecars, MCP, permissions, sandbox, auth, telemetry, model, or provider
configuration unless you explicitly ask for that.

---

## Claude Workflow

After installing:

```bash
coding-agent-kit install --target claude
```

Restart Claude Code or start a new session. Use namespaced plugin skills:

```text
/coding-agent-kit:scan-project
/coding-agent-kit:setup-project
/coding-agent-kit:brainstorm-feature
/coding-agent-kit:write-plan
/coding-agent-kit:implement-task
/coding-agent-kit:implement-plan
/coding-agent-kit:review-feature
```

Use `/coding-agent-kit:implement-task` for one task at a time. Use
`/coding-agent-kit:implement-plan` only when the plan is clear and you want all
remaining tasks completed in one run. Run `/coding-agent-kit:review-feature`
after either implementation mode.

The scan workflow creates or updates project docs and `CLAUDE.md`. It does not
edit Claude settings, hooks, monitors, MCP, permissions, sandbox, auth,
telemetry, model, or provider configuration unless you explicitly ask for that.

---

## Existing Codex Setups

The Codex installer is designed for machines that already have Codex configured.

- Existing `~/.codex/AGENTS.md` content is preserved.
- If `~/.codex/AGENTS.md` already has content, the CLI previews the change and
  asks whether to append the managed block, overwrite the file, or cancel.
- Existing content is preserved by default; overwriting requires an explicit
  choice.
- The kit writes only the block between:
  `<!-- CODING_AGENT_KIT_START ... -->` and
  `<!-- CODING_AGENT_KIT_END -->`.
- Existing custom skills are not overwritten unless they contain the kit marker
  or you pass `--force`.
- Existing marketplace metadata is preserved; the plugin entry is appended or
  updated by name.
- If the `codex` command is available, the CLI asks whether to install or
  refresh the Codex plugin record automatically.
- Codex may need a restart or new session to load new global guidance, skills,
  or plugin metadata.

Plugin install from the command line:

```bash
codex plugin add coding-agent-kit@personal
```

Use this when you use the `codex` command and want the plugin to appear as
installed/enabled there. Codex app and IDE extension users can use the direct
personal skills installed by `coding-agent-kit install --target codex`.

---

## Update

`status` reports the current package version, the latest npm version when it
can be checked, installed file versions, and stale managed files:

```bash
coding-agent-kit status
coding-agent-kit status --target codex
```

If a newer npm package is available, update the package first, then refresh the
installed platform files:

```bash
npm update -g coding-agent-kit
coding-agent-kit update --target codex
coding-agent-kit update --target opencode
```

For Codex, `update` refreshes the managed AGENTS block, managed skills, local
plugin files, and marketplace entry.

When the `codex` command is available, `update` asks whether to refresh the
Codex plugin record. If that step is skipped, refresh it later with:

```bash
codex plugin add coding-agent-kit@personal
```

For opencode, `update` refreshes the managed AGENTS block, skills, commands,
and merges new `opencode.json` keys without overwriting existing keys.

For Antigravity, `update` refreshes only the selected
`coding-agent-kit` plugin files under the app/editor and/or CLI plugin paths.

For Claude, `update` refreshes the managed `CLAUDE.md` block and the
`coding-agent-kit` skills-directory plugin.

---

## Uninstall

```bash
coding-agent-kit uninstall --target codex
coding-agent-kit uninstall --target opencode
coding-agent-kit uninstall --target antigravity
coding-agent-kit uninstall --target claude
```

Preview removal without deleting files:

```bash
coding-agent-kit uninstall --target codex --dry-run
```

`uninstall` removes only files and blocks marked as managed by
`coding-agent-kit`.

- Codex: removes the managed AGENTS block, managed skills, local plugin files,
  marketplace entry, and can remove the Codex plugin record when the `codex`
  command is available.
- opencode: removes the managed AGENTS block, managed skills, and managed
  commands.
- Antigravity: removes selected managed plugin directories only.
- Claude: removes the managed `CLAUDE.md` block and managed plugin directory.
- `opencode.json` is preserved by default because it may contain user changes.

---

## Kit Structure

```text
kit/
├── platforms/
│   ├── opencode/         # opencode kit files
│   ├── codex/            # Codex AGENTS source and plugin bundle
│   ├── antigravity/      # Antigravity plugin bundle
│   └── claude/           # Claude CLAUDE.md source and plugin bundle
└── shared/
    └── overlays/         # Communication language overlays
```

New agent targets should be added under `kit/platforms/<target>/`. Shared
files should stay under `kit/shared/` only when more than one target uses them.

See [kit/README.md](kit/README.md) for details.

---

## License

MIT - see [LICENSE](LICENSE).

## Support

<a href="https://www.buymeacoffee.com/14h4i" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/default-orange.png" alt="Buy Me A Coffee" height="41" width="174"></a>
