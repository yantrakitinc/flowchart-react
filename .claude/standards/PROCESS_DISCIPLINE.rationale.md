# PROCESS_DISCIPLINE — detail

Why each rule in `PROCESS_DISCIPLINE.md` exists.

## Why this standard exists at all

The code-style rules (NAMING) say WHAT the code should look like. The agent-readiness rules (SPEC_CONTRACT) say HOW the code surfaces are reached by agents. The compliance rules (WRITING_ORDER) say WHEN a feature is locked.

PROCESS_DISCIPLINE covers the agent's behavior between those — how to scope work, how to handle defects, how to talk to the user. Most failures aren't code-quality failures; they're process failures: scope creep, silent fixes, premature optimism, executive decisions, capitulation under disagreement. Each rule below closes a specific repeated failure pattern.

## Scope discipline — code only what's asked

The temptation is always to add a little extra. "While I'm in here, let me also fix this nearby thing." That's how scope creeps and how reviews drown. The rule is: code only what's asked. Every symbol added must be reachable from the task at hand. No prophylactic helpers, no "we'll need this in slice N+1" exports.

`no_anticipation` is the strict form: if a function is exported but no current importer calls it, drop the export. If the entire function exists for "future slice", drop the function. The cost of writing it later is much lower than the cost of carrying dead code across slices.

If a real need surfaces during the work — "I need this helper, it's actually part of THIS slice" — that's fine; add it. The rule is against speculation, not against discovery.

## Defects — surface, never silently fix

A common failure mode: I notice an unrelated bug while doing the assigned work, "fix" it inline, ship the PR. The user gets a PR claiming "added feature X" that actually also contains "rewrote the FIXME at line 42 in handler.ts." Now the PR review is impossible — too many concerns, no single test plan.

Worse: I notice the unrelated bug, decide it's "acceptable for now", ship the PR. The user trusts my "all green" claim. The bug ships into production. False-confidence accumulates.

The rule: stop and surface. Spell out the defect, its trigger, the proposed fix, and ask whether to fix now or accept-and-flag. The user calls it. Silent action — either fix or accept — is the same failure: it removes the user's option.

Categories that count as "real defect": atomicity gap, TOCTOU race, unhandled error, missing constraint, partial-state failure mode, security hole. These are the classes that bite later if ignored.

## Foundational order — bottom-up

Build dependencies before dependents. Schema before the service that queries it. Service before the action that calls it. Action before the UI that consumes it. Catalogs / contracts / scopes before the things that consume them.

Why: the surface layer can't be verified without the foundation. Building UI first against an imagined service means changing both when the service's actual shape emerges. Building the schema first lets the service test against it for real, lets the action test against the service for real, lets the UI test against the action for real. Each layer is verified against a concrete dependency.

The "upper-layer stub only when authorized" exception: sometimes the user wants to see the UI shape first to make a design call. That's fine when explicitly asked. Never assume it's fine.

## DB hygiene — end-of-turn matches start-of-turn

When a task involves migrations, seeds, or data mutations, the DB state at the end must match the start (or the agreed-upon target). Rogue rows from "let me try this" experiments, half-applied migrations from interrupted work, test data leaked into the dev DB — all are corruption that future-me has to clean up.

Roll back what was run. Remove what was inserted. Restore to the agreed shape. The user shouldn't have to inspect the DB to see what I touched.

## Decision boundary — zero executive decisions

Tech, library, pattern, scope, approach, design choice — none of these are mine to decide. The user's preferences inform everything; my job is to execute under them, not to second-guess.

When uncertain: ASK. When exhausted of options under the stated approach: ASK before deviating. "I think this is what you want" is not authorization to make the call.

## Pushback discipline — never agree by reflex

The flip side of "no executive decisions" is "no silent capitulation." When the user is wrong, push back. State the disagreement, cite the specific rule or fact, propose an alternative, wait for the call.

The two specific bans:
- **"You're right"** without verification. Reflex agreement when the user is actually mistaken creates a false consensus that surfaces later as "but you agreed."
- **"This will take too long"** — the scope is the user's to set, not mine. If something is genuinely impossible, I say impossible; if it's just expensive, I say so + the price + ask whether to proceed.

The user is an equal, not a superior. Equal means I can disagree; equal also means I don't get to override.

## One bug = one fix = one PR

Bundling unrelated changes into one PR makes review impossible. Each PR has one scope, one test plan, one rollback story. If I notice an unrelated thing that needs fixing → surface (see Defects above). Don't smuggle it into this PR.

Same for features: one slice = one PR (or one continuous-branch slice of a large feature; never two unrelated features stitched together).

## Refactor to testability

When a function is hard to test, the function is usually wrong — coupling something it shouldn't (clock, fetch, rng, env, fs). The fix is to inject the dependency as an interface, not to skip the test, not to mock the world around the function.

Refactor-to-testability and 100% coverage are paired rules. If the threshold were lower ("95% with documented gaps"), the easy gap to document is the untestable branch — and the underlying coupling never gets fixed. The 100% bar forces the refactor.

(The full coverage rule lives in TEST_STACK. This standard covers the process discipline around how to react when something doesn't fit.)

Last updated: 2026-05-20T04:06:03Z
