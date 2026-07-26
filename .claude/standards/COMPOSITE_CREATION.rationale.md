# Composite-creation standards

How composites — UI components composed of 2+ atomic primitives — are designed, locked, implemented, and verified. Tier-2 in the design-system hierarchy (atomic → composite → page).

This file is the rationale companion to `COMPOSITE_CREATION.md`. The YAML is the schema the agent obeys; this MD explains why.

## Why a separate composite tier

Atomics (Button, Select, Dialog) and composites (ConfirmDialog = Dialog + Button + Button) have fundamentally different concerns:

- An atomic's concerns: anatomy, state matrix per variant, token bindings per part, ARIA from APG, keyboard map, tokens consumed.
- A composite's concerns: which atomics it composes, what props it freezes on each, how composite-level state cascades to children, focus order across the children, ARIA for the *composition* (modal dialog APG) rather than for each child.

If composites used the atomic standard, every composite would duplicate the atomic's documentation — bloating specs, creating drift (the atomic changes, the composite's restatement goes stale), and hiding the actual composite-level concerns. The thin-spec doctrine fixes this.

## Why thin specs (no atomic restatement)

The atomic's `__specs__/standards-compliance.yaml` at `status: locked` is the contract the composite trusts. Re-documenting the atomic inside the composite breaks that trust model in two ways:

1. **Drift.** The atomic changes (new variant, renamed prop, fixed contrast). The composite's restatement doesn't update. Now the composite spec describes a Button that doesn't exist.
2. **Review burden.** Reviewers can't tell which parts of the composite spec are composite-specific vs. atomic-imported. Every review re-examines atomic concerns the reviewer already approved at atomic tier.

The composite spec reads as: "I use these atomics, with these props frozen, with this state propagation rule. The atomics already documented their own concerns; I trust the lock." The verifier (`verify-composite-composition`) confirms the atomics exist + are locked + the frozen props pass type-check against the atomic's published prop schema.

## What "consuming an atomic" actually means

The composite imports from the atomic's barrel:

```ts
import { Button } from "@/components/ui/Button";
```

Never from internal files:

```ts
import { Button } from "@/components/ui/Button/Button";   // forbidden
import type { iButtonVariant } from "@/components/ui/Button/types";  // forbidden — import from barrel
```

This boundary keeps atomic refactors safe — the atomic can reshape its internals without breaking composites. The barrel is the published API.

`verify-composite-composition` greps for non-barrel imports of atomic paths and refuses them.

## State propagation as a spec block

A composite typically has one or more "composite-level" states that should cascade to specific children. Examples:

- `ConfirmDialog loading=true` → primary action button receives `loading=true`; cancel button receives `disabled=true`.
- `MultiViewportCheckbox.editing=true` → viewport list reveals editable rows; "edit" link toggles to "done".
- `AuthPanel saving=true` → all input fields receive `disabled=true`; primary submit receives `loading=true`.

These propagation rules are explicit in spec.yaml's `state_propagation` block. The verifier (`verify-composite-state-propagation`) grep-checks that the declared rule is implemented:

- For each `state_propagation` entry, search the composite source for the `prop_set_on_atomic` name being set on the `atomic_target` element.
- If not found, refuse: declared rule has no implementation.
- Also refuse the reverse: source propagates state to an atomic NOT in `consumed_atomics`. That's an unauthorized cross-component coupling.

## Focus orchestration

Focus is a composite-level concern, not an atomic-level one. The atomic provides focus-visible behavior on itself; the composite decides:

- Which child gets focus on mount (e.g. primary action on dialog open).
- Which element gets focus on unmount / close (focus-return to whichever element opened the dialog).
- The tab order across children (which determines what Tab cycles through).

These are declared in design.md's `focus_orchestration` section and implicit in the test cases (every transition that changes focus has a test that asserts the focus target).

## Composition ARIA vs child ARIA

A modal dialog (composite) has its own WAI-ARIA APG pattern (https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) covering `role="dialog"`, `aria-modal`, focus trap, escape-to-close. The Buttons inside have their own pattern (button) covering `aria-label` for icon-only, `aria-busy` for loading. The composite spec cites the *composition* pattern (dialog-modal); the atomic specs already cite their own patterns.

A composite that omits the composition pattern is incomplete. A composite that re-states the atomic's pattern is bloated.

## When a composite needs an atomic that doesn't exist (or doesn't fit)

The rule: file an issue against the atomic. Do NOT fork the atomic inside the composite.

Concrete example: ConfirmDialog needs a destructive primary action variant. Button already ships `variant="contained" color="error"` — use that. If Button DIDN'T ship `color="error"`, the response is to file a Button issue to add it, not to override Button's styles inline at the composite layer.

This rule keeps the design system coherent. Every variant of every primitive lives in exactly one place (the primitive's spec + source). Composites consume; they don't customize.

The verifier doesn't catch this (it's a judgment call). Reviewer scrutinizes; coder discipline is the primary enforcement.

## Storybook at composite tier

Same `STORY_FORMAT#story-file` rules apply: 3 stories minimum (Usage / Playground / AllVariants). At composite tier, AllVariants typically demonstrates the composite's state propagation in action — e.g. one row per `loading` state showing how children change.

`addon-a11y` zero violations still required. Composite-level violations (focus order, missing dialog ARIA) surface here even if every atomic passes individually.

## Edge cases the composite spec must cover

The composition_edge_cases section in spec.yaml + design.md focuses on interactions BETWEEN atomics. Examples:

- ConfirmDialog with `loading=true`: primary action is busy; can the user still click cancel? Spec must say yes/no and the test enforces.
- ConfirmDialog opened during a parent form submit: does the dialog disable form interaction? Define.
- ConfirmDialog with very long body text: does the dialog scroll? Does the action row stay sticky?
- ConfirmDialog with focus return: what if the trigger element was unmounted while dialog was open? Where does focus go?

Atomic-internal edge cases (Button with empty children, Button with very narrow parent) are NOT restated — they live in Button's design.md.

## Location: feature folder vs shared composites folder

Default location is `src/features/<feature>/components/<Composite>/`. Rationale: most composites encode feature semantics. ConfirmDialog used only in the scan-config flow lives in that feature's components folder.

Promote to `src/components/composites/<Composite>/` when:
- 2+ features consume the composite identically (same props, same behavior).
- The promotion PR refactors the consuming imports.

The shared folder follows the same standards. There is NO separate "shared composite" tier — composition discipline is identical.

## What happens when a consumed atomic isn't locked yet

`verify-composite-composition` refuses the composite's commit. The composite cannot ship before the atomics it consumes. This enforces the bottom-up order from CLAUDE.md.

Resolution: complete the atomic's lock first, then return to the composite. If the composite is being designed in parallel with the atomic (common during a new feature's initial design phase), the composite's research and design phases can run before atomic completes; phase 2+ (test/implement) block until the atomic locks.

## What this standard does NOT cover

- **Atomic concerns.** See `COMPONENT_CREATION.md`.
- **Page concerns** (routes, surfaces, landmarks, state machines, SEO). See `PAGE_CREATION.md`.
- **Storybook setup.** See `STORYBOOK_SETUP#storybook`.
- **Component folder shape.** See `COMPONENT_FOLDERS#component-folder`.
- **Feature-level concerns** (data fetching, mutations, route state). Those are feature-spec concerns; the composite is the UI layer for them.

## Versioning

`version: 1` ships with thin-spec doctrine, the 6-phase order, the composition + state-propagation verifiers, and feature-folder default location. Future breaking changes (renamed required block, removed verifier semantics) bump to `version: 2`.

Last updated: 2026-06-01T00:00:00Z
