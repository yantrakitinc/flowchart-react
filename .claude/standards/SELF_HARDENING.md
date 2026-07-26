# SELF_HARDENING

> The system learns: every failure becomes a versioned artifact that changes future behavior. The model never learns — the FILES are the memory, the GATES are the reflexes.

```meta
version: 1
last_updated: 2026-07-13T00:00:00Z
```

## lessons_ledger

- `file`: ~/.claude/lessons/LESSONS.yaml _(append-only, like the decision log)_
- `append_same_turn`: every defect that slips past a gate, every gate bug, every false positive is appended IN THE TURN it is diagnosed
- `entry`: { date, lesson, caught_by, terminal }
- `terminal_enum`: _(every entry ends in exactly one)_
  - "hardened_by: <gate/commit/fixture citation>" # a machine now refuses the failure
  - "standard_updated: <NAME>" _(the rule changed)_
  - "status: open" _(unfinished hardening — injected at session start)_
- `open_lessons_injection`: the SessionStart hook lists status:open entries next to the session contract — every new session inherits the hardening backlog

## regression_corpus

- `dir`: ~/.claude/standards/scripts/selftest/ _(node:test fixtures, one per learned failure)_
- `rule`: when a lesson is mechanically reproducible, its terminal is a FIXTURE that re-creates the failure and asserts the gate now refuses it — the machine can never regress to a failure mode it has already experienced
- `runner`: scripts/verify-gates-selftest.mjs _(runs the corpus; wired into the)_
    _~/.claude pre-commit alongside the meta-linter_

## periodic_self_audit

- `cadence`: weekly (scheduled routine)
- `runs`: standards-auditor-core (tree gates) + standards-reconciler-core (contradiction hunt) + proposal-miner-core (pattern mining)
- `output`: findings APPENDED as lessons / proposals — the audit never silently fixes

## proposals

- `miner`: ~/.claude/agents/proposal-miner-core.md _(reads DECISIONS.yaml + LESSONS.yaml,)_
    _proposes standard changes with citations_
- `authority`: proposals QUEUE FOR THE USER — standards-change authority is never delegated; the system learns to suggest, only the user ratifies

## honest_limit

no cross-session improvement of judgment — novelty is caught by layer depth, not remembered wisdom; what is guaranteed is monotonic hardening (each learned failure is permanently refused)

## enforced_by

scripts/verify-standards-meta.mjs _(check 10 validates ledger terminals; pre-commit runs the selftest corpus)_

Last updated: 2026-07-13T00:00:00Z