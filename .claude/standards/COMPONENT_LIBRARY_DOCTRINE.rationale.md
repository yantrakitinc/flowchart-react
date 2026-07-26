# COMPONENT_LIBRARY_DOCTRINE — detail

Why each rule in `COMPONENT_LIBRARY_DOCTRINE.md` exists.

## Component library — MUI shape + Tailwind tokens + shadcn primitives

Three doctrines pulled together:

1. **MUI prop names + types + behavior.** Developers transferring from a MUI codebase find familiar names (`variant="contained"`, `size="large"`, etc.). Reusing the MUI surface area = less invention, more transferable knowledge.
2. **Tailwind + DaisyUI semantic tokens internally.** MUI's runtime CSS-in-JS is replaced with Tailwind utility classes referencing semantic tokens. The tokens come from the project's `globals.css`.
3. **shadcn primitives first.** When a primitive (Button, Input, Dialog) is needed, generate it via the shadcn CLI. Build custom only when shadcn truly doesn't cover the use case.

Where the library lives depends on how many apps consume it:

1. **Single-app project** — in-tree at `src/components/ui/`. The library iterates as part of the project, with no publish/consume cycle.
2. **Monorepo with 2+ consuming apps** — one shared workspace package (e.g., `packages/ui`). Two apps that must render identical components — for example a public site and a CMS editor that previews that site — share a single source of truth instead of hand-synced copies that drift apart. The package mirrors the standard internal layout (`packages/ui/src/components/ui/` + `src/components/shadcn/`), so every UI gate applies unchanged when run with the package as its root, and Storybook lives with the package.

Both forms hold the same theme-agnostic contract: components ship CSS-var references only, never bundled token values. Each consuming app supplies the tokens through its own `globals.css`. Because a workspace package ships no CSS values at all — only var references — it stays theme-agnostic, the same property that makes the in-tree form portable. That is exactly what the portability rule protects, so a workspace package satisfies it identically.

A separate, narrow exception covers cross-REPO reuse: a project MAY ship a focused npm package (e.g., a cross-project icon catalog) with its own publish cycle, documented in the publishing project's memory — not here, because the standard stays project-agnostic.

## Portability

`src/components/ui/` must be copy-pasteable into another project with zero edits. The library imports nothing project-specific:

1. No imports from `@/features/...`.
2. No imports from `@/lib/<project-name>`.
3. No imports from anything that depends on the host project's state.

The theme applies via the destination project's `globals.css` — UI components consume CSS variables only. When the destination defines `--color-foreground` and `--color-muted`, the UI component picks them up automatically.

Why this matters: when a future project starts, copy `src/components/ui/` and immediately have a working design system. The portability rule keeps that path open.

## Variants — cva or tailwind-variants

Variants live in a typed library (cva or tailwind-variants) so the TypeScript types check at compile time. The variants are built incrementally — only what's currently needed.

The anticipation ban catches the temptation to enumerate every conceivable variant up front. Each unused variant is dead code that has to be maintained. Add variants as features need them.

## Tailwind tokens

UI components use ONLY semantic tokens from the project's `globals.css`. Hardcoded color-shade classes (`text-red-500`, `bg-gray-100`) are banned — the design system can't redefine `red-500` without touching every call site. The full token discipline (allowed/banned class shapes, CSS-var syntax, verifier) is owned by `DESIGN_TOKENS.md`; this doctrine records the UI-library application of it: semantic tokens (`text-foreground`, `bg-surface`) and opacity-modified named colors (`text-white/60`) are the only color classes a portable component may carry.

Last updated: 2026-07-12T00:00:00Z
