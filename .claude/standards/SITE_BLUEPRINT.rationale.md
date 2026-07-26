# Site Blueprint standard — detail

## Why scope exempts components

Atomics and composites are design-system inventory: token-bound, spec'd, tested in isolation, and
consumable by any future page. Building them early is cheap and safe — they carry no product-flow
assumptions. Pages are the opposite: a page hard-codes a scenario (what the operator sees, does,
and recovers from), and coding one without the full scenario map produces whack-a-mole UI — screens
that contradict flows discovered later. The gate therefore bites exactly at the tier where
scenario knowledge is load-bearing, and nowhere below it.

## Why the blueprint is markdown, not tickets

Tickets fragment; a folder of page docs and flow docs reads as the site. The blueprint is the
single place where a reader (human or agent) walks every route, opens every interaction, and hits
every failure branch before a line of page code exists. Feature `__specs__/` folders then bind
slices to code; the blueprint is the map they hang from. The vision docs (`docs/specs/`,
`docs/plan/`) stay the "why"; the blueprint is the "exactly what".

## Why the coverage matrix ends with a machine line

"Each scenario is covered" must be falsifiable. Prose claims rot; a literal terminal line
`unmapped_stories: 0` is greppable by the verifier and turns completeness into a mechanical check.
A matrix that cannot honestly print that line is the standard working as intended: the gap list IS
the remaining planning work.

## Why API bindings gate page slices

Build principle "API first, UI last" fails silently when a page doc cites an endpoint that doesn't
exist — the page slice starts, discovers mid-flight the backend is missing, and either stalls or
grows an inline mock that ships. Forcing every consumed endpoint to be *existing* (GAPs resolved)
before the page slice starts converts that failure into an explicit ordering: the GAP's API slice
is scheduled first.

## Why the lock marker mirrors design-lock

The component discipline's `design-locked` marker + autonomy-mode split (`by:user` / `by:agent`) is
a proven shape: mechanical checks decide eligibility, autonomy.yaml decides who may sign, and the
verifier refuses source without a signature. Reusing the shape (as `blueprint-locked` +
`blueprint_lock_mode`) keeps one mental model across tiers.

## Why airtightness is mechanical, not editorial

Each of the eight checks encodes a failure mode observed when multiple writers produce a blueprint
in parallel: draft markers (`GAP-NEW`) surviving to lock, endpoint paths invented in one doc and
never registered in the bindings table, cross-references to docs another writer was expected to
produce, brace-glob built-claims naming components that were never shipped, and matrix rows that
drift from the story catalog. Prose review catches these unreliably; a grep does it every time.
The lock marker is therefore a claim the verifier can falsify — `by:agent` self-lock is only
legitimate because the suite, not the agent's judgment, decides eligibility.

## Anti-patterns

- **Blueprint theater** — writing page docs after the page ships, to satisfy the verifier. The
  gate checks the marker before page source is committed; retrofits show up in git history as
  page-before-doc and are a phase-order violation, same class as code-before-design.
- **GAP laundering** — marking an endpoint "existing" in 03-API-BINDINGS.md because a route file
  exists with a stub handler. Existing means the verify chain covers it (spec + tests locked).
- **Scope creep via flows** — inventing flows the vision docs don't support. Every flow traces to
  a user story; stories trace to vision. The matrix makes orphan flows visible.
- **One mega-doc** — a single SITE.md instead of per-page/per-flow docs. It defeats slice binding
  (`blueprint_doc:` points a page spec at ITS doc) and makes drift invisible.

## Worked example (correct)

`socialytix/ai.socialytix` `docs/site/`: core docs 00–03 + `pages/*.md` (24 surfaces) +
`flows/*.md` (30+ scenarios) + `99-COVERAGE-MATRIX.md` mapping the 89-story catalog in
`docs/plan/05-USER-STORIES.md`. The channel-queue page slice may start only when
`docs/site/pages/channel-queue.md` exists, `flows/approve-gate.md` (+ siblings) exist, and GAP-1
(pending-gates list endpoint) has landed as a locked API slice.

Last updated: 2026-07-09T00:00:00Z


## Overview (migrated from SITE_BLUEPRINT.md)

# Site Blueprint standard

Governs the order between planning and site code: **a site's page-tier surfaces may only be coded
after a complete site blueprint exists in markdown.** Design-system components (atomics and
composites) are exempt — they may be built at any time, blueprint or not.

