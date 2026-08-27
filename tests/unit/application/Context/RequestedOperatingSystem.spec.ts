import { describe, it, expect } from 'vitest';
import { OperatingSystem } from '@/domain/OperatingSystem';
import { readRequestedOperatingSystem } from '@/application/Context/RequestedOperatingSystem';

describe('RequestedOperatingSystem', () => {
  describe('readRequestedOperatingSystem', () => {
    describe('reads the operating system the static catalog pages link to', () => {
      const testScenarios: readonly {
        readonly description: string;
        readonly search: string;
        readonly expected: OperatingSystem;
      }[] = [
        { description: 'windows', search: '?os=windows', expected: OperatingSystem.Windows },
        { description: 'macos', search: '?os=macos', expected: OperatingSystem.macOS },
        { description: 'linux', search: '?os=linux', expected: OperatingSystem.Linux },
        { description: 'uppercase slug', search: '?os=Windows', expected: OperatingSystem.Windows },
        { description: 'mixed case slug', search: '?os=macOS', expected: OperatingSystem.macOS },
        {
          description: 'alongside other parameters',
          search: '?utm_source=github&os=linux',
          expected: OperatingSystem.Linux,
        },
      ];
      testScenarios.forEach(({ description, search, expected }) => {
        it(description, () => {
          // act
          const actual = readRequestedOperatingSystem(search);
          // assert
          expect(actual).to.equal(expected);
        });
      });
    });
    describe('falls back to detection', () => {
      const testScenarios: readonly {
        readonly description: string;
        readonly search: string | undefined;
      }[] = [
        { description: 'no query string', search: undefined },
        { description: 'empty query string', search: '' },
        { description: 'unrelated parameters only', search: '?ref=hn' },
        { description: 'empty value', search: '?os=' },
        { description: 'unsupported operating system', search: '?os=android' },
        { description: 'operating system without a collection', search: '?os=freebsd' },
        { description: 'nonsense value', search: '?os=%20%20' },
        /*
         * `Object.prototype` keys must not resolve through the slug lookup. Without a
         * null-prototype or own-property guard, `?os=constructor` would return a function.
         */
        { description: 'prototype key as value', search: '?os=constructor' },
        { description: 'prototype method as value', search: '?os=toString' },
      ];
      testScenarios.forEach(({ description, search }) => {
        it(description, () => {
          // act
          const actual = readRequestedOperatingSystem(search);
          // assert
          expect(actual).to.equal(undefined);
        });
      });
    });
  });
});
