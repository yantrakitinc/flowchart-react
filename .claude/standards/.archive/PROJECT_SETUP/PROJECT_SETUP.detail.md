# PROJECT_SETUP — detail

Why each rule in `PROJECT_SETUP.yaml` exists.

## Why this standard exists at all

Setting up a new project is the highest-leverage moment in its life. Decisions made here (port choice, hostname pattern, env-var layout, README structure) recur across every subsequent slice. A project that skips the pre-setup ceremony pays for it indefinitely — confusing local dev, missing audit URLs, mystery env vars.

This standard exists so every new project follows the same setup spine. The agent doing the setup doesn't have to remember what to provision; it reads the YAML and provisions in order.

## Folder layout — why the strict root

Strict root layout makes every repo scannable in one glance — humans + agents see exactly what's documentation vs what's code. Tooling (Vercel, CI, agents) has one place to look for code. No "is package.json at root or in web/?" ambiguity per-repo. The Vercel `Root Directory` setting is the deploy-side half of the same contract: the app builds from its per-app code path, never from repo root.

## Pre-setup — provision before code

Five things must exist before any code lands:

1. **GitHub repo** — the code's home. Capture URL into memory.
2. **Primary GitHub user** — who creates issues + opens PRs on this project. When the user holds multiple GH accounts on the same machine, they are non-interchangeable; using the wrong one for `gh` ops produces orphan attribution. The user names the primary at provision time; the agent never assumes.
3. **GitHub Project board** — every issue MUST land on a board at creation time (see GITFLOW.yaml). The board has to exist before the first issue.
4. **Host provider dashboard project** — Vercel, Cloudflare Pages, Render, AWS Amplify, etc. Capture the dashboard URL. Provision via the web UI; NEVER auto-create via CLI (commands like `vercel link --yes` link the repo to whatever Vercel project is highlighted, which is often the wrong one). The web UI forces a deliberate pick.
5. **Third-party services** — Stripe, Sentry, PostHog, Slack webhooks, etc. Only what the project actually needs. Capture credentials in memory.

The capture step is the audit anchor. Six months later when the agent asks "where's the project board for X?", the answer is in memory + reference.md, not in someone's head.

## Ports + local hostnames

`/etc/hosts` is the source of truth for local dev. Why:

- **Unique port per project.** Multiple projects on the same machine each get their own port. Running two projects on `:3000` causes "the wrong project loaded" bugs that look like cache problems.
- **Hostname instead of localhost.** `<project>.<dev-tld>` shows up in the URL bar; the developer knows which project they're looking at. Cookies + auth flows that depend on domain matching work the same locally as in production.
- **`/etc/hosts` is the canonical record.** When `package.json` drifts (someone changed the port in code but forgot the host file), the host file wins — that's the thing the browser actually reads.

The dev-tld is per-project. `.local` is the standard convention; brand-scoped TLDs (e.g., `.yantrakit.local`) are fine for projects in a given product set; anything that doesn't collide with a real TLD works.

