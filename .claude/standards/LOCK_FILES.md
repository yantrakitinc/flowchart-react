# LOCK_FILES

> agent needs to APPLY and ENFORCE: the per-feature lock file (standards-compliance.md) schema, the exception.yaml waiver, the testing surfaces required for the lock, the verify gates over the stamps, core verifier mode semantics + stamping authority, and the compliant/<sha> tag. The three-phase writing order that EARNS the stamp: WRITING_ORDER.md. ---------- per-feature lock file ----------

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## file

- `name`: standards-compliance.md
- `location`: <feature>/__specs__/standards-compliance.md
- `required_in`: every folder containing __specs__/
- `minimal_by_design`: required fields ONLY — never pad with spec/flows/tests/manual/notes; verifiers read only status/verified/last_validated; history lives in the changelog (changelog.mdx) + git, not here

## schema

- `status`: enum[locked, unlocked] _("locked" at compliant-tag time)_
- `verified`: enum["100%"] _(ONLY value; no fractional compliance)_
- `last_validated`: iso8601_datetime _(UTC, e.g. 2026-05-20T04:06:03Z)_
- `feature`: path _(path to feature folder from repo root)_
- `standards`: map _(EVERY standard registered in INDEX.yaml, none omitted;)_
    _per-standard verdict enum: "100%" | "NOT REQUIRED"._
    _Deliberate stamping — a missing standard or any other verdict_
    _fails verify-standards-compliance._

## exception_file

- `name`: exception.yaml
- `location`: <feature>/__specs__/exception.yaml
- `required_in`: none — present ONLY when a justified, case-by-case waiver is needed; the escape hatch of last resort, never a default bar-lowering
- `schema`:
  - `exceptions`: 'list of { rule: <verifier/check id, e.g. verify-component-tokens>, reason: <REQUIRED — why this case warrants the waiver>, approved_by: <who signed off — the user>, added: <iso8601_date> }'
- `enforcement`: every verifier loads <feature>/__specs__/exception.yaml (via _load-exceptions.mjs); a violation whose `rule` matches an exception is SKIPPED and logged as an accepted exception with its reason — never silently, never without a `reason`; no file or no matching entry → the gate fails as normal

## testing_surfaces

- `required_for_lock`: 1:
    - `name`: unit / integration
    - `tool`: Vitest (or per-project equivalent)
    - `coverage`: 100% lines / branches / functions / statements 2:
    - `name`: scripted E2E
    - `tool`: Playwright (or per-project equivalent)
    - `assertion`: real transport AND persisted state 3:
    - `name`: manual API
    - `tool`: Chrome-extension agent driving Swagger UI
    - `coverage`: one flow per endpoint 4:
    - `name`: manual UI
    - `tool`: Chrome-extension agent driving __specs__/manual/<flow>.md
    - `coverage`: every user-facing surface
- `rule`: NO production ship until all 4 are green for every user-facing surface
- `see`:
  - WRITING_ORDER#writing-order _(the lock-time walk that exercises these surfaces)_
  - TEST_STACK.md _(surface-specific tooling rules)_

## verification

- `per_rule_grep_gates`: forbidden
- `shape_check`:
  - `script`: verify-standards-compliance
  - `rule`: every folder containing __specs__/ has __specs__/standards-compliance.md
  - `asserts`:
    - status == "locked"
    - verified == "100%"
    - last_validated is a valid ISO-8601 UTC datetime
  - `runtime`: fast
  - `runs_in`: pnpm verify (every push)
- `freshness_check`:
  - `rule`: most recent commit touching the feature folder (excluding the lock file itself) ≤ standards-compliance.md.last_validated + same_commit_grace_ms
  - `signal`: 'git log -1 --format=%aI -- <feature-folder> :(exclude)<lock-relative-path>'
  - `NOT`: filesystem mtime — git operations reset mtime; only git history is the truth
  - `same_commit_grace_ms`: 1800000 _(30 min — covers the gap between coder finishing and verifier stamping in the same commit)_
  - `on_fail`: feature is stale; verifier Mode A walk + re-stamp required
  - `runtime`: slow (one git call per lock)
  - `runs_in`: pnpm verify:full + verifier Mode B + Mode D

## verifier_modes

