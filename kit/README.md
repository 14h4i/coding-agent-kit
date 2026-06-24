# kit/

This directory contains the files installed by `coding-agent-kit`.

The source is organized around platform targets so future support for agents
such as Claude Code or Google Antigravity can be added without mixing their
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

Skills shipped with this kit use the `coding-agent-` prefix across platforms.

Examples:

- `coding-agent-scan-project`
- `coding-agent-write-plan`
- `coding-agent-implement-task`
- `coding-agent-review-feature`

The prefix makes kit-managed skills recognizable and avoids collisions with
personal, project, or platform-native skills.

Skills generated later for a specific project should not automatically use the
kit prefix. They should follow the project's domain and workflow language, such
as `create-component`, `add-api-route`, `write-migration`, or
`billing-create-invoice`.

---

## opencode Target

Installed into `~/.config/opencode/`:

- `AGENTS.md`
- `opencode.json`
- `skills/coding-agent-*`
- `commands/`

`opencode.json` is merged without overwriting existing keys. Skills and
commands are overwritten only during `update`.

---

## Codex Target

Installed into:

- `~/.codex/AGENTS.md` as a managed block.
- `~/.agents/skills/coding-agent-*` for immediate personal skill discovery.
- `~/plugins/coding-agent-kit/` as a local plugin bundle.
- `~/.agents/plugins/marketplace.json` as a personal marketplace entry.

The installer does not edit `~/.codex/config.toml`.

---

## Language Overlays

Both current targets use the same Communication markers:

```md
<!-- COMMUNICATION_START -->
## Communication
...
<!-- COMMUNICATION_END -->
```

The CLI replaces only this section when a language is selected. The rest of the
kit stays in English.
