# DESIGN_TOKENS — detail

Why each rule in `DESIGN_TOKENS.md` exists. Read this when changing a rule, or when a rule feels arbitrary and you need the load-bearing reason.

## Semantic tokens only

Hardcoded color-shade classes (`text-red-500`, `bg-zinc-400`) are banned because they encode a specific design decision at every call site. When the design system changes (`red-500` → `red-600` for better contrast), every call site has to be touched.

Semantic tokens (`text-error`, `bg-surface`, `text-muted`) defined in `globals.css` are indirection. The token name says what it MEANS; the value can change in one place.

Opacity-modified named colors (`text-white/60`) also pass — they're semantic (a named color modified by a documented intent: "60% of foreground"), not a hardcoded shade pick.

## Tailwind v4 + @tailwindcss/postcss

Pinning the Tailwind major version and the PostCSS plugin keeps every project on the same token mechanics: v4's CSS-first configuration is where the semantic tokens in `globals.css` live, and `@tailwindcss/postcss` is the supported build path for it. A project on a different Tailwind major would express tokens differently, and the banned/required rules above would stop being mechanically checkable the same way.

## Single ownership

This file is the single owner of design-token discipline. UI and component standards (component, composite, page creation) cite `DESIGN_TOKENS.md` rather than restating the banned/required lists, so the rule can evolve in one place.

Last updated: 2026-07-12T00:00:00Z
