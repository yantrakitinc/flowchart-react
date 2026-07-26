# STANDARDS_COMPLIANCE — detail

Why each rule in `STANDARDS_COMPLIANCE.yaml` exists. Read this when changing a rule, or when "100% compliance" feels arbitrary and you need the load-bearing reason.

## Why this standard exists at all

Per-rule verification (one grep / AST script per catalog rule) fails on two axes:

1. **Scripts can't catch the part that matters.** A grep can verify that a JSDoc block exists; it can't verify that the JSDoc describes the function correctly. A naming-check refuses bad identifiers; it doesn't refuse code that compiles and tests-pass but doesn't actually do what the spec says. The hard part of verification is the part only a human walk catches — and a wall of green per-rule gates is a perfect cover for skipping that walk.

2. **The maintenance cost is unbounded.** Every new rule = a new script. Every script = its own edge cases, false positives, exemption lists. Months of work for a single primitive's worth of gates. Drift between standards prose and script implementations grows faster than it can be closed.

The model: write specs precise enough that the code is mechanically determined. Manually verify each feature once. Stamp the lock. ONE script checks two things — is it stamped? has the folder been modified since the stamp? The model trades "many automated checks" for "one disciplined manual walk."

## The per-feature lock file

A YAML file at `<feature>/__specs__/standards-compliance.yaml`. Four required fields:

- `status: locked` — explicit state. Locked features are immutable until unlocked.
- `verified: 100%` — explicit verification level. The string "100%" is the only allowed value; partial compliance is not a state.
- `last_validated: <iso8601-utc>` — when the manual walk completed. The freshness gate reads this.
- `feature: <path>` — self-identification so a reader scanning the file knows what it locks.

The file is minimal by design — required fields only, never padded with `spec` / `flows` / `tests` / `manual` / `notes` pointers. The verifiers read only `status` / `verified` / `last_validated`; evidence trails live in the changelog (changelog.mdx) and git history, so extra fields in the lock are dead weight that drifts.

## Why "100%" as a string, not boolean

A boolean (`verified: true`) says "we passed something." `"100%"` says specifically "every applicable rule was satisfied at lock time." That distinction stops a future reader from misinterpreting `verified: true` as "passed some subset of checks." There is no middle state to model.

## Why fractional compliance is forbidden

Partial compliance becomes bureaucracy. `"95%"` says "the feature is 5% broken, but we accepted it." The 5% is where the bugs live. The 100% bar exists because anything less is a gap-tracking treadmill — and the gaps never close.

