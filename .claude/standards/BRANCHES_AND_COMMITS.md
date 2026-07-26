# BRANCHES_AND_COMMITS

> Scope: branch naming, push rules + the nuke path, commit message format, the AI-attribution ban, the per-push user-override scope, and release tags. Siblings: ISSUES.md, PULL_REQUESTS.md, VERIFIER_MODES.md, REPO_GATE_INSTALLATION.md (the hooks that mechanically enforce these). ---------- branches ----------

```meta
version: 1
last_updated: 2026-07-16T00:00:00Z
```

## branches

- `pattern`: "(feat|fix)/NNNN-tiny-content-identifier"
- `NNNN`: 4-digit issue number with zero-padding
- `banned`:
  - direct commit or push to main
  - direct commit or push to staging
  - force-push to main or staging
- `exception`:
  - `nuke_path`: force-push to main allowed ONLY to revert non-compliant history; requires I_AUTHORIZED_THIS_PUSH=1 AND I_REALLY_MEAN_MAIN=1
- `base_freshness`: pull main latest before creating any branch
- `one_pr_per`: [feature, fix, slice of large feature]
- `banned_in_pr`:
  - bundling unrelated changes
  - mixing a bug fix with a feature

## commits

- `message_format`: "<type>: <subject>"
- `types`: [feat, fix, docs, style, refactor, test, chore]
- `subject_max`: 72 chars
- `banned`:
  - "Co-Authored-By: Claude"
  - "Generated with Claude"
  - "🤖"
  - any AI / Anthropic attribution anywhere

## trunk_integration

- `flow`: one feature = one short-lived (feat|fix)/NNNN branch = one merge, AS THE FEATURE LOCKS — lock → PR → green chain → MERGE COMMIT to main → delete branch. The default path, not a later decision.
- `banned`: a long-lived integration branch that accumulates many locked features off-trunk; "should we merge to main?" is NOT a user decision — integration is standard-mandated
- `rule`: green-on-branch is NOT done; only merged-to-main is done. Every gate runs on the current branch and answers "is this code spec'd/locked/covered?" — none of them assert the work reached trunk, so integration must be driven, never assumed
- `gate`: scripts/verify/verify-stamps.mjs --check trunk-integration _(flags locked features on the branch that are absent from main)_
- `surfaced_by`: hooks/trunk-integration-warn.mjs _(session-start warning + merge flow (non-blocking))_

## user_override

- `rule`: a user instruction overrides the standard for that specific scope only
- `scope`: per-push or per-action (NOT per-session)

## release_tags

- `format`: vYYYY.MM.DD.N
- `emitted_when`: a deploy goes to production
- `rule`: every prod deploy carries a release tag; rollbacks reference the prior tag

Last updated: 2026-07-16T00:00:00Z