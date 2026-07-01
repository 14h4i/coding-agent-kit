# kit/

This directory contains the files installed by `coding-agent-kit`.

The source is organized around platform targets so Codex, opencode, Claude
Code, Google Antigravity, and future agents can evolve without mixing their
installation files into existing targets.

---

## Structure

```text
kit/
├── platforms/
│   ├── opencode/
│   │   ├── AGENTS.md
│   │   ├── opencode.json
│   │   ├── skills/
│   │   └── commands/
│   └── codex/
│       ├── AGENTS.md
│       └── plugin/
│           ├── .codex-plugin/
│           │   └── plugin.json
│           └── skills/
│   ├── antigravity/
│   │   └── plugin/
│   │       ├── plugin.json
│   │       ├── rules/
│   │       └── skills/
│   └── claude/
│       ├── CLAUDE.md
│       └── plugin/
│           ├── .claude-plugin/
│           │   └── plugin.json
│           └── skills/
└── shared/
    └── overlays/
        ├── vi/communication.md
        ├── ja/communication.md
        ├── ko/communication.md
        ├── zh/communication.md
        ├── es/communication.md
        ├── fr/communication.md
        └── de/communication.md
```

---

## Platform Rule

Each platform owns its installable files under `kit/platforms/<target>/`.

Shared resources live under `kit/shared/` only when they are genuinely reused
by more than one platform. Today that is the Communication language overlay
system.

---

## Skill Naming

Codex and opencode skills use the `coding-agent-` prefix for backward
compatibility and to avoid collisions in global skill directories.

Examples:

- `coding-agent-scan-project`
- `coding-agent-write-plan`
- `coding-agent-implement-task`
- `coding-agent-implement-plan`
- `coding-agent-review-feature`

Claude and Antigravity plugin skills use shorter names such as `scan-project`
`write-plan`, and `implement-plan` because the plugin namespace already
identifies `coding-agent-kit`.

Skills generated later for a specific project should not automatically use the
kit prefix. They should follow the project's domain and workflow language, such
as `create-component`, `add-api-route`, `write-migration`, or
`billing-create-invoice`.

---

## opencode Target

Installed into `~/.config/opencode/`:

- `AGENTS.md` as a managed block.
- `opencode.json`
- `skills/coding-agent-*`
- `commands/`

The installer preserves existing `AGENTS.md` content by default and can append
or replace the managed block after confirmation. `opencode.json` is merged
without overwriting existing keys. Skills and commands are overwritten only
during `update`.

---

## Codex Target

Installed into:

- `~/.codex/AGENTS.md` as a managed block.
- `~/.agents/skills/coding-agent-*` for immediate personal skill discovery.
- `~/plugins/coding-agent-kit/` as a local plugin bundle.
- `~/.agents/plugins/marketplace.json` as a personal marketplace entry.

The installer does not edit `~/.codex/config.toml`.

---

## Antigravity Target

Installed into one or both documented plugin locations:

- `~/.gemini/config/plugins/coding-agent-kit/` for Antigravity app/editor.
- `~/.gemini/antigravity-cli/plugins/coding-agent-kit/` for Antigravity CLI.

The plugin contains:

- `plugin.json`
- `rules/coding-agent-kit.md`
- `skills/<workflow>/SKILL.md`

The installer does not edit Antigravity settings, hooks, sidecars, MCP,
permissions, sandbox, auth, telemetry, model, or provider configuration.

---

## Claude Target

Installed into:

- `~/.claude/CLAUDE.md` as a managed block.
- `~/.claude/skills/coding-agent-kit/` as a Claude Code skills-directory
  plugin.

The plugin contains:

- `.claude-plugin/plugin.json`
- `skills/<workflow>/SKILL.md`

The installer does not edit Claude settings, hooks, monitors, MCP,
permissions, sandbox, auth, telemetry, model, or provider configuration.

---

## Language Overlays

All guidance or rule files use the same Communication markers:

```md
<!-- COMMUNICATION_START -->
## Communication
...
<!-- COMMUNICATION_END -->
```

The CLI replaces only this section when a language is selected. The rest of the
kit stays in English.
