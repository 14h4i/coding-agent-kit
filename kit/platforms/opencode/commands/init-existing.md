---
description: Scan and set up opencode for an existing project
agent: build
---

Use the `coding-agent-scan-project` skill to analyze this entire project.

Requirements:
- Read the codebase in read-only mode first, don't edit anything
- Create: docs/, AGENTS.md, .opencode/opencode.json
- Suggest skills and MCP servers relevant to the stack
- Ask for confirmation before creating files if unsure
- In the final report, remind the user that `/brainstorm` and `/plan` are
  available for planning new feature work

Start by asking: are there any directories or files that need special attention?