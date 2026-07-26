# ENV_VARS — detail

Why each rule in `ENV_VARS.md` exists.

## Environment variables

Two files: `.env.example` (committed, keys only) + `.env.local` (gitignored, values for local dev).

Every variable in `.env.example` has a comment: what it's for + where to get the value. The comment is the difference between "developer reads the variable name and guesses" vs "developer reads the comment and provisions correctly."

The `NEXT_PUBLIC_` ban on server-only secrets is shared with GOOGLE_FIREBASE_STANDARDS — the prefix ships the variable to the browser bundle, exposing anything it labels.

The `printf '%s'` vs `echo` rule for host-provider CLIs catches the multi-line-value corruption problem. Service-account JSONs, RSA keys, multi-line API tokens — `echo` adds trailing newlines + may interpret escape sequences. `printf '%s'` preserves the input byte for byte.

Admin email lists are semicolon-separated + lowercase: semicolon because commas appear in email display names occasionally, lowercase because email comparison is case-insensitive in practice.

Last updated: 2026-07-12T00:00:00Z
