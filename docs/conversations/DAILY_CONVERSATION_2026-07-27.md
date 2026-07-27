# 2026-07-27

## Publish v2.0.0 + npm packaging fixes

Published `@yantrakit/flowchart-react@2.0.0` to npm (interactive browser-auth publish by the
maintainer; 2FA-bypass tokens are being deprecated by npm, so a Keychain-token setup was
attempted then reverted in favour of plain `npm login`).

Follow-up fix (issue #6): the npm page showed no README and the `homepage` pointed at GitHub.
Cause — the package is published from `code/package/` but the README lived at the repo root, and
`package.json.homepage` was never retargeted. Added `code/package/README.md` (consumer-facing),
set `homepage` to `https://yantrakit.com/flowchart-react`, bumped to `2.0.1`. Docs/metadata only;
full `pnpm verify` green, shipped via `fix/0006-npm-readme-homepage`.
