# AGENT_AFFORDANCES — detail

Why each rule in `AGENT_AFFORDANCES.md` exists. The umbrella motivation — an agent with ONLY `__specs__/` must operate every feature without guessing — lives in `SPEC_CONTRACT.rationale.md`.

## `/agents.json` — why auto-generated

An `AGENT_INDEX.md` maintained by hand is a lying-source-of-truth waiting to happen. Drop a new operation, forget to update the index, ship — the agent's table of contents now lies, the agent picks the wrong operation, the user sees garbage.

Auto-generation at build time means: the index is regenerated from every `__specs__/spec.md` in the repo on every build. Specs are the source. Index is derived. They cannot drift.

`/agents.json` is the primary machine surface. `/agents.txt` is an optional human-readable derivative for `llms.txt`-style consumers. Both come from the same generator, so they cannot disagree.

## `agents_index.generated_at: build-time` — why not runtime

Two choices:

- **Runtime** — `/agents.json` is a route handler that scans the filesystem on each request. Always-fresh but requires the source `__specs__/spec.md` files to be packaged into the deployed runtime bundle (Next.js doesn't include source by default; we'd need an explicit copy step). Slight serve-time latency.
- **Build-time** — the generator runs once during the project's build step, emits a static `/agents.json` to the public output. No runtime fs access. Served as a static file.

Build-time wins because every merge triggers a build, so the static file is always fresh against the current commit. Drift between source specs and the served index is impossible — both come from the same git ref. For the deploy-on-merge model (Vercel, Cloudflare Pages, similar), this is the natural choice.

Runtime would only beat build-time if specs could change between deploys — but our model doesn't allow that (specs are part of code, code lands via PR + deploy).

## Standardized `data-*` attributes — why a fixed vocabulary

If every page invents its own attribute names (`data-action`, `data-do-thing`, `data-button-type`, `data-purpose`), the Chrome-extension agent has to read the whole page to figure out which element does what. With a fixed vocabulary — `data-testid`, `data-agent-action`, `data-agent-step`, `aria-label` — the agent looks for the same four attributes everywhere and knows what they mean.

Same logic for the action-verb catalog. If one form uses `submit`, another uses `save`, and a third uses `confirm-and-go`, the agent has to map free-form verbs to intentions on the fly. Lock the verb list; pages choose from it. Adding a new verb = a one-line PR to extend the list, then any page can use it.

`data-agent-step` carries the `<surface>:<state>` pattern so a multi-step flow (sign-in → email-entry → password-entry → submit) is traceable from the agent's perspective.

## `data-testid` 3-segment format — why `<feature>-<element>-<type>`

Three segments because that's the smallest schema that uniquely identifies an element across a multi-feature codebase:

- **`<feature>`** — disambiguates between features that ship similar elements (`whoami-email-input` vs `signup-email-input`). Without it, every "email-input" testid collides at the test-runner / agent-extension level.
- **`<element>`** — the role of the element (`signin-link`, `submit-btn`, `permissions-list`). The agent uses this to predict behavior — `*-btn` is clickable, `*-input` accepts text, `*-list` contains items.
- **`<type>`** — the kind (`btn`, `input`, `link`, `list`, `cell`). Helps the agent reason about the affordance type without inspecting the rendered DOM.

Kebab-case (lowercase + hyphens) because: (a) it's the existing JS / HTML attribute convention, (b) it's parseable by `split('-')`, and (c) it doesn't collide with CSS class-name conventions.

Trade-off: more verbose than a 1-segment testid (`submit-btn` alone). Worth it because the verbosity buys collision-free uniqueness across the whole site.

## Public-facing rules — `/llms.txt`, RSC docs, plain-English OpenAPI

The agent visiting the deployed site from outside doesn't have the repo. It has only what's reachable over HTTP. `/llms.txt` is its first stop — a plain-text table of contents (industry convention from llmstxt.org) telling it what the site does + where the structured contracts live.

Docs served as RSC-rendered markdown (not JS-heavy single-page apps) mean `curl <docs-url>` returns readable content. Text browsers + agents share one path with humans.

OpenAPI `description:` fields written in plain English (not terse identifiers) mean an agent reading `openapi.yaml` doesn't have to decode jargon to know what an operation does. Same content humans read in Swagger UI.

"No human-only UI" — hover-only menus, drag-only reordering, focus-only modals — all banned. Two reasons: (1) agents can't perform those gestures reliably, (2) accessibility-impaired humans can't either. The two constituencies share one constraint.

Last updated: 2026-07-12T00:00:00Z
