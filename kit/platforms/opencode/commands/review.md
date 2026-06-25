---
description: Review a completed feature against its design doc and produce a manual test checklist
agent: build
---

<!-- CODING_AGENT_KIT_MANAGED version=1.1.0 -->

Use the `coding-agent-review-feature` skill to review the completed implementation.

Requirements:
- Read the design doc, plan file, and all affected files before writing anything
- Compare implementation against design — find gaps, not style preferences
- Produce a manual test checklist the user can run themselves
- If gaps are found, ask whether to fix now, log as follow-up, or ignore
- Do NOT refactor, rename, or change anything outside the scope of fixing
  identified gaps
