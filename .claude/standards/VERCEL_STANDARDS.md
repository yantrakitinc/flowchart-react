# VERCEL_STANDARDS

```meta
version: 1
last_updated: 2026-07-11T00:00:00Z
```

## scope

Vercel deployment policy — what triggers a deploy, what doesn't, what gets
preview/prod environments, and the surface settings every project must carry.

## hard_rules

- `H1_no_local_triggered_deploys`:
  - `rule`:
    NEVER trigger a Vercel deploy from local. The ONLY allowed path to a Vercel
    deploy is `git push` → merge to `main` on GitHub → GitHub webhook → Vercel.
  - `banned`:
    - "`vercel deploy` CLI invoked from a local terminal"
    - "`curl -X POST https://api.vercel.com/v13/deployments ...` from a local script"
    - "`curl <deploy-hook-url>` from a local script"
    - any script-side path that bypasses the GitHub webhook
  - `why`:
    Every deploy must trace back to a reviewable git commit on `main`. A
    local-triggered deploy bypasses PR review, branch protection, and CI gates —
    the deployed bits no longer match what's on `main`. Git is the source of
    truth for "what's deployed"; if it's not on `main`, it's not on Vercel.
  - `enforcement`:
    - When asked "deploy this" → respond "merge to main on GitHub; Vercel picks it up"
    - When asked "verify Vercel works" → verify webhook config + production branch + preview disabled; do NOT trigger a deploy to test
    - In provisioning scripts: provision the project + domain + DNS, then stop. Never call deploy.

- `H2_preview_deploys_off`:
  - `rule`:
    Every Vercel project must have **preview deployments disabled**. Only the
    production branch (`main`) ever produces a deploy. Branches, PRs, forks
    produce nothing.
  - `why`:
    Preview deploys consume build minutes, leak unfinished work to URLs that
    get indexed/cached, and create review surfaces that compete with the PR
    itself. The PR review happens in GitHub; the deploy review happens once
    it's on main.
  - `how_to_apply`:
    - `api_setting`:
      PATCH /v9/projects/<id> with body
      { "commandForIgnoringBuildStep": "[ \"$VERCEL_GIT_COMMIT_REF\" != \"main\" ]" }
      Semantics: exit 0 → skip build, exit non-zero → run build.
      On `main` the test evaluates `[ main != main ]` → exit 1 → BUILD.
      On any other ref → exit 0 → SKIP.
    - `verify_setting`:
      - GET /v9/projects/<id>
      - Confirm `commandForIgnoringBuildStep` matches above exactly
    - `audit_cadence`:
      Run the verify check on every existing project monthly or after any
      bulk-project op. Re-PATCH any drift.

- `H3_production_branch_is_main`:
  - `rule`: Every Vercel project's production branch must be `main`. Never `master`, never feature branches.
  - `why`: Aligns with BRANCHES_AND_COMMITS.md — `main` is the integration branch; `main` is what ships.

## provisioning_checklist

- `steps`: 1_create_project:
    - `api`: POST /v9/projects
    - `body_includes`:
      - name: <subdomain>
      - framework: nextjs (or appropriate)
      - rootDirectory: code/web (per ROOT_LAYOUT.md folder layout)
      - gitRepository: { type: github, repo: <org>/<repo> } 2_attach_domain:
    - `api`: POST /v10/projects/<id>/domains
    - `body`: { name: <subdomain> } 3_disable_preview_deploys:
    - `api`: PATCH /v9/projects/<id>
    - `body`: { commandForIgnoringBuildStep: "[ \"$VERCEL_GIT_COMMIT_REF\" != \"main\" ]" } 4_add_dns:
    - `cf_api`: POST CNAME <subdomain> -> cname.vercel-dns.com
    - `cf_api`: POST TXT _vercel.<parent-zone> = <verification-value-from-step-2> 5_DO_NOT:
    - trigger an initial deploy via API
    - call any deploy hook
    - run `vercel deploy`
    - let `gh repo create --push` indirectly trigger a deploy by pushing — wait until the first real `main` merge from a PR

## ecosystem_defaults

- `production_branch`: main
- `framework`: nextjs
- `root_directory`: code/web
- `command_for_ignoring_build_step`: '[ "$VERCEL_GIT_COMMIT_REF" != "main" ]'
- `git_fork_protection`: true
- `preview_deployments`: disabled
- `auto_assign_custom_domains`: true
- `comments_on_prs`: disabled _(see H2 — preview surface is dead anyway)_

## audit_query

- `description`:
  Surface every project's preview-deploy setting in a single sweep. Run after
  bulk ops or on suspicion of drift.
- `pattern`:
  For each yantrakitinc + 314picturesproductions Vercel project:
    curl -s -H "Authorization: Bearer $TOKEN" \
      "https://api.vercel.com/v9/projects/<id-or-name>" \
      | jq '{name, commandForIgnoringBuildStep, productionBranch: .link.productionBranch}'
  Expected: commandForIgnoringBuildStep matches H2, productionBranch == "main"

## related_memory

- feedback_never_trigger_vercel_deploy_from_local
- feedback_align_ecosystem_to_all_four_surfaces

Last updated: 2026-07-11T00:00:00Z