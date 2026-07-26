# DIGEST for gate-runner-core.md — GENERATED, do not edit. Regenerate: node ~/.claude/standards/scripts/generate/generate-agent-digests.mjs
# sources:
#   VERIFIER_MODES.md 4398d7072b02f375
#   REPO_GATE_INSTALLATION.md 46c28688caf588cb
#   CONTEXT_ECONOMY.md bb97a1b65cb56163

## ═══ VERIFIER_MODES.md ═══

```markdown
# VERIFIER_MODES

> Scope: THE full 15-mode verifier catalog — SINGLE OWNER. No other file carries the catalog. LOCK_FILES.md owns the
semantics of the core modes (A/B/C/D/E) and cites this file for the catalog. Also owns the final-push / about-to-merge
mode-selection prompt. Siblings: ISSUES.md, BRANCHES_AND_COMMITS.md, PULL_REQUESTS.md, REPO_GATE_INSTALLATION.md (the
hooks that invoke these modes). ---------- verifier mode catalog (15 modes — SINGLE OWNER) ----------

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## verifier_modes

- `layers`:
  - `timestamp_ops`: letters A–F — read or write the `status:` / `last_validated:` fields on `__specs__/standards-compliance.yaml`
  - `heavy_proof`: named modes — actually execute code gates (typecheck, build, lint, unit, e2e)
  - `deep_ceremony`: named modes — unlock → Pristine + Compliance per feature → relock + checklist
- `lock_state_machine`: 'every `__specs__/standards-compliance.yaml` carries `status: locked | unlocked`; Mode A flips to unlocked at start, runs gates, flips back to locked with fresh last_validated on pass; interrupt mid-gates → stays unlocked (signal: slice not re-validated); Modes B / B.5 / D / F / F-Random refuse to validate any unlocked slice'
- `timestamp_modes`:
  - `mode_a`: { action: update, scope: one slice (this commit), gates: scoped Pristine + lock-shape (refuses to stamp on failure) }
  - `mode_b`: { action: validate, scope: HEAD only, read_only: true }
  - `mode_b5`: { action: validate, scope: uncommitted working tree (staged + unstaged), read_only: true }
  - `mode_c`: { action: update, scope: this branch (origin/main..HEAD), implementation: fans Mode A across every slice }
  - `mode_d`: { action: validate, scope: this branch (origin/main..HEAD), read_only: true }
  - `mode_e`: { action: update, scope: entire repo, implementation: fans Mode A across every slice }
  - `mode_f`: { action: validate, scope: entire repo, read_only: true }
  - `mode_f_random`: { action: validate, scope: random ~20% of repo, read_only: true }
- `heavy_proof_modes`:
  - `mode_pristine`: typecheck + build + lint + unit tests + e2e tests
  - `mode_compliance`: the 11-script compliance chain (specs/flows/manuals/lock-files/source-coverage/freshness/RULE 0 boundaries/UI gates)
  - `mode_pristine_and_compliance`: Pristine then Compliance — the pre-merge gate (manual, on-demand)
- `deep_ceremony_modes`:
  - `mode_verify_all`: feature-by-feature deep ceremony with checklist; hours-long; manual
  - `mode_verify_all_random`: same as verify-all on random ~20% feature subset
- `inspection_maintenance_modes`:
  - `mode_inspect`: read-only walk of every lock — status + last_validated + freshness; no execution
  - `mode_cleanup_orphans`: detect orphan lock files + dead catalog entries; report-only by default

## final_push_gate

- `owner`: PM agent (when present) OR developer-invoked directly
- `prompt`: "Last full verify was {N} ago. Pick: (B) HEAD stamp check; (D) branch stamp check; (Pristine+Compliance) full code gates; (Verify-All) deep ceremony."
- `modes`:
  - `B`: HEAD-only stamp check
  - `D`: branch (origin/main..HEAD) stamp check Pristine+Compliance: full code gates on every slice + 11-script compliance chain (no per-slice unlock/relock)
  - `Verify-All`: feature-by-feature deep ceremony (unlock → Pristine + Compliance → relock); hours-long
- `house_clean_trigger`:
  - `commits_since_last_verify_all`: 25
  - `days_since_last_verify_all`: 7
  - `behaviour`: prompt fires regardless of developer intent when either threshold is hit
- `exit_required`: 0 from the chosen mode
- `see`: AGENT_ARCHITECTURE.md _(full lifecycle spec)_

Last updated: 2026-07-12T00:00:00Z
```

## ═══ REPO_GATE_INSTALLATION.md ═══

