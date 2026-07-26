# Component-creation standards

How design-system UI primitives (`src/components/ui/<Name>/`) are designed, locked, implemented, and verified. Read this when the YAML's intent isn't obvious or when an edge case needs interpretation.

This file is the rationale companion to `COMPONENT_CREATION.md`. The YAML is the schema the agent obeys; the MD is why.

## Why this standard exists

`STORYBOOK_SETUP.md`, `COMPONENT_FOLDERS.md`, and `COMPONENT_LIBRARY_DOCTRINE.md` already cover Storybook setup, folder shape, library doctrine, portability, variants, and Tailwind token use. They do NOT cover:

1. **Order of creation.** Nothing in the existing standard refuses code that lands before its spec. The result: agents that write code first, then write a spec that mirrors the code — documentation, not a contract.

2. **Design completeness.** The existing spec.md.template (for features) doesn't require an anatomy diagram, state matrix, ARIA pattern reference, keyboard map, responsive strategy, or edge-case enumeration. A component shipped without these has gaps that surface as inconsistent hover/focus/disabled treatment later.

3. **Shared interaction-state vocabulary.** Without a fixed set of state classes (`state-hover-contained`, `state-focus-visible`, etc.) every component invents its own treatment — one Button variant uses `hover:brightness-95`, the next uses `hover:opacity-90`, the third uses `hover:underline`. The design system loses coherence.

4. **Token discipline at source level.** `COMPONENT_LIBRARY_DOCTRINE#tailwind-tokens` says "use semantic tokens, not palette shades" — but no verifier scans the source. A `bg-amber-500` slip-through breaks portability when the next project consumes the same component.

This standard fills those four gaps with concrete artifacts, schemas, and verifier scripts.

## Why phase order matters

The six phases — design → test → implement → stories → verify — exist because each one constrains the next:

- The **design phase** establishes anatomy, every state in every variant, the ARIA pattern, the keyboard map, and edge cases. A complete design.md is the contract the rest of the work executes against.
- The **test phase** writes failing tests against the locked design. Tests express "the design says X; here's the assertion that X holds." Tests written after code only assert the code's actual behavior, which is tautology, not validation.
- The **implement phase** writes the smallest code that turns the tests green. Constrained by the spec and tests, the implementation has nowhere to hide.
- The **stories phase** renders every variant × color × size combination from the locked design. Storybook + `addon-a11y` becomes the visual + a11y gate.
- The **verify phase** runs the verifiers + coverage + a11y; on green, `standards-compliance.md` flips to `status: locked`. The lock is the stamp that this component is the precedent every later primitive follows.

Skipping or reordering any phase produces the failure mode the standard exists to prevent.

### Why the user inserts the lock marker

The `<!-- design-locked: YYYY-MM-DD -->` marker in `design.md` is inserted by the user, never by the spec-writer agent or the coder. Reason: the user is the only party who can validate that the design is complete and matches their intent. An agent that self-signs the lock has no review gate; it's just rubber-stamping its own work.

This mirrors the existing `verify-ui-design-locked.mjs` pattern for feature-flow UI designs. The same discipline applies here.

## Why design.md is mandatory

The anatomy diagram + state matrix + token bindings in `design.md` are the parts the existing spec.md.template doesn't carry. They live in `design.md` (not `spec.md`) because:

- Anatomy is best expressed as a sketch (ASCII / unicode-box), not as a YAML tree.
- The state matrix is exhaustive (variant × color × size × state) — it would bloat spec.md past readability.
- Cross-variant consistency rules are prose ("all `contained` variants darken identically on hover") that don't compress to schema.

`design.md` is to a primitive what `__specs__/ui/<flow>.md` is to a feature — the design contract a human reviews and locks. The locking workflow is identical.

## Why a shared state vocabulary

The bug this prevents:

> Component A's `variant: default` uses `hover:brightness-95`. Component A's `variant: destructive` uses `hover:opacity-90`. Component A's `variant: secondary` uses `hover:opacity-90`. Component A's `variant: ghost` uses `hover:bg-[var(--color-muted)]`. Component A's `variant: link` uses `hover:underline`. Five variants, five different hover languages.

The fix: a fixed set of state utility classes in `src/styles/states.css` that every variant of every component consumes. There is exactly one `state-hover-contained` definition; every contained variant of every component binds to it. Change the hover treatment, and it changes everywhere consistently.

