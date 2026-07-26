# PULL_REQUESTS

> Scope: the agent-owned PR lifecycle — body shape (SIX H2 sections), the "no 100%, no PR" gate, the per-standard stamping requirement, the PR-body pre-create gate, merge, and issue close + branch cleanup. Siblings: ISSUES.md, BRANCHES_AND_COMMITS.md, VERIFIER_MODES.md, REPO_GATE_INSTALLATION.md (pre-push hook + pr-shape CI). ---------- pull request ----------

```meta
version: 1
last_updated: 2026-07-13T00:00:00Z
```

## pull_request

- `owner`: agent _(agent owns the full per-issue lifecycle below)_
- `body_template`:
  - "## Summary"
  - "## Type of change"
  - "## Standards gates" _(MECHANICAL — verbatim quoted green gate output; see pr_gate.gate_evidence)_
  - "## Standards compliance" _(generated per-standard stamp block; see pr_gate.standards_compliance_section)_
  - "## Test plan"
  - "## Checklist"
- `lifecycle`: _(in order; each step is required agent action)_ 1: run the pre-push gate chain green
  (REPO_GATE_INSTALLATION#pre-push-gate); a PR is NOT opened while any gate is red (pr_gate.no_100_no_pr) 2: '`gh pr
  create` immediately after `git push`; agent writes PR title + body — the six body_template H2 sections + `Closes
  #NNNN` trailer; `## Standards gates` carries verbatim gate proof per pr_gate.gate_evidence; `## Standards
  compliance` carries the generated per-standard stamp block per pr_gate.standards_compliance_section' 3: re-validate
  locally — re-run `pnpm verify` (typecheck + lint + test + build + verify-standards-compliance; or per-project
  equivalent) against the merge-target tree on this branch tip before merge 4: 'resolve every `## Standards checklist`
  item on the linked issue (ISSUES#issues) — `- [x] <item>` (done) OR `- [ ] <item> — N/A: <reason>`; zero
  bare-unchecked items at merge' 5: flip the issue label from `status:in-progress` to `status:done` BEFORE merge (per
  ISSUES#issues) 6: '`gh pr merge --squash --delete-branch` once every checklist item is resolved AND the PR''s CI
  checks (if any) are green AND the local re-verify exited 0' 7: close the issue (auto-closed by `Closes #NNNN`; if
  GitHub does not auto-close, run `gh issue close`) 8: confirm every checklist item is checked on the project board
  entry; fill per-issue completion fields when the board tracks them 9: delete the local branch (`git branch -D`) AND
  confirm remote deletion landed (per close.delete_branch_after_merge)

## pr_gate

- `no_100_no_pr`: true _(any red gate ⇒ no `gh pr create` runs; the full pre-push gate chain (REPO_GATE_INSTALLATION#pre-push-gate) is green BEFORE the PR opens)_
- `gate_evidence`:
  - `section`: "## Standards gates"
  - `rule`: MUST contain the copy-pasted final-line output of every mechanical gate proving 100% — the pre-push chain result, each shipping package's `verify` EXIT 0, and Mode D (branch stamp) green; every embedded line reads as a pass (EXIT 0 / GREEN / "locked + fresh"); a paraphrase, a summary, or a missing line is a violation
- `standards_compliance_section`:
  - `section`: "## Standards compliance"
  - `generator`: scripts/generate/generate-pr-standards-block.mjs — run after a green `pnpm verify`; consumes the green receipt written only on all-green
  - `rule`: 'MUST carry the literal line "100% standards met" AND every standard registered in INDEX.yaml, each deliberately stamped `: 100%` or `: NOT REQUIRED` — none omitted, no other verdict; a missing standard or any other verdict fails verify-pr-body-draft'
- `pre_create_gate`:
  - `script`: verify-pr-body-draft
  - `invocation`: "node .claude/standards/scripts/verify-pr-body-draft.mjs <path-to-pr-body.md>"
  - `rule`: run BEFORE `gh pr create --body-file <path>`; exit 0 required
  - `refuses_when`: 'PR body missing any required H2 section (Summary / Type of change / Standards gates / Standards
    compliance / Test plan / Checklist) OR missing the `Closes #NNNN` trailer OR `## Standards gates` absent / lacking
    quoted gate output / containing any gate line that is not a pass OR `## Standards compliance` lacking the literal
    "100% standards met" line / omitting any INDEX.yaml-registered standard / carrying any verdict other than `100%`
    or `NOT REQUIRED`'
- `parallels`: ISSUES#issues (verify-issue-body-draft) — same shape, PR analogue

## pr_body_draft_gate

- `script`: scripts/verify-pr-body-draft.mjs
- `rule`: run against the body draft BEFORE `gh pr create`; NEVER create a PR until it exits 0; requirements = pr_gate.pre_create_gate.refuses_when + pr_gate.gate_evidence + pr_gate.standards_compliance_section (explicit pass lines, zero failure markers — less than 100% green means no PR exists to create)

## merge

- `branch_up_to_date_with_main`: required before merge
- `merge_method`: merge (default) or squash (per-project)
- `autonomous_after_pristine`: true
- `standards_checklist_gate`:
  - `rule`: 'a PR does NOT merge until every item in each linked issue''s `## Standards checklist` is resolved — `- [x]` (done) OR `- [ ] <item> — N/A: <reason>` (deliberately not applicable); any bare-unchecked item blocks the merge'
  - `who_resolves`: 'the agent ticks/annotates each box on the linked issue (mirrored into the PR body when applicable) BEFORE merging; on an unresolved item the agent fixes it or annotates `- [ ] <item> — N/A: <reason>` first — never merges past a bare-unchecked item'
  - `verifies`: 'every checklist item is `[x]` or carries `N/A: <reason>`; zero bare-unchecked items'
- `see`: LOCK_FILES.md _(for the compliant/<sha> tag rule)_

## close

- `precondition`: feature is fully implemented AND standards-compliance.yaml status=locked AND verified=100%
- `delete_branch_after_merge`:
  - `remote`: true
  - `local`: true

## merge_wall

Private repos on the free plan cannot mark standards-chain REQUIRED (GitHub Pro gate;
repos are never public per the decision log). The wall is harness-enforced instead —
the machine-wide PreToolUse hook ~/.claude/hooks/merge-wall-guard.mjs intercepts every
`gh pr merge` and DENIES it unless the PR head sha has a successful standards-chain run.
Fail-closed for regime repos; repos without the workflow pass through.

## merge_strategy

MERGE COMMIT (never squash, never rebase) — squash strips the branch's "100% standards met" stamp commit from main's history, destroying the git-log answer to "when was the last 100%". The merge commit preserves every stamped commit on main.

Last updated: 2026-07-13T00:00:00Z