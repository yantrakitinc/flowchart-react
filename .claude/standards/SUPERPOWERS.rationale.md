# SUPERPOWERS — detail

Why each rule in `SUPERPOWERS.md` exists.

## Why this standard exists at all

The `superpowers@claude-plugins-official` plugin ships a catalog of skills (brainstorming, writing-plans, test-driven-development, etc.) that auto-trigger at session start + task transitions. Without this standard, the agent uses the skills inconsistently — sometimes invoking them, sometimes forgetting, sometimes letting skill defaults override repo standards.

This standard does two things: (1) declares the priority rule (standards beat skills on conflict), and (2) maps the canonical workflow + output locations.

## Priority — standards beat skills

A skill might say "always do X" while a standard says "never do X." The agent follows the standard, notes the conflict, doesn't silently obey the skill. This rule exists because skills evolve via plugin updates outside this machine's control; standards are versioned + authored here. Standards are the local source of truth.

The "note the conflict" clause matters — if a skill conflicts with a standard, surfacing it lets the user choose to update the standard, file an issue on the plugin, or override per-task.

## Slash commands

Three commands are the workflow entry points:

- `/brainstorm` → invokes the brainstorming skill → designs the feature + writes the spec before any code.
- `/write-plan` → turns the spec into a bite-sized task list (2-5 minute tasks with file paths + verification).
- `/execute-plan` → walks the plan with human checkpoints between tasks.

The user types these to trigger the workflow at the right moment. The agent doesn't auto-trigger them; the user is in control.

## Skill catalog

Skills are grouped by phase. Listing them under `process/planning/execution/code_review/branch_worktree/meta` mirrors the lifecycle of a feature: think first (process), plan next, execute, review, branch hygiene, and the meta skill that bootstraps the rest.

**Execution skills — preference rules:**

- `executing-plans` is preferred over `subagent-driven-development`. Subagents cost ~7x tokens compared to inline execution. The user pays for tokens; defaulting to inline saves money. Subagents are useful when fresh-context-per-task is genuinely justified (independent investigations, parallel implementations), not as the default.
- `dispatching-parallel-agents` carries the same token caveat. Use only when the work IS genuinely parallel.

## Canonical workflow

The 8-step workflow integrates the skills with the BRANCHES_AND_COMMITS + WRITING_ORDER regime:

1. **Brainstorm** → the spec is born. Lands in `<feature>/__specs__/spec.md`. NOT a separate timestamped doc.
2. **Worktree** → isolated branch (`feat/NNNN-...` per BRANCHES_AND_COMMITS).
3. **Write plan** → step-by-step plan at `docs/plans/YYYY-MM-DD-<feature>.md`.
4. **Execute plan** → walk the plan inline with checkpoints.
5. **TDD per task** → red → green → refactor.
6. **Request review** → pre-review checklist + dispatch.
7. **Verify** → run `verify-standards-compliance` (presence + freshness gate) + the manual walk + stamp `__specs__/standards-compliance.md`.
8. **Finish branch** → merge / PR / cleanup options.

This integrates the plugin's skill outputs with the standards' artifacts. Brainstorming doesn't dump into `docs/superpowers/specs/` — it writes the actual per-feature spec.md. Verification doesn't produce a `code-confidence.md` — it stamps the standards-compliance.md lock file.

## Output locations — `__specs__/` for specs; `docs/plans/` for plans

Skill outputs land in the same trees the rest of the codebase uses — no parallel `docs/superpowers/` doc system:
- **Specs** land in `<feature>/__specs__/spec.md`. The brainstorming output IS the per-feature spec; there's no separate "design doc" that gets translated later.
- **Plans** stay in `docs/plans/YYYY-MM-DD-<feature>.md`. Plans are cross-feature workflow artifacts (this slice will touch features X, Y, Z) — they don't belong inside any one feature's `__specs__/`. Date-stamping is for chronological recall ("what was the plan we wrote last Tuesday?").

## When NOT to use

Three classes of work where the plugin adds friction without value:

1. **Pure mechanical work** — renaming folders, running git commands, copy/pasting config. The skills assume there's design work to do; for mechanical work there isn't.
2. **Conversational questions** — "what does this code do?" doesn't need brainstorming + a plan + TDD.
3. **When a standard forbids** — see Priority above.

The skill catalog is for genuinely-creative work. Don't force it on tasks that don't fit.

## Updating

The plugin is updated via `/plugin → select superpowers@claude-plugins-official → version + update`. New skills + new versions land via that path. The source is upstream at github.com/obra/superpowers.

Last updated: 2026-05-20T04:06:03Z
