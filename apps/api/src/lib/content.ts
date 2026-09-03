import type { Prisma } from '@prisma/client';

export const EMPTY_DOC_BLOCKS: Prisma.InputJsonValue = [
  { type: 'paragraph', props: {}, content: [] },
];

export const EMPTY_WHITEBOARD_SCENE: Prisma.InputJsonValue = {
  elements: [],
  appState: {},
  files: {},
};
