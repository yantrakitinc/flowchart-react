# WRITING_ORDER — detail

Why each rule in `WRITING_ORDER.md` exists.

## The writing order — why specs precede code

Specs first because the code agent writing the implementation reads the spec to know what to write. If the spec is precise, two code agents fed the same spec produce near-identical code from the same inputs. The spec is the design — not the agent's interpretation of an ambient understanding.

Flows next: every path the function can take, named. Happy, error, edge. The agent writing the code consults the flows to know what to implement, what to fail on, and what tests to write.

Code next, driven by specs + flows. JSDoc on every exported function is the locator pointing back at the spec, not a duplicate of it.

Tests after code (red/green TDD optional; what matters is that the test suite reaches 100% on the now-committed shape). Manual scripts (for HTTP/UI surfaces) capture the agent-driven walkthrough.

Manual verification — run the feature, lint, typecheck, build, tests — happens AFTER all artifacts are in place. The walk is what earns the lock stamp (LOCK_FILES#schema).

The stamp is last. Commit + tag is the externally-visible signal.

## Editing a locked feature — why the order is non-negotiable

The same order as greenfield, with `unlock` prepended:

1. Unlock the compliance file (the deliberate "I am breaking the seal" act).
2. Update spec.md FIRST.
3. Update flows.
4. Update code.
5. Update tests.
6. Update manual scripts.
7. Re-run manual verification.
8. Re-stamp the compliance file.

Banned: editing code before updating the spec. That's the bug-introduction path — "I'm just changing the code and we'll fix the spec later" — which inevitably becomes "we forgot to fix the spec." The spec is the source; the code is derived. Reversing the order makes the spec a lying-about-yesterday's-design document.

Also banned: bumping `last_validated` without re-walking. The timestamp represents an honest manual walk at that exact moment. Touching the date for any other reason is a lie — same severity as saying "done" when nothing was done.

## Drive-to-green — why 5 attempts, why then surface

Most Mode A failures are mechanical (missing import, off-by-one in a test fixture, type mismatch, untested branch). The orchestrator can resolve those without user attention. After 5 attempts, the failure is almost always a spec gap, environmental issue, or design call — those need the user, and iterating past 5 just burns tokens on a problem the loop cannot solve. Surfacing carries all 5 verbatim reproductions because the user diagnoses from the raw evidence, not the orchestrator's summary of it.

## Coverage policy — why fractional compliance is forbidden

If a feature can't reach 100% coverage, three options:
- Split the file (it's doing too much; each smaller piece can be locked separately).
- Refactor for testability (the hard-to-test branches indicate hidden coupling).
- Document a physical/mathematical impossibility (e.g., a function whose only branch is "process exit on first line" — no test runner can reach the next line).

"Too long", "too many tests required", "improbable" — none of these are impossibility. They're scope decisions that should result in splitting the file, not lowering the bar. (The lock-side rule — `verified: "100%"` as the only value — is owned by LOCK_FILES#schema.)

## Scope authority — why the spec carries it

`scope_authority` lets a spec pre-delegate the mechanical, feature-internal decisions (helper extraction, private naming, fixtures) to the coder while keeping every caller-visible decision (API shapes, permissions, destructive ops, library choice) surfaced. The default is `user` because CLAUDE.md "Do exactly what is asked" is the baseline; `claude` is an explicit opt-in per feature, not an ambient permission.

## Standards change authority — why never auto-patch

Standards changes always surface for explicit user approval because the agent's judgment of "harmless wording fix" is unreliable — a one-paragraph clarification can silently weaken a gate or shift a rule's scope. Shipping standards changes in their own focused PR keeps the diff reviewable as a standards decision rather than burying it inside a feature slice.

## Why the journey_phase precedes the writing order

The per-feature writing order (spec → code → verify) answers "how do we build this feature correctly?" It cannot answer "is this the right set of features?" — that question is set-level and product-level, and it is exactly what the outside-in journey loop (`USER_JOURNEYS.md`) settles before any feature spec is written. Running it first means the flows a feature spec enumerates already trace to a real arriving-user intent, and no feature gets specced that no journey needs. The phase is owned by the pm rather than the feature-spec-writer because it spans the whole product, not one feature: the pm dispatches the repo-blind discover pass, drives the match/reconcile/update loop, and holds the bidirectional map. A feature's spec_phase starting before journeys and flows reconcile would be building on an unsettled understanding of what the user came to do — the same failure the "documentation first" rule guards against, one level up.

Last updated: 2026-07-19T16:43:58Z
