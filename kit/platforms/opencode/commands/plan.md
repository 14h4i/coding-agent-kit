---
description: Turn an approved design (or clear spec) into a concrete implementation plan
agent: plan
---

<!-- CODING_AGENT_KIT_MANAGED version=1.2.0 -->

Use the `coding-agent-write-plan` skill to create an implementation plan.

Requirements:
- If no approved design exists and the request is non-trivial, use `coding-agent-brainstorm-feature` first
- Map out files and their responsibilities before defining tasks
- Every task must include real code — no placeholders, no "TBD", no "similar to Task N"
- Self-review the plan against the design before presenting it
- Save the plan to docs/plans/
