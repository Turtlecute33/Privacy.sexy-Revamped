import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('web-only distribution', () => {
  it('has no Electron dependencies, scripts, or distribution target', () => {
    const packageJson = JSON.parse(
      readFileSync(resolve('package.json'), 'utf-8'),
    ) as {
      scripts?: Record<string, string>;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const packageEntries = [
      ...Object.keys(packageJson.dependencies ?? {}),
      ...Object.keys(packageJson.devDependencies ?? {}),
      ...Object.keys(packageJson.scripts ?? {}),
    ];
    const distributionDirectories = JSON.parse(
      readFileSync(resolve('dist-dirs.json'), 'utf-8'),
    ) as Record<string, string>;

    expect(packageEntries.filter((entry) => entry.toLowerCase().includes('electron'))).toEqual([]);
    expect(distributionDirectories).toEqual({ web: 'dist-web' });
  });
});
