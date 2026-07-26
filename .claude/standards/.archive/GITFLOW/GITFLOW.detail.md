# GITFLOW — detail

Why each rule in `GITFLOW.yaml` exists.

## Why this standard exists at all

Every team has its own git conventions. Without standardization the agent gets lost ("does this team squash-merge or merge-commit?"), reviews fragment ("where does the test plan go?"), and history rots ("what was this branch for?"). GITFLOW exists so any contributor — human or agent — knows the answer to those questions without asking.

The rules below close specific recurring failure modes, not aesthetic preferences.

## Issues — every change ships under one

Branches without parent issues become orphan changes nobody can find later. The required `## Description / ## Acceptance criteria / ## Technical notes / ## Related issues` body sections force the author to articulate what's being done and how to know it's done. The reviewer reads the body before the diff and knows what to look for.

`type:` and `status:` labels are minimal. `type:` answers "what kind of work" (epic/story/bug/enhancement/docs/chore). `status:` answers "is it in flight, blocked, or done". Two labels at creation; `status:done` swapped BEFORE merge so the close-time state is correct.

The project-board membership rule (`projectItems` non-empty) exists because GitHub's `gh issue create --project <num>` flag can silently fail to attach the project link, leaving an orphan. The rule is: the issue creation isn't done until the project link is verified. A closed issue with empty projectItems is a defect; the sweep + nuke path applies.

## Standards checklist — why itemized and tickable

The `## Standards checklist` section exists so the developer and verifier check compliance off ONE BY ONE rather than asserting it wholesale. A single "standards: yes" line invites rubber-stamping; a per-standard item list makes each requirement individually falsifiable. The two-state resolution rule (`[x]` or explicit `N/A: <reason>`) exists because a bare unchecked box is ambiguous — it could mean "not done" or "not applicable" — and ambiguity at merge time is where gaps ship.

## Issue body compliance block

The compliance block in the issue body is short — 4 lines — and references STANDARDS_COMPLIANCE.yaml instead of duplicating its content. The truth lives in the per-feature `standards-compliance.yaml`; the issue body just attests to its state at close-time. Keeping the block small means it's hard to forget and hard to backfill incorrectly.

## Branches — feat/NNNN-tiny pattern

The `(feat|fix)/NNNN-...` pattern is parsed by tooling (the pre-push hook + any per-project gate that links branch → issue) to derive the issue number automatically. Loosening the pattern would break that tooling.

`tiny-content-identifier` is the contract: short, descriptive, lowercase, hyphen-separated. Not "tiny" as in trivial — "tiny" as in "fits in a path component without word-wrapping".

Direct push to main / staging is banned because both are protected branches. The force-push exception (for nuke-paths) requires two explicit env vars because force-push to main is destructive — both vars MUST be set per push, never per session.

## Commits — `<type>: <subject>` + no AI attribution

The conventional-commit-ish format means a `git log --oneline` reveals the kind of change at a glance. Types are bounded (`feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`); free-form types get rejected.

The no-AI-attribution rule is absolute. No `Co-Authored-By: Claude`, no "Generated with Claude", no robot emojis. The commits represent code shipped under the author's name and responsibility. Attribution noise dilutes that signal.

## Pull request — agent-owned lifecycle

The agent owns the full per-issue lifecycle: gates green → `gh pr create` → local re-verify → checklist resolution → label flip → merge → issue close → branch cleanup. The trust contract is mechanical proof, not human review: the `## Standards gates` section carries verbatim green gate output as falsifiable evidence, so a non-compliant PR is mechanically impossible rather than a matter of discipline. `verify-pr-body-draft` refuses the PR body before creation the same way `verify-issue-body-draft` refuses issue bodies — one shape, two analogues.

Bundling unrelated changes into one branch is banned because each branch should have one rollback story. "We need to revert" should mean reverting one concern, not unwinding a tangle.

## PR gate — no 100%, no PR

