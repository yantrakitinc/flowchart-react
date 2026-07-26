# SUPERPOWERS

> Reference + workflow for the `superpowers@claude-plugins-official` plugin. Plugin installed globally; skills auto-trigger at session start + task transitions. ---------- priority ----------

```meta
version: 1
last_updated: 2026-05-20T20:00:00Z
```

## priority

- `rule`: CLAUDE.md and ~/.claude/standards/*.yaml ALWAYS win over any superpowers skill on conflict
- `on_conflict`: follow the standard; note the conflict; do not silently obey the skill

## slash_commands

- `/brainstorm`: design + spec before code (activates the `brainstorming` skill)
- `/write-plan`: turn a spec into a bite-sized implementation plan (`writing-plans`)
- `/execute-plan`: walk a plan with human checkpoints (`executing-plans`)

## skills

- `process`:
  - `brainstorming`: before any creative work; aligns with spec-driven mandate
  - `systematic-debugging`: on any bug / test failure / unexpected behavior; aligns with "investigate before coding"
  - `verification-before-completion`: before claiming work is done; aligns with LOCK_FILES manual walk + lock stamp
- `planning`:
  - `writing-plans`: bite-sized tasks (2-5 min each); file paths + verification steps per task
  - `writing-skills`: meta — for authoring new skills
- `execution`:
  - `test-driven-development`: red → green → refactor; aligns with UNIT_COVERAGE.md
  - `executing-plans`: walk a plan inline with human checkpoints (PREFERRED over subagent-driven-development)
  - `subagent-driven-development`: fresh subagent per task; token-expensive; only when explicitly requested
  - `dispatching-parallel-agents`: multiple independent investigations in parallel; same token caveat
- `code_review`:
  - `requesting-code-review`: between tasks; pre-review checklist + reviewer dispatch
  - `receiving-code-review`: when receiving review feedback
- `branch_worktree`:
  - `using-git-worktrees`: after design approval; isolated worktree on a new branch per BRANCHES_AND_COMMITS (feat/NNNN-...)
  - `finishing-a-development-branch`: after all tasks complete; verify tests, present merge/PR/cleanup options
- `meta`:
  - `using-superpowers`: bootstrap; auto-injected at session start

## workflow 1: user describes idea → /brainstorm → design spec (lands in the relevant <feature>/__specs__/spec.md +
spec.md) 2: approve → using-git-worktrees → isolated branch + worktree 3: /write-plan → step-by-step plan at
docs/plans/YYYY-MM-DD-<feature>.md 4: approve plan → /execute-plan (executing-plans preferred) 5: during each task →
test-driven-development 6: after tasks → requesting-code-review 7: after review → verification-before-completion (run
`verify-standards-compliance` + manual walk; stamp __specs__/standards-compliance.md) 8: all done →
finishing-a-development-branch

## when_not_to_use

- pure mechanical work (rename folders, run git, copy/paste config) — skill friction without value
- conversational questions ("what does this code do?")
- when a standard says don't — see priority

## output_locations

- `specs`:
  - `location`: <feature>/__specs__/spec.md
  - `rule`: brainstorming output IS the per-feature spec; not a separate timestamped doc
- `plans`:
  - `location`: docs/plans/YYYY-MM-DD-<feature>.md
  - `rule`: cross-feature workflow artifacts; date-stamped for chronological recall
- `project_override`: if a project's standards / memory dictate different paths, project wins

## updating

- `command`: "/plugin → select `superpowers@claude-plugins-official` → version + update"
- `source`: https://github.com/obra/superpowers

Last updated: 2026-05-20T20:00:00Z