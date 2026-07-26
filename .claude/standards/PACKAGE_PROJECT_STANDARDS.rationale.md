# PACKAGE_PROJECT_STANDARDS — detail

Why each rule in `PACKAGE_PROJECT_STANDARDS.md` exists.

## Why this standard exists at all

Published npm packages have failure modes that apps don't:

- **Unpublish is hostile.** npm allows unpublish within 72 hours, but the version number is permanently burned afterward — no one can re-use it. A wrong publish leaves you with a permanently-broken version on the registry.
- **Consumers depend on stable behavior.** A semver-breaking change shipped as a patch corrupts every downstream consumer's lockfile.
- **The package's surface is permanent.** Every published version stays on npm forever. The README + the type signatures + the changelog the consumer reads are the contract.

So package publishing gets its own discipline: a strict version-bump policy, a two-step publish gate, a per-package checklist for adding entries, and a generalized layout that keeps the publishable artifact isolated from anything else in the repo.

## Repo layout — `/code/package/` isolates the publishable artifact

Per `ROOT_LAYOUT#folder-layout`, all code lives under `/code/`. The publishable npm bundle lives in `/code/package/`. Everything that goes to npm is inside that directory. The repo root carries only `/docs/`, `/code/`, `README.md`, `README.yaml`, optionally `CLAUDE.md`, plus repo + dev-tooling metadata.

Why the split:
- **Surface clarity.** Anything in `/code/package/` is shipped to consumers. Anything outside isn't. A future contributor adding a file knows exactly which question to ask ("does this go in the published artifact?").
- **Build commands run from `/code/package/`.** `cd code/package && pnpm build` makes the working directory unambiguous; tsconfig + tsup config + package.json are all there.
- **Tests run from `/code/package/`.** Same logic — vitest config + the test files share a directory.

`/code/web/` is optional and explicitly outside `/code/package/`. The marketing/docs site has its own deploy pipeline (Vercel / Cloudflare Pages) and shouldn't pollute the published artifact. Vercel "Root Directory" for the companion site is `code/web` (per `ROOT_LAYOUT#folder-layout`).

## Versioning — default patch, minor/major require user say-so

`pnpm version patch` is the default because most changes are patch-level (bug fixes, internal refactors, documentation). Minor (new features) and major (breaking changes) bumps have downstream consequences — consumers see "new minor version available" notifications, upgrade considerations, changelog reads — and shouldn't be inferred from the diff. The user is the source of "is this a breaking change?" — never the agent.

CHANGELOG.md lands in the same PR as the version bump. A version without a changelog entry is mute — consumers reading the npm page see a new version with no explanation.

## Publish workflow — 9 steps, two-step gate

The 9-step workflow is bounded: each step's output is verifiable before the next. The two-step gate (prepublish-check + CONFIRMED=1) is the load-bearing part.

**Step 4 — prepublish check (no CONFIRMED):** `pnpm publish` without the env var does a dry-run. It outputs the file list that would be published, version validation, README sanity. NO actual publish happens. The user reads the dry-run output and confirms.

**Step 6 — real publish (CONFIRMED=1):** only after the user has explicitly said go. The CONFIRMED env var is a mechanical lock — the publish script refuses without it. Even if the agent confused itself and ran the command early, the missing env var would prevent the publish from happening.

Why so much ceremony around publishing? Because unpublish is hostile (see "Why this standard exists at all"). A wrong publish is permanent.

The rejection-recovery rule (verify state before claiming a destructive command didn't run) catches the failure mode where a network glitch causes the publish to succeed silently but the agent sees an error and assumes nothing happened. `npm view <package>` + `git log` confirms the actual state.

## Storybook deploy — own-domain only

The package path is `<project-domain>/<package-name>/`. The principle is:

1. The package's docs/storybook is hosted on the project's own domain, not on a third-party (gh-pages, Vercel marketing tier, etc.). Owning the domain means controlling the SEO, the analytics, the auth, the styling.
2. The path is the package's slug. Multiple packages on the same domain don't collide.

The `STORYBOOK_BASE` env var lets the build know the deploy path so internal links resolve correctly. Without it, links break in production.

The gh-pages ban is sharp: gh-pages adds an extra subdomain (`<org>.github.io/<repo>`), splits the domain story, breaks unified analytics, and signals "we didn't care enough to host this properly."

## Adding entries — per-package checklists

A package that ships a catalog (icons, components, validators) needs a checklist for the "I'm adding a new entry" workflow. The checklist captures the steps that are easy to forget:

- Pull main + rebuild AFTER PR merge — otherwise the entry you tested locally isn't in main yet.
- Update consumer-side dependency BEFORE adding metadata in consumer code — otherwise the consumer imports a not-yet-published version.
- Aliases / metadata MUST be user-confirmed — the agent never guesses how the consumer will reference the new entry.
- Consumer-side version matches published version — pinning to a stale version means the new entry is invisible.
- Storybook rebuilt + deployed — otherwise the visual docs lag the npm reality.
- Consumer-side tests pass — the new entry must compile + behave in the consumer.

Each step closes a specific failure mode that happened at least once. The checklist is the institutional memory.

## README — package-specific additions

The base README requirements (README_CONTRACT.md) cover everything every project's README needs. Packages add:

- Heading is `# @<scope>/<package-name>` — npm-readers see this first.
- GitHub repo link — for issue reports, source browsing.
- Documentation link — to the deployed storybook / docs URL.
- Sections in order: Installation / Usage / Props or API / Features / Documentation / License — the npm-reader's mental model.

The banned `github_project_board_link` exists because the project board is INTERNAL — it's for the maintainer's roadmap, not the consumer's interest. A consumer reading the npm package README doesn't care about your sprint planning.

## Forbidden list

Each item is a specific failure mode that happened or was about to:

- **Storybook to gh-pages** — see Storybook deploy section.
- **GitHub project board links in package README / npm package** — see README section.
- **Claude / AI attribution** — global rule from BRANCHES_AND_COMMITS.
- **`git push origin main`** — global rule from BRANCHES_AND_COMMITS (never push directly to main).
- **Minor / major bump without user instruction** — see Versioning section.
- **`CONFIRMED=1 pnpm publish` without user say-so** — see Publish workflow section.

These aren't novel rules; they're the consolidated "do not do" list for the package context. Each appears once in the YAML's `forbidden:` block as the lookup index.

Last updated: 2026-05-20T04:06:03Z
