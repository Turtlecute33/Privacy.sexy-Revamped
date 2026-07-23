import { describe, it, expect } from 'vitest';
import { CurrentEnvironment } from '@/infrastructure/RuntimeEnvironment/RuntimeEnvironmentFactory';

describe('RuntimeEnvironmentFactory', () => {
  it('identifies test builds as non-production browser environments', () => {
    expect(CurrentEnvironment.isNonProduction).to.equal(true);
    expect(CurrentEnvironment.os).not.to.equal(null);
  });
});
