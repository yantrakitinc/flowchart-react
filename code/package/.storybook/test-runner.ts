import type { TestRunnerConfig } from '@storybook/test-runner';
import { getStoryContext, waitForPageReady } from '@storybook/test-runner';
import { checkA11y, injectAxe } from 'axe-playwright';

/**
 * Storybook test-runner config (ACCESSIBILITY.yaml.test_runner): injects
 * axe-core into every story's iframe and asserts zero violations after the
 * story has rendered. Ran headless via `pnpm test:stories`
 * (`test-storybook`); wired into `pnpm verify` via `verify:stories`.
 */
const config: TestRunnerConfig = {
  async preVisit(page) {
    await injectAxe(page);
  },
  async postVisit(page, context) {
    await waitForPageReady(page);
    const storyContext = await getStoryContext(page, context);
    if (storyContext.parameters?.a11y?.disable) return;

    await checkA11y(
      page,
      { include: [['#storybook-root']], exclude: [['.react-flow__attribution']] },
      {
        detailedReport: true,
        detailedReportOptions: { html: true },
        axeOptions: storyContext.parameters?.a11y?.options,
      },
    );
  },
};

export default config;
