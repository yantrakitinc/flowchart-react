# BRANCHES_AND_COMMITS — detail

Why each rule in `BRANCHES_AND_COMMITS.md` exists. Without standardized git conventions the agent gets lost ("does this team squash-merge or merge-commit?") and history rots ("what was this branch for?"). The rules below close specific recurring failure modes, not aesthetic preferences.

## Branches — feat/NNNN-tiny pattern

The `(feat|fix)/NNNN-...` pattern is parsed by tooling (the pre-push hook + any per-project gate that links branch → issue) to derive the issue number automatically. Loosening the pattern would break that tooling.

`tiny-content-identifier` is the contract: short, descriptive, lowercase, hyphen-separated. Not "tiny" as in trivial — "tiny" as in "fits in a path component without word-wrapping".

Direct push to main / staging is banned because both are protected branches. The force-push exception (for nuke-paths) requires two explicit env vars because force-push to main is destructive — both vars MUST be set per push, never per session.

Bundling unrelated changes into one branch is banned because each branch should have one rollback story. "We need to revert" should mean reverting one concern, not unwinding a tangle.

## Commits — `<type>: <subject>` + no AI attribution

The conventional-commit-ish format means a `git log --oneline` reveals the kind of change at a glance. Types are bounded (`feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`); free-form types get rejected.

The no-AI-attribution rule is absolute. No `Co-Authored-By: Claude`, no "Generated with Claude", no robot emojis. The commits represent code shipped under the author's name and responsibility. Attribution noise dilutes that signal.

## User override

The user override rule: an explicit user instruction overrides the standard for that specific push or action. Never for the session. A user saying "push directly to main this once" is per-push; the next push reverts to standard. This prevents "the user said no force-push checks last week" from being cited as authorization today.

## Release tagging

Every prod deploy gets `vYYYY.MM.DD.N`. The date + counter is the audit trail. Rollback references the prior tag.

Last updated: 2026-07-12T00:00:00Z
