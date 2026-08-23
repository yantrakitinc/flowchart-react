#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Writes src/Changelog.mdx from CHANGELOG.md at build time.
 *
 * The two used to be written by hand and they drifted to DIFFERENT wrong answers: CHANGELOG.md
 * stopped at 1.1.5, the story page stopped at 1.1.3, and npm was on 2.0.1. Nothing compared them,
 * because comparing two prose files is not something a build does. Generating one from the other
 * removes the possibility rather than policing it.
 *
 * CHANGELOG.md is the source. This file is generated and gitignored — edit the source.
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const SOURCE = resolve(ROOT, 'CHANGELOG.md');
const TARGET = resolve(ROOT, 'src/Changelog.mdx');

const raw = readFileSync(SOURCE, 'utf8');

// MDX parses `{` as an expression and `<` as a tag. Neither is intended in a changelog, and both
// fail the build rather than rendering, so they are escaped before they reach the compiler.
const body = raw
  .replace(/^#\s+Changelog\s*$/m, '')
  .replace(/\{/g, '&#123;')
  .replace(/</g, '&lt;')
  .trim();

writeFileSync(
  TARGET,
  `import { Meta } from '@storybook/blocks';\n\n` +
    `<Meta title="Getting Started/Changelog" />\n\n` +
    `{/* GENERATED from CHANGELOG.md by scripts/generate-changelog-mdx.mjs. Do not edit. */}\n\n` +
    `# Changelog\n\n${body}\n`,
);

const versions = (raw.match(/^## \[[^\]]+\]/gm) ?? []).length;
console.log(`Changelog.mdx generated from CHANGELOG.md — ${versions} versions.`);
