# E2E testing standard — detail

## Why E2E is separate from unit and from manual playbooks

Unit tests prove a function/component in isolation; per-feature manual playbooks prove one surface of
one feature. Neither can answer "does booking-then-paying-then-getting-a-receipt actually work across
scheduling, payments, and accounts." That cross-feature journey is what E2E owns. Keeping it a
separate standard (and a separate folder tree) means a person can go to one place to ask "what does
the whole product do," and the cross-feature tests don't get buried inside one feature's folder.

## Why UI/API parity

The agent-operability bar already requires every browser action to have an API equivalent. E2E is
where that promise is enforced: if a journey can be done in the UI but its API variant can't be
written, the API surface is incomplete — a real defect the parity rule surfaces. Two variants per
flow is therefore not duplication; it's the mechanism that keeps the API honest.

## Why English steps + a separate yaml (not one or the other)

The steps must be readable and writable by a human and turned into a test by a coding agent — that's
prose, `Setup → Actions → Assertions`. But the runner needs structured facts (which projects, which
seed, which run modes, which variants) that prose can't carry reliably. Splitting them follows the
universal rule-of-thumb (`.md` human, `.yaml` machine) and mirrors `spec.md` + `spec.md`. The yaml
deliberately does **not** restate the steps: one source of truth for the steps (the `.md`), one for
the machine facts (the `.yaml`), so they can't drift.

## Why the UI md doubles as the Chrome Extension steps

The same plain-English UI journey is what a person follows, what Playwright automates, and what the
Chrome Extension drives. Authoring it once and pointing all three at it guarantees they test the same
thing. A separate "chrome" file would be a second source of truth that silently diverges.

## Why placement follows the shared-truth boundary

A test run can only own the truth it can reach. Inside a shared-DB cluster one run can seed the DB
and drive every member, so one home serves the whole cluster. Across an API boundary no one owns the
other's data, so each side tests its own flows and the crossing becomes a contract test. Repo layout
(mono/poly) only decides whether that home is a folder here or a separate repo — the boundary, not
the layout, decides the shape. `projects[]` + the `own-flow`/`cross-project` tag exist so that when a
project is later extracted, you know exactly which flows must be reworked (the cross-project ones) and
which travel unchanged (own-flow).

## Why the database rule is absolute

E2E exercises destructive paths (create, cancel, refund, wipe-and-seed). Pointed at real data that is
catastrophic and irreversible. The rule is therefore not "be careful" but "never": E2E may only ever
reach a local DB or a dedicated E2E DB, and remote DBs are never wiped under any flag or mode. "Online"
is redefined to mean an E2E *environment* with its own E2E database precisely so that "run it online"
can never resolve to production data.

## Why seeding is automated, with a narrow human exception

The whole point of the system is "start the Chrome Extension, point it at the page, walk away." A
human seeding step breaks that. So seeding is something Claude Code or the test does itself (`auto`),
or the page drives with a button + wait (`button-wait`). The one case that genuinely needs a human is
a seed too large/slow to run inline — and even then it's explicit, justified by record volume, and
the only sanctioned human-in-the-loop point (`human`).

## Why attestations, not committed run logs

Run results are noisy and per-run; committing them pollutes history and means nothing durable. What's
worth keeping is the durable claim "this flow was 100% verified at this commit" — an attestation,
reusing the existing lock + `compliant/<sha>` machinery. Raw results stay ephemeral and are cleaned;
the attestation is the record.

## Edge cases

- **API-only flow** (no UI) — declare only the `api` variant; no UI/chrome file. Parity applies only
  where a UI surface exists.
- **A flow that can't be expressed from the spec alone** — the spec is deficient; fix the spec, per
  the spec-driven, code-blind rule. Never author an E2E by reading source.
- **`.archive/`** — exempt; archived journeys are not discovered or run.

Last updated: 2026-06-21T00:00:00Z


## Overview (migrated from E2E_TESTING.md)

# E2E testing standard

Governs end-to-end tests — whole user journeys across features, proving the *product* does what it
should. Distinct from unit/in-feature tests (`TEST_STACK`) and from per-feature manual playbooks
(`__specs__/manual/<flow>.md`). Naming + IDs come from `TEST_NAMING`.

