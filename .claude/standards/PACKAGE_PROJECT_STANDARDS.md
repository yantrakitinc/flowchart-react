# PACKAGE_PROJECT_STANDARDS

> Applies to any project that ships as a published npm package. Inherits from base standards (NAMING, BRANCHES_AND_COMMITS, etc.). ---------- repo layout ---------- Every repo (package or app) uses the same /docs + /code root layout. See ROOT_LAYOUT#folder-layout for the canonical rule.

```meta
version: 1
last_updated: 2026-06-06T00:00:00Z
```

## repo_layout

- `root_contains_only`:
  - README.md
  - README.yaml
  - docs/
  - code/ _(ALL code lives here — no exceptions)_
  - .git/
  - .gitignore
  - .github/
  - .claude/
- `code_folder_contains`:
  - package/ _(the published npm-package code)_
  - web/ _(optional companion marketing / docs site)_
- `package_folder_contains`:
  - src/
  - .storybook/ _(when component library)_
  - package.json
  - tsconfig.json
  - tsup.config.ts _(or equivalent build config)_
  - vitest.config.ts
  - eslint.config.mjs
  - CHANGELOG.md
  - LICENSE
  - pnpm-lock.yaml
  - .npmrc _(private (restricted) packages only: scope registry + ${NODE_AUTH_TOKEN} authline, never a literal token)_
- `builds_run_from`: code/package/
- `tests_run_from`: code/package/

## versioning

- `default_bump`: patch
- `minor_or_major`: requires explicit user instruction (NEVER inferred)
- `changelog`: package/CHANGELOG.md updated in the same PR as the version bump

## publish

_Access mode is per-package, declared in package/package.json `publishConfig`._
_The publish steps below substitute <access_flag> + <registry> from the chosen mode._
- `access_modes`:
  - `public`:
    - `registry`: https://registry.npmjs.org
    - `access_flag`: --access public
    - `publishConfig`: '{ "access": "public" }'
  - `restricted`: _(private packages → GitHub Packages)_
    - `registry`: https://npm.pkg.github.com
    - `access_flag`: --access restricted
    - `publishConfig`: '{ "access": "restricted", "registry": "https://npm.pkg.github.com" }'
    - `scope_registry_npmrc`: '@<scope>:registry=https://npm.pkg.github.com'
    - `auth`:
      - `env_var`: NODE_AUTH_TOKEN
      - `publish_token_scope`: write:packages _(token used to publish)_
      - `consumer_token_scope`: read:packages _(token used to install)_
      - `npmrc_authline`: '//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}'
      - `consumer_story`:
        - committed .npmrc carries the scope_registry_npmrc line + the npmrc_authline (token via env, never inlined)
        - each consuming env (local shell + every Vercel project) sets NODE_AUTH_TOKEN to a token with read:packages
        - Vercel: add NODE_AUTH_TOKEN as a project env var so `pnpm install` resolves the private scope at build
      - `forbidden`:
        - committing a token value anywhere in git (.npmrc must reference ${NODE_AUTH_TOKEN}, never a literal)
        - "`wrangler login` / `vercel login` / `npm login` that overwrite existing auth (discover existing tokens)"
- `required_steps_in_order`: 1: 'bump version in package/package.json (default: patch)' 2: update package/CHANGELOG.md
  3: run `cd package && pnpm build` 4: 'prepublish-check (no CONFIRMED env): `pnpm publish <access_flag>
  --no-git-checks` (dry run)' 5: show output to user; wait for explicit confirmation that version + README are correct
  6: 'real publish: `CONFIRMED=1 pnpm publish <access_flag> --no-git-checks` ONLY after user say-so' 7: 'build
  storybook (when applicable): `pnpm build-storybook`' 8: deploy storybook to <project-domain>/<package-name>/ (see
  storybook_deploy below) 9: commit + push package repo per BRANCHES_AND_COMMITS.md
- `publish_gate`:
  - `rule`: NEVER `CONFIRMED=1 pnpm publish` without explicit user say-so
  - `reason`: publishing is destructive; unpublish has 72-hour window + hostile-to-recovery semantics
- `rejection_recovery`:
  - `after_rejected_destructive_command`: verify state (`npm view`, `git log`) BEFORE claiming command didn't run

## storybook_deploy

- `target`: <project-domain>/<package-name>/
- `banned`: gh-pages
- `base_path`: package/.storybook/main.ts reads STORYBOOK_BASE env var for conditional base path
- `build_script`: '"build-storybook": "STORYBOOK_BASE=/<package-name>/ storybook build -o storybook-static"'

## adding_entries

- `required`: every package ships its own per-entry checklist (e.g., docs/ADDING_ICONS.md, docs/ADDING_COMPONENTS.md)
- `critical_points`:
  - after PR merge: pull main + rebuild BEFORE publishing
  - after publish: update consumer-side dependency FIRST, then add metadata entries
  - aliases / metadata in consumer code MUST be confirmed with the user (never guessed)
  - consumer-side version matches published version
  - storybook rebuilt + deployed
  - consumer-side tests pass before committing

## readme

- `base`: see README_CONTRACT#readme-requirements
- `package_specific_additions`:
  - `heading`: "# @<scope>/<package-name>"
  - `github_repo_link`: required
  - `documentation_link`: link to deployed storybook / docs URL
  - `sections_required`:
    - Installation
    - Usage
    - Props or API
    - Features
    - Documentation
    - License
- `banned`:
  - github_project_board_link _(readers of npm package don't need internal project view)_

## forbidden

- storybook deploys to gh-pages
- GitHub project board links in package README or npm package
- Claude / AI attribution anywhere (see BRANCHES_AND_COMMITS.md)
- "`git push origin main`"
- minor or major version bump without explicit user instruction
- "`CONFIRMED=1 pnpm publish` without explicit user say-so"

Last updated: 2026-06-06T00:00:00Z