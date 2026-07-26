# ROOT_LAYOUT — detail

Why each rule in `ROOT_LAYOUT.md` exists.

## Why this standard exists at all

Repo-root layout is decided once and recurs across every subsequent slice. A repo without a strict root contract pays for it indefinitely — "is package.json at root or in web/?" ambiguity, tooling that can't find the code, docs scattered at root.

## Folder layout — why the strict root

Strict root layout makes every repo scannable in one glance — humans + agents see exactly what's documentation vs what's code. Tooling (Vercel, CI, agents) has one place to look for code. No "is package.json at root or in web/?" ambiguity per-repo. The Vercel `Root Directory` setting is the deploy-side half of the same contract: the app builds from its per-app code path, never from repo root.

Last updated: 2026-07-12T00:00:00Z
