# SPEC_CONTRACT — detail

Why each rule in `SPEC_CONTRACT.md` exists. Read this when you're about to change a rule, or when a rule feels arbitrary and you need the load-bearing reason.

## Why the `__specs__/` contract exists at all

Every site shipped from this machine — current or future — is going to be operated by an AI agent on the user's behalf. Three concrete agents we know about today:

1. The on-site chatbot embedded in the deployed app. Reads voice / text from a real user, performs the same operations a UI user would perform (click buttons, fill forms, navigate), reports back honestly.
2. A browser-resident extension (Claude Code Chrome extension or equivalent) driving the UI from outside.
3. A CLI tool that wraps the site's APIs for scripting / cross-primitive workflows.

All three agents need the same thing: a structured, machine-readable description of what the site can do, how to invoke each operation, what to confirm with the user beforehand, what to say after. Without that, the agent hallucinates. With it, the agent operates the site like a senior user.

So every artifact in this contract exists to answer one question: **"if the agent has only this directory of files (no source-code access), can it perform every user-facing operation without guessing?"** Anything that breaks that property is a P0 bug. Siblings `FLOW_CONTRACT.md`, `MANUAL_FLOWS.md`, and `AGENT_AFFORDANCES.md` serve the same question for their artifacts.

## Folder layout — why `__specs__/` contains everything

The parent folder stays lean: code + tests + manual scripts only. Everything specification-related — machine contracts, human prose, flow docs, compliance markers, manual scripts (now also under `__specs__/manual/`) — lives under `__specs__/`.

Why: a developer scanning a feature folder for "where's the code?" doesn't want to wade through six docs files. A code agent reading `__specs__/` for "what does this feature do?" doesn't want to wade through `.ts` files. One physical separation, two distinct readers.

## `spec.md` + `spec.md` — why split

`spec.md` is the machine contract: operation name, slug, invocation, chat-agent behavior, cross-cutting concerns, links. A generator script reads it to build `/agents.json`. An agent reads it to know whether to call this operation. A verify script reads it to assert schema completeness.

