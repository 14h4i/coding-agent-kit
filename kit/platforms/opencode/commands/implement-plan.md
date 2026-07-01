---
description: Implement all remaining tasks from an approved plan in docs/plans/
agent: build
---

<!-- CODING_AGENT_KIT_MANAGED version=1.2.0 -->

Use the `coding-agent-implement-plan` skill to execute all remaining unchecked
tasks from the plan.

Requirements:
- Use the Build agent - this step writes code
- Execute tasks sequentially, not in parallel or out of order
- Verify each task and mark it done only after verification passes
- Stop if the codebase has drifted, the plan is ambiguous, or the work needs
  scope beyond the approved plan
- Run relevant final validation after all remaining tasks are complete
- Do not run `/review` automatically; remind the user to run it after this
  command finishes
