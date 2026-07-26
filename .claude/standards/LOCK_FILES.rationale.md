# LOCK_FILES — detail

Why each rule in `LOCK_FILES.md` exists. Read this when changing a rule, or when "100% compliance" feels arbitrary and you need the load-bearing reason.

## Why this standard exists at all

Per-rule verification (one grep / AST script per catalog rule) fails on two axes:

1. **Scripts can't catch the part that matters.** A grep can verify that a JSDoc block exists; it can't verify that the JSDoc describes the function correctly. A naming-check refuses bad identifiers; it doesn't refuse code that compiles and tests-pass but doesn't actually do what the spec says. The hard part of verification is the part only a human walk catches — and a wall of green per-rule gates is a perfect cover for skipping that walk.

2. **The maintenance cost is unbounded.** Every new rule = a new script. Every script = its own edge cases, false positives, exemption lists. Months of work for a single primitive's worth of gates. Drift between standards prose and script implementations grows faster than it can be closed.

The model: write specs precise enough that the code is mechanically determined (WRITING_ORDER.md owns that order). Manually verify each feature once. Stamp the lock. ONE script checks two things — is it stamped? has the folder been modified since the stamp? The model trades "many automated checks" for "one disciplined manual walk."

## The per-feature lock file

A YAML file at `<feature>/__specs__/standards-compliance.md`. Required fields:

- `status: locked` — explicit state. Locked features are immutable until unlocked.
- `verified: 100%` — explicit verification level. The string "100%" is the only allowed value; partial compliance is not a state.
- `last_validated: <iso8601-utc>` — when the manual walk completed. The freshness gate reads this.
- `feature: <path>` — self-identification so a reader scanning the file knows what it locks.
- `standards: <map>` — every standard registered in INDEX.yaml, stamped `"100%"` or `"NOT REQUIRED (<reason>)"`, none omitted. The map forces deliberate per-standard stamping; an omitted standard is indistinguishable from a skipped walk, so it fails the gate.

The file is minimal by design — required fields only, never padded with `spec` / `flows` / `tests` / `manual` / `notes` pointers. The verifiers read only `status` / `verified` / `last_validated`; evidence trails live in the changelog (changelog.mdx) and git history, so extra fields in the lock are dead weight that drifts.

## Why "100%" as a string, not boolean

A boolean (`verified: true`) says "we passed something." `"100%"` says specifically "every applicable rule was satisfied at lock time." That distinction stops a future reader from misinterpreting `verified: true` as "passed some subset of checks." There is no middle state to model.

`"95%"` says "the feature is 5% broken, but we accepted it." The 5% is where the bugs live. The 100% bar exists because anything less is a gap-tracking treadmill — and the gaps never close. (The coverage-side consequences — split the file, refactor for testability — are owned by WRITING_ORDER#test-coverage.)

## Testing surfaces — all 4 required

Four surfaces are required for 100% compliance:

1. **Unit / integration** — Vitest at 100% coverage. The mechanical floor.
2. **Scripted E2E** — Playwright with real transport AND persisted state. Catches the "the test passed but the DB didn't write" class of bug.
3. **Manual API** — Chrome-extension agent drives Swagger UI. One flow per endpoint.
4. **Manual UI** — Chrome-extension agent drives `__specs__/manual/<flow>.md`. Every user-facing surface.

The combination covers what any single surface misses. Unit tests can't catch framework integration bugs; E2E can't catch the "agent reads the spec and operates it differently than expected" bug; manual surfaces catch the human-level "is this experience actually usable" question.

All four green is the bar for production ship.

The manual walk at lock time (WRITING_ORDER#writing-order) is where these four surfaces get exercised. The lock isn't stamped until all four are green.

## The verify script — only one, ever

`verify-standards-compliance` is the entire standards-checking machinery. Two checks:

- **Presence**: every folder containing `__specs__/` has a `standards-compliance.md` with the required fields in the right state.
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

## Exception file — why last resort

The per-feature `exception.yaml` is a justified, case-by-case waiver with a required reason and named approver. It is the escape hatch of last resort, not a way to lower the bar by default: an exception without a reason is indistinguishable from a silenced gate, and a repo where exceptions accumulate is a repo whose 100% claim is quietly false. The verifier logs every accepted exception with its reason so the waiver stays visible on every run.

## Verifier modes — one catalog, one owner

VERIFIER_MODES.md is the single owner of the full 15-mode catalog (the modes hang off git lifecycle points). LOCK_FILES.md owns only the semantics of the core modes it defines the lock contract for: A stamps, B reads, C re-verifies via A, D full-repo read-only, E manual QA. The `full_mode_catalog` pointer exists so neither file grows a competing list.

Last updated: 2026-07-12T00:00:00Z
