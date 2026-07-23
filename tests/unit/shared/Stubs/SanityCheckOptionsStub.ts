import type { SanityCheckOptions } from '@/infrastructure/RuntimeSanity/Common/SanityCheckOptions';

export class SanityCheckOptionsStub implements SanityCheckOptions {
  public validateEnvironmentVariables = false;

  public withvalidateEnvironmentVariables(value: boolean): this {
    this.validateEnvironmentVariables = value;
    return this;
  }
}
