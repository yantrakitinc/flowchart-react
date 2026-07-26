# DIGEST for github-project-agent-core.md — GENERATED, do not edit. Regenerate: node ~/.claude/standards/scripts/generate/generate-agent-digests.mjs
# sources:
#   ISSUES.md 10ef78457ef3db4d
#   BRANCHES_AND_COMMITS.md 1c3374bdbeabb34c
#   PULL_REQUESTS.md a1c7da8802fec80d
#   README_CONTRACT.md ead37c41b879da60
#   DECISION_LOG.md 6e66ab4cda731377
#   CONTEXT_ECONOMY.md 7937af1a8307570f

## ═══ ISSUES.md ═══

```markdown
# ISSUES

> Scope: GitHub issue discipline — body shape, labels, project-board membership, the standards checklist, the issue pre-create gate, the compliance block, and open-issue audits. Siblings: BRANCHES_AND_COMMITS.md, PULL_REQUESTS.md, VERIFIER_MODES.md, REPO_GATE_INSTALLATION.md. ---------- issues ----------

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## issues

- `required`: every code change ships under a GitHub issue
- `body_template`:
  - "## Description"
  - "## Acceptance criteria"
  - "## Standards checklist" _(itemized, tickable, per-standard — see standards_checklist)_
  - "## Technical notes"
  - "## Related issues"
- `labels`:
  - `type`: one of [epic, story, bug, enhancement, docs, chore]
  - `status`: one of [in-progress, blocked, done]
  - `rule`: one type + one status at creation; `status:done` set BEFORE merge
- `project_board`:
  - `rule`: every issue MUST be added to the appropriate GH Project board AT creation time
  - `enforcement`: a closed issue with empty projectItems is a defect; sweep + nuke per ISSUES
  - `location_capture`: project URL recorded in the repo's reference.md before any issue work
- `pre_create_gate`:
  - `script`: verify-issue-body-draft
  - `invocation`: "node .claude/standards/scripts/verify-issue-body-draft.mjs <path-to-draft-body.md>"
  - `rule`: run BEFORE `gh issue create --body-file <path>`; exit 0 required
  - `refuses_when`: draft body missing `## Description` / `## Acceptance criteria` / `## Standards checklist` / `## Technical notes` OR `## Standards compliance` block
- `standards_checklist`:
  - `required_in`: every implementation issue (type in [story, bug, enhancement, chore] that ships code or specs); epic/docs exempt
  - `rule`: itemized tickable `- [ ]` items — one per standard requirement the feature must satisfy, each naming the standard it enforces; the creating agent tailors items to the feature's invocation.type; every required_group below is mandatory — omit a group ONLY when it does not apply, stating why on that group's line
  - `required_groups`:
    - `spec_phase`: "spec.md + flows/<fn>.flow.md + manual/<flow>.md (HTTP|UI) + ui/<flow>.md ui-locked (UI; USER sign-off) + openapi.yaml (HTTP) + asyncapi.yaml (events) + standards-compliance.md — SPEC_CONTRACT + FLOW_CONTRACT + MANUAL_FLOWS + WRITING_ORDER"
    - `code_phase`: "folder shape + index barrel + JSDoc per export + semantic Tailwind tokens only + naming + data-agent-* attrs on interactive elements — NAMING + COMPONENT_CREATION + AGENT_AFFORDANCES"
    - `tests`: "__tests__ present + 100% coverage (lines/branches/functions/statements) — TEST_STACK"
    - `storybook`: "Usage/Playground/AllVariants + addon-a11y error mode + viewport presets — COMPONENT_CREATION (UI features only)"
    - `cross_cutting`: "WCAG 2.2 AA + server-side authz + mobile-first + i18n — ACCESSIBILITY / AUTHORIZATION_STANDARDS / MOBILE_FIRST / I18N"
    - `verify`: "verifier Mode A green + standards-compliance.md stamped (status:locked, verified:100%) — WRITING_ORDER"
    - `gitflow`: "branch feat/NNNN-id + `<type>: <subject>` commits + no AI attribution + pushed — BRANCHES_AND_COMMITS"
  - `item_resolution`:
    - `rule`: 'every item resolved before merge, in exactly one of two ways: (a) checked done `- [x] <item>`; (b) deliberately not applicable `- [ ] <item> — N/A: <one-line reason>`. A bare `- [ ]` item with no `N/A:` annotation is UNRESOLVED and blocks merge. No third state.'
  - `enforced_by`:
    - `creation`: verify-issue-body-draft (presence of `## Standards checklist` section)
    - `merge`: see PULL_REQUESTS#merge (no merge with any unresolved item)

