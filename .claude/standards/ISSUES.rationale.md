# ISSUES — detail

Why each rule in `ISSUES.md` exists. Without standardized issue conventions, changes become orphans nobody can find later, reviews fragment, and history rots. The rules below close specific recurring failure modes, not aesthetic preferences.

## Issues — every change ships under one

Branches without parent issues become orphan changes nobody can find later. The required `## Description / ## Acceptance criteria / ## Technical notes / ## Related issues` body sections force the author to articulate what's being done and how to know it's done. The reviewer reads the body before the diff and knows what to look for.

`type:` and `status:` labels are minimal. `type:` answers "what kind of work" (epic/story/bug/enhancement/docs/chore). `status:` answers "is it in flight, blocked, or done". Two labels at creation; `status:done` swapped BEFORE merge so the close-time state is correct.

The project-board membership rule (`projectItems` non-empty) exists because GitHub's `gh issue create --project <num>` flag can silently fail to attach the project link, leaving an orphan. The rule is: the issue creation isn't done until the project link is verified. A closed issue with empty projectItems is a defect; the sweep + nuke path applies.

## Standards checklist — why itemized and tickable

The `## Standards checklist` section exists so the developer and verifier check compliance off ONE BY ONE rather than asserting it wholesale. A single "standards: yes" line invites rubber-stamping; a per-standard item list makes each requirement individually falsifiable. The two-state resolution rule (`[x]` or explicit `N/A: <reason>`) exists because a bare unchecked box is ambiguous — it could mean "not done" or "not applicable" — and ambiguity at merge time is where gaps ship.

## Issue body compliance block

The compliance block in the issue body is short — 4 lines — and references LOCK_FILES.md instead of duplicating its content. The truth lives in the per-feature `standards-compliance.yaml`; the issue body just attests to its state at close-time. Keeping the block small means it's hard to forget and hard to backfill incorrectly.

## Audit

Periodic audits catch drift. An open issue stale for 3 weeks with a `status:in-progress` label is either abandoned or stuck — either way, attention needed.

Last updated: 2026-07-12T00:00:00Z