"Every PR body carries the mechanical + standards-verified gate output; if it is not 100%, no PR." A PR is not opened until the full pre-push chain is green, and the PR body embeds the verbatim final-line output of each gate as falsifiable proof. Paraphrase is banned because a paraphrased summary is exactly the surface where a red gate gets rounded up to green; a copy-pasted line either says EXIT 0 or it doesn't.

## Pre-push gate — executes the real chain

The pre-push hook EXECUTES the standards chain (stamps → pristine → compliance) and refuses the push on any non-zero exit. It does not merely trust slice stamps — a stamps-only gate lets non-compliant code through whenever a stamp is stale, missing, or scoped to the wrong package set. The gate runs the real gates. The coverage rule (every shipping package wired into the gate) exists because an unwired package is a silent hole: its code pushes ungated forever.

Deeper gates (re-running Mode A across every slice in the push, or the full end-to-end Mode D) are opt-in at the final-push prompt — see `final_push_gate` in GITFLOW.yaml and `.claude/agents/AGENT_ARCHITECTURE.md` for the lifecycle.

The pre-push hook is the enforcement point — exit non-zero refuses the push before it reaches the remote. CI mirrors the local chain and adds the external-service gates (DB-integration, live parity, headless suites) that can't run locally; those gate the MERGE, not the push.

## Verifier mode catalog — why GITFLOW owns it

GITFLOW.yaml is the single owner of the full 15-mode catalog because the modes are invoked from git lifecycle points (pre-commit, pre-push, final-push, house-clean). STANDARDS_COMPLIANCE.yaml owns the semantics of the core modes (A stamps, B reads, C fans A, D repo-wide read-only, E manual QA) and points at the catalog via `full_mode_catalog`. Two competing catalogs would drift; one catalog, one owner.

The three layers separate cost classes: timestamp ops (letters) are cheap stamp reads/writes; heavy proof modes actually execute code gates; deep ceremonies are the hours-long per-feature walks. Naming the layer tells the invoker what they're paying for.

## Merge — autonomous after pristine + up-to-date

Once `pnpm verify` exits 0 and the branch is up to date with main, the developer merges. This is the trust contract: the gate is the proxy for review.

The compliant tag (`compliant/<sha>`) is emitted at merge per STANDARDS_COMPLIANCE.yaml. It marks the last known 100%-compliant state, available as a revert anchor.

Branch deletion after merge (remote + local) cleans up the namespace. Leaving stale branches accumulates noise and tempts revival of dead work.

## Close issue — only at 100% compliance

An issue closes ONLY when:
- The feature is fully implemented.
- Its `standards-compliance.yaml` is `status: locked` + `verified: 100%`.
- The verifier's verbatim final-line output is available for the close-time GitHub comment.

Closing prematurely (because "we'll come back to fix it later") creates the lying-issue-tracker pattern. The user later asks "is feature X done?" and sees the issue closed, but the feature has known gaps. Two failure modes: hidden bugs (gaps weren't documented) or wasted review (gaps were known but the closer didn't surface).

## Audit + override

Periodic audits catch drift. An open issue stale for 3 weeks with a `status:in-progress` label is either abandoned or stuck — either way, attention needed.

The user override rule: an explicit user instruction overrides the standard for that specific push or action. Never for the session. A user saying "push directly to main this once" is per-push; the next push reverts to standard. This prevents "the user said no force-push checks last week" from being cited as authorization today.

## Release tagging

Every prod deploy gets `vYYYY.MM.DD.N`. The date + counter is the audit trail. Rollback references the prior tag.

## Repo setup (one-time)

A new repo isn't ready until:
- main is push-protected.
- Husky pre-push is installed (invokes verifier Mode B).
- A GitHub Project board exists + URL is in `reference.md`.
- `reference.md` lists repo URL, project URL, deploy URL, env-vars location.

Without these, the rest of GITFLOW can't enforce. The setup IS the first slice of every new repo.

Last updated: 2026-07-11T00:00:00Z
