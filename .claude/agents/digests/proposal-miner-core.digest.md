# DIGEST for proposal-miner-core.md — GENERATED, do not edit. Regenerate: node ~/.claude/standards/scripts/generate/generate-agent-digests.mjs
# sources:
#   SELF_HARDENING.md 7346d5dfdf337a1c
#   DECISION_LOG.md 6e66ab4cda731377
#   STANDARDS_CREATION_STANDARDS.md f34d80bbde493a61
#   CONTEXT_ECONOMY.md bb97a1b65cb56163

## ═══ SELF_HARDENING.md ═══

```markdown
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
```

## ═══ DECISION_LOG.md ═══

```markdown
# DECISION_LOG

> Decisions the user has ruled on are LOGGED and never re-asked.

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## locations

- `global`: ~/.claude/decisions/DECISIONS.yaml _(rulings that apply across all projects)_
- `per_repo`: <repo>/docs/decisions/DECISIONS.yaml _(rulings scoped to one project)_

## entry_schema

- `date`: iso8601_date _(when the ruling was made)_
- `scope`: enum[global, repo]
- `decision`: one-sentence statement of the ruling, in the user's terms
- `context`: one line — what prompted the question
- `source`: enum[user] _(only the user creates decisions)_

## rules

- `append_same_turn`: every user ruling (an AskUserQuestion answer, an explicit "do X not Y", a preference, a scope call) is appended to the correct log IN THE SAME TURN it is given
- `consult_before_asking`: before asking the user ANY question, grep both logs; a question already answered there is NEVER asked again — cite the entry and proceed
- `log_beats_memory`: the log is the source of truth for past rulings; session memory and recollection never override it
- `never_edit_rulings`: entries are append-only; a ruling changes only when the user gives a new ruling (append the new entry; the newest entry for a topic wins)
- `no_silent_downscoping`: a directive is executed WHOLE — never silently reduced to the least-destructive subset; if a step looks destructive or wrong, SAY SO and ask (after consulting the log), never quietly skip it

## enforcement

- `pre_ask_hook`: ~/.claude/hooks/decision-log-guard.mjs _(PreToolUse on AskUserQuestion — injects both logs + the never-re-ask directive into context before any question reaches the user)_
- `tier_1`: CLAUDE.md + STANDARDS_ENTRY.md carry the consult-before-asking + append-same-turn rules

Last updated: 2026-07-12T00:00:00Z
```

## ═══ STANDARDS_CREATION_STANDARDS.md ═══

```markdown
# STANDARDS_CREATION_STANDARDS

> Governs: how to write a standard in `~/.claude/standards/` — the two-file Markdown shape, the machine-readable meta block, the `NAME#anchor` citation scheme, and what earns its own standard.

```meta
version: 2
enforced_by: scripts/verify-standards-meta.mjs
last_updated: 2026-07-26T03:13:32Z
```

## A standard is one discipline in two Markdown files

Every standard covers ONE discipline — never several bundled — and ships as exactly two files:

1. **`<NAME>.md`** — the rules. What an agent needs to APPLY and ENFORCE, in imperative Markdown. Self-sufficient; no rationale prose. This is the file agents load.
2. **`<NAME>.rationale.md`** — the why. The reason for every rule, edge cases, trade-offs, anti-patterns, worked examples. Loaded on demand.

Markdown, not YAML: an LLM parses clean sectioned Markdown reliably and authors it without the whitespace/colon/quote fragility YAML imposes. A standard that bundles multiple disciplines must be split — one discipline, one standard.

## `<NAME>.md` shape

- `# NAME` H1, then a one-line `> Governs: …` statement.
- Exactly one fenced ` ```meta ` block — the ONLY machine-parsed region. Required: `version` (int), `last_updated` (ISO-8601 UTC). Optional: `enforced_by` (gate path), plus any scalar a gate reads.
- `## <section>` headings, topic by topic. Rules as imperative bullets; tables for enums; conditional requirements stated inline. **Section headings ARE the citation anchors** — keep them stable and descriptive.
- Keep it lean: if a line could be removed without changing what the agent must do, remove it. Multi-line examples and rationale go in the rationale file.
- Final line: `Last updated: <iso-8601-utc>`.

## `<NAME>.rationale.md` shape

- One section per `<NAME>.md` section, explaining the why of that section — load-bearing rationale, not a restatement of the rule.
- Edge cases, trade-offs, anti-patterns, worked examples of correct AND incorrect usage.
- Final line: `Last updated: <iso-8601-utc>`.

## Citations — `NAME#section-anchor`

- Reference another standard's section as `NAME#section-anchor`, where the anchor is the kebab-case of a `##`/`###` heading in `NAME.md` (e.g. `FLOW_CONTRACT#journey-completeness`).
- Never a dotted key path. `verify-standards-meta.mjs` (check 6) validates every `NAME#anchor` resolves to a real heading, and every bare `NAME.md` reference exists.

## File-name convention

- Rules: `<NAME>.md`. Rationale: `<NAME>.rationale.md`. Base name `UPPER_SNAKE_CASE`.
- Location: `~/.claude/standards/`. Register both files in `INDEX.yaml` under the standard's key (`md:` + `rationale:`).
- No `-detail` kebab, no `_DETAIL`, no lowercase base names, no spaces.

