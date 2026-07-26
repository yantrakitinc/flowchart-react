# VERIFIER_MODES

> Scope: THE full 15-mode verifier catalog — SINGLE OWNER. No other file carries the catalog. LOCK_FILES.md owns the
semantics of the core modes (A/B/C/D/E) and cites this file for the catalog. Also owns the final-push / about-to-merge
mode-selection prompt. Siblings: ISSUES.md, BRANCHES_AND_COMMITS.md, PULL_REQUESTS.md, REPO_GATE_INSTALLATION.md (the
hooks that invoke these modes). ---------- verifier mode catalog (15 modes — SINGLE OWNER) ----------

```meta
version: 1
last_updated: 2026-07-12T00:00:00Z
```

## verifier_modes

- `layers`:
  - `timestamp_ops`: letters A–F — read or write the `status:` / `last_validated:` fields on `__specs__/standards-compliance.yaml`
  - `heavy_proof`: named modes — actually execute code gates (typecheck, build, lint, unit, e2e)
  - `deep_ceremony`: named modes — unlock → Pristine + Compliance per feature → relock + checklist
- `lock_state_machine`: 'every `__specs__/standards-compliance.yaml` carries `status: locked | unlocked`; Mode A flips to unlocked at start, runs gates, flips back to locked with fresh last_validated on pass; interrupt mid-gates → stays unlocked (signal: slice not re-validated); Modes B / B.5 / D / F / F-Random refuse to validate any unlocked slice'
- `timestamp_modes`:
  - `mode_a`: { action: update, scope: one slice (this commit), gates: scoped Pristine + lock-shape (refuses to stamp on failure) }
  - `mode_b`: { action: validate, scope: HEAD only, read_only: true }
  - `mode_b5`: { action: validate, scope: uncommitted working tree (staged + unstaged), read_only: true }
  - `mode_c`: { action: update, scope: this branch (origin/main..HEAD), implementation: fans Mode A across every slice }
  - `mode_d`: { action: validate, scope: this branch (origin/main..HEAD), read_only: true }
  - `mode_e`: { action: update, scope: entire repo, implementation: fans Mode A across every slice }
  - `mode_f`: { action: validate, scope: entire repo, read_only: true }
  - `mode_f_random`: { action: validate, scope: random ~20% of repo, read_only: true }
- `heavy_proof_modes`:
  - `mode_pristine`: typecheck + build + lint + unit tests + e2e tests
  - `mode_compliance`: the 11-script compliance chain (specs/flows/manuals/lock-files/source-coverage/freshness/RULE 0 boundaries/UI gates)
  - `mode_pristine_and_compliance`: Pristine then Compliance — the pre-merge gate (manual, on-demand)
- `deep_ceremony_modes`:
  - `mode_verify_all`: feature-by-feature deep ceremony with checklist; hours-long; manual
  - `mode_verify_all_random`: same as verify-all on random ~20% feature subset
- `inspection_maintenance_modes`:
  - `mode_inspect`: read-only walk of every lock — status + last_validated + freshness; no execution
  - `mode_cleanup_orphans`: detect orphan lock files + dead catalog entries; report-only by default

## final_push_gate

- `owner`: PM agent (when present) OR developer-invoked directly
- `prompt`: "Last full verify was {N} ago. Pick: (B) HEAD stamp check; (D) branch stamp check; (Pristine+Compliance) full code gates; (Verify-All) deep ceremony."
- `modes`:
  - `B`: HEAD-only stamp check
  - `D`: branch (origin/main..HEAD) stamp check Pristine+Compliance: full code gates on every slice + 11-script compliance chain (no per-slice unlock/relock)
  - `Verify-All`: feature-by-feature deep ceremony (unlock → Pristine + Compliance → relock); hours-long
- `house_clean_trigger`:
  - `commits_since_last_verify_all`: 25
  - `days_since_last_verify_all`: 7
  - `behaviour`: prompt fires regardless of developer intent when either threshold is hit
- `exit_required`: 0 from the chosen mode
- `see`: AGENT_ARCHITECTURE.md _(full lifecycle spec)_

Last updated: 2026-07-12T00:00:00Z