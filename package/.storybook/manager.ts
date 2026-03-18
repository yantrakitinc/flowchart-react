import { addons } from '@storybook/manager-api';
import { create } from '@storybook/theming/create';

const theme = create({
  base: 'dark',
  brandTitle: 'FlowChart React - Storybook',
  brandUrl: 'https://yantrakit.com',
  brandTarget: '_self',
});

addons.setConfig({
  theme,
});
