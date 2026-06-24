# coding-agent-kit

[![npm version](https://img.shields.io/npm/v/coding-agent-kit)](https://www.npmjs.com/package/coding-agent-kit)
[![license](https://img.shields.io/npm/l/coding-agent-kit)](LICENSE)
[![node](https://img.shields.io/node/v/coding-agent-kit)](package.json)

Setup kit for coding agents. Install once, then use structured project
understanding, planning, implementation, and review workflows across projects.

Supported targets:

- [Codex](https://developers.openai.com/codex)
- [opencode](https://opencode.ai)

`coding-agent-kit` installs one platform at a time. There is intentionally no
`--target all`.

---

## What's Included

### Codex

- Managed global guidance block in `~/.codex/AGENTS.md`
- 8 personal Codex skills in `~/.agents/skills/`
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
- `coding-agent-review-feature`

Skills generated later for a specific project should follow that project's
domain and naming conventions instead of using the `coding-agent-` prefix.

The Codex installer does not edit `~/.codex/config.toml`, model provider,
approval policy, sandbox mode, auth, telemetry, MCP servers, or hooks.

Skills are installed directly so they work immediately. The plugin is also made
available in the personal marketplace for the Codex plugin UI and sharing flow.

### opencode

- Global `AGENTS.md` in `~/.config/opencode/`
- `opencode.json` with safe default permissions
- 8 global skills using the same `coding-agent-*` prefix
- 7 global commands:
  `/init-existing`, `/init-new`, `/skill-new`, `/brainstorm`, `/plan`,
  `/implement`, `/review`
- Language overlay for the Communication section

---

## Requirements

- Node.js 18+
- Codex app or CLI for the `codex` target
- opencode installed for the `opencode` target

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

Preview changes without writing files:

```bash
coding-agent-kit install --target codex --dry-run
```

---

## Commands

```bash
coding-agent-kit install --target <opencode|codex>
coding-agent-kit update --target <opencode|codex>
coding-agent-kit status
coding-agent-kit status --target <opencode|codex>
coding-agent-kit lang <en|vi|ja|ko|zh|es|fr|de> --target <opencode|codex>
coding-agent-kit help
```

Options:

```bash
--lang <en|vi|ja|ko|zh|es|fr|de>
--target <opencode|codex>
--dry-run
--force
```

`--force` is mainly for replacing conflicting Codex skill folders that already
exist and are not marked as managed by this kit.

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

coding-agent-kit lang ko --target codex
coding-agent-kit lang en --target opencode
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
$coding-agent-implement-task
$coding-agent-review-feature
```

The implementation skill intentionally handles one task at a time and stops
for review before continuing.

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
/implement
/review
```

---

## Existing Codex Setups

The Codex installer is designed for machines that already have Codex configured.

- Existing `~/.codex/AGENTS.md` content is preserved.
- The kit writes only the block between:
  `<!-- CODING_AGENT_KIT_START ... -->` and
  `<!-- CODING_AGENT_KIT_END -->`.
- Existing custom skills are not overwritten unless they contain the kit marker
  or you pass `--force`.
- Existing marketplace metadata is preserved; the plugin entry is appended or
  updated by name.
- Codex may need a restart or new session to load new global guidance, skills,
  or plugin metadata.

Optional plugin install:

```bash
codex plugin add coding-agent-kit@personal
```

Use this when you want the plugin to appear as installed/enabled in Codex or
when you want to share it from the Codex app. The direct personal skills are
already installed by `coding-agent-kit install --target codex`.

---

## Update

```bash
npm update -g coding-agent-kit
coding-agent-kit update --target codex
coding-agent-kit update --target opencode
```

For Codex, `update` refreshes the managed AGENTS block, managed skills, local
plugin files, and marketplace entry.

If you installed the Codex plugin, refresh its local cache after update:

```bash
codex plugin add coding-agent-kit@personal
```

For opencode, `update` refreshes skills and commands, and merges new
`opencode.json` keys without overwriting existing keys.

---

## Kit Structure

```text
kit/
├── platforms/
│   ├── opencode/         # opencode kit files
│   └── codex/            # Codex AGENTS source and plugin bundle
└── shared/
    └── overlays/         # Communication language overlays
```

New agent targets should be added under `kit/platforms/<target>/`. Shared
files should stay under `kit/shared/` only when more than one target uses them.

See [kit/README.md](kit/README.md) for details.

---

## License

MIT - see [LICENSE](LICENSE).
