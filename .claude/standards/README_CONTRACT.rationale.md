# README_CONTRACT — detail

Why each rule in `README_CONTRACT.md` exists.

## Why this standard exists at all

The README pair is the project's onboarding doc and its machine-readable identity. Every consuming tool (github-project-agent, deploy scripts, e2e tests, /agents.json + /llms.txt generators) and every new contributor starts here; a malformed or missing pair makes every downstream operation guesswork.

## Root README requirements

The README is the project's onboarding doc. Eight top-of-file metadata items + seven sections.

The metadata answers questions a new contributor (human or agent) asks before reading any code:
- What is this? (name + description)
- Where do I see it running? (production URL)
- Where's the code? (GitHub repo)
- Where's the work tracked? (project board)
- Where's it deployed? (host dashboard)
- How do I access it locally? (local dev URL + ports)
- Who owns the GitHub identity? (primary user)
- What third-party services does it touch? (one line + dashboard each)

If any of those answers is missing, the contributor has to ask — wasting time and signaling "this project's documentation is incomplete."

The seven sections (Prerequisites / Structure / Development / Tech Stack / Env vars / Testing / Deployment) are the minimum to clone the repo and contribute. Each one answers the next question after the metadata.

## Status semantics

`status` gates which standards apply. `planning` repos are a bare Coming Soon shape — no features, so no spec/lock/coverage machinery; only the universal gates (present-tense docs, typecheck, lint) apply. `shipping` / `maintained` carry the full regime. `archived` is read-only history; gating a frozen repo produces noise, not safety.

Last updated: 2026-07-12T00:00:00Z
