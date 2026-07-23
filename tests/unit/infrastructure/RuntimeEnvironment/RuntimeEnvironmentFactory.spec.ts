import { describe, it, expect } from 'vitest';
import {
  type BrowserRuntimeEnvironmentFactory,
  createBrowserRuntimeEnvironment,
} from '@/infrastructure/RuntimeEnvironment/RuntimeEnvironmentFactory';
import { RuntimeEnvironmentStub } from '@tests/unit/shared/Stubs/RuntimeEnvironmentStub';

describe('RuntimeEnvironmentFactory', () => {
  it('creates a browser environment with the provided window', () => {
    const expectedWindow = {} as Window;
    const expectedEnvironment = new RuntimeEnvironmentStub();
    let actualWindow: Window | undefined;
    const factory: BrowserRuntimeEnvironmentFactory = (providedWindow) => {
      actualWindow = providedWindow;
      return expectedEnvironment;
    };

    const actualEnvironment = createBrowserRuntimeEnvironment(expectedWindow, factory);

    expect(actualWindow).to.equal(expectedWindow);
    expect(actualEnvironment).to.equal(expectedEnvironment);
  });

  it('throws when the browser window is unavailable', () => {
    const act = () => createBrowserRuntimeEnvironment(undefined);

    expect(act).to.throw('Unsupported runtime environment: browser window is unavailable.');
  });
});