Storybook gets its own port + hostname because it runs as a separate dev server. Storybook and the app run as concurrent processes; both need their own slot. (Port assignments are project-specific — see the project's own `README.yaml.local_dev_url` + `/etc/hosts` entry, not this standards doc.)

The drift rule (`/etc/hosts wins; update package.json`) prevents the cycle where "I changed the port in package.json but forgot `/etc/hosts`, now it doesn't work" turns into "I changed `/etc/hosts` too but used a different port, now both are inconsistent". One source of truth.

## Root README requirements

The README is the project's onboarding doc. Eight top-of-file metadata items + seven sections.

The metadata answers questions a new contributor (human or agent) asks before reading any code:
- What is this? (name + description)
- Where do I see it running? (production URL)
- Where's the code? (GitHub repo)
- Where's the work tracked? (project board)
- Where's it deployed? (host dashboard)
- How do I access it locally? (local dev URL + ports)
- Who owns the GitHub identity? (primary user)
- What third-party services does it touch? (one line + dashboard each)

If any of those answers is missing, the contributor has to ask — wasting time and signaling "this project's documentation is incomplete."

The seven sections (Prerequisites / Structure / Development / Tech Stack / Env vars / Testing / Deployment) are the minimum to clone the repo and contribute. Each one answers the next question after the metadata.

## Environment variables

Two files: `.env.example` (committed, keys only) + `.env.local` (gitignored, values for local dev).

Every variable in `.env.example` has a comment: what it's for + where to get the value. The comment is the difference between "developer reads the variable name and guesses" vs "developer reads the comment and provisions correctly."

The `NEXT_PUBLIC_` ban on server-only secrets is shared with GOOGLE_FIREBASE_STANDARDS — the prefix ships the variable to the browser bundle, exposing anything it labels.

The `printf '%s'` vs `echo` rule for host-provider CLIs catches the multi-line-value corruption problem. Service-account JSONs, RSA keys, multi-line API tokens — `echo` adds trailing newlines + may interpret escape sequences. `printf '%s'` preserves the input byte for byte.

Admin email lists are semicolon-separated + lowercase: semicolon because commas appear in email display names occasionally, lowercase because email comparison is case-insensitive in practice.

## API surface — every service has an HTTP route

The rule: every service method called by a Server Action MUST ALSO be exposed as an HTTP route, even when no external consumer is planned. Three reasons:

1. **Chat agent operability.** The agent has to be able to invoke every operation. Server Actions are framework-bound (Next.js); HTTP routes are universal. If the agent can only reach the operation through the UI, it can only operate it via the manual-script path. With an HTTP route, the agent can drive the service layer with pure data.

2. **Manual API testing.** The Chrome-extension agent drives Swagger UI in dev/staging to exercise every endpoint with pure data, independent of UI flows. Bugs that only surface through "wrong input shape" or "permission boundary" are caught at the API surface, not buried behind UI validation.

3. **Future external consumers.** Once a service is HTTP-callable, exposing it to a future CLI / API client / mobile app is a documentation change, not a re-architecture.

Each route gets:
- An entry in its feature's `__specs__/openapi.yaml` (AGENT_STANDARDS owns the schema).
- A manual script in `__specs__/manual/<flow>.md` (so the Chrome-extension agent can drive it).
- A version prefix (`/api/v1/...`) — breaking changes bump to v2.
- Authorization via Layer A + Layer B (see AUTHORIZATION_STANDARDS).

`/openapi.json` is the auto-generated aggregate spec (the same one `agents_index` references in AGENT_STANDARDS). `/docs` is the Swagger UI shell — visible in dev/staging, gated behind admin auth in production.

## Visibility gates

`ENABLE_ALL_API` + `ENABLE_SWAGGER_FOR_ALL_API` separate "what's reachable" from "what's listed." Some endpoints exist for testing only (seed data, fixture flips, dry-runs, internal admin ops). They're never meant to be discoverable in production but need to exist for the maintainer.

`visibility: "public"` endpoints are always reachable + always in Swagger.
`visibility: "internal"` endpoints are reachable only when `ENABLE_ALL_API=true`; in Swagger only when `ENABLE_SWAGGER_FOR_ALL_API=true`.

Local dev: both default to `true` (developer needs full surface).
Production: both default to `false` (locked down).

The "flipping to true in production MUST emit an audit event" rule catches the abuse case — an attacker (or a careless admin) flips the flag, exposes internal endpoints, never flips back. The audit trail makes this auditable.

## Testing surfaces — all 4 required

Four surfaces are required for 100% compliance:

1. **Unit / integration** — Vitest at 100% coverage. The mechanical floor.
2. **Scripted E2E** — Playwright with real transport AND persisted state. Catches the "the test passed but the DB didn't write" class of bug.
3. **Manual API** — Chrome-extension agent drives Swagger UI. One flow per endpoint.
4. **Manual UI** — Chrome-extension agent drives `__specs__/manual/<flow>.md`. Every user-facing surface.

The combination covers what any single surface misses. Unit tests can't catch framework integration bugs; E2E can't catch the "agent reads the spec and operates it differently than expected" bug; manual surfaces catch the human-level "is this experience actually usable" question.

All four green is the bar for production ship.

STANDARDS_COMPLIANCE.yaml's manual walk at lock time is where these four surfaces get exercised. The lock isn't stamped until all four are green.

## Project memory capture

Once provisioned, the URLs + decisions go into `~/.claude/projects/<project-id>/memory/reference.md`. Future sessions read that file to know:
- Where's the GitHub repo + board?
- Where's the host dashboard?
- What ports + hostnames are claimed?
- What's the dev-tld for this project?
- What third-party services + credentials?

Without this, every new session starts from "what is this project again?"

Last updated: 2026-07-11T00:00:00Z
