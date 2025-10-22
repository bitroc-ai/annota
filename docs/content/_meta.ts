import type { Meta } from 'nextra';

export default {
  index: {
    type: 'page',
    display: 'hidden',
  },
  docs: {
    title: 'Documentation',
    type: 'page',
  },
  api: {
    title: 'API Reference',
    type: 'page',
  },
  github: {
    title: 'GitHub',
    href: 'https://github.com/bitroc-ai/annota',
  },
} satisfies Meta;
