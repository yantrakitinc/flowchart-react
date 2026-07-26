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