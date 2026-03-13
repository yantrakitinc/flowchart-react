import type { Preview } from '@storybook/react';
import '../src/styles.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#09090b' },
        { name: 'light', value: '#fafafa' },
      ],
    },
    layout: 'fullscreen',
    options: {
      storySort: {
        order: ['Getting Started', ['Usage', 'Changelog'], 'Components'],
      },
    },
  },
};

export default preview;
