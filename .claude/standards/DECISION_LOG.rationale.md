# DECISION_LOG — why

## Why a file, not memory

Sessions forget rulings and re-ask the same questions. Memory is per-session and lossy;
a file is neither. The log is deliberately tiny (one line per ruling) so it can be
injected whole into context by the pre-ask hook — the session physically sees every
prior ruling at the exact moment it is about to ask.

## Why append-only

Editing history invites silent rewrites of what the user decided. A new ruling appends;
the newest entry for a topic wins. The full trail stays auditable.

## Why the hook fires on AskUserQuestion

That is the exact moment re-asking happens. Injecting the log there converts
"remember to check" (honor system, proven to fail) into "the answer is in front of
you" (mechanical). Asking a question the log already answers is then a visible
violation, not a memory lapse.

## Why no_silent_downscoping lives here

The same failure shape: the session substitutes its own judgment (safest subset,
least-destructive interpretation) for the user's actual words. The rule makes the
substitution itself the violation — uncertainty is surfaced as a question (after
consulting the log), never resolved by quietly doing less.

Last updated: 2026-07-12T00:00:00Z
