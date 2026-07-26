import { test, expect } from 'vitest';
import { formatAssertionMessage } from '@tests/shared/FormatAssertionMessage';
import { shuffle } from '@/application/Common/Shuffle';
import { indentText } from '@/application/Common/Text/IndentText';
import { loadApplicationComposite } from '@/application/Application/Loader/CompositeApplicationLoader';
import { type UrlStatus, formatUrlStatus } from './StatusChecker/UrlStatus';
import { getUrlStatusesInParallel, type BatchRequestOptions } from './StatusChecker/BatchStatusChecker';
import { TestExecutionDetailsLogger } from './TestExecutionDetailsLogger';
import { extractDocumentationUrls } from './DocumentationUrlExtractor';

const Logger = new TestExecutionDetailsLogger();

function main() {
  // arrange
  Logger.logTestSectionStartDelimiter();
  const app = loadApplicationComposite();
  let urls = extractDocumentationUrls({
    logger: Logger,
    urlExclusionPatterns: [
      // Drops HEAD/GET requests via fetch/curl, responding to Postman/Chromium.
      // Matches both domains the same archive serves under.
      /^https:\/\/archive\.(ph|today)/,
      /*
        Wayback Machine snapshots are immutable permalinks: they do not rot the way the live
        pages they preserve do, so failures here are rate limiting rather than broken docs.
        They also outnumber every other URL by an order of magnitude, and same-domain requests
        are serialized, which alone pushed the check past the CI job time limit.
      */
      /^https:\/\/web\.archive\.org/,
      // Serves a Cloudflare interactive challenge (`cf-mitigated: challenge`) to any
      // non-browser client, which no user agent or TLS impersonation can pass.
      /^https:\/\/www\.thewindowsclub\.com/,
      // Answers `403` to GitHub runners: the block tracks the datacenter address rather
      // than the request, so `forceHttpGetForUrlPatterns` cannot work around it. Every
      // cited answer responds `200` from a residential connection, over both HEAD and
      // GET, which makes a failure here a report on the runner, not a dead page.
      // The whole Stack Exchange network sits behind the same edge, so scoping this to
      // `stackoverflow.com` only moved the failure to the next cited site.
      /^https:\/\/(?:[a-z]+\.)?(?:stackoverflow|stackexchange|serverfault|superuser|askubuntu)\.com(?=[/?#]|$)/,
    ],
    application: app,
  });
  urls = filterUrlsToEnvironmentCheckLimit(urls);
  Logger.logLabeledInformation('URLs submitted for testing', urls.length.toString());
  const requestOptions: BatchRequestOptions = {
    domainOptions: {
      sameDomainParallelize: false, // be nice to our third-party servers
      sameDomainDelayInMs: 5 /* sec */ * 1000,
    },
    requestOptions: {
      retryExponentialBaseInMs: 3 /* sec */ * 1000,
      requestTimeoutInMs: 60 /* sec */ * 1000,
      additionalHeaders: { referer: app.projectDetails.homepage },
      randomizeTlsFingerprint: true,
      forceHttpGetForUrlPatterns: [
        // Reject HEAD with `403` but serve `200` for GET.
        /^https:\/\/apps\.microsoft\.com/,
        /^https:\/\/thehackernews\.com/,
      ],
    },
    followOptions: {
      followRedirects: true,
      enableCookies: true,
    },
  };
  Logger.logLabeledInformation('HTTP request options', JSON.stringify(requestOptions, null, 2));
  const testTimeoutInMs = urls.length * 60 /* seconds */ * 1000;
  Logger.logLabeledInformation('Scheduled test duration', convertMillisecondsToHumanReadableFormat(testTimeoutInMs));
  Logger.logTestSectionEndDelimiter();
  test(`all URLs (${urls.length}) should be alive`, {
    timeout: testTimeoutInMs,
  }, async () => {
    // act
    const results = await getUrlStatusesInParallel(urls, requestOptions);
    // assert
    const deadUrls = results.filter((r) => r.code === undefined || !isOkStatusCode(r.code));
    expect(deadUrls).to.have.lengthOf(
      0,
      formatAssertionMessage([createReportForDeadUrlStatuses(deadUrls)]),
    );
  });
}

function isOkStatusCode(statusCode: number): boolean {
  return statusCode >= 200 && statusCode < 300;
}

function createReportForDeadUrlStatuses(deadUrlStatuses: readonly UrlStatus[]): string {
  return `\n${deadUrlStatuses.map((status) => indentText(formatUrlStatus(status))).join('\n---\n')}\n`;
}

function filterUrlsToEnvironmentCheckLimit(originalUrls: string[]): string[] {
  const { RANDOMIZED_URL_CHECK_LIMIT } = process.env;
  Logger.logLabeledInformation('URL check limit', RANDOMIZED_URL_CHECK_LIMIT || 'Unlimited');
  if (RANDOMIZED_URL_CHECK_LIMIT !== undefined && RANDOMIZED_URL_CHECK_LIMIT !== '') {
    const maxUrlsInTest = parseInt(RANDOMIZED_URL_CHECK_LIMIT, 10);
    if (Number.isNaN(maxUrlsInTest)) {
      throw new Error(`Invalid URL limit: ${RANDOMIZED_URL_CHECK_LIMIT}`);
    }
    if (maxUrlsInTest < originalUrls.length) {
      return shuffle(originalUrls).slice(0, maxUrlsInTest);
    }
  }
  return originalUrls;
}

function convertMillisecondsToHumanReadableFormat(milliseconds: number): string {
  const timeParts: string[] = [];
  const addTimePart = (amount: number, label: string) => {
    if (amount === 0) {
      return;
    }
    timeParts.push(`${amount} ${label}`);
  };

  const hours = milliseconds / (1000 * 60 * 60);
  const absoluteHours = Math.floor(hours);
  addTimePart(absoluteHours, 'hours');

  const minutes = (hours - absoluteHours) * 60;
  const absoluteMinutes = Math.floor(minutes);
  addTimePart(absoluteMinutes, 'minutes');

  const seconds = (minutes - absoluteMinutes) * 60;
  const absoluteSeconds = Math.floor(seconds);
  addTimePart(absoluteSeconds, 'seconds');

  return timeParts.join(', ');
}

main();