## UI / API parity

Anything doable in the browser must be doable via API (the agent-operability bar). So **every flow
normally has both a UI E2E and an API E2E.** A **mixed** variant exists only when a single journey
genuinely needs both.

## Structure: scenario → flow → variants

- **Scenario = a folder** holding many flows (happy path, error cases, edge cases).
- **Flow = a sub-folder** inside the scenario.
- **English steps in `.md`, machine data in one `<flow>.yaml`.** Steps are plain English in a fixed
  shape — **Setup → Actions → Assertions** — so a coding agent turns them straight into a test. The
  yaml is the machine contract and never restates the steps (no duplication, no drift).
- The **UI `.md` doubles as the Chrome Extension steps** — one file, not two.

### Default layout (named files in the flow folder)
```
e2e/booking/                          scenario
  booking.md                          plain-English scenario overview (non-technical)
  happy-path/                         a flow
    happy-path.yaml                   MACHINE contract: identity, projects[], tag, seed{}, runModes[], variants[]
    happy-path.md                     plain-English flow overview
    happy-path.api.md                 API variant: Setup / Actions / Assertions (English)
    happy-path.api.e2e.test.ts        the API test
    happy-path.ui.md                  UI variant:  Setup / Actions / Assertions (English; = Chrome steps)
    happy-path.ui.e2e.test.ts         the UI test
    happy-path.mixed.md               only if this flow needs a mixed journey
    happy-path.mixed.e2e.test.ts
```
Blend in a sub-folder per variant only when one variant grows into many files.

## The variant spec (`<flow>.<variant>.md`)

Exactly three sections:
- **Setup** — preconditions + the seed strategy (see below). Target is always a local or E2E DB.
- **Actions** — the steps, in order.
- **Assertions** — what must hold, and what must NOT happen.

## The machine contract (`<flow>.yaml`)

One per flow. The runner + coder read it; pages render from it; it is never hand-maintained.
Fields: `scenario`, `flow`, `tag` (own-flow | cross-project), `projects[]` (projects/repos the flow
touches), `seed{}`, `runModes[]` (subset of local | online | hybrid), and `variants[]` — each
`{ kind: ui|api|mixed, md, test, runModes? }` pointing at the English `.md` + the test. It does not
restate the English steps.

## Placement (per the repo taxonomy)

E2E lives with the shared-truth boundary it exercises:
- **mono** → one spanning `e2e/` folder at the repo root for the whole repo.
- **poly** → per flow, in the repo that owns the **majority of the behavior** (center of gravity);
  the flow's `projects[]` makes that explicit.
- Across an **API boundary**, E2E is per-project plus a contract/integration test on each side.

Tag each flow `own-flow` vs `cross-project` so a mono→poly extraction is clean.

## Database safety (hard rule — non-negotiable)

- E2E **never** touches a real / remote / production database. Remote databases are **never wiped**.
- E2E targets **only** a local database or a dedicated E2E database — both safe to clear and seed.
- "Online" E2E means against an E2E environment with its own E2E database, never production.
- Because the target is never real data, full wipe + reseed is allowed (local / E2E only).

## Seeding (automated; no human by default)

A flow declares a `seed.strategy`:
- **`auto`** (default) — Claude Code runs the seed before driving the flow; automated tests seed in
  their own setup (fixture / `beforeAll`), in which case `command` is `in-suite` (no external command).
- **`button-wait`** — the runner page renders a "Seed database" button (from config), runs the seed,
  waits the configured duration, then continues automatically.
- **`human`** — exception, only for large/heavy seeds: the Chrome Extension tells the human to run
  the seed, then waits for "continue."

## Run modes

`local` (boot the needed projects + DB locally), `online` (against an E2E environment), `hybrid`.

## Attestation

When a flow is green across its declared variants/modes it earns a timestamped, `<sha>`-stamped
attestation (reusing `standards-compliance.md` + `compliant/<sha>`). Raw run results stay
ephemeral and gitignored.

## Exemption

Paths inside a `.archive/` folder are exempt (see STANDARDS_ENTRY).
Last updated: 2026-07-11T00:00:00Z