## The rule

1. **The blueprint is the site, in prose.** Before any page/route/surface is coded, the whole site
   exists as a markdown blueprint: every route, every page's layout and states, every interaction
   flow with every branch and failure, and a coverage matrix proving no scenario is unspecified.
2. **Components are exempt.** Atomics (`COMPONENT_CREATION`) and composites (`COMPOSITE_CREATION`)
   follow their own 6-phase discipline and may be built before the blueprint exists. They are
   design-system inventory, not site surfaces.
3. **Pages are gated.** A page-tier slice (any surface `PAGE_CREATION.md` recognizes as
   `tier: page`) may not start until:
   - the blueprint carries its lock marker, and
   - that page's own blueprint doc exists, and
   - every flow doc the page references exists, and
   - every endpoint the page consumes is listed as **existing** (not a GAP) in the blueprint's
     API-bindings doc — API first, UI last.

## Blueprint shape

The blueprint lives at `docs/site/` in the repo:

| File | Role |
|---|---|
| `00-INDEX.md` | Reading order + the page-doc and flow-doc templates + the lock marker |
| `01-DESIGN-LANGUAGE.md` | The visual/motion/voice language every page binds to |
| `02-ROUTES-AND-SHELL.md` | The complete sitemap with guards + the app-shell contract |
| `03-API-BINDINGS.md` | Every surface → verified endpoint, or a named GAP-n |
| `pages/<slug>.md` | One doc per page: layout, components, data, full state matrix, interactions, edge cases, a11y, responsive |
| `flows/<verb-slug>.md` | One doc per interaction: happy path, every branch/failure, postconditions, scenario checklist |
| `99-COVERAGE-MATRIX.md` | Every user story ↔ page/flow docs; ends with the machine line `unmapped_stories: 0` |

## Completeness and the lock

A blueprint is complete when every template section is present in every doc, no doc contains
`TBD`/`TODO`/placeholder text, and the coverage matrix reports `unmapped_stories: 0`. On
completeness, `00-INDEX.md` receives the lock marker:

```
<!-- blueprint-locked: YYYY-MM-DD by:user -->    (human review path)
<!-- blueprint-locked: YYYY-MM-DD by:agent -->   (autonomous path)
```

The autonomous path is permitted only when the repo's `.standards/autonomy.yaml` sets
`blueprint_lock_mode: autonomous` (default when the key is absent) AND the completeness checks all
pass mechanically.

## Airtightness

A locked blueprint is held to eight mechanical checks — all must be green before the lock is
applied, and a locked blueprint failing any of them fails the verify chain:

1. **Core files exist** — the five numbered docs.
2. **Zero placeholder text** anywhere under `docs/site/`.
3. **Template sections complete** — every page doc carries all 10 H2s, every flow doc all 6.
4. **GAP citations valid** — every `GAP-<n>` cited has a row in `03-API-BINDINGS.md`; the
   `GAP-NEW` draft marker never survives to lock.
5. **Endpoint citations resolve** — every `/api/v1/...` path cited appears verbatim in
   `03-API-BINDINGS.md`; GAP rows enumerate concrete paths, never abbreviations.
6. **Cross-references resolve** — every `pages/<x>.md` / `flows/<y>.md` token points at a real file.
7. **Matrix is total** — `unmapped_stories: 0`, every page/flow doc referenced, and every story in
   the repo's catalog (when present) mapped.
8. **Built claims are true** — a Components row claiming `built` cites a path that exists on disk.

## Enforcement

`verify-site-blueprint.mjs` runs in the verify chain. Whenever the lock marker is present it runs
the full airtightness suite; for every page-tier spec it additionally requires the
`blueprint_doc:` binding and that the bound doc's `## Data` cites no unresolved GAP. Repos with
`ui_discipline: none`, or with neither page-tier specs nor a locked blueprint, pass green —
component-only work and in-progress planning are never blocked by this standard.

## Amending a locked blueprint

The blueprint is living documentation: editing it after lock is normal (new pages, changed flows)
and follows the same completeness rules; the lock date is refreshed on each edit that keeps the
checks green. A page slice whose blueprint doc has drifted from intent updates the doc in the same
slice — the doc and the page ship together, never apart.
Last updated: 2026-07-11T00:00:00Z

