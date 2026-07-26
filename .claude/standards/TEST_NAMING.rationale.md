# Test naming convention — detail

## Why a path-derived ID is the keystone

The test-runner must auto-discover every test, render it on a page, track pass/fail, write
attestations, and clean orphans **with zero hand-maintenance**. Hand-assigned IDs defeat all of
that: they must be kept in sync by a human, they collide, and they go stale silently. Deriving the
ID purely from the file path removes the entire class of problem — the filesystem *is* the registry.
Add a test → it has an ID. Delete a test → its ID disappears → its stored result is, by definition,
an orphan and is removed. No bookkeeping.

Everything downstream references the ID and nothing else, so results, filters, and attestations
never need to know anything about a test except where it lives.

## Why kebab-case except components

Kebab-case is the project-wide default for files, slugs, and ids (see NAMING). Components are the one
established exception — they live in `src/components/ui/<Name>/` with PascalCase folders. Forcing
those to kebab in the ID would either break the derive-from-path rule or require a translation table
(more bookkeeping). Honoring the real folder name keeps the ID a pure function of the path.

## Why the flow name is repeated as a file prefix

`<flow>.ui.md`, `<flow>.api.md`, etc., rather than generic `ui.md` / `api.md`. Repeating the flow
name makes the files greppable by flow, unambiguous when several are open in editor tabs, and safe to
move/copy without losing their identity. The folder already scopes them, so the redundancy is cheap
insurance, not noise.

## Why the yaml fields must equal the folder names

`<flow>.yaml.scenario`/`flow` duplicating the folder names looks redundant, but it lets a verifier
catch drift mechanically: if someone renames a folder but not the yaml (or vice-versa), the ID the
runner derives from the path no longer matches the contract, and the mismatch is a hard error rather
than a silent wrong-ID. The yaml is the contract; the folders are the source of the ID; they must agree.

## Why component IDs go down to control + scenario

The Chrome Extension tests a component by operating its Playground story — setting each control,
triggering each action, checking each scenario. For the runner to track "is this control verified,"
each control/scenario needs its own ID, not just the component. This is the granularity at which the
unit standard requires two-way coverage (unit test + Chrome Extension).

## Why discovery is glob-based

Globs over the naming convention mean discovery is a pure read of the filesystem — no index file to
maintain, no registration step. The convention is strict precisely so the globs are unambiguous: one
glob finds every E2E contract, one finds every code test, one finds every story.

## Edge cases

- **A flow with only one variant** still lives in its own folder with its `<flow>.yaml`; `variants[]`
  simply lists the one. Uniformity keeps discovery and the runner simple.
- **Renames** change the ID (it's path-derived). The old ID's stored result becomes an orphan and is
  cleaned — correct behavior: a renamed test is, to the runner, a new test plus a removed one.
- **`.archive/`** paths are skipped entirely (STANDARDS_ENTRY exemption), so archived tests neither
  discover nor orphan-pollute.

Last updated: 2026-06-21T00:00:00Z


## Overview (migrated from TEST_NAMING.md)

# Test naming convention

Governs how every test (unit + E2E) is named and laid out, so a runner can auto-discover, track,
attest, and clean up tests with zero hand-maintenance. This is the foundation the unit standard
(`TEST_STACK`), the E2E standard (`E2E_TESTING`), and the test-runner all build on.

## The keystone: every test has one path-derived ID

Every test has a single stable, unique **ID derived purely from its file path** — never authored,
never hand-assigned. Form: `<layer>:<path>` where `layer ∈ { unit, e2e }` and `<path>` is the
folder/file segments joined with `/`.

- **E2E:** `e2e:<scenario>/<flow>/<variant>` — e.g. `e2e:booking/happy-path/ui`.
- **Unit, code** (functions / services / actions): `unit:<feature-path>/<file>` — e.g.
  `unit:scheduling/slot-service`. An optional case slug may be appended:
  `unit:scheduling/slot-service/rejects-past-date`.
- **Unit, component** (Storybook): `unit:<feature-path>/<Component>/<case>` — e.g.
  `unit:ui/SlotPicker/disabled-state`.

Everything downstream — stored results, page filters, attestations, orphan detection — references
the ID only. **Orphan rule:** a stored result whose ID no current file produces is an orphan and is
deleted.

## Casing

Kebab-case for every segment, **except** component segments, which stay PascalCase to match the
existing `src/components/ui/<Name>/` folders. IDs remain 100% path-derived and stable.

## E2E filenames

```
e2e/<scenario>/                    scenario name = folder name (kebab-case, unique per e2e home)
  <scenario>.md                    plain-English scenario overview
  <flow>/                          flow name = folder name (kebab-case, unique per scenario)
    <flow>.yaml                    machine contract (identity, projects[], tag, seed{}, runModes[], variants[])
    <flow>.md                      plain-English flow overview
    <flow>.<variant>.md            variant ∈ { ui, api, mixed } — Setup / Actions / Assertions
    <flow>.<variant>.e2e.test.ts   the test for that variant
```

Files repeat the flow name as prefix. The `<flow>.yaml` `scenario`/`flow` fields MUST equal their
folder names. `variants[]` MUST match the variant files present — no stray, no missing.

## Unit / story filenames

```
<feature>/
  <code>.ts
  __tests__/<code>.test.ts             → unit:<feature-path>/<code>
  <Component>/
    __stories__/<Component>.stories.tsx → unit:<feature-path>/<Component>/<case>
    __tests__/<Component>.test.tsx
```

Component unit IDs cover the component plus each Playground **control** and each **scenario** — the
cases both the unit tests and the Chrome Extension exercise.

## Seed dataset names

Kebab-case, referenced by name in `<flow>.yaml.seed.dataset`, living in one known per-repo place
(e.g. `db/seeds/e2e/<dataset>.ts`). Target is always a local or E2E database (never real/remote).

## Discovery globs

- E2E: `**/e2e/**/<flow>/<flow>.yaml`.
- Unit (code): `**/__tests__/*.test.ts(x)`.
- Unit (component): `**/__stories__/*.stories.tsx`.

## Uniqueness

`scenario` unique per `e2e/` home; `flow` unique per scenario; `variant` unique per flow; component
names unique repo-wide. Therefore every ID is unique by construction.

## Exemption

Paths inside a `.archive/` folder are exempt (see STANDARDS_ENTRY). The runner does not discover them.
Last updated: 2026-07-11T00:00:00Z

