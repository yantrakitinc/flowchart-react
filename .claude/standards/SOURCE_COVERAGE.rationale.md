# SOURCE_COVERAGE — detail

Why each rule in `SOURCE_COVERAGE.md` exists.

## Why this standard exists at all

The lock model (LOCK_FILES.md) only works if every source file is inside some feature's lock. A file that resolves to no spec is invisible to every gate — unspecced, unwalked, unstamped. Source coverage closes that hole: every `.ts`/`.tsx` under `src/` either walks up to a `__specs__/spec.yaml` or sits under a deliberate `.ignore.specs.yaml` marker. The marker makes exemption an explicit, reviewable act instead of an accident of folder placement; closest-marker-wins lets a deep folder override a shallow blanket exemption.

## feature_name — why first field, why unique

`feature_name` is the join key between a spec and the `.ignore.specs.yaml` markers that point at it. First-field placement makes it readable without parsing the whole file; repo-wide uniqueness makes the named-marker resolution unambiguous.

## One operation per feature — why the allowlist

"A feature is small — one operation" keeps the lock walkable: a verifier can hold one operation's spec, flows, code, and tests in view during a Mode A walk. The per-invocation-type subfolder allowlist is the mechanical edge of that rule — a feature folder that sprouts folders outside its type's allowlist is accreting a second operation and should be split.

Last updated: 2026-07-12T00:00:00Z
