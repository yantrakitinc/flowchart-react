# REPO_PROVISIONING

> an agent needs to APPLY and ENFORCE: the pre-setup provisioning ceremony (GitHub repo / board / host provider / third-party services), the installer auto-setup steps, and the project-memory capture contract. ---------- pre-setup — provision before any code ----------

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## pre_setup

- `required_before_any_code`: 1:
    - `what`: GitHub repo
    - `action`: create; capture URL into project memory 2:
    - `what`: primary GitHub user for this project
    - `action`: confirm with user; use earlier memory if defined; never assume; capture in memory 3:
    - `what`: GitHub Project board
    - `action`: create; capture URL into project memory + reference.md 4:
    - `what`: host provider project (e.g., Vercel / Cloudflare Pages / AWS Amplify / Render)
    - `action`: create on the dashboard; capture dashboard URL; NEVER auto-create via CLI (e.g., `vercel link --yes`) 5:
    - `what`: third-party services
    - `action`: provision per-project; capture credentials in project memory; only what the project actually needs
- `capture`: every URL + account goes into project memory + reference.md

## installer_auto_setup

- `always`:
  - vendor `.claude/standards/` + `.claude/agents/` from user-global
  - install 3 universal gates (verify-no-history-baked-in, verify-issue-body-draft, verify-commit-stamp)
  - create / preserve per-project CLAUDE.md
- `shipping_or_maintained`:
  - install lib helpers (walk, kebab, exports, blast-radius, changed-paths, design-source)
  - install verify-all.mjs orchestrator
  - install 4 flat-layout gates + 13 per-folder gates + 15 verifier modes + agents-manifest generator
  - install husky pre-push hook + pre-commit Gate 1+2
  - "`pnpm add -D yaml puppeteer` (auto when pnpm + package.json present; skips with one-line manual command otherwise)"
- `any_status`:
  - create `type:tech-debt` + `status:ready` labels on the project's GH repo (idempotent; silent if present; skips when `gh` not on PATH or auth absent)
  - mirror session memory from $STANDARDS_MEMORY_SOURCE (default = the user's canonical memory-source path on this machine) into this repo's session-memory dir, ONLY when target is empty / missing

## project_memory

- `location`: "~/.claude/projects/<project-id>/memory/ (typically reference.md)"
- `captures`:
  - all URLs from pre_setup
  - primary GitHub user
  - local dev URLs + ports
  - dev-tld chosen for this project
  - project-specific setup decisions (DB choice, host provider, third-party services)

Last updated: 2026-07-12T00:00:00Z