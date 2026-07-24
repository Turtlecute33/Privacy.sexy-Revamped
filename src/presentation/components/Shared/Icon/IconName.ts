export const IconNames = [
  'magnifying-glass',
  'copy',
  'circle-info',
  'tag',
  'github',
  'face-smile',
  'xmark',
  'battery-half',
  'battery-full',
  'folder',
  'folder-open',
  'left-right',
  'file-arrow-down',
  'lightbulb',
  'square-check',
  'triangle-exclamation',
  'rotate-left',
  'shield',
] as const;

export type IconName = typeof IconNames[number];
