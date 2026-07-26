# REPO_GATE_INSTALLATION — detail

Why each rule in `REPO_GATE_INSTALLATION.md` exists. The hooks are the enforcement points for the sibling standards (`ISSUES` / `BRANCHES_AND_COMMITS` / `PULL_REQUESTS`); without installed gates, those standards are advisory prose.

## Pre-push gate — executes the real chain

The pre-push hook EXECUTES the standards chain (stamps → pristine → compliance) and refuses the push on any non-zero exit. It does not merely trust slice stamps — a stamps-only gate lets non-compliant code through whenever a stamp is stale, missing, or scoped to the wrong package set. The gate runs the real gates. The coverage rule (every shipping package wired into the gate) exists because an unwired package is a silent hole: its code pushes ungated forever.

Deeper gates (re-running Mode A across every slice in the push, or the full end-to-end Mode D) are opt-in at the final-push prompt — see `VERIFIER_MODES#final-push-gate` and `.claude/agents/AGENT_ARCHITECTURE.md` for the lifecycle.

The pre-push hook is the enforcement point — exit non-zero refuses the push before it reaches the remote. CI mirrors the local chain and adds the external-service gates (DB-integration, live parity, headless suites) that can't run locally; those gate the MERGE, not the push.

## Stamped HEAD + commit-msg anti-fake — why a receipt

A stamp that can be hand-typed is a stamp that will eventually be faked under deadline pressure. The chain of custody is: `verify-all.mjs` writes the green receipt ONLY on all-green; `stamp-standards-met.mjs` creates the stamp commit ONLY against a fresh (≤10 min) receipt and a clean tree; the commit-msg hook refuses any hand-typed "100% standards met" message lacking that receipt; the pre-push hook requires the outgoing HEAD to be a stamped commit. Every link is mechanical, so the claim "100% standards met" is either backed by an executed green chain or the push never leaves the machine.

## Pre-commit gates — why two

Gate 1 (protected-branch flag) makes a direct commit to main/master/staging a deliberate two-step act (`I_REALLY_MEAN_<BRANCH>=1`), never a reflex. Gate 2 (verify-commit-stamp) mechanizes the delegate-to-coder rule: a behavior change without a fresh verifier Mode A stamp means the spec-writer → coder → verifier chain was skipped and inlined; the 30-minute grace window forces the verifier to have run within the last half hour of the commit.

## Installer — why generated hooks

`install-slice-gates.sh` generates the hooks so every repo carries byte-identical enforcement; a hand-edited hook is a per-repo fork of the gate that drifts silently. The "DO NOT EDIT" banner plus regenerate-via-installer rule keeps the single source of truth in the standards tree.

## pr-shape CI — why server-side re-validation

Local hooks live on the developer's machine and can be uninstalled; `.github/workflows/pr-shape.yml` re-validates branch shape, title, body sections, gate proofs, and the Closes trailer server-side, so a machine without installed hooks still cannot land an off-shape PR.

## Repo setup (one-time)

A new repo isn't ready until:
- main is push-protected.
- Husky pre-push is installed (invokes verifier Mode B).
- A GitHub Project board exists + URL is in `reference.md`.
- `reference.md` lists repo URL, project URL, deploy URL, env-vars location.

Without these, the sibling git standards can't enforce. The setup IS the first slice of every new repo.

Last updated: 2026-07-12T00:00:00Z
