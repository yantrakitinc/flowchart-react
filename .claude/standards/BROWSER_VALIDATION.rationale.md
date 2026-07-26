# BROWSER_VALIDATION — why

## Why tests don't substitute for a browser

Unit tests and even Playwright E2E exercise the developer's own fixtures and
assumptions. They routinely pass while the rendered surface is broken — wrong
tokens resolved, portal content unmounted, interaction-gated surfaces (modals,
menus, accordions) never opened. Driving the real rendered UI through the
Chrome extension validates what a user actually gets, and validates the SPEC
at the same time (the flows are spec-derived and code-blind).

## Why the evidence is a lock stamp

"I checked it in the browser" is a claim; `browser_validated:` in the lock file
is a fact the verify chain checks on every run. Mode A stamps it only after the
walk, so a UI-bearing feature mechanically cannot reach locked+100% without a
real browser pass — the same no-honor-system shape as the 100%-standards-met
push stamp.

## Why interaction-gated surfaces are named explicitly

They are the classic gap: every screenshot diff and axe pass runs against the
closed state. Opening every owned modal/menu/drawer is listed as a rule because
it is exactly what otherwise gets skipped.

Last updated: 2026-07-12T00:00:00Z