`spec.md` is human prose: Concept (why this exists), Files (numbered list), Out of scope (what this explicitly doesn't do). A developer reads it.

Two readers, two files. Drift between them is possible — caught by the manual review at lock-time + by the verify script asserting the H1 in `spec.md` matches `operation.name` in `spec.md`.

## The cross-cutting declaration rule — why all four, every time

The four `cross_cutting` keys force the spec author to face each concern at spec time rather than discover it at review time. The declaration is a per-feature attestation; the substance lives with each concern's owning standard — WCAG with `ACCESSIBILITY.md`, authorization with `AUTHORIZATION_STANDARDS.md`, small-viewport-first with `MOBILE_FIRST.md`, string externalization with `I18N.md`. "n/a" without a reason is banned because an unreasoned n/a is indistinguishable from "didn't think about it" — the exact failure the declaration exists to prevent.

## Each of the 6 `chat_agent` sub-keys — why each one

Together they form a complete agent-invocation contract; missing any one creates a class of hallucination.

- **`when_to_call`** — the trigger condition. Without it the agent can't recognise the user's natural-language intent and route to this operation.
- **`when_not_to_call`** — the anti-condition. The agent must know when to abstain (e.g., "user is already signed in" for the login operation). Anti-conditions are the difference between an agent that helps and an agent that double-acts.
- **`natural_language_examples`** — concrete user phrases. The agent uses these for few-shot matching when the user says something only loosely related. Without examples, the agent maps everything literally and misses synonyms.
- **`confirm_before`** — what the agent says to the user before invoking. State-mutating operations need confirmation ("about to delete user X, confirm?"); reads do not. Splitting this out forces the spec author to think about destructiveness explicitly.
- **`summarize_after_success`** — one-line template for what the agent reports back on success. Without it the agent improvises ("done!") and loses the user's mental model of what changed.
- **`summarize_after_failure`** — the failure-path equivalent. Critical because failure is where the agent is most tempted to hallucinate — claiming success when the operation 500'd, or omitting the actual error. The template forces the agent to surface the real failure.

Six sub-keys = the smallest map that covers trigger, abstain, recognition, pre-action contract, post-success contract, post-failure contract. Dropping any one of them re-opens a known hallucination vector.

## YAML vs JSON — why YAML wherever structured

YAML is the format for every structured file in `__specs__/` for three reasons:

1. **Comments.** YAML supports `#` comments; JSON does not. Inline explanations ("why this slug? — admin-only operation"), TODOs, and links to related artifacts all need a place to live. Without comments, that context drifts into surrounding files or evaporates.
2. **Ecosystem consistency.** `openapi.yaml` and `asyncapi.yaml` are ecosystem-defined YAML files. Mixing JSON for our own files breaks the visual rhythm and forces the reader to track which parser handles which file.
3. **Human readability.** YAML's indentation-based syntax is faster to scan than JSON's brace-and-quote forest, particularly for the deeply nested chat_agent / cross_cutting structures.

Trade-off: YAML's whitespace sensitivity is a real footgun. Mitigated by every artifact being short (<200 lines) and validated by a parser at lock-time.

Markdown is reserved exclusively for `spec.md` and the inside of multiline string fields (e.g., `mermaid:`) because those carry prose, not structure.

## Why `standards-compliance.md`, not `.md`

This file is a status marker, not documentation (schema owner: `LOCK_FILES.md`). Three fields drive everything:

```yaml
status: locked
verified: 100%
last_validated: <ISO-8601>
```

A verify script reads `last_validated` and compares it to the feature folder's latest commit time from git history (`git log -1 --format=%aI -- <folder>`, excluding the lock file). An agent asked "is this 100% compliant?" reads `status` and `verified`. Humans don't read this file at all — they read the verify script's output. YAML is the right format for that.

## `verified: 100%` as a string — why not boolean, why no fractional

It's a string (`"100%"`) not a boolean (`true`) because the field's PURPOSE is to make the verification level explicit and impossible to misread. `true` says "passed something"; `"100%"` says specifically "every applicable rule was satisfied at lock time."

Fractional values (`"95%"`, `"80%"`) are explicitly NOT supported. The 100% bar exists because partial compliance is a slippery slope into bureaucratic gap-tracking. Either the feature is locked at 100% or it's not locked. There's no "locked at 80% with three known issues" — that's the same thing as "broken with three known issues."

If a feature can't reach 100%, the right answer is one of: (a) split the file, (b) refactor for testability, (c) document the impossibility precisely (physical / mathematical, not "too hard"). Never (d) accept a fraction.

## Writing order — why spec-first, why test-after-code

(The writing-order rules themselves live in `WRITING_ORDER#writing-order`; this is the rationale.)

Spec first because the code agent writing the implementation reads the spec to know what to write. If the spec is well-defined enough, two code agents fed the same spec produce near-identical code. The spec, not the agent's interpretation, is the design.

Then flows: every path the function can take, named. Happy path, every error condition, every edge case. The agent writing the code consults the flows to know what to implement — and what tests to write.

Then code. Light JSDoc on every export — the detail is in the spec; JSDoc is the locator pointing at the spec, not a duplicate.

Then tests. 100% coverage required. If a file can't reach 100%, the file is too tangled — split it. Skip a line only when reaching it is **physically or mathematically impossible** (not "too long", not "improbable", not "too many tests required"). The 100% bar exists because 95%-with-documented-gaps is just bureaucracy that lets dead branches in.

Manual + optional openapi/asyncapi after code is the contract-vs-implementation reconciliation step. Then manual verification — run the feature, lint, typecheck, build, tests by hand. Then stamp the compliance marker. Then commit + tag.

## Editing a locked feature — why the order matters

(The unlock rules live in `WRITING_ORDER#editing-locked`; this is the rationale.)

The order — spec → flows → code → tests → manual → re-stamp — is the same as the writing-order. Same reason: the spec drives the code, not the other way around. Editing the code first and then "updating the spec to match" is the bug-introduction path. Always:

1. Decide what changes (update the spec).
2. Decide every path through the change (update the flows).
3. Implement (update the code).
4. Cover the change (update the tests, 100% again).
5. Re-walk manually.
6. Re-stamp the compliance file.

Anything else is "I'm just changing the code and we'll fix the spec later" — which we don't, ever.

## Why feature-lock + freshness gate, not per-rule scripts

Per-rule verification (one script per catalog rule) fails for two reasons:

1. **Maintenance cost.** Hundreds of standards rules → ~95 scriptable → one script per rule to write, maintain, and keep in sync with the standards prose. Every new rule means another script.

2. **The scripts don't replace human verification.** A script catches naming + structural shape. It can't catch "this code looks right but doesn't actually do what the spec says". The hard part of verification is the part the agent has to do manually — and green per-rule gates mask that the manual work was skipped.

The model: write specs precise enough that the code is mechanically determined. Manually verify each feature once. Stamp the lock. The ONE script that matters checks two things:

- Is the lock stamped? (presence)
- Has the folder been modified since the stamp? (freshness)

If the feature folder's latest commit (git history) is newer than `last_validated`, the lock is broken. The feature must be manually re-verified — spec, flows, code, tests, the whole walk — and the lock re-stamped. No way to skip; no way to silently rot.

This shifts the burden from "scripts catch every violation" to "manual verification is the gate, the script catches when verification became stale". Cheap, deterministic, hard to lie about.

## Why the source-coverage gate, `feature_name`, and `.ignore.specs.yaml`

The feature-lock gate above audits every folder that already contains `__specs__/`. On its own it is silent about folders that don't — a Route Handler at `src/app/api/v1/health/route.ts` with no adjacent `__specs__/` (while the owning feature's spec lives four directories away) would slip through. The Route Handler is a public surface — its own URL + method + status codes + OpenAPI shape deserve a locked spec. A second gate closes this.

The second gate refuses any `.ts/.tsx` file under `src/` that doesn't resolve to either:

1. A `__specs__/spec.md` walked up the directory tree, OR
2. An explicit `.ignore.specs.yaml` marker file.

`.ignore.specs.yaml` has two valid contents. **Empty** (or whitespace-only) means "this folder is deliberately exempt — true cross-cutting code with no single owning feature." The mere presence of the file proves the exemption was deliberate; an unmarked folder is a bug, not an oversight. **Non-empty** carries one field — `feature_name: <parent-feature-name>` — pointing at the spec elsewhere in the repo that owns this code. The verifier refuses if no `__specs__/spec.md` in the repo declares a matching `feature_name`.

That linkage is why every `__specs__/spec.md` requires `feature_name:` as its first top-level field, kebab-case, unique repo-wide. Without a stable handle, the markers point at nothing and the resolution is unenforceable.

Inheritance: a `.ignore.specs.yaml` at a shallow level covers every subtree below it; a deeper marker overrides. The closest marker (`__specs__` OR `.ignore`) wins. This avoids dropping markers in every leaf folder while still letting a subtree opt out of an ancestor's coverage.

The gate (`verify-source-coverage.mjs`) sits in the verify chain after `verify-standards-compliance.mjs`. Both run on every push; the pre-push hook refuses any push that fails either. A Route Handler with no spec adjacent and no marker fails the build — the silent-pass loophole is mechanically impossible.

Last updated: 2026-07-12T00:00:00Z
