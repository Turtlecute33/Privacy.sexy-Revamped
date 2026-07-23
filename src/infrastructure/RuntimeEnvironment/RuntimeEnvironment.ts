import { OperatingSystem } from '@/domain/OperatingSystem';

export interface RuntimeEnvironment {
  readonly os: OperatingSystem | undefined;
  readonly isNonProduction: boolean;
}
