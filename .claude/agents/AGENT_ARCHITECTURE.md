# Agent Architecture

The 5-agent ecosystem for the spec-first per-feature coding workflow: `pm` / `feature-spec-writer` / `coder` / `verifier` (with four modes) / `github-project-agent`. The pm holds the WHAT (project state + lifecycle decisions); the other four hold the HOW (design, implementation, gates, ticket mechanics).

## Three-tier UI work — separate SOP at `THREE_TIER_UI.md`

When the slice touches design-system primitives, composites, or pages (collectively "UI tier work"), every agent above reads `~/.claude/agents/THREE_TIER_UI.md` FIRST and follows the tier-specific phase order + verifier chain + lock-marker rules in addition to their own SOP. `THREE_TIER_UI.md` is read by `pm`, `feature-spec-writer`, `coder`, and `verifier` whenever the work lands under `src/components/ui/**`, `src/features/<feature>/components/**`, `src/components/composites/**`, `src/app/**`, or any extension surface (`packages/<pkg>/src/{sidepanel,popup,options}/**`). Non-tier feature work (`src/features/<feature>/<NotAComponent>.ts`) follows the agents' base SOPs only.

This ecosystem runs DURING feature implementation — the per-slice spec / code / verify / ticket loop. Strategic / architectural / GTM document writing (project kick-off, primitive research, launch planning) sits OUTSIDE this ecosystem and is handled inline by the active Claude Code session rather than by named agents.

---

## Inline-first doctrine — Claude Code executes; subagents are the 5%

Two costs compete, and the default resolves toward inline. A subagent spins up its own context window (a multi-agent TEAM runs up to ~7x); inline work runs on the session model, where every token it pulls in is re-read on every later turn. A single offload agent is ~1x its own context and often net-saves the loop by absorbing transient tokens that would otherwise re-cost all session — but that payoff is earned, not reflexive. Before dispatching, exhaust the cheaper inline moves first: summarize the finding and drop the raw output, discard stale context, narrow the read. Dispatch is the last resort — the move when inline can no longer keep the loop lean — and the session self-adjudicates it (it never asks the user per-dispatch, including in autonomous runs). Full rule: `CONTEXT_ECONOMY#dispatch-discipline`. Each agent has TWO files:

- **`<agent>.md`** — Claude Code's SOP. Full doctrine. Read inline when doing the work yourself. Has a "Read also" pointer to `-core.md` for the dispatch contract — no duplication.
- **`<agent>-core.md`** — the dispatchable subagent (registered with `name:` frontmatter). Self-contained. Loaded when isolation OR context economy earns it.

Dispatch the `-core` agent ONLY after the cheap inline remedies are exhausted AND one of these holds:

1. **Reproducibility exercise** — fresh agent given ONLY the locked spec / artifacts (no access to current source); proves the spec is sufficient.
2. **Parallel independent investigation** — 2+ agents searching simultaneously genuinely beats serial inline (not merely tidier).
3. **Bulk / sweep / audit** — >5-target operation where clean output materially wins and the dry-run preview shouldn't pollute conversation context.
4. **Heavy verifier modes** (C / D) — whole-push or whole-repo runs that produce big output better isolated.
5. **Net-saving context-bloat offload** — the remaining transient work is heavy enough that a subagent absorbing it saves more main-loop tokens across the rest of the session than the subagent costs. Not a reflex at the first big read: summarize-and-drop, discard stale context, and narrow the read come first; offload only what genuinely must be worked and cannot be trimmed.

A multi-agent **team** (2+ full-context teammates) is the ~7x case — reserve it for tasks that cannot be done any other way, with explicit justification; never for speed or tidiness alone.

Runs inline: single-slice spec writing, single-slice coding, Mode A slice verification, Mode B push-time stamp check, single-target gh ops, and any read whose result must live in working context. When an inline task starts ballooning context, first summarize/trim; offload the remainder only if it clears the bar above.

## Model selection at dispatch

Each `-core.md` frontmatter pins the cheapest model that handles the agent's routine work — the pin is the FLOOR, not a ceiling. The dispatcher (active session / pm) reads the agent's `model_selection` rubric before every dispatch and passes a per-dispatch `model` override ONLY when a rubric trigger fires; the override names the trigger in the dispatch prompt's first line. No trigger → dispatch on the pin. Escalation above `opus` requires an explicit user instruction.