## What earns its own standard

Three conditions, all required:

1. The rule set is a single coherent discipline (testing, gitflow, code style, agent operability, …). Not "miscellaneous things to remember."
2. It has at least one machine-enforceable element. Pure-prose social rules belong in `CLAUDE.md`.
3. It applies across projects, not just one. Project-specific conventions live in the project.

Fail any of the three → fold it into an existing standard or capture it as a memory / `CLAUDE.md` note.

## `last_updated` + versioning

- Every file carries `last_updated` (rules: in the `meta` block; rationale: as the final line). ISO-8601 UTC with trailing `Z`. Bump on every edit, even typos — it records "when did this file last reflect a deliberate decision."
- `version` (in the `meta` block) bumps only on a breaking change (a section renamed so a citation anchor breaks, a required field added/removed). Non-breaking additions don't bump. Git tracks history; the file itself does not.

## History-baked-in is banned

Standards read as declarative present tense, as if always this way. No OLD-vs-NEW comparisons, no "amendment vN", no dated parentheticals on rules, no migration narrative ("replaces the old X"). Past decisions live in commit messages. Enforced by `verify-no-history-baked-in.mjs`.

Last updated: 2026-07-26T03:13:32Z
```

## ═══ CONTEXT_ECONOMY.md ═══

```markdown
# CONTEXT_ECONOMY

> Context is a budget, not a landfill. Standards-following must get CHEAPER over time, never heavier.

```meta
version: 1
last_updated: 2026-07-25T15:22:50Z
```

## session_injection

- `budget`: 6000 _(chars, TOTAL additionalContext from the SessionStart hook)_
- `composition`: contract (fixed) + catalog (names only) + open lessons (open only) + failures (only when failing)
- `rule`: scopes/rules/details are ONE READ away (INDEX.yaml -> <NAME>.yaml) — never injected wholesale
- `enforced_by`: scripts/verify-standards-meta.mjs _(check 11 pipe-runs the hook and fails over budget)_

## agent_economy

- `read_scope`: an agent reads ONLY the standards in its standards_used list (+ INDEX for routing) — never sweeps the tree
- `output_contract`: strict verbatim-lines-only report formats with hard line caps — transcripts, file dumps, and narration never return to the orchestrator
- `model_fit`: haiku for mechanical run-and-quote work; sonnet only where judgment is the job
- `dispatch_rule`: one focused brief in, one capped report out; follow-ups via SendMessage to the same agent instead of re-briefing a new one
- `offload_rule`: token-heavy transient work (multi-file reads, wide searches, gate/test transcripts, open-ended
  investigation) MAY be dispatched to a pinned-cheap agent when the offload genuinely nets a saving — but only after
  the cheaper inline remedies (dispatch_discipline.prefer_inline) are exhausted. Dispatch is not the default reflex;
  it is the move when inline can no longer keep the loop lean.
- `offload_enforced_by`: hooks/context-bloat-guard.mjs _(PostToolUse: nudges when an inline)_
  _read/search/gate burst crosses the char threshold; leads with inline-summarize/trim, offload second;_
  _resets on subagent dispatch. Advisory (never blocks the tool). Disable with CONTEXT_BLOAT_GUARD=off._

## dispatch_discipline

- `default`: inline — Claude Code does the work in-session by reading the relevant <agent>.md as SOP
- `self_adjudicated`: the session decides whether a dispatch clears the bar; it NEVER prompts the user for per-dispatch approval. In autonomous runs the same self-gate applies with no user in the loop.
- `prefer_inline`: _(before dispatching ANY agent, exhaust the cheaper remedies first)_
  - summarize the finding inline and drop the raw output from working context
  - drop stale / no-longer-needed context rather than moving fresh work out
  - narrow the read (fewer files, tighter grep, targeted line ranges) so it never bloats
- `dispatch_only_when`: _(only after prefer_inline is exhausted AND at least one holds)_
  - `net_saving_offload`: the transient work is heavy enough that a subagent absorbing it (returning a capped report) saves more main-loop tokens across the remaining session than the subagent costs
  - `isolation_required`: parallel file mutation that would conflict inline (worktree)
  - `fresh_context_required`: a reproducibility / repo-blind exercise that must NOT see current context
  - `genuinely_bulk`: "more than 5 near-identical targets where clean capped output materially beats inline"
  - `heavy_verifier`: verifier Mode C / D
- `teams_effectively_never`: a multi-agent team (2+ full-context teammates) is the ~7x case — dispatch one ONLY when the task cannot be done any other way, with an explicit one-line justification. A team for speed or tidiness alone is NON-COMPLIANT.
- `justify`: every dispatch states in one line which dispatch_only_when case it clears and why inline is genuinely worse — a discipline the session applies to itself, recorded in its own reasoning, not a user-facing permission request
- `cheapest_model`: pick the cheapest model that fits (haiku for mechanical; sonnet only where judgment is the job) — model_fit still applies on top of the dispatch decision

## ledgers

- `injection`: decisions inject at question-time only (pre-ask hook); lessons inject open-only; terminated entries live on disk, not in context

Last updated: 2026-07-25T15:22:50Z
```
