# REQUIREMENTS_CONTRACT

> Autonomous building happens ONLY against requirements finalized with the user and locked. Sessions help by building exactly what was agreed — never by guessing, never by silently deciding on the user's behalf.

```meta
version: 1
last_updated: 2026-07-19T16:43:58Z
```

## requirements_phase

- `where`: docs/requirements/REQUIREMENTS.md (+ REQUIREMENTS.yaml when machine fields help)
- `how`: produced WITH the user (brainstorm → draft → user edits → final)
- `outside_in_input`: the user-journey catalog (USER_JOURNEYS.md, docs/journeys/) is the outside-in evidence that shapes requirements — journeys are discovered from the SaaS domain + peer apps BEFORE requirements are drafted, so the capabilities below answer real arriving-user intent, not internal guesswork. Journeys FEED requirements; they never replace them (the user still locks).
- `lock`: "<!-- requirements-locked: YYYY-MM-DD by:user -->" _(ONLY the user locks requirements)_
- `contents`: what the app is, every capability (each becomes an API per API_FIRST.md), actors + gating, out-of-scope list, and the acceptance bar

## autonomous_build

- `starts`: only when the lock marker exists
- `derivation_order`: requirements → journeys (USER_JOURNEYS.md) → standards → decision logs → ask _(never invent)_
- `stop_conditions`: _(the ONLY reasons a session stops)_
  - ALL DONE — every gate green, locks stamped, 100%-standards-met push
  - a question ONLY the user can answer (not derivable from requirements/standards/decisions)
  - an assumption the session is about to make that could CONTRADICT locked requirements or standards — surface it BEFORE building on it
- `no_executive_decisions`: scope, tech beyond STACK.md, product behavior, and anything the requirements are silent on that changes what the user gets — user-owned, always

## assumption_ledger

- `file`: docs/requirements/ASSUMPTIONS.yaml _(append-only, like the decision log)_
- `entry`: { date, assumption, derived_from: <requirements/standards/decision citation> }
- `rule`: every assumption made mid-build is WRITTEN with its derivation BEFORE code relies on it; an assumption with no derivable citation is a stop-condition, not an entry
- `why`: bad assumptions surface in days at review of the ledger — not months later in code

## enforced_by

scripts/verify/verify-outside-in.mjs --check requirements _(shipping repo with features but no user-locked requirements = red)_

Last updated: 2026-07-19T16:43:58Z