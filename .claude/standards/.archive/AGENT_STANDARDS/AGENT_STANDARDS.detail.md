# AGENT_STANDARDS — detail

Why each rule in `AGENT_STANDARDS.yaml` exists. Read this when you're about to change a rule, or when a rule feels arbitrary and you need the load-bearing reason.

## Why this standard exists at all

Every site shipped from this machine — current or future — is going to be operated by an AI agent on the user's behalf. Three concrete agents we know about today:

1. The on-site chatbot embedded in the deployed app. Reads voice / text from a real user, performs the same operations a UI user would perform (click buttons, fill forms, navigate), reports back honestly.
2. A browser-resident extension (Claude Code Chrome extension or equivalent) driving the UI from outside.
3. A CLI tool that wraps the site's APIs for scripting / cross-primitive workflows.

All three agents need the same thing: a structured, machine-readable description of what the site can do, how to invoke each operation, what to confirm with the user beforehand, what to say after. Without that, the agent hallucinates. With it, the agent operates the site like a senior user.

So every artifact in this standard exists to answer one question: **"if the agent has only this directory of files (no source-code access), can it perform every user-facing operation without guessing?"** Anything that breaks that property is a P0 bug.

## Folder layout — why `__specs__/` contains everything

The parent folder stays lean: code + tests + manual scripts only. Everything specification-related — machine contracts, human prose, flow docs, compliance markers, manual scripts (now also under `__specs__/manual/`) — lives under `__specs__/`.

Why: a developer scanning a feature folder for "where's the code?" doesn't want to wade through six docs files. A code agent reading `__specs__/` for "what does this feature do?" doesn't want to wade through `.ts` files. One physical separation, two distinct readers.

## `spec.yaml` + `spec.md` — why split

`spec.yaml` is the machine contract: operation name, slug, invocation, chat-agent behavior, cross-cutting concerns, links. A generator script reads it to build `/agents.json`. An agent reads it to know whether to call this operation. A verify script reads it to assert schema completeness.

