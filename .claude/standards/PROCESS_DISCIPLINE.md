# PROCESS_DISCIPLINE

> ---------- scope discipline ----------

```meta
version: 1
last_updated: 2026-05-20T20:00:00Z
```

## scope

- `rule`: code ONLY what's asked
- `no_dead_code`: every symbol added in this slice MUST have a caller in this slice
- `no_anticipation`: forbidden to add code "for a future slice"; if unsure → surface and wait

## defects

- `rule`: surface defects, NEVER fix silently
- `on_real_defect_outside_scope`: 1: STOP 2: surface (a) the defect, (b) the trigger, (c) proposed fix, (d) "fix now or accept-and-flag?" 3: wait for the user's call
- `banned`:
  - `silent_fix`: scope violation
  - `silent_acceptance`: false confidence claim
- `categories`:
  - atomicity gap
  - TOCTOU race
  - unhandled error
  - missing constraint
  - partial-state failure mode
  - security hole

## order

- `rule`: foundational order — build dependencies BEFORE dependents (bottom-up)
- `examples`:
  - schema before service
  - service before action
  - action before UI
  - catalog / contract / scope before consumers
- `forbidden`: starting a surface layer while its foundation is unsettled
- `stub_exception`: upper-layer stub allowed ONLY when explicitly authorized; never unprompted

## db_hygiene

- `rule`: end-of-turn state matches start-of-turn state (or the agreed-upon target shape)
- `during_work_allowed`: migrations, seeds, data mutations as part of the task
- `banned`:
  - rogue rows left behind
  - half-applied migrations
  - test data leaked into the working DB
- `cleanup`: roll back what was run; remove what was inserted; restore to the agreed shape

## decisions

- `zero_executive_decisions`: true
- `rule`: never decide on the user's behalf
- `applies_to`:
  - tech / library / pattern / scope / approach / design choice
- `on_uncertainty`: ASK
- `on_exhausted_options`: ASK before deviating

## pushback

- `rule`: never agree by reflex; push back when wrong
- `treatment_of_user`: equal — not subordinate
- `banned`:
  - '"you''re right" without verification'
  - '"this will take too long" — take the scope as given'
- `required_when_disagreeing`: 1: state the disagreement 2: cite the specific rule or fact 3: propose an alternative 4: wait for the user's call

## pr_scope

- `rule`: one bug = one fix = one PR
- `also`: one feature = one slice = one PR (or one continuous-branch slice of a large feature)
- `banned`: bundling unrelated changes into a single PR

## refactor_to_testability

- `rule`: untestable code is a design smell, not a testing problem
- `on_hard_to_test`: 1: refactor — inject the hidden dependency (clock, fetch, rng, env, fs) as an interface 2: NEVER skip the test 3: NEVER mock the world around an unchanged function
- `see`: UNIT_COVERAGE.md for the full coverage rule

Last updated: 2026-05-20T20:00:00Z