# REQUIREMENTS_CONTRACT — why

## Why requirements lock before autonomy

Autonomous sessions are only safe when "what to build" is a settled fact, not a
moving guess. The lock (user-only) is the line: before it, the session's job is
to help FINALIZE requirements with the user; after it, the session's job is to
BUILD them and stop only at done or a genuinely user-only question.

## Why an assumption ledger

The failure mode is not big wrong decisions — it is dozens of tiny silent
assumptions that compound into months of wrong code. Writing each assumption
WITH its derivation, before code relies on it, makes them reviewable in
minutes. An assumption with no derivable citation is by definition a question
for the user — the ledger refuses to hold it.

## Why the stop conditions are exactly three

"All done", "user-only question", "assumption might contradict the contract".
Anything else — fatigue, uncertainty that IS derivable, wanting approval — is
not a reason to stop; asking anyway is the re-asking disease DECISION_LOG kills.

Last updated: 2026-07-12T00:00:00Z
