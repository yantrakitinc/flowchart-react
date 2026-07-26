# REPO_PROVISIONING — detail

Why each rule in `REPO_PROVISIONING.md` exists.

## Why this standard exists at all

Setting up a new project is the highest-leverage moment in its life. Decisions made here recur across every subsequent slice. A project that skips the pre-setup ceremony pays for it indefinitely — confusing local dev, missing audit URLs, mystery credentials.

This standard exists so every new project follows the same setup spine. The agent doing the setup doesn't have to remember what to provision; it reads the YAML and provisions in order.

## Pre-setup — provision before code

Five things must exist before any code lands:

1. **GitHub repo** — the code's home. Capture URL into memory.
2. **Primary GitHub user** — who creates issues + opens PRs on this project. When the user holds multiple GH accounts on the same machine, they are non-interchangeable; using the wrong one for `gh` ops produces orphan attribution. The user names the primary at provision time; the agent never assumes.
3. **GitHub Project board** — every issue MUST land on a board at creation time (see ISSUES.md). The board has to exist before the first issue.
4. **Host provider dashboard project** — Vercel, Cloudflare Pages, Render, AWS Amplify, etc. Capture the dashboard URL. Provision via the web UI; NEVER auto-create via CLI (commands like `vercel link --yes` link the repo to whatever Vercel project is highlighted, which is often the wrong one). The web UI forces a deliberate pick.
5. **Third-party services** — Stripe, Sentry, PostHog, Slack webhooks, etc. Only what the project actually needs. Capture credentials in memory.

The capture step is the audit anchor. Six months later when the agent asks "where's the project board for X?", the answer is in memory + reference.md, not in someone's head.

## Installer auto-setup

`install-slice-gates.sh` is the one-command path from a bare repo to a gated repo: idempotent, ordered, and status-aware (the README_CONTRACT#readme-requirements status field decides which step tier applies). Optional-input steps skip loudly rather than fail, so a partial environment (no pnpm, no gh auth) still produces a usable setup plus a clear to-do list.

## Project memory capture

Once provisioned, the URLs + decisions go into `~/.claude/projects/<project-id>/memory/reference.md`. Future sessions read that file to know:
- Where's the GitHub repo + board?
- Where's the host dashboard?
- What ports + hostnames are claimed?
- What's the dev-tld for this project?
- What third-party services + credentials?

Without this, every new session starts from "what is this project again?"

Last updated: 2026-07-12T00:00:00Z
