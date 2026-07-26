import remarkLintNoDeadUrls from 'remark-lint-no-dead-urls';

/** @type {import('remark-lint-no-dead-urls').Options} */
const PluginOptions = {
  skipUrlPatterns: [
    // These result in false negatives
    'archive.ph',
    'scoop.sh',
    'localhost',
    'web.archive.org',
    // Answers `429` to GitHub runners, whose shared addresses exhaust the anonymous rate limit
    // before the check runs. `dead-or-alive` never retries a 4xx, so `maxRetries` cannot absorb
    // it, and a failure here reports the runner's address rather than a dead article.
    'en.wikipedia.org',
  ].map(buildUrlPattern),
};

/** @type {import('unified-engine').Preset} */
export default {
  plugins: [[remarkLintNoDeadUrls, PluginOptions]],
};

function buildUrlPattern(fqdn) {
  const escaped = fqdn.replace(/\./g, '\\.');
  // Matches http(s)://<domain>[:port]/<path>
  return `^https?://${escaped}(?::\\d+)?/.*$`;
}
