# ROOT_LAYOUT

> agent needs to APPLY and ENFORCE: the repo-root folder contract (/docs + /code + README pair) and the deploy-side Root Directory setting. ---------- repo folder layout ----------

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## folder_layout

- `rule`:
  Repo root holds ONLY:
  - /docs/                    — all human + machine docs
  - /code/                    — all product code (no exceptions)
  - /manual-results/          — git-ignored; where each app's local-only POST /api/v1/manual-results/<flow> route writes manual-flow results for the CLI agent to read (MANUAL_FLOWS#manual-flow-surfaces). Created on first run; MUST be in .gitignore; never committed.
  - /README.md                — human prose
  - /README.yaml              — machine-readable project metadata
  - /CLAUDE.md (optional)     — per-project Claude Code instructions
  - Repo metadata (hidden / dev-tooling, NOT product code):
      .git/, .github/, .gitignore, .gitattributes,
      .claude/, .husky/, .vscode/, .editorconfig,
      .prettierrc, .prettierrc.json, .prettierignore,
      .npmrc, .nvmrc,
      host-provider deploy markers (any dotfile a deploy provider drops at the root)

  Code MUST NOT live at root. /web/, /apps/, /packages/, /services/, /scripts/, /src/, /lib/, /tests/, package.json, pnpm-lock.yaml, pnpm-workspace.yaml, turbo.json, tsconfig.json (if any), next.config.*, vercel.json, .env.example, .env.local — ALL of these live under /code/.

  Documentation files (anything ending in .md other than README.md / CLAUDE.md) MUST live under /docs/, NOT at root. AMENDMENT-* / HANDOFF-* filename patterns are banned anywhere in the repo — documentation reads declarative present-tense, with past decisions captured in commit messages rather than checked-in narrative files.

- `single_app_layout`:
  - `description`: the common shape — one Next.js app at /code/web/, no workspace
  - `tree`:
    <repo-root>/
    ├── docs/
    ├── code/
    │   ├── web/                       # the Next.js app
    │   │   ├── package.json
    │   │   ├── pnpm-lock.yaml
    │   │   ├── next.config.ts
    │   │   ├── tsconfig.json
    │   │   ├── .env.example
    │   │   ├── public/
    │   │   └── src/
    │   └── (any additional non-web code goes alongside web/, e.g. scripts/, packages/)
    ├── README.md
    ├── README.yaml
    ├── .gitignore
    ├── .github/
    └── .claude/

- `turborepo_layout`:
  - `description`: workspace repos (e.g., ai-stores with apps/marketing + apps/admin + apps/chat + packages/* + services/*)
  - `tree`:
    <repo-root>/
    ├── docs/
    ├── code/
    │   ├── package.json               # workspace root package.json
    │   ├── pnpm-workspace.yaml
    │   ├── turbo.json
    │   ├── pnpm-lock.yaml
    │   ├── tsconfig.base.json
    │   ├── apps/
    │   │   ├── marketing/
    │   │   ├── admin/
    │   │   └── chat/
    │   ├── packages/
    │   │   ├── ui/
    │   │   ├── auth/
    │   │   └── ...
    │   └── services/
    │       └── python-workers/
    ├── README.md
    ├── README.yaml
    ├── .gitignore
    ├── .github/
    └── .claude/

- `vercel_root_directory`:
  - `rule`: every Vercel project sets `Root Directory` to the per-app code path
  - `single_app`: "code/web"
  - `turborepo_app`: "code/apps/<app-name>"
  - `set_via`: 'Vercel dashboard OR API (`PATCH /v9/projects/<id>` with `"rootDirectory": "code/web"`)'

Last updated: 2026-07-12T00:00:00Z