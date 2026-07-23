// eslint-disable-next-line max-classes-per-file
import { describe, it, expect } from 'vitest';
import type { RuntimeEnvironment } from '@/infrastructure/RuntimeEnvironment/RuntimeEnvironment';
import { RuntimeEnvironmentStub } from '@tests/unit/shared/Stubs/RuntimeEnvironmentStub';
import { itIsSingletonFactory } from '@tests/unit/shared/TestCases/SingletonFactoryTests';
import { LoggerStub } from '@tests/unit/shared/Stubs/LoggerStub';
import {
  ClientLoggerFactory,
  type LoggerCreationFunction,
} from '@/presentation/components/Shared/Hooks/Log/ClientLoggerFactory';

describe('ClientLoggerFactory', () => {
  describe('Current', () => {
    itIsSingletonFactory({
      getter: () => ClientLoggerFactory.Current,
      expectedType: ClientLoggerFactory,
    });
  });

  [
    { isNonProduction: true, expectedFactory: 'console' },
    { isNonProduction: false, expectedFactory: 'noop' },
  ].forEach(({ isNonProduction, expectedFactory }) => {
    it(`uses ${expectedFactory} logger in browser environment`, () => {
      const expectedLogger = new LoggerStub();
      const factory = new TestableClientLoggerFactory(
        new RuntimeEnvironmentStub().withIsNonProduction(isNonProduction),
        expectedFactory === 'noop' ? () => expectedLogger : () => new LoggerStub(),
        expectedFactory === 'console' ? () => expectedLogger : () => new LoggerStub(),
      );

      expect(factory.logger).to.equal(expectedLogger);
    });
  });
});

class TestableClientLoggerFactory extends ClientLoggerFactory {
  public constructor(
    environment: RuntimeEnvironment,
    noopLoggerFactory: LoggerCreationFunction,
    consoleLoggerFactory: LoggerCreationFunction,
  ) {
    super(environment, noopLoggerFactory, consoleLoggerFactory);
  }
}
