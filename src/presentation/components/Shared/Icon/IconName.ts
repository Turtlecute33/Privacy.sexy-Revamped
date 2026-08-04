export const IconNames = [
  'magnifying-glass',
  'copy',
  'circle-info',
  'tag',
  'github',
  'face-smile',
  'xmark',
  'left-right',
  'file-arrow-down',
  'lightbulb',
  'square-check',
  'triangle-exclamation',
] as const;

export type IconName = typeof IconNames[number];
