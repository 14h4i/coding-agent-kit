---
name: coding-agent-setup-project
description: >
  Use when starting a brand new project in Codex - when the user says "create
  a new project", "init project", or "start a new project". Gather
  requirements, propose a stack and structure, wait for confirmation, then
  scaffold and verify the project.
---

<!-- CODING_AGENT_KIT_MANAGED version=1.2.1 -->

## Process

### Step 1 - Gather Requirements

Ask one question at a time:

1. What is the goal of the project?
2. Preferred stack, if any?
3. Expected scale: personal, small team, or production?
4. Special requirements such as auth, realtime, offline, mobile, or payments?
5. Current priority and timeline?

### Step 2 - Plan

Present:

- Suggested stack and why.
- Expected directory structure.
- Setup steps in order.
- Files and commands that will be created or run.
- Assumptions and out-of-scope items.

Wait for confirmation before creating files.

### Step 3 - Scaffold

After confirmation:

1. Use the official scaffold tool for the chosen stack when available.
2. Install only required dependencies.
3. Set up lint, formatter, typecheck, and tests when appropriate.
4. Avoid changing deploy, CI/CD, Docker, secrets, or auth config without
   explicit approval.

### Step 4 - Initialize Project Guidance

Use `$coding-agent-scan-project` to create docs, project `AGENTS.md`, and any
approved repo-scoped skills.

### Step 5 - Verify

Run the project's build, test, lint, or dev checks that make sense for the
newly scaffolded project. Report any command that cannot run and why.
