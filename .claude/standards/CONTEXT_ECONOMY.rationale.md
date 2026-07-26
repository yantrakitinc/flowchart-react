# CONTEXT_ECONOMY — why

## Why a hard injection budget

Every mechanism this weekend wanted a seat in session start — contract, catalog,
lessons, decisions, status. Unbudgeted, the injection grows monotonically until
the harness truncates it arbitrarily (a learned lesson: 12KB got clipped to 3
entries). A gated budget forces each addition to displace something or stay on
disk one read away.

## Why open-only / names-only

Terminated lessons and full scope texts are reference material, not working
memory. The pattern everywhere: pointers in context, content on disk.

## Why capped agent reports

The orchestrator's context is the scarcest resource in a campaign. An agent that
returns 40 disciplined lines costs nothing; one that returns its transcript
poisons the rest of the session.

## Why dispatch is aggressively discouraged, and why inline is the default

A subagent is not free. It spins up its own context window, and a multi-agent team
— several teammates each holding full context in plan mode — runs up to ~7x the
tokens of doing the work once. The "~7x" is specifically the team case; a single
offload agent is ~1x its own bounded context and frequently *net-saves* the main
loop, because the dirty tokens it absorbs would otherwise re-cost on every later
turn. That net-saving is real, and it is why offload exists — but it is a payoff to
earn, not a reflex to indulge. The failure mode is reaching for an agent when a
cheaper inline move would do: summarizing the finding and dropping the raw output,
discarding stale context, or narrowing the read so it never bloats in the first
place. Those come first; dispatch is what you do when inline can no longer keep the
loop lean, not the first tool off the shelf.

## Why the session self-adjudicates instead of asking

Sessions are sometimes told to run autonomously. A rule that made every dispatch
wait for the user's yes would break those runs and, worse, train a reflex of
deferring a judgment the session is perfectly able to make. So the cost test is a
discipline the session runs on *itself*: it decides whether a dispatch clears the
bar and proceeds, in autonomous and interactive runs alike, without a per-dispatch
permission prompt. The hard-cap variant — ask every time — was considered and
rejected for exactly this reason.

Last updated: 2026-07-25T15:22:50Z
