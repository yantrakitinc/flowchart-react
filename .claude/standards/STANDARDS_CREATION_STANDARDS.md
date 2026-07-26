# STANDARDS_CREATION_STANDARDS

> Governs: how to write a standard in `~/.claude/standards/` — the two-file Markdown shape, the machine-readable meta block, the `NAME#anchor` citation scheme, and what earns its own standard.

```meta
version: 2
enforced_by: scripts/verify-standards-meta.mjs
last_updated: 2026-07-26T03:13:32Z
```

## A standard is one discipline in two Markdown files

Every standard covers ONE discipline — never several bundled — and ships as exactly two files:

1. **`<NAME>.md`** — the rules. What an agent needs to APPLY and ENFORCE, in imperative Markdown. Self-sufficient; no rationale prose. This is the file agents load.
2. **`<NAME>.rationale.md`** — the why. The reason for every rule, edge cases, trade-offs, anti-patterns, worked examples. Loaded on demand.

Markdown, not YAML: an LLM parses clean sectioned Markdown reliably and authors it without the whitespace/colon/quote fragility YAML imposes. A standard that bundles multiple disciplines must be split — one discipline, one standard.

## `<NAME>.md` shape

- `# NAME` H1, then a one-line `> Governs: …` statement.
- Exactly one fenced ` ```meta ` block — the ONLY machine-parsed region. Required: `version` (int), `last_updated` (ISO-8601 UTC). Optional: `enforced_by` (gate path), plus any scalar a gate reads.
- `## <section>` headings, topic by topic. Rules as imperative bullets; tables for enums; conditional requirements stated inline. **Section headings ARE the citation anchors** — keep them stable and descriptive.
- Keep it lean: if a line could be removed without changing what the agent must do, remove it. Multi-line examples and rationale go in the rationale file.
- Final line: `Last updated: <iso-8601-utc>`.

## `<NAME>.rationale.md` shape

- One section per `<NAME>.md` section, explaining the why of that section — load-bearing rationale, not a restatement of the rule.
- Edge cases, trade-offs, anti-patterns, worked examples of correct AND incorrect usage.
- Final line: `Last updated: <iso-8601-utc>`.

## Citations — `NAME#section-anchor`

- Reference another standard's section as `NAME#section-anchor`, where the anchor is the kebab-case of a `##`/`###` heading in `NAME.md` (e.g. `FLOW_CONTRACT#journey-completeness`).
- Never a dotted key path. `verify-standards-meta.mjs` (check 6) validates every `NAME#anchor` resolves to a real heading, and every bare `NAME.md` reference exists.

## File-name convention

- Rules: `<NAME>.md`. Rationale: `<NAME>.rationale.md`. Base name `UPPER_SNAKE_CASE`.
- Location: `~/.claude/standards/`. Register both files in `INDEX.yaml` under the standard's key (`md:` + `rationale:`).
- No `-detail` kebab, no `_DETAIL`, no lowercase base names, no spaces.

## What earns its own standard

Three conditions, all required:

1. The rule set is a single coherent discipline (testing, gitflow, code style, agent operability, …). Not "miscellaneous things to remember."
2. It has at least one machine-enforceable element. Pure-prose social rules belong in `CLAUDE.md`.
3. It applies across projects, not just one. Project-specific conventions live in the project.

Fail any of the three → fold it into an existing standard or capture it as a memory / `CLAUDE.md` note.

## `last_updated` + versioning

- Every file carries `last_updated` (rules: in the `meta` block; rationale: as the final line). ISO-8601 UTC with trailing `Z`. Bump on every edit, even typos — it records "when did this file last reflect a deliberate decision."
- `version` (in the `meta` block) bumps only on a breaking change (a section renamed so a citation anchor breaks, a required field added/removed). Non-breaking additions don't bump. Git tracks history; the file itself does not.

## History-baked-in is banned

Standards read as declarative present tense, as if always this way. No OLD-vs-NEW comparisons, no "amendment vN", no dated parentheticals on rules, no migration narrative ("replaces the old X"). Past decisions live in commit messages. Enforced by `verify-no-history-baked-in.mjs`.

Last updated: 2026-07-26T03:13:32Z