- `full_mode_catalog`: VERIFIER_MODES.md _(single owner of the 15-mode catalog; this file keeps only lock/stamp semantics)_
- `full_mode_catalog`: VERIFIER_MODES.md
- `A`:
  - `name`: slice-on-commit
  - `when`: coder finishes a slice; orchestrator routes the handoff
  - `scope`: just-written code + blast radius (callers, callees, tests, specs)
  - `runs`:
    - targeted `pnpm vitest run <blast-radius-paths>` (NOT full suite)
    - "`pnpm typecheck` (whole-project — TS doesn't scope cleanly)"
    - "`pnpm lint <blast-radius-paths>` (scoped)"
    - PRIMARY RULE boundary greps against the slice's DB code
    - verify-manual-playbooks: a runnable .md flow EXISTS + is valid for each new surface (authoring is the per-slice gate; RUNNING the flows is the Mode E ritual)
    - flow doc / test cross-reference for slice's flows
  - `on_green`: stamp standards-compliance.md (status:locked, verified:100%, last_validated:<utc-now>)
  - `default_execution`: INLINE (Claude Code reads ~/.claude/agents/verifier.md and runs it)
- `B`:
  - `name`: push-time stamp check
  - `when`: every routine push
  - `scope`: stamps only — no code execution
  - `runs`:
    - shape_check (per-lock presence + status:locked + verified:100% + valid ISO-8601 UTC)
    - freshness_check (git-history-based)
  - `stamps`: NO — Mode B only reads stamps; never writes
  - `default_execution`: INLINE
- `C`:
  - `name`: push-time slice re-verify
  - `when`: opt-in at final-push prompt (recommended for tricky features / major security implications / dependency-shifting changes)
  - `scope`: every slice in this push, end-to-end
  - `runs`: Mode A per slice
  - `stamps`: YES — via the Mode A calls it spawns; each touched slice re-stamped on green
  - `default_execution`: SUBAGENT (dispatch ~/.claude/agents/verifier-core.md with mode=C)
- `D`:
  - `name`: full end-to-end
  - `when`: opt-in at final-push prompt OR house_clean_trigger (25 commits / 7 days since last D)
  - `scope`: whole repo
  - `runs`:
    - "`pnpm typecheck`"
    - "`pnpm lint`"
    - "`pnpm verify:full` (all standards-side verify scripts)"
    - "`pnpm test:coverage` (full suite + coverage)"
    - cross-reference every flow doc / manual playbook against tests (project-wide)
    - PRIMARY RULE grep checks across the whole repo
  - `stamps`: NO — Mode D verifies repo-wide health, NOT per-slice walks; stamping a per-slice lock requires Mode A (or Mode C orchestrating A per slice)
  - `default_execution`: SUBAGENT (dispatch ~/.claude/agents/verifier-core.md with mode=D)
  - `on_green`: eligible for `git tag compliant/<sha>` (orchestrator tags; verifier does not)
- `E`:
  - `name`: manual QA pass (RUN the flows)
  - `when`: pre-release / pre-tag ritual (NOT per-PR) — the hybrid half of manual-flow compliance
  - `scope`: every __specs__/manual/<flow>.md in the repo
  - `runs`:
    - boot the app locally (and Storybook too, for component QA flows)
    - 'drive each flow with the Claude Code Chrome extension (full autonomy): it executes the steps and POSTs results to the local-only /api/v1/manual-results/<flow> route'
    - 'the CLI agent reads manual-results/ and triages each flow: every assertion held AND nothing in the MUST-NOT list happened'
  - `stamps`: NO — results live in the git-ignored manual-results/; this ritual gates a RELEASE, not a per-slice lock
  - `default_execution`: human-triggered in the browser; the CLI agent reads + acts on the posted results
  - `note`: authoring the flow is the per-PR gate (Mode A + verify-manual-playbooks); RUNNING it is Mode E. A FEATURE is compliant when the flow is authored; a RELEASE is QA-passed when Mode E is green.

## stamping_authority

- `rule`: only verifier Mode A writes last_validated; Mode C writes last_validated indirectly by spawning Mode A per slice
- `mode_a`: writes last_validated on green (slice-on-commit)
- `mode_b`: reads last_validated; never writes
- `mode_c`: spawns Mode A per slice — writes last_validated transitively
- `mode_d`: reads via freshness_check; NEVER writes last_validated — by design (Mode D verifies repo-wide health, not per-slice walks)
- `on_mode_d_green_with_stale_stamps`: legitimate — run Mode C to refresh stamps OR accept that locks reflect the last per-slice walk, not the latest repo-wide gate

## on_user_question

- `procedure`: dispatch verifier (Mode D or B); quote its output verbatim
- `reply_all_green`: '"yes — last full verify <date>"'
- `reply_any_stale`: name failing folder(s) + reproduction

## compliant_tag

- `format`: compliant/<sha>
- `emitted_when`: green verifier Mode D OR every commit at which all features are 100% standards compliant
- `purpose`: revert anchor — last known 100% commit
- `authority`: orchestrator tags after verifier reports green; verifier does NOT tag itself

Last updated: 2026-07-12T00:00:00Z