`spec.md` is human prose: Concept (why this exists), Files (numbered list), Out of scope (what this explicitly doesn't do). A developer reads it.

Two readers, two files. Drift between them is possible — caught by the manual review at lock-time + by the verify script asserting the H1 in `spec.md` matches `operation.name` in `spec.yaml`.

## Why manual scripts live under `__specs__/manual/`

The browser-executable manual scripts are FOR agents (Chrome extension, future CLI). They're specification — "here's how an agent drives this UI" — so they belong with the rest of the specification under `__specs__/`. Plain `manual/` (single underscores) signals "a regular subdirectory" rather than the double-underscore convention reserved for framework-magic folders.

## Why `flow.yaml`, not `flow.md`

The flow doc's content is 90% structured (16 required keys, named paths, ai_agent_action sub-map) and 10% prose. Markdown-with-YAML-frontmatter forced a parser into both modes and made automated checks fragile. Pure YAML simplifies: every reader (verify script, agent, generator) parses one format. The single prose-y field is `mermaid:` (the diagram), which fits naturally as a multiline YAML string. The `paths:` section becomes a structured map (`happy`, `error_*`, `edge_*`) instead of free-form prose.

## Why `standards-compliance.yaml`, not `.md`

This file is a status marker, not documentation. Three fields drive everything:

```yaml
status: locked
verified: 100%
last_validated: <ISO-8601>
```

A verify script reads `last_validated` and compares it to the feature folder's latest commit time from git history (`git log -1 --format=%aI -- <folder>`, excluding the lock file). An agent asked "is this 100% compliant?" reads `status` and `verified`. Humans don't read this file at all — they read the verify script's output. YAML is the right format for that.

## `/agents.json` — why auto-generated

An `AGENT_INDEX.md` maintained by hand is a lying-source-of-truth waiting to happen. Drop a new operation, forget to update the index, ship — the agent's table of contents now lies, the agent picks the wrong operation, the user sees garbage.

Auto-generation at build time means: the index is regenerated from every `__specs__/spec.yaml` in the repo on every build. Specs are the source. Index is derived. They cannot drift.

`/agents.json` is the primary machine surface. `/agents.txt` is an optional human-readable derivative for `llms.txt`-style consumers. Both come from the same generator, so they cannot disagree.

## Standardized `data-*` attributes — why a fixed vocabulary

If every page invents its own attribute names (`data-action`, `data-do-thing`, `data-button-type`, `data-purpose`), the Chrome-extension agent has to read the whole page to figure out which element does what. With a fixed vocabulary — `data-testid`, `data-agent-action`, `data-agent-step`, `aria-label` — the agent looks for the same four attributes everywhere and knows what they mean.

Same logic for the action-verb catalog. If one form uses `submit`, another uses `save`, and a third uses `confirm-and-go`, the agent has to map free-form verbs to intentions on the fly. Lock the verb list; pages choose from it. Adding a new verb = a one-line PR to extend the list, then any page can use it.

`data-agent-step` carries the `<surface>:<state>` pattern so a multi-step flow (sign-in → email-entry → password-entry → submit) is traceable from the agent's perspective.

## Public-facing rules — `/llms.txt`, RSC docs, plain-English OpenAPI

The agent visiting the deployed site from outside doesn't have the repo. It has only what's reachable over HTTP. `/llms.txt` is its first stop — a plain-text table of contents (industry convention from llmstxt.org) telling it what the site does + where the structured contracts live.

Docs served as RSC-rendered markdown (not JS-heavy single-page apps) mean `curl <docs-url>` returns readable content. Text browsers + agents share one path with humans.

OpenAPI `description:` fields written in plain English (not terse identifiers) mean an agent reading `openapi.yaml` doesn't have to decode jargon to know what an operation does. Same content humans read in Swagger UI.

"No human-only UI" — hover-only menus, drag-only reordering, focus-only modals — all banned. Two reasons: (1) agents can't perform those gestures reliably, (2) accessibility-impaired humans can't either. The two constituencies share one constraint.

## Writing order — why spec-first, why test-after-code

Spec first because the code agent writing the implementation reads the spec to know what to write. If the spec is well-defined enough, two code agents fed the same spec produce near-identical code. The spec, not the agent's interpretation, is the design.

Then flows: every path the function can take, named. Happy path, every error condition, every edge case. The agent writing the code consults the flows to know what to implement — and what tests to write.

Then code. Light JSDoc on every export — the detail is in the spec; JSDoc is the locator pointing at the spec, not a duplicate.

Then tests. 100% coverage required. If a file can't reach 100%, the file is too tangled — split it. Skip a line only when reaching it is **physically or mathematically impossible** (not "too long", not "improbable", not "too many tests required"). The 100% bar exists because 95%-with-documented-gaps is just bureaucracy that lets dead branches in.

Manual + optional openapi/asyncapi after code is the contract-vs-implementation reconciliation step. Then manual verification — run the feature, lint, typecheck, build, tests by hand. Then stamp the compliance marker. Then commit + tag.

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

1. A `__specs__/spec.yaml` walked up the directory tree, OR
2. An explicit `.ignore.specs.yaml` marker file.

`.ignore.specs.yaml` has two valid contents. **Empty** (or whitespace-only) means "this folder is deliberately exempt — true cross-cutting code with no single owning feature." The mere presence of the file proves the exemption was deliberate; an unmarked folder is a bug, not an oversight. **Non-empty** carries one field — `feature_name: <parent-feature-name>` — pointing at the spec elsewhere in the repo that owns this code. The verifier refuses if no `__specs__/spec.yaml` in the repo declares a matching `feature_name`.

That linkage is why every `__specs__/spec.yaml` requires `feature_name:` as its first top-level field, kebab-case, unique repo-wide. Without a stable handle, the markers point at nothing and the resolution is unenforceable.

Inheritance: a `.ignore.specs.yaml` at a shallow level covers every subtree below it; a deeper marker overrides. The closest marker (`__specs__` OR `.ignore`) wins. This avoids dropping markers in every leaf folder while still letting a subtree opt out of an ancestor's coverage.

The gate (`verify-source-coverage.mjs`) sits in the verify chain after `verify-standards-compliance.mjs`. Both run on every push; the pre-push hook refuses any push that fails either. A Route Handler with no spec adjacent and no marker fails the build — the silent-pass loophole is mechanically impossible.

## YAML vs JSON — why YAML wherever structured

YAML is the format for every structured file in `__specs__/` for three reasons:

1. **Comments.** YAML supports `#` comments; JSON does not. Inline explanations ("why this slug? — admin-only operation"), TODOs, and links to related artifacts all need a place to live. Without comments, that context drifts into surrounding files or evaporates.
2. **Ecosystem consistency.** `openapi.yaml` and `asyncapi.yaml` are ecosystem-defined YAML files. Mixing JSON for our own files breaks the visual rhythm and forces the reader to track which parser handles which file.
3. **Human readability.** YAML's indentation-based syntax is faster to scan than JSON's brace-and-quote forest, particularly for the deeply nested chat_agent / cross_cutting structures.

Trade-off: YAML's whitespace sensitivity is a real footgun. Mitigated by every artifact being short (<200 lines) and validated by a parser at lock-time.

Markdown is reserved exclusively for `spec.md` and the inside of multiline string fields (e.g., `mermaid:`) because those carry prose, not structure.

## Each of the 6 `chat_agent` sub-keys — why each one

Together they form a complete agent-invocation contract; missing any one creates a class of hallucination.

- **`when_to_call`** — the trigger condition. Without it the agent can't recognise the user's natural-language intent and route to this operation.
- **`when_not_to_call`** — the anti-condition. The agent must know when to abstain (e.g., "user is already signed in" for the login operation). Anti-conditions are the difference between an agent that helps and an agent that double-acts.
- **`natural_language_examples`** — concrete user phrases. The agent uses these for few-shot matching when the user says something only loosely related. Without examples, the agent maps everything literally and misses synonyms.
- **`confirm_before`** — what the agent says to the user before invoking. State-mutating operations need confirmation ("about to delete user X, confirm?"); reads do not. Splitting this out forces the spec author to think about destructiveness explicitly.
- **`summarize_after_success`** — one-line template for what the agent reports back on success. Without it the agent improvises ("done!") and loses the user's mental model of what changed.
- **`summarize_after_failure`** — the failure-path equivalent. Critical because failure is where the agent is most tempted to hallucinate — claiming success when the operation 500'd, or omitting the actual error. The template forces the agent to surface the real failure.

Six sub-keys = the smallest map that covers trigger, abstain, recognition, pre-action contract, post-success contract, post-failure contract. Dropping any one of them re-opens a known hallucination vector.

## Each of the 17 required `flow_yaml` keys (+ 1 optional) — why each one

The flow doc is the agent's call-graph map. Each key answers a question the agent (or a developer ramping on the code) will inevitably ask. The 17 required keys split into four groups; `mermaid` is the one optional key.

**Identity (4 keys)**:
- `flow` — the function name. Anchor.
- `kind` — request-handler, predicate, service-method, etc. Tells the agent what kind of behavior to expect (an HTTP handler vs a pure helper).
- `source` — path to the source-of-truth `.ts` file. The agent can jump to the code if it has source access.
- `symbol` — the exported symbol within `source`. Disambiguates when a file exports multiple functions.

**I/O contract (4 keys)**:
- `inputs` — argument types. The agent constructs calls from this without reading the source.
- `returns` — success-shape descriptions. The agent knows what to expect back.
- `throws` — declared errors. The agent knows what failure modes are reachable.
- `transaction` — transaction scope (or "none"). Critical for state-mutating ops; the agent + a human reader knows whether the call is atomic.

**Call graph (5 keys)**:
- `calls` — downstream calls. The agent reasons about side-effect chains.
- `called_by` — upstream callers. The agent knows where this function is invoked from (helps when planning a multi-step flow).
- `emits_events` — events emitted (or `[]`). Hooks into the async event graph; chains with `asyncapi.yaml`.
- `side_effects_on_success` — what state changes on the happy path (or `["none"]`). Differentiates pure functions from state-mutators without reading the body.
- `side_effects_on_failure` — what state changes when the function fails (or `"none"`). Forces explicit reasoning about partial-state failure modes.

**Documentation (4 keys)**:
- `test` — path to the test file. The agent can read the tests to learn invariants.
- `spec` — path to the spec.yaml. The contract anchor.
- `ai_agent_action` — the 6-sub-key map (above). The agent's invocation contract for this specific function.
- `paths` — named scenario paths (`happy`, `error_*`, `edge_*`). The agent walks the path it wants to test or trigger.

**Optional (1 key)**:
- `mermaid` — diagram. Required when the function coordinates ≥ 3 collaborators or has ≥ 2 distinct paths; not required for trivial flows.

Together the 17 required keys mean an agent reading ONLY the flow.yaml (no source code) can: identify the function, construct a valid call, predict the return shape, know the failure modes, reason about side effects + transactions, find the test + spec, invoke under the right user-facing contract, and trace any named scenario.

## `manual_yaml.step` shape — why each field

Each step in a `manual/<flow>.md` represents one atomic browser-driven action. Five fields:

- **`action`** — required. The human verb ("Click the submit button", "Fill the email input"). Drives the agent's verb selection at runtime.
- **`selector`** — CSS / aria-label / role+name. The agent locates the element. Without it the agent has to guess from the action verb, which fails on any non-trivial page.
- **`input`** — value to type / paste (for fills). Separated from `action` so a templated `${SEED_EMAIL}` doesn't have to live inside a prose verb.
- **`expected`** — one-line post-state description ("redirect to /whoami; signed-in markers visible"). Tells the agent what success looks like for THIS step.
- **`assertion`** — boolean expression the agent can evaluate (e.g., `'[data-testid="whoami-signed-in"]' is present`). Programmatic verification, not just prose.

Five fields is the minimum to describe a clickable interaction unambiguously. Adding more (timing, retry policy, screenshot-on-pass) → optional metadata in a future revision; not core.

## `agents_index.generated_at: build-time` — why not runtime

Two choices:

- **Runtime** — `/agents.json` is a route handler that scans the filesystem on each request. Always-fresh but requires the source `__specs__/spec.yaml` files to be packaged into the deployed runtime bundle (Next.js doesn't include source by default; we'd need an explicit copy step). Slight serve-time latency.
- **Build-time** — the generator runs once during the project's build step, emits a static `/agents.json` to the public output. No runtime fs access. Served as a static file.

Build-time wins because every merge triggers a build, so the static file is always fresh against the current commit. Drift between source specs and the served index is impossible — both come from the same git ref. For the deploy-on-merge model (Vercel, Cloudflare Pages, similar), this is the natural choice.

Runtime would only beat build-time if specs could change between deploys — but our model doesn't allow that (specs are part of code, code lands via PR + deploy).

## `data-testid` 3-segment format — why `<feature>-<element>-<type>`

Three segments because that's the smallest schema that uniquely identifies an element across a multi-feature codebase:

- **`<feature>`** — disambiguates between features that ship similar elements (`whoami-email-input` vs `signup-email-input`). Without it, every "email-input" testid collides at the test-runner / agent-extension level.
- **`<element>`** — the role of the element (`signin-link`, `submit-btn`, `permissions-list`). The agent uses this to predict behavior — `*-btn` is clickable, `*-input` accepts text, `*-list` contains items.
- **`<type>`** — the kind (`btn`, `input`, `link`, `list`, `cell`). Helps the agent reason about the affordance type without inspecting the rendered DOM.

Kebab-case (lowercase + hyphens) because: (a) it's the existing JS / HTML attribute convention, (b) it's parseable by `split('-')`, and (c) it doesn't collide with CSS class-name conventions.

Trade-off: more verbose than a 1-segment testid (`submit-btn` alone). Worth it because the verbosity buys collision-free uniqueness across the whole site.

## `verified: 100%` as a string — why not boolean, why no fractional

It's a string (`"100%"`) not a boolean (`true`) because the field's PURPOSE is to make the verification level explicit and impossible to misread. `true` says "passed something"; `"100%"` says specifically "every applicable rule was satisfied at lock time."

Fractional values (`"95%"`, `"80%"`) are explicitly NOT supported. The 100% bar exists because partial compliance is a slippery slope into bureaucratic gap-tracking. Either the feature is locked at 100% or it's not locked. There's no "locked at 80% with three known issues" — that's the same thing as "broken with three known issues."

If a feature can't reach 100%, the right answer is one of: (a) split the file, (b) refactor for testability, (c) document the impossibility precisely (physical / mathematical, not "too hard"). Never (d) accept a fraction.

## Editing a locked feature — why the order matters

The order — spec → flows → code → tests → manual → re-stamp — is the same as the writing-order. Same reason: the spec drives the code, not the other way around. Editing the code first and then "updating the spec to match" is the bug-introduction path. Always:

1. Decide what changes (update the spec).
2. Decide every path through the change (update the flows).
3. Implement (update the code).
4. Cover the change (update the tests, 100% again).
5. Re-walk manually.
6. Re-stamp the compliance file.

Anything else is "I'm just changing the code and we'll fix the spec later" — which we don't, ever.

## Why flows enumerate every path

A flow.yaml exists to turn unknowns into knowns: enumerate every path the function can take — happy, every error, every edge — so implementation and tests derive from a complete behavior map with no unknowns left to discover later. A missing error/edge/concurrency/authority path is the exact gap a production bug slips through; writing the flow is where the unknowns are surfaced, and the tests then cover what it enumerates. `KNOWN-NOT-VALIDATED` is honest disclosure, not a dodge: it enumerates a slim-probability path (turns the unknown into a stated known) without a test — which is why it is reserved for genuinely improbable edges and never for a realistic failure/authority/write path.

## Why manual flows are adversarial and code-blind

The manual flow is the independent adversarial review of an operation. The executing agent did not write the code and is not anchored to the author's assumptions; its job is to find what the author's flows + unit/E2E tests missed — probe, abuse, and try to break the surface. Authoring from the spec only (code-blind) means running the flow validates the surface AND the spec's accuracy in one shot; a flow that cannot be authored from the spec proves the spec deficient.

## Why exact URLs and a retry cap in browser-agent rules

A guessed or invented URL is the #1 cause of runaway agent thrashing, so every navigation/fetch names its exact URL and the agent is told never to guess. Unbounded step retries crash the tab (renderer OOM) and burn the agent's budget, so every flow caps at two attempts before recording a FAIL and stopping.

Last updated: 2026-07-11T00:00:00Z
