# MANUAL_FLOWS — detail

Why each rule in `MANUAL_FLOWS.md` exists. The umbrella motivation — an agent with ONLY `__specs__/` must operate every feature without guessing — lives in `SPEC_CONTRACT.rationale.md`.

## Why manual scripts live under `__specs__/manual/`

The browser-executable manual scripts are FOR agents (Chrome extension, future CLI). They're specification — "here's how an agent drives this UI" — so they belong with the rest of the specification under `__specs__/`. Plain `manual/` (single underscores) signals "a regular subdirectory" rather than the double-underscore convention reserved for framework-magic folders.

## Why manual flows are adversarial and code-blind

The manual flow is the independent adversarial review of an operation. The executing agent did not write the code and is not anchored to the author's assumptions; its job is to find what the author's flows + unit/E2E tests missed — probe, abuse, and try to break the surface. Authoring from the spec only (code-blind) means running the flow validates the surface AND the spec's accuracy in one shot; a flow that cannot be authored from the spec proves the spec deficient.

## `manual_md.step_shape` — why each field

Each step in a `manual/<flow>.md` represents one atomic browser-driven action. Five fields:

- **`action`** — required. The human verb ("Click the submit button", "Fill the email input"). Drives the agent's verb selection at runtime.
- **`selector`** — CSS / aria-label / role+name. The agent locates the element. Without it the agent has to guess from the action verb, which fails on any non-trivial page.
- **`input`** — value to type / paste (for fills). Separated from `action` so a templated `${SEED_EMAIL}` doesn't have to live inside a prose verb.
- **`expected`** — one-line post-state description ("redirect to /whoami; signed-in markers visible"). Tells the agent what success looks like for THIS step.
- **`assertion`** — boolean expression the agent can evaluate (e.g., `'[data-testid="whoami-signed-in"]' is present`). Programmatic verification, not just prose.

Five fields is the minimum to describe a clickable interaction unambiguously. Adding more (timing, retry policy, screenshot-on-pass) → optional metadata in a future revision; not core.

## Why exact URLs and a retry cap in browser-agent rules

A guessed or invented URL is the #1 cause of runaway agent thrashing, so every navigation/fetch names its exact URL and the agent is told never to guess. Unbounded step retries crash the tab (renderer OOM) and burn the agent's budget, so every flow caps at two attempts before recording a FAIL and stopping.

Last updated: 2026-07-12T00:00:00Z
