import { sleep } from '@/infrastructure/Threading/AsyncSleep';
import { indentText } from '@/application/Common/Text/IndentText';
import { type UrlStatus, formatUrlStatus } from './UrlStatus';

const DefaultBaseRetryIntervalInMs = 5 /* sec */ * 1000;

export async function retryWithExponentialBackOff(
  action: () => Promise<UrlStatus>,
  baseRetryIntervalInMs: number = DefaultBaseRetryIntervalInMs,
  currentRetry = 1,
): Promise<UrlStatus> {
  const maxTries = 3;
  const status = await action();
  if (shouldRetry(status)) {
    if (currentRetry <= maxTries) {
      const exponentialBackOffInMs = getRetryTimeoutInMs(currentRetry, baseRetryIntervalInMs);
      console.log([
        `Attempt ${currentRetry}: Retrying in ${exponentialBackOffInMs / 1000} seconds.`,
        'Details:',
        indentText(formatUrlStatus(status)),
      ].join('\n'));
      await sleep(exponentialBackOffInMs);
      return retryWithExponentialBackOff(action, baseRetryIntervalInMs, currentRetry + 1);
    }
    /*
      Logged, not warned: the check itself decides whether this status means a dead page, and a
      warning failed the run on its own even for statuses it reports without failing.
    */
    console.log('💀 All retry attempts failed. Final failure to retrieve URL:', indentText(formatUrlStatus(status)));
  }
  return status;
}

function shouldRetry(status: UrlStatus): boolean {
  if (status.error) {
    return true;
  }
  if (status.code === undefined) {
    return true;
  }
  return isTransientError(status.code)
    || status.code === 429; // Too Many Requests
}

function isTransientError(statusCode: number): boolean {
  // `501 Not Implemented` is a server's fixed answer to a request it will not serve, so retrying it
  // only delays the result.
  return statusCode >= 500 && statusCode <= 599 && statusCode !== 501;
}

function getRetryTimeoutInMs(
  currentRetry: number,
  baseRetryIntervalInMs: number = DefaultBaseRetryIntervalInMs,
): number {
  const retryRandomFactor = 0.5; // Retry intervals are between 50% and 150%
  // of the exponentially increasing base amount
  const minRandom = 1 - retryRandomFactor;
  const maxRandom = 1 + retryRandomFactor;
  const randomization = (Math.random() * (maxRandom - minRandom)) + maxRandom;
  const exponential = 2 ** (currentRetry - 1);
  return Math.ceil(exponential * baseRetryIntervalInMs * randomization);
}