## issue_body_compliance_block

- `shape`:
  ## Standards compliance

  Feature(s) touched: <path>
  standards-compliance.md passes: <yes | no — explain>
  `pnpm verify` exits 0: <yes | no>
  Last validated: <YYYY-MM-DD HH:MM:SS Z>
- `see`: LOCK_FILES.md

## audit

- `open_issues`:
  - `rule`: periodically audit open issues against the labels + standards-compliance state
  - `frequency`: weekly or before any major release

Last updated: 2026-07-12T00:00:00Z
```

## ═══ BRANCHES_AND_COMMITS.md ═══

```markdown
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
```

## ═══ PULL_REQUESTS.md ═══

```markdown
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

- `precondition`: feature is fully implemented AND standards-compliance.md status=locked AND verified=100%
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
```

## ═══ README_CONTRACT.md ═══

```markdown
# README_CONTRACT

> agent needs to APPLY and ENFORCE: the paired README.yaml (machine) + README.md (human) contract at repo root, including status semantics. ---------- root README — paired YAML (machine) + Markdown (human) ----------

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## readme_requirements

- `pattern`: paired-file (README.yaml + README.md) at project root — same idea as __specs__/spec.md
- `location`: project root

- `README.yaml`:
  - `purpose`: machine-readable project metadata; consumed by github-project-agent, /agents.json generator, /llms.txt generator, deploy scripts, e2e tests
  - `required_fields`:
    - `project_name`: string _(kebab/dot-case repo identifier; e.g., "com.yantrakit.audit")_
    - `description`: string _(one-line plain English)_
    - `status`: enum[planning, shipping, maintained, archived] _(project lifecycle state; gates which standards apply)_
    - `github`:
      - `account`: string _(gh auth switch --user <this>; e.g., "yantrakitinc")_
      - `owner`: string _(org/user that owns the repo)_
      - `repo`: string _(repo name)_
      - `repo_url`: string _(https://github.com/<owner>/<repo>)_
      - `project_board_number`: integer _(GH project board number (for --project flag))_
    - `local_dev_url`: string _(http://<project>.<dev-tld>:<port>)_
    - `production_url`: string _(https://...)_
    - `last_updated`: iso8601_datetime _(drift signal)_
  - `optional_fields`:
    - `tier`: integer _(1 / 2 / 3 / 4 / 5 / 6 per app registry tiers)_
    - `category`: enum[primitive, app, standalone, archived]
    - `stack`: map _(framework / database / language / package_manager)_
    - `host_provider`: enum[cloud-run, vercel, cloudflare, render, fly, ...]
    - `published_packages`: list<string> _(@<scope>/<package> npm packages this repo publishes; consumed by downstream registries / marketing-site products lists)_
    - `parent_project`: string|null _(when this is a child of another (e.g., extension companion))_
    - `related_repos`: list<string> _(cross-primitive deps)_
    - `third_party_services`: list<map> _([{ name, purpose, dashboard_url }, ...])_
    - `ui_screenshot_match_threshold`: int _(default 85. Score 0-100 from verify-component --check ui-screenshots-match-designs.mjs; states below the threshold fail the gate. Tune per repo when the design source is photoshop-detailed (raise) vs sketch-level (lower).)_
    - `ui_screenshot_dev_server_url`: string _(default "http://localhost:3000". URL Puppeteer hits to navigate flows; manual playbook `start:` values resolve relative to this.)_
  - `enforced_by`: convention — consuming tools (github-project-agent, deploy scripts, e2e tests) surface malformed metadata at runtime
  - `status_semantics`:
    - `planning`:
      - `description`: pre-launch; Coming Soon page only; no production user-facing features yet
      - `exempts_from`:
        - "__specs__/ folders + standards-compliance.md requirements (no features to spec)"
        - "verify-standards-compliance (no locks to check)"
        - "verify-source-coverage (no slices to cover)"
        - "100% perFile test coverage (no business logic to test)"
        - "verify-commit-stamp pre-commit hook (no behavior files to gate)"
      - `still_required`:
        - "README.yaml status field accurate (honored by convention; consuming tools surface drift)"
        - "verify-no-history-baked-in (any docs that exist read present-tense)"
        - "typecheck + lint (the Coming Soon page still has to compile + lint clean)"
    - `shipping`:
      - `description`: active development with user-facing features; full standards regime applies
      - `exempts_from`: []
    - `maintained`:
      - `description`: feature-complete; only critical fixes / security patches; full standards apply
      - `exempts_from`: []
    - `archived`:
      - `description`: end-of-life; no further changes; standards frozen at archival commit
      - `exempts_from`:
        - "all verify gates (the repo is read-only history)"

- `README.md`:
  - `purpose`: human prose; references README.yaml fields rather than duplicating
  - `required_sections`:
    - Prerequisites _(Node version, pnpm, exact /etc/hosts lines to add)_
    - Structure _(folder tree per ROOT_LAYOUT#folder-layout or ROOT_LAYOUT#folder-layout)_
    - Development _(exact command sequence (e.g., `cd code/web && pnpm install && pnpm dev`))_
    - Tech Stack _(ordered list)_
    - Environment Variables _(refer to .env.example; list source for each value)_
    - Testing _(how to run unit / E2E / live-browser walkthroughs)_
    - Deployment _(how the project deploys)_
  - `rule`: do NOT duplicate machine fields from README.yaml in README.md prose; reference them by name and link to the YAML

Last updated: 2026-07-12T00:00:00Z
```

## ═══ DECISION_LOG.md ═══

```markdown
# DECISION_LOG

> Decisions the user has ruled on are LOGGED and never re-asked.

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## locations

- `global`: ~/.claude/decisions/DECISIONS.yaml _(rulings that apply across all projects)_
- `per_repo`: <repo>/docs/decisions/DECISIONS.yaml _(rulings scoped to one project)_

## entry_schema

- `date`: iso8601_date _(when the ruling was made)_
- `scope`: enum[global, repo]
- `decision`: one-sentence statement of the ruling, in the user's terms
- `context`: one line — what prompted the question
- `source`: enum[user] _(only the user creates decisions)_

## rules

- `append_same_turn`: every user ruling (an AskUserQuestion answer, an explicit "do X not Y", a preference, a scope call) is appended to the correct log IN THE SAME TURN it is given
- `consult_before_asking`: before asking the user ANY question, grep both logs; a question already answered there is NEVER asked again — cite the entry and proceed
- `log_beats_memory`: the log is the source of truth for past rulings; session memory and recollection never override it
- `never_edit_rulings`: entries are append-only; a ruling changes only when the user gives a new ruling (append the new entry; the newest entry for a topic wins)
- `no_silent_downscoping`: a directive is executed WHOLE — never silently reduced to the least-destructive subset; if a step looks destructive or wrong, SAY SO and ask (after consulting the log), never quietly skip it

## enforcement

- `pre_ask_hook`: ~/.claude/hooks/decision-log-guard.mjs _(PreToolUse on AskUserQuestion — injects both logs + the never-re-ask directive into context before any question reaches the user)_
- `tier_1`: CLAUDE.md + STANDARDS_ENTRY.md carry the consult-before-asking + append-same-turn rules

Last updated: 2026-07-12T00:00:00Z
```

## ═══ CONTEXT_ECONOMY.md ═══

```markdown
# CONTEXT_ECONOMY

> Context is a budget, not a landfill. Standards-following must get CHEAPER over time, never heavier.

```meta
version: 1
last_updated: 2026-07-26T00:00:00Z
```

## session_injection

- `budget`: 6000 _(chars, TOTAL additionalContext from the SessionStart hook)_
- `composition`: contract (fixed) + catalog (names only) + open lessons (open only) + failures (only when failing)
- `rule`: scopes/rules/details are ONE READ away (INDEX.yaml -> <NAME>.yaml) — never injected wholesale
- `enforced_by`: scripts/verify-standards-meta.mjs _(check 11 pipe-runs the hook and fails over budget)_

## agent_economy

- `read_scope`: an agent reads ONLY the standards in its standards_used list (+ INDEX for routing) — never sweeps the tree
- `output_contract`: strict verbatim-lines-only report formats with hard line caps — transcripts, file dumps, and narration never return to the orchestrator
- `model_fit`: haiku for mechanical run-and-quote work; sonnet only where judgment is the job
- `dispatch_rule`: one focused brief in, one capped report out; follow-ups via SendMessage to the same agent instead of re-briefing a new one
- `offload_rule`: token-heavy transient work (multi-file reads, wide searches, gate/test transcripts, open-ended
  investigation) MAY be dispatched to a pinned-cheap agent when the offload genuinely nets a saving — but only after
  the cheaper inline remedies (dispatch_discipline.prefer_inline) are exhausted. Dispatch is not the default reflex;
  it is the move when inline can no longer keep the loop lean.
- `offload_enforced_by`: hooks/context-bloat-guard.mjs _(PostToolUse: nudges when an inline)_
  _read/search/gate burst crosses the char threshold; leads with inline-summarize/trim, offload second;_
  _resets on subagent dispatch. Advisory (never blocks the tool). Disable with CONTEXT_BLOAT_GUARD=off._

## dispatch_discipline

- `default`: inline — Claude Code does the work in-session by reading the relevant <agent>.md as SOP
- `self_adjudicated`: the session decides whether a dispatch clears the bar; it NEVER prompts the user for per-dispatch approval. In autonomous runs the same self-gate applies with no user in the loop.
- `prefer_inline`: _(before dispatching ANY agent, exhaust the cheaper remedies first)_
  - summarize the finding inline and drop the raw output from working context
  - drop stale / no-longer-needed context rather than moving fresh work out
  - narrow the read (fewer files, tighter grep, targeted line ranges) so it never bloats
- `dispatch_only_when`: _(only after prefer_inline is exhausted AND at least one holds)_
  - `net_saving_offload`: the transient work is heavy enough that a subagent absorbing it (returning a capped report) saves more main-loop tokens across the remaining session than the subagent costs
  - `isolation_required`: parallel file mutation that would conflict inline (worktree)
  - `fresh_context_required`: a reproducibility / repo-blind exercise that must NOT see current context
  - `genuinely_bulk`: "more than 5 near-identical targets where clean capped output materially beats inline"
  - `heavy_verifier`: verifier Mode C / D
- `teams_effectively_never`: a multi-agent team (2+ full-context teammates) is the ~7x case — dispatch one ONLY when the task cannot be done any other way, with an explicit one-line justification. A team for speed or tidiness alone is NON-COMPLIANT.
- `justify`: every dispatch states in one line which dispatch_only_when case it clears and why inline is genuinely worse — a discipline the session applies to itself, recorded in its own reasoning, not a user-facing permission request
- `cheapest_model`: pick the cheapest model that fits (haiku for mechanical; sonnet only where judgment is the job) — model_fit still applies on top of the dispatch decision

## ledgers

- `injection`: decisions inject at question-time only (pre-ask hook); lessons inject open-only; terminated entries live on disk, not in context

## handoff_checkpoints

- `law`: a long or context-heavy session must not let its state die in an uncontrolled compaction. It checkpoints to `docs/handoffs/HANDOFF.md` — a small, forward-looking launchpad a FRESH session boots from — instead of carrying (or `--resume`-ing) accumulated bloat. Continuous work is a chain of bounded sessions stitched by handoffs, not one immortal session.
- `when`: on user command; "every so often" during long runs (per milestone / at a context-size nudge); and automatically before a forced stop — the PreCompact boundary (hooks/handoff-precompact.mjs nudges it), budget ceiling, or error spike.
- `pickup`: a new session opening in a repo with a handoff auto-surfaces it at SessionStart (hooks/handoff-pickup.mjs) and resumes from `## START HERE` — after verifying its claims against git; a stale handoff is refreshed, not trusted blindly.
- `boundary`: the handoff holds the forward map only (START HERE / Queue / In flight / Blockers / Done) — NOT history (git owns that) and NOT decisions (DECISIONS.yaml owns those, logged the same turn).
- `procedure`: the write-handoff skill owns HOW (shape, cadence, rules); this section is the law it complies with.

Last updated: 2026-07-26T00:00:00Z
```