The class naming follows the variant axis (`state-hover-contained`, `state-hover-outlined`, `state-hover-text`) rather than the color axis (no `state-hover-primary`) because hover treatment correlates with surface type (filled / bordered / transparent), not with semantic color. Color is preserved through the underlying tokens (`--color-primary`, `--color-destructive`) which the state utility composes against.

### Why direct `hover:` / `focus:` / `active:` in component sources is forbidden

Allowing direct state variants reopens the per-component invention pit. A future maintainer adds a new variant, writes `hover:opacity-90` ad-hoc because it's quick, and the consistency the state vocabulary protects is gone. The verifier (`verify-component-state-vocab.mjs`) refuses any such utility in component source so the only path to add state treatment is to extend the shared `states.css` file — which forces the design system update to happen in one place.

Exemptions: `__stories__/`, `__tests__/`, and `src/components/shadcn/` are allowed to use anything. Stories may demo a raw effect; tests grep for specific behavior; shadcn baselines are regenerated by the shadcn CLI and not hand-edited.

## Why token discipline is enforced at source level

`COMPONENT_LIBRARY_DOCTRINE#tailwind-tokens` already bans `text-red-500` etc. in prose. This standard adds the verifier (`verify-component-tokens.mjs`) that scans the actual `.tsx` files and refuses the commit if any hardcoded value slips through.

The patterns scanned:
- Hex color literals (`#fbbf24`, `#fff`, etc.) — except inside the auto-generated shadcn directory.
- `rgb()` / `rgba()` / `hsl()` / `hsla()` function literals.
- Tailwind palette-shade classes (`bg-red-500`, `text-amber-300`, etc.).

The allowed pattern is Tailwind v4 arbitrary values referencing CSS vars: `bg-[var(--color-primary)]`. This keeps every visual decision tokenized, every token swappable per project, and every component portable.

## Why cross-variant consistency is its own check

A subtle failure mode: a `cva` config can carry the "right" token references AND still produce inconsistency. Example:

```ts
cva("base", {
  variants: {
    variant: {
      default:     "bg-[var(--color-primary)] hover:brightness-95",     // tokenized ✓
      destructive: "bg-[var(--color-destructive)] hover:opacity-90",    // tokenized ✓
      secondary:   "bg-[var(--color-secondary)] hover:brightness-95",   // tokenized ✓
    }
  }
})
```

Every entry is token-compliant. But `default` and `secondary` darken via brightness while `destructive` darkens via opacity. Visually inconsistent.

`verify-component-state-vocab.mjs` does a second-level scan: for every `variant` group in every cva config, it extracts state-utility prefixes across entries and refuses if they disagree. The agent is forced to either (a) bind every entry to the same shared state class (`state-hover-contained`) or (b) document the deviation in the spec with a justification.

## Why several verifiers, not one

Each verifier catches a distinct failure mode at a distinct phase:

- `verify-component-design-locked.mjs` catches "writing source before design is reviewed."
- `verify-component-spec.mjs` catches "spec is incomplete; some required block is missing."
- `verify-component-tokens.mjs` catches "hardcoded value in source."
- `verify-component-state-vocab.mjs` catches "direct state variant in source OR cross-variant inconsistency."

Combining them into one script obscures which rule failed. Keeping them separate makes the violation report actionable — the agent (or pre-commit hook) names exactly which rule broke and points at the line.

They are intended to run in the pre-commit hook and the `pnpm verify` chain (not yet implemented — see the implementation-status note in COMPONENT_CREATION.md) — both running locally on the contributor machine. CI enforcement is intentionally NOT part of the standard; the pre-commit + pnpm verify combination is sufficient and avoids coupling the standard to a particular CI provider + secret-management workflow + standards-sync mechanism — operational cost without changing the safety story.

## Why agent self-check is layer 1

Pre-commit + CI catch violations at commit time. That's too late for an agent that has already written hundreds of lines of source. The agent's own discipline — reading `COMPONENT_CREATION.md` before writing a component, creating spec-writing tasks first, refusing to call `Edit`/`Write` on `<Name>.tsx` until `design.md` is locked — is the cheapest catch. The Tier-1 in `CLAUDE.md` names this rule so a fresh session reads it at session start.

The four mechanical layers (self-check / pre-commit / pnpm verify / CI) exist because layer 1 will sometimes fail. Each subsequent layer is the safety net for the previous one.

## Why `--no-verify` is forbidden

`git commit --no-verify` bypasses pre-commit hooks. Allowing the agent to use it would make the pre-commit layer ceremonial. The CLAUDE.md rule is explicit: pre-commit refusals are investigated and fixed; never bypassed. If a hook is wrong, the fix is to update the hook, not to skip it.

