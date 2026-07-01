---
description: Implement the next task from an approved plan in docs/plans/
agent: build
---

<!-- CODING_AGENT_KIT_MANAGED version=1.2.1 -->

Use the `coding-agent-implement-task` skill to execute the next task from the plan.

Requirements:
- Use the Build agent — this step writes code
- Execute exactly one task: implement, verify, mark it done in the plan file
- If the codebase has drifted from what the plan assumes, stop and ask
  rather than improvising
- Report using the AGENTS.md Response Format
- Ask whether to continue with the next task before doing so
