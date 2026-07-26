import { defineConfig } from 'tsup';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Inline React Flow's base stylesheet into our shipped styles.css so that importing
 * `@yantrakit/flowchart-react/styles` is enough (esbuild would otherwise leave the bare
 * `@import '@xyflow/react/dist/style.css'` unresolved for consumers).
 */
function inlineReactFlowCss() {
  const stylesPath = resolve('dist/styles.css');
  const rfCssPath = resolve('node_modules/@xyflow/react/dist/style.css');
  const importLine = /@import ["']@xyflow\/react\/dist\/style\.css["'];?/;
  const styles = readFileSync(stylesPath, 'utf8');
  if (!importLine.test(styles)) return;
  const rfCss = readFileSync(rfCssPath, 'utf8');
  writeFileSync(
    stylesPath,
    styles.replace(importLine, `/* --- @xyflow/react/dist/style.css (inlined) --- */\n${rfCss}`)
  );
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
  async onSuccess() {
    inlineReactFlowCss();
  },
});
