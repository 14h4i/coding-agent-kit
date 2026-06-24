---
name: coding-agent-setup-project
description: >
  Use when starting a brand new project — when the user says "create a new
  project", "init project", "start a new project". Ask about requirements and
  produce a clear plan before creating any files. Don't write code before
  confirmation.
---

<!-- CODING_AGENT_KIT_MANAGED version=1.0.4 -->

## Process

### Step 1 — Gather information (no files yet)

Ask one at a time:

1. What is the goal of this project?
2. Preferred stack? (or let the agent suggest one)
3. Expected scale? (personal / small team / production)
4. Any special requirements? (auth, realtime, offline, mobile...)
5. Timeline and current priorities?

### Step 2 — Plan

Present:
- Suggested stack and why
- Expected directory structure
- Setup steps in order
- What will be created

**Wait for confirmation before doing anything.**

### Step 3 — Create the project

Once confirmed:
1. Scaffold using the official tool (create-next-app, laravel new, go mod init...)
2. Install required dependencies
3. Set up lint, formatter, typecheck

### Step 4 — Run coding-agent-scan-project

Use the `coding-agent-scan-project` skill to create docs/, AGENTS.md, and
.opencode/opencode.json.

### Step 5 — Verify

Run the dev server, lint/typecheck. Report results and suggested next steps.
