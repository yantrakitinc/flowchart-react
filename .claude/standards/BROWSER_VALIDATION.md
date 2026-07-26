# BROWSER_VALIDATION

> Wherever UI is available and touched, the UI is validated IN A REAL BROWSER (Claude Code Chrome extension) before the slice is done. Tests alone never substitute for driving the rendered surface.

```meta
version: 1
last_updated: 2026-07-16T00:00:00Z
```

## trigger

- `rule`: a slice TOUCHES UI when it creates or edits any component/composite/page source, story, or UI-bearing feature file (.tsx render surface, __stories__/, app routes)
- `consequence`: the slice is NOT done — and Mode A cannot stamp its lock — until the browser walk below is green

## what_runs

_content owners cited; this standard binds them_

- `manual_flows`: every __specs__/manual/<flow>.md for the touched surface is executed in Chrome via the extension, spec-derived and code-blind (MANUAL_FLOWS.md)
- `storybook_two_way`: every control + callback of touched components exercised on the Playground story via the extension (STORYBOOK_TESTING.md)
- `verify_manual_story`: the component's Verify-Manual runbook is followed; verdict + findings recorded through the Master page form (VERIFY_MANUAL_STORIES.md)
- `e2e_ui_variants`: touched cross-feature journeys run their ui variant through the real browser (E2E_TESTING.md)
- `interaction_gated_surfaces`: every modal / menu / accordion / drawer the touched surface owns is OPENED and asserted — unopened surfaces are unvalidated surfaces

## dispatch

- `walker`: ~/.claude/agents/ui-walker-core.md _(dispatchable walk; the active session may also walk inline)_

## evidence

- `results_record_required`: for every manual/<flow>.md the feature ships, a record at <repo>/manual-results/<flow>.<iso8601>.json no older than 60 min before browser_validated — checked by verify-standards-compliance alongside the stamp
- `walk_receipt_signed`: each record is a WALKER-SIGNED receipt (scripts/verify/_walker-receipt.mjs) — an HMAC
  signature over {flow, nonce, walkedAt, ok, observed} using a machine-local key (~/.claude/.walker-signing-key,
  git-ignored). Tamper-evident (editing any signed field breaks the signature) + path-bound (produced by the walker
  signing routine). NOT proof a browser rendered — a walker-signed receipt raises the forgery cost; extension-emitted
  receipts are the unbuilt ceiling. The walker signs ok:true ONLY on a genuine green walk (ui-walker-core.md step 6).
- `lock_stamp`: the feature's standards-compliance.yaml carries browser_validated:<ISO-8601-UTC>, stamped by verifier Mode A ONLY after the walk is green (LOCK_FILES#schema)
- `results_record`: verdicts persist via POST /api/v1/manual-results/<flow> (MANUAL_FLOWS.md per-app surfaces)
- `ci_split`: walk records are LOCAL evidence (git-ignored) — the record check runs on local machines only; CI validates the committed stamps/locks (browser walks cannot run in CI)
- `no_walk_no_stamp`: a UI-bearing feature's lock without browser_validated fails verify-standards-compliance — mechanically, every verify chain run

## not_required_when

- the repo declares ui_discipline:none (.standards/autonomy.yaml)
- the feature ships no UI surface (no .tsx render surface, no stories, no routes)

## enforced_by

scripts/verify/verify-standards-compliance.mjs _(browser_validated stamp + record existence/freshness on UI-bearing features)_

## record_content_gate

scripts/verify/verify-browser-validation-receipt.mjs _(record CONTENT — the newest manual-results record must be a real walk (ok:true + findings), not a stub)_

Last updated: 2026-07-16T00:00:00Z