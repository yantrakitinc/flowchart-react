# Exhaustive-by-default — enforcement (all projects)

This is enforced by a **global blocking Stop hook**: `~/.claude/hooks/enforce-completion.mjs`
(wired in `~/.claude/settings.json` → `hooks.Stop`). It is generic — it applies in every
project, not just ones with `pnpm verify`.

## The standing rule

When the user gives a directive, take its scope **literally and completely**. "Audit the
whole site", "fix all X", "do everything" means enumerate ALL of it first, then cover every
item — never silently shrink scope, never present a slice as the deliverable, never end with
"which one next?" when the user already said all/every/whole. Finish, then report.

This is the operational form of the Tier-1 rules (100%, verify don't assert, no half-assed).
The hook makes it mechanical instead of aspirational.

## What the hook blocks

When my final message of a turn **asserts completion** (done / complete / finished / fixed /
verified / shipped / 100% / "all tests pass" / "ready to merge" / "no issues"), the turn is
**blocked** (I'm forced to keep working) unless ALL hold:

1. **Quoted proof is in the message.** A code fence, `EXIT 0`, N-of-N counts (e.g. `158/158`),
   ✅, "184 passed", "0 failed", or an inline `code` span quoting real tool output. Prose
   like "it's done, looks good" is not proof.
2. **The task manifest (if any) is complete.** See below.
3. **`pnpm verify` passes** (only if the project has a `verify` script up-tree). A failing
   verify blocks even if I quoted stale/fake proof — the anti-bluff check.

Safety: fail-open (any hook error → allow), loop-safe (after one forced retry it downgrades
to a visible warning and allows, so it can never trap a session), and silent on non-claim
turns (ordinary chat is untouched).

## How to comply

- **Single-step claims:** include the verbatim evidence in the message — the final line of
  `pnpm verify`, the test count, the coverage numbers, the command output — in a code fence or
  inline `code`. Never say "done" in prose alone.
- **Multi-item tasks** ("audit every page", "fix all N", "migrate every call site"): write a
  manifest FIRST, then work it to completion. The manifest makes silent scope-shrinking a hard
  failure (31/47 → blocked) instead of an invisible one.

## Manifest format

Path: `<cwd>/.claude/task-manifest.json` (per-project, gitignored or temporary).

```json
{
  "task": "audit inarahlights.com — every page × breakpoint × interaction",
  "items": [
    { "id": "home @375 fold", "done": true,  "evidence": "/tmp/audit/home-375-fold.png" },
    { "id": "home @375 menu-open", "done": true, "evidence": "/tmp/audit/home-375-menu.png" },
    { "id": "services @1280", "done": false, "evidence": "" }
  ]
}
```

- Enumerate **every** item up front (that's the scope contract).
- Mark `done: true` only when the work is real and `evidence` points at a captured artifact.
- A completion claim while any item is `done: false` → blocked, listing what's left.
- Delete the manifest when the task is genuinely finished.

## Disable

- Per-turn: don't claim completion, or just provide the proof.
- Globally: remove the `Stop` hook from `~/.claude/settings.json` (or `/hooks` to review).
Last updated: 2026-07-11T00:00:00Z
