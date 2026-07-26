# package.yantrakit.flowchart-react

Per-project Claude Code instructions. Auto-loaded at session start.

## Project metadata
Authoritative source: `README.yaml` at repo root. Schema: `~/.claude/standards/README_CONTRACT.yaml.readme_requirements.README.yaml`.

## Standards regime
- User-global Tier-1 hub: `~/.claude/CLAUDE.md` + `~/.claude/standards/STANDARDS_ENTRY.md`.
- This project's vendored copy: `.claude/standards/` (re-vendor via `bash ~/.claude/standards/scripts/install-slice-gates.sh .`).
- 5-agent ecosystem: `.claude/agents/` (vendored) — see `AGENT_ARCHITECTURE.md`.

## Per-status behavior

Read `README.yaml.status` first.

### `status: planning` (Coming Soon)
- ONLY these gates apply: `verify-no-history-baked-in` + `verify-issue-body-draft` + `verify-commit-stamp` + `typecheck` + `lint`.
- No `__specs__/` folders required; no `standards-compliance.yaml` locks; no pre-commit Gate 2; no husky pre-push.
- Source is a bare create-next-app shape under `/code/web/` per `ROOT_LAYOUT.yaml.folder_layout`.

### `status: shipping` or `maintained`
- Full 15-gate `pnpm verify` chain applies.
- Every feature carries `__specs__/{spec.yaml, spec.md, flows/, manual/}` + `standards-compliance.yaml`.
- Verifier Mode A on slice handoff; Mode B at pre-push; Mode C/D opt-in at final push.
- 5-agent workflow: `feature-spec-writer` → `coder` → `verifier`; `github-project-agent` for GH ops; `pm` for orchestration when multi-slice.

### `status: archived`
- Read-only history. No gates apply.

## Transitioning planning → shipping
1. Update `README.yaml.status` to `shipping`.
2. Re-run `bash ~/.claude/standards/scripts/install-slice-gates.sh .` — the installer detects the new status and adds the full verify chain (husky pre-push, pre-commit Gate 2, all 15 gates, orchestrator).
3. Update `code/web/package.json` to add `verify` / `test` / `e2e` scripts (the installer prints the snippet).
4. Begin slice-by-slice development per the spec-writer → coder → verifier workflow.

## GitHub identity
This repository is owned by the GH account named in `README.yaml.github.account`. Before any `gh` op:
```bash
gh auth switch --user <github.account>
```
This machine hosts multiple accounts; running on the wrong one silently drops `--project` flags.
