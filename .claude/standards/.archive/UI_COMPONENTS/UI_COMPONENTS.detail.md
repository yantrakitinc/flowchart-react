# UI_COMPONENTS — detail

Why each rule in `UI_COMPONENTS.yaml` exists.

## Why this standard exists at all

UI components are the part of the codebase humans actually see. A bug in a service function shows up in a log; a bug in a button shows up in front of every user. The standard exists so:

1. Every component has its visual contract documented (Storybook).
2. Every component has its props + variants exhausted in a Playground.
3. Every component has an accessibility + viewport baseline.
4. The component library is portable (copy-pasteable across projects).

Without these, UI bugs ship silently — looking fine on the developer's screen, broken on every other.

## Storybook setup

Storybook is the visual review system. Required on every project because:

- It's where the AllVariants matrix lives — a single page that shows every combination of variant × color × size. A visual regression eyeball at this matrix catches CSS bugs that pixel-tests miss.
- It's where the agent-driven walkthroughs start (`__specs__/manual/<flow>.md` with `Start: <storybook-url>`).
- It's the surface a designer reviews without running the app.

The `< ~15 components` ask-first carve-out exists for small projects where Storybook is more overhead than benefit. Anything bigger should have Storybook from day one.

Deploy as subpath of the project's own domain. Hosting on `<project-domain>/storybook/` keeps the analytics, auth, CSP, and styling unified with the main app. gh-pages adds a separate subdomain that splits the story.

## Required addons

Four addons cover the minimum:

- **`addon-a11y` in error mode** — accessibility violations FAIL the story. WCAG 2.2 AA is a CODING.yaml + AGENT_STANDARDS requirement; addon-a11y enforces it at story time.
- **`addon-controls`** — interactive prop manipulation in the Playground story.
- **`addon-actions`** — captures callback invocations for inspection.
- **`addon-viewport`** with 5 presets (320 / 375 / 768 / 1024 / 1440) — mobile-first review on every component without manual resize.

## Story coverage

Every user-rendered component has a story. Three exceptions:

1. Components built strictly for Storybook demo purposes (themselves).
2. Components that never render to a user (debug-only helpers).
3. Utilities/functions, unless a story would genuinely clarify usage.

The Storybook-first rule (story BEFORE the component is used in a page) means the component's API is reviewed in isolation before it gets integrated. Bugs caught at the story stage cost a fraction of bugs caught after integration.

## Story file format

Three stories per file:

