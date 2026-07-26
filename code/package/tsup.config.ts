import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'tsup';

const here = dirname(fileURLToPath(import.meta.url));

/**
 * `src/styles.css` starts with `@import '@xyflow/react/dist/style.css';` so local dev
 * (Storybook, this repo) always has an up-to-date copy of React Flow's own stylesheet.
 * Published consumers, though, import `dist/styles.css` directly (no bundler CSS
 * `@import` resolution guaranteed) — so at build time we inline React Flow's actual
 * stylesheet in place of that `@import` line.
 */
function inlineReactFlowStyles(): void {
  const distCss = join(here, 'dist', 'styles.css');
  const built = readFileSync(distCss, 'utf8');
  const reactFlowCss = readFileSync(
    join(here, 'node_modules', '@xyflow', 'react', 'dist', 'style.css'),
    'utf8'
  );
  const inlined = built.replace(/@import\s+['"]@xyflow\/react\/dist\/style\.css['"];?/, reactFlowCss);
  writeFileSync(distCss, inlined);
}

export default defineConfig({
  entry: ['src/index.ts', 'src/styles.css'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  external: ['react', 'react-dom'],
  sourcemap: true,
  minify: false,
  splitting: false,
  treeshake: true,
  onSuccess: async () => {
    inlineReactFlowStyles();
  },
});
