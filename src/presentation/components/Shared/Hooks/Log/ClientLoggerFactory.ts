import type { RuntimeEnvironment } from '@/infrastructure/RuntimeEnvironment/RuntimeEnvironment';
import { ConsoleLogger } from '@/infrastructure/Log/ConsoleLogger';
import type { Logger } from '@/application/Common/Log/Logger';
import { NoopLogger } from '@/infrastructure/Log/NoopLogger';
import { CurrentEnvironment } from '@/infrastructure/RuntimeEnvironment/RuntimeEnvironmentFactory';
import type { LoggerFactory } from './LoggerFactory';

export class ClientLoggerFactory implements LoggerFactory {
  public static readonly Current: LoggerFactory = new ClientLoggerFactory();

  public readonly logger: Logger;

  protected constructor(
    environment: RuntimeEnvironment = CurrentEnvironment,
    noopLoggerFactory: LoggerCreationFunction = () => new NoopLogger(),
    consoleLoggerFactory: LoggerCreationFunction = () => new ConsoleLogger(),
  ) {
    if (environment.isNonProduction) {
      this.logger = consoleLoggerFactory();
      return;
    }
    this.logger = noopLoggerFactory();
  }
}

export type LoggerCreationFunction = () => Logger;