The same applies to `pnpm verify` — the chain runs in full; failures are diagnosed and fixed, not skipped with `|| true`.

## Edge cases

### Compound components (e.g., List + ListItem, Tabs + Tab + TabPanel)

Per `COMPONENT_FOLDERS#component-folder`, compound components share one folder; each sub-component gets its own `.tsx` + `.test.tsx` + `.stories.tsx`. The design.md applies to the COMPOUND — one design document covers the whole family. Sub-component flows live as separate `__specs__/flows/<sub>.flow.md` files. The lock marker on the compound's design.md unlocks the whole family.

### Components that wrap a shadcn baseline

The shadcn-generated file at `src/components/shadcn/<name>.tsx` is exempt from token-discipline and state-vocabulary checks (it's auto-generated; the edit-rule per `COMPONENT_FOLDERS#component-locations` is "never hand-edit"). The MUI-shaped wrapper at `src/components/ui/<Name>/<Name>.tsx` is NOT exempt — it must use tokens + state vocabulary only, and any class-string overrides it adds (via `cn()`) must consume shared state utilities.

If the shadcn baseline ships hover treatments that violate the cross-variant consistency rule (it often does), the wrapper either (a) overrides them with `cn()` consuming shared state utilities, or (b) re-runs the shadcn CLI with a customized template. Hand-editing the baseline is forbidden because it makes future shadcn CLI updates lossy.

### Components without variants

Some primitives (Spinner, Separator) have no variant/color matrix. Their spec.md omits the `interaction_states` matrix (it's required only for components with variants); the design.md states `n/a — no interactive states` in the state matrix section. The verifier accepts the `n/a — <reason>` form.

### Custom primitives with no shadcn match

Per `COMPONENT_LIBRARY_DOCTRINE#component-library`, shadcn is first choice; custom is "build only when shadcn truly doesn't cover." When a custom primitive is justified, the spec.md's `api_shape` field carries `custom-justified` and the spec.md "Out of scope" section names the justification (which shadcn primitive was considered and why it didn't fit). The verifier accepts this; reviewer scrutinizes.

### Components that consume other primitives

A composition primitive (e.g., a custom `ConfirmDialog` that composes `Dialog` + `Button` + `Alert`) MUST consume them via their barrel exports. Its design.md's `composition_rules` section names every primitive it consumes. The verifier doesn't enforce this (graph-level lint is overkill); the review catches it.

### Project-specific deviations from the state vocabulary

If a project legitimately needs a state treatment the canonical set doesn't cover, the agent surfaces the gap, the user approves the addition, and the state class is added to BOTH the project's `states.css` AND the canonical template at `~/.claude/standards/templates/component-states.css.template`. Once-off project deviations that don't graduate to the template are forbidden — they recreate the per-project drift the standard exists to prevent.

## Bootstrap into a new project

A project adopts this standard by:

1. Copying `~/.claude/standards/templates/component-states.css.template` to `src/styles/states.css`, importing it from the project's `globals.css`.
2. Adding husky as a devDep, running `pnpm dlx husky init`.
3. Copying the pre-commit hook from `~/.claude/standards/templates/component-pre-commit.sh.template` to `.husky/pre-commit`.
4. Adding `verify:component` to `package.json` scripts (see `COMPONENT_CREATION#bootstrap` for the exact script).
5. CI is intentionally NOT part of the bootstrap — local enforcement is the model.

Once bootstrapped, the discipline runs automatically. The agent's first action on a new component slice is to copy `~/.claude/standards/templates/component-spec.md.template` and `~/.claude/standards/templates/component-design.md.template` into the new `<Name>/__specs__/` folder and fill them.

## What this standard does NOT cover

- **Storybook setup.** See `STORYBOOK_SETUP#storybook`.
- **Component folder shape.** See `COMPONENT_FOLDERS#component-folder`.
- **shadcn / MUI / DaisyUI library choices.** See `COMPONENT_LIBRARY_DOCTRINE#component-library`.
- **Lock-file freshness for the whole feature.** See `LOCK_FILES.md`.
- **Feature-folder components** (`src/features/<name>/components/`). Those aren't primitives; they're feature-specific and follow `SPEC_CONTRACT.md` only.

## Design rationale

### Why Phase 0 (research) before design

Without a research anchor, the agent leans on design judgment alone. It could ship a design that's coherent but ignores how MUI / DaisyUI / shadcn solve the same problem, or how industry leaders in the relevant domain do it. The result: bespoke designs that drift from user expectations and from the design-system ecosystem.

Phase 0 (research) writes `__specs__/research.md` BEFORE design, containing:
- Competitor scan of shadcn / MUI / DaisyUI for the same primitive.
- Baseline decision (wrap shadcn / wrap MUI / wrap DaisyUI / custom-justified) with the unchosen options' rejection reasons.
- Domain pattern survey (when the matrix triggers it) of industry leaders for the relevant domain.
- A concrete recommendation the design phase consumes.

The design phase MUST cite the research; `verify-component-research-cited.mjs` enforces. This prevents "design from scratch when there's a well-trodden path" failure mode.

### Why coverage × stakes matrix

Not every component needs the same research depth. A Button has full shadcn coverage and is low-risk; a novel chat composition with no library precedent and brand-defining stakes needs a thorough survey. Fixing depth at "always thorough" wastes session time; fixing at "always light" misses critical context.

The 3×3 matrix (library coverage × stakes) lets the agent self-classify and pick depth + domain-survey trigger automatically. Page tier always runs full domain survey regardless — pages have UX patterns library docs don't cover.

### Why autonomy + by:user vs by:agent lock markers

When the design-lock marker must be inserted by the user, the precedent component is correct but expensive at scale — every primitive blocks on human review.

A per-tier mode in `<project>/.standards/autonomy.yaml`:
- `autonomous`: agent self-locks after `verify-component-design-self-lock-eligible` proves completeness.
- `review-locked`: only `by:user` accepted.
- `mixed`: review-locked for paths in `review_locked_overrides`; autonomous elsewhere.

The marker variant (`by:user` / `by:agent`) is the audit trail. `git log -G 'design-locked'` enumerates the lock history.

### Why a self-lock eligibility verifier

`verify-component-design-self-lock-eligible.mjs` makes `by:agent` honest. It refuses self-lock unless the design is demonstrably complete:
- Every required design.md section non-placeholder.
- State matrix exhaustive (no `…`, no `etc.`).
- ARIA pattern is a real APG URL or explicit `n/a — <reason>`.
- Every contrast `passes: false` row carries a non-empty `deviation`.
- design.md references research.md.

Without this gate, autonomy degenerates into rubber-stamping. With it, the agent only self-locks when the work earns it.

### Why `ui_discipline` exists

Some projects are pure API; they ship no UI. Without a `ui_discipline` switch, such a project would either adopt the standard (paying the cost on non-applicable verifiers) or skip it (losing it for future UI parts).

`.standards/autonomy.yaml.ui_discipline` resolves this:
- `full` — UI shipped; full discipline applies.
- `crappy-permitted` — UI exists but design phase is optional per slice with explicit user permission. Verifiers warn but don't block.
- `none` — pure API project. UI verifiers short-circuit to green with "n/a — non-UI project".

The pre-commit hook checks this first; if `none`, no UI verifier runs. Adding UI later flips the flag and the discipline kicks in.

### Why three tiers (atomic / composite / page)

A single-tier standard can't carry composition-specific concerns (state propagation, focus orchestration across children) or page-specific concerns (landmarks, state machines, SEO, performance budgets). Stuffing it all into the atomic standard bloats specs and blurs which concerns belong where.

The three-tier split:
- **Atomic** primitives (Button, Select) — leaves; own anatomy + state matrix + tokens.
- **Composite** combinations (ConfirmDialog = Dialog + Button + Button) — own composition + state propagation + focus order across atomics.
- **Page / surface** orchestration — own landmarks + state machine + responsive matrix + SEO/analytics/i18n + performance budget.

Each tier's spec is **thin** — only what's new at its level. Lower-tier concerns are trusted via `status: locked`. The verifier chain at each tier extends the previous tier's with tier-specific verifiers.

See `COMPOSITE_CREATION.md` and `PAGE_CREATION.md` for tier-specific details.

### Why discovery is path-agnostic

The `components/` ancestor requirement in the discovery model is the guardrail that stops unrelated `__specs__`-bearing folders (e.g. engine rules) from being mistaken for UI components. The per-project `component_roots:` override lets each project place components wherever it wants while keeping discovery fully mechanical.

### Why the exception engine

`__specs__/exception.yaml` waivers are the opt-in escape hatch of last resort, not a way to lower the bar by default. That is why a waiver only fires when it names the exact `rule` and carries a `reason:` — anything less fails the gate as normal.

### Why the autonomy default (file missing) is `autonomous`

Greenfield projects with no setup should flow; review-locked is opt-in.
Last updated: 2026-07-11T00:00:00Z
