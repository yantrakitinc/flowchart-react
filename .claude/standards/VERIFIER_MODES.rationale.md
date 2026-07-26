# VERIFIER_MODES — detail

Why each rule in `VERIFIER_MODES.md` exists.

## Why a single owner for the mode catalog

`VERIFIER_MODES.md` is the single owner of the full 15-mode catalog because the modes are invoked from git lifecycle points (pre-commit, pre-push, final-push, house-clean — see `REPO_GATE_INSTALLATION.md`). `LOCK_FILES.md` owns the semantics of the core modes (A stamps, B reads, C fans A, D repo-wide read-only, E manual QA) and cites the catalog here. Two competing catalogs would drift; one catalog, one owner.

The three layers separate cost classes: timestamp ops (letters) are cheap stamp reads/writes; heavy proof modes actually execute code gates; deep ceremonies are the hours-long per-feature walks. Naming the layer tells the invoker what they're paying for.

## Final-push gate — why a mode-selection prompt

Deeper gates (re-running Mode A across every slice in the push, or the full end-to-end Mode D) are opt-in at the final-push prompt because their cost varies by orders of magnitude — a HEAD stamp check is seconds, Verify-All is hours. The prompt names the elapsed time since the last full verify so the picker is informed, and the house-clean trigger (25 commits or 7 days) fires the prompt regardless of intent so the deep walk cannot be indefinitely deferred. See `.claude/agents/AGENT_ARCHITECTURE.md` for the lifecycle.

Last updated: 2026-07-12T00:00:00Z
