import type { StorybookConfig } from '@storybook/react-vite';

const basePath = process.env.STORYBOOK_BASE || '/';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: ['@storybook/addon-essentials'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  typescript: {
    reactDocgen: 'react-docgen-typescript',
  },
  viteFinal: async (config) => {
    config.base = basePath;
    return config;
  },
  managerHead: (head) => {
    if (basePath === '/') return head;
    return `${head}<base href="${basePath}">`;
  },
};

export default config;
