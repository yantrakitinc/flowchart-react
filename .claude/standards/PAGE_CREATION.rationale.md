# Page-creation standards

Tier-3 standard for pages and surfaces — the top of the design-system hierarchy. A "page" is any user-facing surface that composes composites + atomics into a coherent destination.

This file is the rationale companion to `PAGE_CREATION.md`.

## Why a separate page tier

Pages are not just bigger composites. They have concerns no atomic or composite carries:

- **Routes have URLs.** URL state, deep linking, browser history, redirects are page concerns.
- **Pages have landmarks.** `<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>` are page-tier structural elements. A Button doesn't carry these; a Dialog doesn't either.
- **Pages have state machines.** Even a single-state page should declare `state: idle`. Most have idle / loading / success / error / not-found / partial. This is fundamentally different from a composite's state (open/closed, loading).
- **Pages own performance budgets.** LCP, FCP, hydration timing, total JS — page-level metrics.
- **Pages own SEO.** Title, OG image, structured data, sitemap inclusion.
- **Pages own analytics.** Section visibility, key conversions.
- **Pages own i18n.** Translation keys and RTL coordination are page-tier.
- **Routes ship error.tsx / loading.tsx / not-found.tsx.** Three more files per route.

Pages get their own standard because squeezing all this into the composite tier obscures it.

## surface_type — unifying routes and non-routes

A Chrome extension sidepanel is a "page" in every meaningful sense: it has landmarks (relaxed), a state machine, focus orchestration, performance constraints, edge cases. But it's not a Next.js route. The `surface_type` field unifies the standard across:

- `route` — Next.js / React Router; URL-addressable.
- `sidepanel` — Chrome extension sidepanel; not URL-addressable.
- `popup` — Chrome extension popup; not URL-addressable.
- `options` — Chrome extension options page; URL-addressable but no SEO concerns.
- `embedded` — a surface rendered inside another surface that has its own state machine (borderline; if the state is just composite state, it's not embedded — it's a composite).

The `non_route_surface_adjustments` block in `PAGE_CREATION.md` lists which page-tier requirements relax for each non-route type. Sidepanel and popup waive SEO; route can't. Sidepanel's performance budget is the sidepanel viewport (380×640 paint + sub-100ms interaction), not LCP/FCP at the whole-page level.

## Thin specs at page tier

The same thin-spec doctrine applies: don't restate the composite's state propagation rules or the atomic's anatomy. The page spec lists `consumed_composites` + `consumed_atomics` and trusts those tiers' locked specs.

What the page spec adds:
- The surface itself (URL or surface ID).
- Layout grid + responsive matrix per breakpoint.
- Landmark structure.
- State machine + URL state.
- Focus orchestration on state transitions.
- Performance / SEO / analytics / i18n.
- error.tsx / loading.tsx / not-found.tsx contracts.

These are the orchestration concerns that exist only at the surface level.

## Wireframes — one per breakpoint

The state matrix at the atomic tier and the composition_anatomy at the composite tier both communicate structure. At page tier, that's insufficient — the layout is the design. Wireframes (ASCII or unicode-box) at each declared breakpoint live at `__specs__/wireframes/<breakpoint>.md`. Examples:

- `wireframes/mobile.md` — single column, sticky header, bottom nav
- `wireframes/tablet.md` — two-column with sidebar drawer
- `wireframes/desktop.md` — three-column with persistent sidebar + main + aside

The verifier doesn't check wireframe contents (that's design judgment), but it checks that the file exists for each breakpoint declared in `responsive_matrix`. A page declaring 3 breakpoints with only 1 wireframe file fails.

## State machine — every page declares one

Even a static page has a state machine: `{states: [idle], transitions: []}`. Declaring it explicitly forces the page author to think about every state the user might land in:

- `idle` — initial render after route load
- `loading` — data fetch in flight
- `success` — primary content rendered
- `empty` — fetched, no content
- `error` — fetch failed
- `not-found` — route matched but resource missing
- `partial` — some data loaded, some pending
- `redirecting` — route redirect in progress

Each state has its own render branch in source. The verifier (`verify-page-state-machine`) cross-checks declared states against the source render branches: missing branches fail, unknown branches fail.

URL state is part of the state machine. A `tab` query param that controls which sub-section renders should appear in `state_machine.url_state` and the source should derive its state from the URL.

## Focus orchestration on transitions

Atomic primitives handle focus on themselves (focus-visible behavior). Composites orchestrate focus across their children (initial focus, focus return). Pages orchestrate focus across state transitions:

- On route enter: focus moves to `<h1>` or skip-link target or first interactive element.
- On state transition from loading → success: focus moves to the first interactive element in the loaded content.
- On state transition from any → error: focus moves to the error message.
- On modal open within a page: composite handles it; on modal close, page may need to return focus appropriately.

`focus_orchestration_on_transitions` in spec.md enumerates these. Tests assert.

## Landmarks — `verify-page-landmarks` enforces

WCAG 2.4.1 (Bypass Blocks) and screen-reader navigation depend on landmarks. The page spec declares which landmarks exist and which element renders them. The verifier confirms:

1. Every declared landmark has a corresponding semantic element in source.
2. No undeclared landmark sneaks in (e.g., a stray `<nav>` not in the spec).
3. Skip-link declared in spec has a target element that exists.

Pages typically need:
- `<header>` (banner role) — site or app header
- `<nav>` (navigation role) — primary nav
- `<main>` (main role) — primary content (exactly one)
- `<aside>` (complementary role) — secondary content
- `<footer>` (contentinfo role) — site footer

Sidepanels and popups have relaxed landmark requirements — they're themselves the `<main>` landmark inside the host page. The standard tracks this via `surface_type`.

## SEO contract — routes only

The `seo_contract` block in spec.md is required when `surface_type=route` and forbidden otherwise. It enumerates:

- `title` — page title; default + per-locale
- `description` — meta description; default + per-locale
- `robots` — `index,follow` / `noindex,nofollow` / etc.
- `og_image` — OG card image path or "site default"
- `structured_data` — JSON-LD schemas to emit
- `in_sitemap` — boolean

The verifier doesn't currently check Next.js Metadata API consumption matches the spec (that's harder grep-wise); reviewer + Lighthouse catch it.

## Performance budget — routes own LCP/FCP; sidepanels own paint

For routes, `performance_budget` declares LCP_ms, FCP_ms, CLS, hydration_budget_kb, total_js_kb. Lighthouse runs in verify-phase against these.

For sidepanels, the budget is paint-to-interactive at 380×640 + sub-100ms response on hover/click. Different metric set; the standard's `non_route_surface_adjustments.sidepanel.performance_budget` describes it.

For popups and options, smaller route-style budget.

For embedded, the budget rolls into the parent surface.

## Analytics events + i18n

The page is where analytics events are emitted (page-view, key interactions, conversions). The spec enumerates them with their payload schemas; source emits them; the test layer can mock the analytics client and assert events fire.

i18n at page tier means: translation keys are listed in the spec; the page consumes them via the project's i18n library; RTL is handled at the layout level (mirroring grids) on top of the atomic/composite RTL (mirroring icons + text directionality).

## error.tsx / loading.tsx / not-found.tsx

For routes, Next.js separates these into distinct files. Each is its own design.md surface — `error.tsx` is the error surface design; `loading.tsx` is the loading surface design; `not-found.tsx` is the not-found surface. The page spec carries the `error_surface`, `loading_surface`, and `not_found_surface` blocks naming trigger conditions, copy, and recovery actions for each.

Non-route surfaces (sidepanel, popup) don't have separate files — they inline these states into the state machine. The standard accommodates both.

## When a page needs a composite that doesn't exist

Same rule as composite-to-atomic: file an issue against the composite. Don't fork the composite inside the page. The bottom-up lock order means pages can begin design + research without composites locked, but can't pass Phase 2 until composites lock.

## Storybook at page tier

Stories are harder for pages because data + routing must be mocked. The standard permits substituting the manual flow (manual/<flow>.md) for stories when mocking is impractical — declared explicitly in `spec.md.stories_substituted_by_manual: true`. The playbook drives the page via Playwright in a real route + mocked data layer instead of a story.

addon-a11y zero violations still required, run against whichever surface (stories or live route).

## Compositional purity — pages compose, they don't customize

The same anti-pattern from composites: don't bypass a composite's public API to customize. If the page needs a Dialog variant the existing Dialog composite doesn't ship, file an issue against the composite. Pages are surfaces; composites are reusable orchestrations; atomics are primitives. Cross-tier discipline holds the line.

## Why page-tier coverage may relax below 100/100/100/100

Pages compose 3rd-party libraries (routers, data layers, analytics clients), so per-file 100% coverage is often unattainable without mocking the world. The project-policy override in `autonomy.yaml` exists for exactly this; atomic and composite tiers keep the strict 100/100/100/100 bar.

## Versioning

`version: 1` ships with the 6-phase order, `surface_type` enum, wireframes-per-breakpoint, state-machine declaration, page landmarks + state-machine verifiers, and non-route surface adjustments. Future breaking changes (new `surface_type` value, renamed required block) bump.

Last updated: 2026-06-01T00:00:00Z