**Standards outrank the cost pin — this is the tie-break.** The pin minimizes cost; it NEVER lowers the standards bar. Standards adherence is guaranteed by the gates, not by model tier: a pinned-cheap agent that produces a non-compliant slice is caught by its gate and must redo it. So a too-cheap tier does not breach standards — it costs MORE (extra drive-to-green cycles), not less. The floor therefore is "cheap enough to clear its standards gates first-try, never cheaper." When a slice is standards-dense and the pinned tier risks a deviation its gates would not mechanically catch, escalate a tier rather than ship. Where cost and standards conflict, standards win; the only cost saving on the table is the retries that a compliant-first-pass avoids.

---

## Agents

### pm — project state + orchestration

- Holds the project's WHAT: current branch, sprint, WIP, blocked, slice dependencies, lifecycle triggers.
- Owns the product-level journey loop (`USER_JOURNEYS.md`) that precedes all feature work: dispatches `journey-cartographer-core` for the repo-blind DISCOVER pass, then drives MATCH → RECONCILE → UPDATE and keeps `docs/journeys/00-INDEX.md` reconciled bidirectionally before any feature spec_phase starts.
- Decides the next action; delegates HOW to specialists.
- Watches the house-clean trigger (25 commits OR 7 days since last Mode D) + the final-push prompt.
- **Speaks in typed commands to github-project-agent** (READ / WRITE / BULK + intent); never sends raw `gh` calls directly.
- Routes handoffs between feature-spec-writer → coder → verifier.
- Auto-authorizes mechanical `README.yaml` updates (default-label addition for a known GH account, status-field option ID refresh); identity-bearing updates (new GH account, new repo binding, cross-team handles) bubble to human.
- Never writes code, specs, tests, or tickets directly.

### feature-spec-writer — design phase

- Writes `__specs__/spec.md` + `spec.md` + `flows/*.flow.md` + `manual/*.yaml`.
- Locks the spec when ready.
- **Available for dialogue with the coder.** When the coder pushes back on the spec, the feature-spec-writer:
  - (a) updates the spec,
  - (b) adds a clarification *within the spec*, OR
  - (c) explains the rationale back to the coder (often becoming a note inside the spec so the next reader benefits).
- Does NOT write code. Does NOT write tests.

### coder — implementation

- Reads the locked spec.
- Writes source code + tests.
- Red/green TDD allowed — runs ONLY the targeted tests it just wrote, for its own red/green cycle. That is the ONLY testing it does.
- **Talks to the feature-spec-writer** when the spec is unclear, internally contradictory, or improvable. Does NOT silently deviate.
- Does NOT run `pnpm verify`. Does NOT run `pnpm typecheck` / `pnpm lint` as gates. Does NOT iterate against the full repo. Does NOT stamp anything.
- Hands off to the verifier when writing is done.

### Predictability invariant (shared by feature-spec-writer + coder)

Two independent coders fed the same locked spec produce code that is *behaviorally equivalent*:

- Same inputs → same outputs.
- Same observable contract.
- Internal implementation details (variable names, helper organization) may differ.

feature-spec-writer obligation: write the spec precisely enough to make that possible.
coder obligation: write code that conforms to that contract without sneaking in non-spec'd behavior.

### verifier — four modes

| Mode | When | Scope | Stamps? | Default execution |
|---|---|---|---|---|
| **A — slice-on-commit** | Coder finishes a slice; orchestrator routes the handoff. | Just-written code + blast radius (callers, callees, tests, specs). Targeted `pnpm vitest run <paths>`. | ✅ stamps `last_validated` on green | INLINE (Claude Code) |
| **B — push-time stamp check** | Every routine push. | Read every lock; check presence + freshness via git history. No code execution. Trusts stamps. | ❌ | INLINE |
| **C — push-time slice re-verify** | Opt-in at final-push prompt (recommended for tricky / security features). | Re-runs Mode A on every slice in this push. | ✅ via the Mode A calls it spawns | SUBAGENT (dispatch `verifier-core`) |
| **D — full end-to-end** | Opt-in at final-push prompt OR house-clean trigger. | Whole-repo `pnpm verify:full` + full `pnpm test:coverage` + cross-reference every flow/manual. | ❌ **by design** — Mode D verifies repo-wide health, not per-slice walks | SUBAGENT (dispatch `verifier-core`) |

