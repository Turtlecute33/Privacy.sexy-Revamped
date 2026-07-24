import { describe, expect, it } from 'vitest';
import { resolveRedirectUrl } from '@tests/checks/external-urls/StatusChecker/FetchFollow';

describe('FetchFollow', () => {
  describe('resolveRedirectUrl', () => {
    const scenarios = [
      {
        name: 'absolute URL',
        redirectLocation: 'https://redirected.example/final',
        currentUrl: 'https://origin.example/start',
        expected: 'https://redirected.example/final',
      },
      {
        name: 'root-relative URL',
        redirectLocation: '/final',
        currentUrl: 'https://origin.example/start',
        expected: 'https://origin.example/final',
      },
      {
        name: 'path-relative URL',
        redirectLocation: 'final',
        currentUrl: 'https://origin.example/path/start',
        expected: 'https://origin.example/path/final',
      },
    ];

    scenarios.forEach(({
      name, redirectLocation, currentUrl, expected,
    }) => {
      it(name, () => {
        const actual = resolveRedirectUrl(redirectLocation, currentUrl);

        expect(actual).to.equal(expected);
      });
    });
  });
});