```markdown
# REPO_GATE_INSTALLATION

> Scope: hook + installer mechanics — the pre-push gate (chain + shape checks incl. the stamped-HEAD rule), the
pre-commit gate, the commit-msg anti-fake rule, the pr-shape CI workflow, the installer contract, and one-time repo
setup. Siblings: ISSUES.md, BRANCHES_AND_COMMITS.md (the rules the hooks enforce), PULL_REQUESTS.md, VERIFIER_MODES.md
(the modes the hooks invoke). ---------- pre-push gate (MECHANICAL 100% — no green, no push) ----------

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## pre_push_gate

- `doctrine`: no 100% standards compliance, no push — the pre-push hook is a MECHANICAL, non-bypassable gate that EXECUTES the standards chain and REFUSES the push (non-zero exit) on ANY failure; it runs the real gates, never merely trusts slice stamps (a stale / missing / wrong-scoped stamp must not pass)
- `runs_in_order`: _(every step; first non-zero exit aborts the push)_
  - stamps: EVERY feature's __specs__/standards-compliance.yaml — backend AND UI (component/composite/page) — present + status:locked + verified:100% + fresh (git-history freshness; see LOCK_FILES.md)
  - pristine: each package's `verify` — typecheck + lint + unit tests + 100% coverage + build (+ storybook build for the design-system package)
  - compliance: the full discipline chain runnable without external services — component/composite/page gates + source-coverage + freshness
- `coverage_rule`: the gate MUST run against every package that ships code in this repo; adding a package without wiring it into the gate is itself a violation
- `exit_required`: 0
- `no_green_no_push`: true
- `bypass`: FORBIDDEN — `git push --no-verify` / `-o` is a standards violation; FIX the failing gate (re-walk + re-stamp + commit, fix source, update spec), never bypass
- `enforcement`: Husky pre-push hook (core.hooksPath) executes the chain; non-zero exit aborts the push before it reaches the remote
- `external_service_gates`: _(things that need a DB / live reference / network)_
  - `run_in`: CI (they gate the MERGE, not the push)
  - `examples`: DB-integration tests, live/reference parity, headless scenario suites
- `ci_required`: true _(CI mirrors the local chain AND adds the external-service gates; a red CI blocks the merge)_

## pre_push_hook

_generated by install-slice-gates.sh; NO bypass exists_

- `refuses`:
  - direct pushes to main (main moves only via PR merge)
  - branch names outside (feat|fix)/NNNN-kebab-slug
  - "any pushed commit whose subject lacks the <type>: <subject> shape or exceeds 65 chars (squash-suffix headroom for the 72 limit)"
  - pushes on a day whose docs/conversations/DAILY_CONVERSATION_<utc-date>.md does not exist on disk
  - a non-zero `pnpm verify` (verifier Mode B — VERIFIER_MODES#verifier-modes)
  - an outgoing HEAD that is not a "100% standards met" stamped commit (stamp emitted ONLY by scripts/verify/stamp-standards-met.mjs against a fresh green receipt — see commit_msg_gate)

## pre_commit_gate

- `owner`: Mode A (slice stamp) _(VERIFIER_MODES#verifier-modes)_
- `scope`: 'for the slice owning the staged files — run scoped Pristine + lock-shape gates; on pass flip `status: locked` and update `last_validated`; on fail refuse the commit'
- `enforcement`: pre-commit hook invokes Mode A against the touched slice path
- `gate_1_protected_branch`: a commit on a protected branch (main / master / staging) is refused unless I_REALLY_MEAN_<BRANCH>=1 is set for THAT commit
- `gate_2_commit_stamp`: behavior files (<web>/src/** excluding __specs__/, __tests__/, __manual__/, __stories__/) require the nearest __specs__/standards-compliance.yaml to be status:locked + verified:100% + last_validated within the 30-min same-commit grace window (verify-commit-stamp.mjs; matches LOCK_FILES#verification)

## commit_msg_gate

- `rule`: 'a commit message claiming "100% standards met" is refused unless a FRESH green receipt exists (.git/verify-receipt.json — written ONLY by verify-all.mjs on all-green, expires after 10 min); the stamp commit is created ONLY by scripts/verify/stamp-standards-met.mjs, which also refuses a dirty working tree; hand-typing the stamp message is a violation the hook refuses'
- `receipt_producer`: verify-all.mjs — the ONLY producer of the proof that "100% standards met" is real; written exclusively on all-green
- `stamp_producer`: 'scripts/verify/stamp-standards-met.mjs — an empty commit `chore: 100% standards met [<gates>/<gates> gates, <ts>]`'

## pr_shape_ci

- `file`: .github/workflows/pr-shape.yml
- `rule`: server-side re-validation of branch shape, title (type + ≤65 chars), body sections, gate proofs, Closes trailer — red check on any violation

## installer

- `script`: scripts/install-slice-gates.sh
- `generates`:
  - <web>/.husky/pre-push _(the pre_push_hook shape checks + pnpm verify)_
  - .git/hooks/pre-commit _(Gate 1 (protected branch) + Gate 2 (verify-commit-stamp))_
  - <web>/scripts/verify/verify-commit-stamp.mjs _(installed when README.yaml.status != planning)_
- `hooks_path`: git config core.hooksPath = <web>/.husky
- `no_hand_edits`: generated hooks carry "DO NOT EDIT — generated by install-slice-gates.sh"; regenerate via the installer, never edit in place

## repo_setup

- `required`:
  - "main branch protected against direct push"
  - "Husky pre-push hook installed (invokes verifier Mode B)"
  - "GitHub Project board created + URL recorded in reference.md"
  - "reference.md present at repo root with: repo URL, project URL, deploy URL, env-vars location"

Last updated: 2026-07-12T00:00:00Z
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