If a feature can't reach 100%, three options:
- Split the file (it's doing too much; each smaller piece can be locked separately).
- Refactor for testability (the hard-to-test branches indicate hidden coupling).
- Document a physical/mathematical impossibility (e.g., a function whose only branch is "process exit on first line" — no test runner can reach the next line).

"Too long", "too many tests required", "improbable" — none of these are impossibility. They're scope decisions that should result in splitting the file, not lowering the bar.

## The writing order — why specs precede code

Specs first because the code agent writing the implementation reads the spec to know what to write. If the spec is precise, two code agents fed the same spec produce near-identical code from the same inputs. The spec is the design — not the agent's interpretation of an ambient understanding.

Flows next: every path the function can take, named. Happy, error, edge. The agent writing the code consults the flows to know what to implement, what to fail on, and what tests to write.

Code next, driven by specs + flows. JSDoc on every exported function is the locator pointing back at the spec, not a duplicate of it.

Tests after code (red/green TDD optional; what matters is that the test suite reaches 100% on the now-committed shape). Manual scripts (for HTTP/UI surfaces) capture the agent-driven walkthrough.

Manual verification — run the feature, lint, typecheck, build, tests — happens AFTER all artifacts are in place. The walk is what earns the lock stamp.

The stamp is last. Commit + tag is the externally-visible signal.

## Editing a locked feature — why the order is non-negotiable

The same order as greenfield, with `unlock` prepended:

1. Unlock the compliance file (the deliberate "I am breaking the seal" act).
2. Update spec.yaml + spec.md FIRST.
3. Update flows.
4. Update code.
5. Update tests.
6. Update manual scripts.
7. Re-run manual verification.
8. Re-stamp the compliance file.

Banned: editing code before updating the spec. That's the bug-introduction path — "I'm just changing the code and we'll fix the spec later" — which inevitably becomes "we forgot to fix the spec." The spec is the source; the code is derived. Reversing the order makes the spec a lying-about-yesterday's-design document.

Also banned: bumping `last_validated` without re-walking. The timestamp represents an honest manual walk at that exact moment. Touching the date for any other reason is a lie — same severity as saying "done" when nothing was done.

## The verify script — only one, ever

`verify-standards-compliance` is the entire standards-checking machinery. Two checks:

- **Presence**: every folder containing `__specs__/` has a `standards-compliance.yaml` with the three required fields in the right state.
- **Freshness**: last git-commit date touching the folder ≤ `last_validated`. If a commit changed any file in the folder more recently than the validation, the lock is broken; the feature must be re-walked.

Per-rule grep gates are explicitly forbidden. The temptation will reappear ("this would only take a small script") — resist it. The discipline is: manual verification, with one script to enforce that the manual walk happened.

## Why git log, not filesystem mtime

The freshness signal is `git log -1 --format=%aI -- <folder>` — the ISO-8601 date of the most recent commit that touched any file in the folder (excluding the lock file itself).

Git history is stable across `git checkout` / `git pull` / `git clone`. Two developers on the same commit see the same value. Filesystem mtime would reset to wall-clock on every git operation; every clean clone would produce false-positive staleness on every folder, forcing re-stamp ceremony on every PR. That noise floor — every git operation everywhere — defeats the gate.

Every consumer of this signal runs on committed code: CI (`git checkout <ref>`), `next build`, Docker build, pre-push hook (which runs against the staged tree). Uncommitted code never reaches the gate, so a "git log misses uncommitted edits" concern doesn't apply.

A small grace window (`same_commit_grace_ms`, currently 30 minutes) accommodates the natural delay between the spec-writer / coder writing `last_validated` and the commit landing. Real drift (forgetting to re-stamp across days or weeks) is far outside the grace and still caught.

## The compliant tag — why per-commit

Every commit at which the verify script exits 0 across all features gets tagged `compliant/<sha>`. The tag is the revert anchor: when something later breaks, `git reset --hard compliant/<latest>` returns to the last known-good state.

Tagging requires the verify script's exit-0 status as proof. No exit 0 → no tag. No exemptions, no "tag with a known issue" — tagging known-broken state poisons the revert-anchor contract.

## Why this isn't a thin grep gate

A reader might ask: "Couldn't we just enforce all 377 catalog rules by running 95 grep scripts? Skip the manual walk?"

Three reasons no:

1. **Specs vs implementation gap.** A grep can't tell whether the implementation matches the spec. That gap is where the bugs live. Only a manual walk catches it.

2. **Compounding script maintenance.** 95 scripts is a corpus that has to evolve with the standards. Every standard change → script audit. Reality: scripts drift behind, false greens accumulate, the system silently rots.

3. **The walk IS the value.** The point of the lock isn't the timestamp — it's the act of walking the feature against the spec. The timestamp is just the receipt for the walk. Replacing the walk with greps is replacing the receipt with a stamp on a blank page.

The freshness gate exists to ensure the walk isn't skipped. The walk is the standard.

## Drive-to-green — why 5 attempts, why then surface

Most Mode A failures are mechanical (missing import, off-by-one in a test fixture, type mismatch, untested branch). The orchestrator can resolve those without user attention. After 5 attempts, the failure is almost always a spec gap, environmental issue, or design call — those need the user, and iterating past 5 just burns tokens on a problem the loop cannot solve. Surfacing carries all 5 verbatim reproductions because the user diagnoses from the raw evidence, not the orchestrator's summary of it.

## Exception file — why last resort

The per-feature `exception.yaml` is a justified, case-by-case waiver with a required reason and named approver. It is the escape hatch of last resort, not a way to lower the bar by default: an exception without a reason is indistinguishable from a silenced gate, and a repo where exceptions accumulate is a repo whose 100% claim is quietly false. The verifier logs every accepted exception with its reason so the waiver stays visible on every run.

## Standards change authority — why never auto-patch

Standards changes always surface for explicit user approval because the agent's judgment of "harmless wording fix" is unreliable — a one-paragraph clarification can silently weaken a gate or shift a rule's scope. Shipping standards changes in their own focused PR keeps the diff reviewable as a standards decision rather than burying it inside a feature slice.

## Verifier modes — one catalog, one owner

GITFLOW.yaml.verifier_modes is the single owner of the full 15-mode catalog (the modes hang off git lifecycle points). STANDARDS_COMPLIANCE.yaml owns only the semantics of the core modes it defines the lock contract for: A stamps, B reads, C re-verifies via A, D full-repo read-only, E manual QA. The `full_mode_catalog` pointer exists so neither file grows a competing list.

Last updated: 2026-07-11T00:00:00Z