A green Mode D with stale per-slice stamps is legitimate, not a contradiction; refresh via Mode C.

### github-project-agent — ticket + project mechanics

- Executes GitHub Issues + Projects operations (create / edit / transition / link / search / bulk) under the universal contract (`BRANCHES_AND_COMMITS.md / PULL_REQUESTS.md / ISSUES.md`) using per-repo bindings from the project's `README.yaml`.
- **First action on any GH op:** read `README.yaml`, run `gh auth switch --user <github.account>`.
- Accepts natural-language input from humans AND structured commands from PM.
- Post-write verification (read-after-every-write) catches silent CLI / GraphQL routing failures.
- Dry-run preview on any op touching >5 tickets; awaits explicit go before execution.
- Never decides ticket type / scope / closure — caller supplies intent.

---

## Lifecycle events

### Routine push (any push to the feature branch)
- PM routes to verifier Mode B. Nothing else.

### Final push / about-to-merge — a verify ALWAYS runs
PM prompts the developer:

> *"Last full verify was {N} ago. Pick: (B) just stamp check — fastest; (C) re-verify every slice in this push — recommended for tricky / security features; (D) full end-to-end — heaviest."*

Same prompt fires on PM's house-clean trigger (25 commits OR 7 days since the last full verify).

### Reproducibility exercise (occasional, on-demand)
- Orchestrator dispatches a fresh `coder-core` subagent.
- Hands it ONLY an existing locked spec — no access to the existing source code.
- Coder produces code from the spec alone.
- Run that code against the ORIGINAL unit tests.
- **Tests pass** → spec is sufficient.
- **Tests fail** → gap somewhere:
  - in the spec (doesn't capture the actual contract)
  - in the original tests (don't enforce what they claim)
  - in the original code (had behavior the tests didn't catch)
- Outcome triggers feature-spec-writer + verifier follow-up.

---

## Binding source — README.yaml

Every project's root `README.yaml` carries the machine-readable bindings. Example (exemplar from one of the user's repos; field names + shape are universal):

```yaml
project_name: com.yantrakit.audit
description: "Universal audit-event store"
github:
  account: yantrakitinc                     # gh auth switch --user <this>
  owner: yantrakitinc
  repo: com.yantrakit.audit
  repo_url: https://github.com/yantrakitinc/com.yantrakit.audit
  project_board_number: 26
local_dev_url: http://audit.local:51439
production_url: https://audit.yantrakit.com
last_updated: 2026-05-25T00:00:00Z
```

The github-project-agent reads `README.yaml` on every dispatch; refuses if any required field is missing.

---

## What the architecture rules out

- Coder writing the spec (feature-spec-writer owns it)
- Coder silently deviating from the spec (dialogue is mandatory)
- Coder running full `pnpm verify` 5–8 times per slice
- Coder running typecheck / lint as release gates
- PM writing tickets, specs, code, or tests directly
- PM sending raw `gh` calls (typed commands to github-project-agent only)
- github-project-agent skipping post-write verification
- github-project-agent acting on bulk ops without a dry-run preview
- Pre-commit hook running the full chain on every commit
- Verifier running `pnpm test:coverage` over the full suite on every Mode A dispatch
- "Always-on" verify scripts firing on every dispatch
- Routine pushes triggering anything beyond a stamp check

## What stays

- Every slice still goes feature-spec-writer → coder → verifier → stamp.
- 100% coverage perFile, but only on the code that changed in that slice.
- Locks still exist; verifier owns the stamp.
- A verify ALWAYS runs at final push — developer picks the depth (B / C / D).
- Full verification still exists, on-demand or house-clean-triggered.
- Reproducibility exercises catch spec / test / code gaps that day-to-day verification cannot.
- PM holds project state + lifecycle authority; specialists execute mechanics.
- github-project-agent is the single chokepoint for every GitHub Issues / Projects write.

Last updated: 2026-05-25T00:00:00Z
