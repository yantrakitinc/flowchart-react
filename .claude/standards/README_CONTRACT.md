# README_CONTRACT

> agent needs to APPLY and ENFORCE: the paired README.yaml (machine) + README.md (human) contract at repo root, including status semantics. ---------- root README — paired YAML (machine) + Markdown (human) ----------

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## readme_requirements

- `pattern`: paired-file (README.yaml + README.md) at project root — same idea as __specs__/spec.yaml + spec.md
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
    - `ui_screenshot_match_threshold`: int _(default 85. Score 0-100 from verify-ui-screenshots-match-designs.mjs; states below the threshold fail the gate. Tune per repo when the design source is photoshop-detailed (raise) vs sketch-level (lower).)_
    - `ui_screenshot_dev_server_url`: string _(default "http://localhost:3000". URL Puppeteer hits to navigate flows; manual playbook `start:` values resolve relative to this.)_
  - `enforced_by`: convention — consuming tools (github-project-agent, deploy scripts, e2e tests) surface malformed metadata at runtime
  - `status_semantics`:
    - `planning`:
      - `description`: pre-launch; Coming Soon page only; no production user-facing features yet
      - `exempts_from`:
        - "__specs__/ folders + standards-compliance.yaml requirements (no features to spec)"
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