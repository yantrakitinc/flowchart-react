# Daily conversation — 2026-07-26

## Topic: @yantrakit/flowchart-react v2 — Mermaid-like, AI-first rewrite

### Direction
The user asked to convert the props-based v1 flowchart into a Mermaid-like, AI-first React
flowchart: author diagrams as text (or an object) and render them with a real interactive UI
per node. Through brainstorming we settled the architecture: own the DSL + IR + semantic path
model + node registry, and delegate interactive rendering to React Flow (`@xyflow/react`).
Layout is a pluggable strategy (dagre default, ELK opt-in). v2 is a clean break → v2.0.0.

### Course correction (important)
A first implementation pass produced working, tested v2 code but **bypassed the standards
regime** — no GitFlow issue/branch/PR, no spec-first writing order, no `__specs__/` lock files,
no verifier stamps, no journeys, no conversations log. The user rejected retrofitting and
directed a full scratch + regime-driven rebuild. All session code/doc changes were reverted to
the clean HEAD (`c7cb219`).

### Phase 1 — provisioning (this session)
- Created `README.yaml` (status: shipping, board #1, npm public, account yantrakitinc).
- Ran `install-slice-gates.sh . code/package`: vendored `.claude/standards` + `.claude/agents`,
  installed the full verify gate chain + verifier modes + husky pre-push + commit-msg hook + CI
  wall, set `core.hooksPath = code/package/.husky`, created `type:tech-debt` + `status:ready`
  labels.
- Created `.standards/autonomy.yaml` (`ui_discipline: full`) and `src/styles/states.css`.
- Wired `package.json` scripts (`verify`, `verify:stamp`, `ship`, `prepare`) — adapted the
  verify chain for a **library** (typecheck + lint + coverage + build + verify-all; no `e2e`).
- Added `husky` devDep.

### Decisions logged
See `docs/decisions/DECISIONS.yaml` (2026-07-26): React-Flow architecture, pluggable layout,
clean break v2.0.0, rich node registry, full-regime-from-scratch directive.

### Surfaced defects / notes
- `install-slice-gates.sh` writes the pre-commit hook to `.git/hooks/pre-commit`, but sets
  `core.hooksPath` to `code/package/.husky` — with a custom hooksPath, `.git/hooks/pre-commit`
  is not executed by git. The pre-commit Gate 1/Gate 2 needs to live under
  `code/package/.husky/pre-commit` for the subdir layout. Surfaced to the user as standards-infra
  tech-debt (installer bug for `code/<subdir>` repos); not fixed here (user-owned standards infra).

### Remaining pipeline
Phase 2 issue + branch → Phase 3 journeys → Phase 4 specs → Phase 5 node design-locks →
Phase 6 TDD implementation → Phase 7 verify + lock + PR.

---

## Session addendum — v2 rebuild under updated standards

The two prior v2 attempts were discarded (the second was improperly force-merged to main and
then nuked; main was restored to the v1 baseline keeping `docs/`). The user updated the global
standards to fix the regime-infra blockers:
- Vendored gate directories no longer ship self-lock compliance files → the ~134 phantom
  `scripts/` compliance violations are gone (`verify-standards-compliance` → "0 feature(s)
  locked + fresh" on the baseline).
- `verify-eslint-permission-rules` (a Next.js+Postgres-only gate) removed from the chain.
- Spec/lock artifacts moved `.yaml → .md` (`spec.md`, `flow.md`, `manual.md`,
  `standards-compliance.md`).

Rebuild pipeline (issue #4, branch `feat/0004-v2-mermaid-flowchart`): provision (done) →
code (coder-core, in progress) → per-feature specs (backfill `.md`) → journeys reconcile →
node-UI design locks → verifier Mode A + `pnpm verify` green → PR. Design is the ratified one
in `docs/decisions/DECISIONS.yaml` (React Flow + pluggable dagre/ELK + Mermaid-like DSL).
