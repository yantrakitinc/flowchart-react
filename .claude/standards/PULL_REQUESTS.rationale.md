# PULL_REQUESTS — detail

Why each rule in `PULL_REQUESTS.md` exists. Without a standardized PR contract, reviews fragment ("where does the test plan go?") and non-compliant work merges on vibes. The rules below close specific recurring failure modes, not aesthetic preferences.

## Pull request — agent-owned lifecycle

The agent owns the full per-issue lifecycle: gates green → `gh pr create` → local re-verify → checklist resolution → label flip → merge → issue close → branch cleanup. The trust contract is mechanical proof, not human review: the `## Standards gates` section carries verbatim green gate output as falsifiable evidence, so a non-compliant PR is mechanically impossible rather than a matter of discipline. `verify-pr-body-draft` refuses the PR body before creation the same way `verify-issue-body-draft` refuses issue bodies — one shape, two analogues.

## PR gate — no 100%, no PR

"Every PR body carries the mechanical + standards-verified gate output; if it is not 100%, no PR." A PR is not opened until the full pre-push chain is green, and the PR body embeds the verbatim final-line output of each gate as falsifiable proof. Paraphrase is banned because a paraphrased summary is exactly the surface where a red gate gets rounded up to green; a copy-pasted line either says EXIT 0 or it doesn't.

## `## Standards compliance` — why per-standard stamping

The section carries the literal "100% standards met" line plus EVERY standard registered in INDEX.yaml, each deliberately stamped `: 100%` or `: NOT REQUIRED (<reason>)`. A wholesale "standards: yes" invites rubber-stamping; a per-standard verdict list makes each standard individually falsifiable, and "NOT REQUIRED" with a reason distinguishes "deliberately out of scope" from "forgot to check". The block is generated (`generate-pr-standards-block.mjs`) from the green receipt, so it cannot exist without every gate having passed.

## Merge — autonomous after pristine + up-to-date

Once `pnpm verify` exits 0 and the branch is up to date with main, the developer merges. This is the trust contract: the gate is the proxy for review.

The compliant tag (`compliant/<sha>`) is emitted at merge per LOCK_FILES.md. It marks the last known 100%-compliant state, available as a revert anchor.

Branch deletion after merge (remote + local) cleans up the namespace. Leaving stale branches accumulates noise and tempts revival of dead work.

## Close issue — only at 100% compliance

An issue closes ONLY when:
- The feature is fully implemented.
- Its `standards-compliance.yaml` is `status: locked` + `verified: 100%`.
- The verifier's verbatim final-line output is available for the close-time GitHub comment.

Closing prematurely (because "we'll come back to fix it later") creates the lying-issue-tracker pattern. The user later asks "is feature X done?" and sees the issue closed, but the feature has known gaps. Two failure modes: hidden bugs (gaps weren't documented) or wasted review (gaps were known but the closer didn't surface).

Last updated: 2026-07-12T00:00:00Z