- **Usage** — realistic context, realistic props. Shows what the developer will actually write. A new developer copy-pastes from here.
- **Playground** — every prop exposed via `argTypes`. Reviewers exercise the full prop surface. `action('callbackName')` captures callback invocations so the reviewer can verify event wiring.
- **AllVariants** — every variant × color × size side-by-side. Visual matrix for regression review. Hover/focus/active/disabled/loading/error states ONLY when they clarify (don't pad).

`action()` from `storybook/actions` is preferred over `fn()` from `storybook/test`. Reasons:
- `action()` produces a readable log in the Actions panel.
- `fn()` is a Vitest mock; in Storybook it pollutes the inspector with mock metadata.
- `action()` is the Storybook-native way; `fn()` is testing reuse leaking into docs.

## Component folder pattern

Every component folder:

```
ComponentName/
├── ComponentName.tsx
├── (SubComponent.tsx)              # for compound components
├── types.ts
├── index.ts                        # mandatory barrel
├── __tests__/
├── __stories__/
└── __specs__/
    ├── spec.yaml                   # machine
    ├── spec.md                     # human
    ├── flows/<fn>.flow.yaml
    ├── manual/<flow>.md          # Start: Storybook URL (not app URL)
    └── standards-compliance.yaml
```

The `index.ts` barrel is mandatory because the import convention is `import { List, ListItem } from '@/components/ui/List'` — a folder import, never an individual-file import. The barrel re-exports everything in the folder. Compound components (List + ListItem) share one folder; each sub-component gets its own .tsx + .test.tsx + .stories.tsx.

`__specs__/manual/<flow>.md` for components points `Start` at the Storybook story URL, not the app URL. The agent driving the story exercises the component in isolation — useful for unit-level walkthroughs that don't depend on the app being deployed.

## Component library — MUI shape + Tailwind tokens + shadcn primitives

Three doctrines pulled together:

- **MUI prop names + types + behavior.** Developers transferring from a MUI codebase find familiar names (`variant="contained"`, `size="large"`, etc.). Reusing the MUI surface area = less invention, more transferable knowledge.
- **Tailwind + DaisyUI semantic tokens internally.** MUI's runtime CSS-in-JS is replaced with Tailwind utility classes referencing semantic tokens. The tokens come from the project's `globals.css`.
- **shadcn primitives first.** When a primitive (Button, Input, Dialog) is needed, generate it via the shadcn CLI. Build custom only when shadcn truly doesn't cover the use case.

Where the library lives depends on how many apps consume it:

- **Single-app project** — in-tree at `src/components/ui/`. The library iterates as part of the project, with no publish/consume cycle.
- **Monorepo with 2+ consuming apps** — one shared workspace package (e.g., `packages/ui`). Two apps that must render identical components — for example a public site and a CMS editor that previews that site — share a single source of truth instead of hand-synced copies that drift apart. The package mirrors the standard internal layout (`packages/ui/src/components/ui/` + `src/components/shadcn/`), so every UI gate applies unchanged when run with the package as its root, and Storybook lives with the package.

Both forms hold the same theme-agnostic contract: components ship CSS-var references only, never bundled token values. Each consuming app supplies the tokens through its own `globals.css`. Because a workspace package ships no CSS values at all — only var references — it stays theme-agnostic, the same property that makes the in-tree form portable. That is exactly what the portability rule protects, so a workspace package satisfies it identically.

A separate, narrow exception covers cross-REPO reuse: a project MAY ship a focused npm package (e.g., a cross-project icon catalog) with its own publish cycle, documented in the publishing project's memory — not here, because the standard stays project-agnostic.

## Portability

`src/components/ui/` must be copy-pasteable into another project with zero edits. The library imports nothing project-specific:

- No imports from `@/features/...`.
- No imports from `@/lib/<project-name>`.
- No imports from anything that depends on the host project's state.

The theme applies via the destination project's `globals.css` — UI components consume CSS variables only. When the destination defines `--color-foreground` and `--color-muted`, the UI component picks them up automatically.

Why this matters: when a future project starts, copy `src/components/ui/` and immediately have a working design system. The portability rule keeps that path open.

## Variants — cva or tailwind-variants

Variants live in a typed library (cva or tailwind-variants) so the TypeScript types check at compile time. The variants are built incrementally — only what's currently needed.

The anticipation ban catches the temptation to enumerate every conceivable variant up front. Each unused variant is dead code that has to be maintained. Add variants as features need them.

## Tailwind tokens

UI components use ONLY semantic tokens from the project's `globals.css`. Hardcoded color-shade classes (`text-red-500`, `bg-gray-100`) are banned for the reasons documented in CODING.yaml — the design system can't redefine `red-500` without touching every call site.

Allowed:
- `text-foreground`, `text-muted`, `bg-surface`, `bg-destructive` — semantic tokens.
- `text-white/60`, `bg-black/40` — named colors with opacity modifiers (semantic by intent).

Banned:
- `text-red-500`, `bg-zinc-400`, `border-blue-600` — specific shade picks.

## Where components live

Three locations:

- `src/components/shadcn/` — primitives auto-generated by the shadcn CLI. NEVER manually edited. Regenerate via the CLI to pick up updates.
- `src/components/ui/` — the design-system layer (MUI-shaped, Tailwind/DaisyUI-styled). Portable.
- `src/features/<name>/components/` — feature-specific. May import feature-internal modules. Not portable.

In a monorepo with 2+ consuming apps, the `shadcn/` + `ui/` layers live inside the shared workspace package (`packages/ui/src/components/{shadcn,ui}/`); `src/features/<name>/components/` stays per-app.

The story rule applies equally to all of them. A shadcn primitive without a story is still missing visual review.

## Changelog story — why history lives in Storybook

Parent-facing JSDoc answers "how do I call this?"; the Changelog story answers "how did this evolve?". Separating them keeps JSDoc + inline comments minimal (per CODING.yaml.docs + CODING.yaml.docs.inline_comments) while preserving history in a browsable, grep-free place.

## Six-entry sidebar cap — rationale

Each concern has its proper home: Docs (autodocs prop table + stories) · Usage (curated examples) · Changelog (history) · Verify-Manual (spec-derived TEST INSTRUCTIONS — no render, no form) · Playground (the live component you operate — controls + actions) · AllVariants (visual scan) · Showcase (anything else, incl. states Playground can't reach). The verdict form lives once on the Verify-Manual » Master page. The sidebar lists COMPONENTS + these views, not prop combinations — every per-variant/per-state/per-prop concern is a row inside AllVariants, so the sidebar never fills with standalone variant stories.

## Verify-Manual » Master — why one page

Separation of concerns, single source of each thing: the component renders once (Playground), the verdict form exists once (the Master page), and each component's Verify-Manual story is only the spec-derived instructions that point at both. Nothing is duplicated across components.

## JSDoc on props — why required

Storybook's autodocs reads JSDoc to populate the prop table's Description column; without JSDoc the Docs view shows "—" for every prop description. Parent-facing descriptions (how to call it, not a changelog) keep the prop table readable and push history to the Changelog story where it belongs.

## Documented axe exceptions — why opt-in per subtree

The `v2-small-target` waiver exists because spacing around the small checkbox varies per consumer; rather than force every consumer to pad the 14px checkbox to a 24×24 target, the brand opts the small checkbox into the documented exception — valid only where row spacing physically guarantees the ≥ 24px separation between adjacent targets.

## Spec ↔ source drift gate — why it exists

Presence-only verifiers confirm a spec.yaml exists, not that it matches shipped source. Source state-class bindings and token lists change over a component's life; the drift gate mechanically diffs the spec's declared `state-*` classes and `var(--*)` tokens against actual source consumption and refuses silent drift in either direction.

Last updated: 2026-07-11T00:00:00Z
