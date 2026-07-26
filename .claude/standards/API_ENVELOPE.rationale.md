# API_ENVELOPE — why

## Why one envelope for success AND error

Clients (human UI, native apps, AI agents) branch on ONE field. RFC 9457 was
considered and rejected: it standardizes only errors and switches the media
type to application/problem+json, so success and failure would have different
shapes — exactly the inconsistency this standard exists to kill. JSend's
status/data/code shape is the widely adopted minimal envelope that covers both.

## Why fail vs error

4xx (caller can fix it) and 5xx (caller cannot) demand different client
behavior; folding them into one "error" hides that. JSend draws the same line.

## Why a single respond() helper

Hand-assembled envelopes drift one endpoint at a time. One helper makes the
envelope a function of (status, data|code/message) — impossible to get wrong.

Last updated: 2026-07-12T00:00:00Z
