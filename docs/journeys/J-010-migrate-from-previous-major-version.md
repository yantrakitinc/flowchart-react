---
id: J-010
slug: migrate-from-previous-major-version
persona: >
  Developer maintaining an existing app that adopted the library over a year ago, now bumping
  a major version during a routine dependency-upgrade sprint.
intent: >
  Find and apply the breaking-change migration path for a major version bump (renamed imports,
  changed prop shapes, deprecated APIs) with minimal app rewrite.
trigger: >
  Dependabot/pnpm outdated flags a new major version; the developer wants confidence the
  upgrade won't silently break rendering in production.
steps:
  - Locate the migration/upgrade guide for the specific version jump, not just the changelog.
  - Read the list of breaking changes (renamed package/import, changed default behavior, removed props).
  - Update package installation and imports per the guide.
  - Update usages of any renamed/removed props or APIs in the app's own code.
  - Re-run the app and existing tests to confirm diagrams render and behave identically post-upgrade.
  - Check the changelog for new opt-in features relevant to the app once the mandatory migration is done.
success: >
  The app builds and renders correctly on the new major version with only the documented
  breaking-change edits applied, and no silent behavior regressions in existing diagrams.
failure_outcomes:
  - when: The migration guide doesn't cover a jump of more than one major version at once.
    explanation: The guide/README states migration must be done one major version at a time and names the intermediate version.
    alternative: Developer upgrades incrementally through each major version.
  - when: A renamed prop/import is missed and the app fails to compile.
    explanation: The TypeScript/build error names the missing/renamed symbol.
    alternative: Developer cross-checks the guide's rename table and fixes remaining call sites.
  - when: A previously-working diagram renders differently after upgrade due to a changed default
      (e.g. new default layout algorithm).
    explanation: >
      The changelog names the default-behavior change explicitly, so it's diagnosable rather
      than a silent regression.
    alternative: Developer opts back into the old behavior via a documented flag, or adopts the new default.
  - when: A new required peer dependency isn't installed.
    explanation: The runtime/build error names the missing peer dependency and required version range.
    alternative: Developer installs the peer dependency and retries.
provenance:
  domain: "diagram-as-code / flowchart component for web apps (developer-facing React library)"
  inspired_by:
    - "React Flow's dedicated per-version migration guides (reactflow.dev/learn/troubleshooting/migrate-to-v11, -v12)"
    - "The reactflow -> @xyflow/react package-rename precedent as an example of a breaking major-version change"
  not_derived_from_our_flows: true
maps_to_flows: []
---

# J-010: Migrate from a previous major version of the library
