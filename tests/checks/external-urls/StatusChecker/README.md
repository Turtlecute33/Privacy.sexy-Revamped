# status-checker

A CLI and SDK for checking the availability of external URLs.

🧐 Why?

- 🏃 **Fast**: Batch checks the statuses of URLs in parallel.
- 🤖 **Easy-to-Use**: Zero-touch startup with pre-configured settings for reliable results, yet customizable.
- 🤞 **Reliable**: Mimics real web browser behavior by following redirects and maintaining cookie storage.

🍭 Additional features

- 😇 **Rate Limiting**: Queues requests by domain to be polite.
- 🔁 **Retries**: Implements retry pattern with exponential back-off.
- ⌚ **Timeouts**: Configurable timeout for each request.
- 🎭️ **Impersonation**: Impersonate different browsers for each request.
  - **🌐 User-Agent Rotation**: Change user agents.
  - **🔑 TLS Handshakes**: Perform TLS and HTTP handshakes that are identical to that of a real browser.
- 🫙 **Cookie jar**: Preserve cookies during redirects to mimic real browser.

## CLI

Coming soon 🚧

## Programmatic usage

The SDK supports both Node.js and browser environments.

### `getUrlStatusesInParallel`

```js
// Simple example
const statuses = await getUrlStatusesInParallel([ 'https://privacy.sexy', /* ... */ ]);
if(statuses.all((r) => r.code === 200)) {
  console.log('All URLs are alive!');
} else {
  console.log('Dead URLs:', statuses.filter((r) => r.code !== 200).map((r) => r.url));
}

// Fastest configuration
const statuses = await getUrlStatusesInParallel([ 'https://privacy.sexy', /* ... */ ], {
  domainOptions: {
    sameDomainParallelize: false,
  }
});
```

#### Batch request options

- `domainOptions`:
  - **`sameDomainParallelize`**, (*boolean*), default: `false`
    - Determines if requests to the same domain will be parallelized.
    - Setting to `false` makes all requests parallel.
    - Setting to `true` queues requests for each unique domain while parallelizing across different domains.
    - Requests to different domains are always parallelized regardless of this option.
    - 💡 This helps to avoid `429 Too Many Requests` and be nice to websites
  - **`sameDomainDelayInMs`** (*number*), default: `3000` (3 seconds)
    - Sets the delay between requests to the same domain.
- `requestOptions` (*object*): See [request options](#request-options).
- `followOptions` (*object*): See [follow options](#follow-options).

### `getUrlStatus`

Check the availability of a single URL.

```js
// Simple example
const status = await getUrlStatus('https://privacy.sexy');
console.log(`Status code: ${status.code}`);
```

#### Request options

- **`retryExponentialBaseInMs`** (*number*), default: `5000` (5 seconds)
  - Base time for the exponential back-off calculation for retries.
  - The longer the base time, the greater the intervals between retries.
- **`additionalHeaders`** (*object*), default: `false`
  - Additional HTTP headers to send along with the default headers. Overrides default headers if specified.
- **`requestTimeoutInMs`**  (*number*), default: `60000` (60 seconds)
  - Time limit to abort the request if no response is received within the specified time frame.
- **`forceHttpGetForUrlPatterns`** (*array*), default: `[]`
  - Specifies URL patterns that should always use an HTTP GET request instead of the default HTTP HEAD.
  - This is useful for websites that do not respond to HEAD requests, such as those behind certain CDN or web application firewalls.
  - Provide patterns as regular expressions (`RegExp`), allowing them to match any part of a URL.
  - Examples:
    - To match any URL starting with `https://example.com/api`: `/^https:\/\/example\.com\/api/`
    - To match any domain ending with `cloudflare.com`: `/^https:\/\/.*\.cloudflare\.com\//`

### `fetchFollow`

Follows `3XX` redirects while preserving cookies.

Same fetch API except third parameter that specifies [follow options](#follow-options), `redirect: 'follow' | 'manual' | 'error'` is discarded in favor of the third parameter.

```js
const status = await fetchFollow('https://privacy.sexy', 1000 /* timeout in milliseconds */);
console.log(`Status code: ${status.code}`); 
```

#### Follow options

- **`followRedirects`** (*boolean*), default: `true`
  - Determines whether or not to follow redirects with `3XX` response codes.
- **`maximumRedirectFollowDepth`** (*boolean*), default: `20`
  - Specifies the maximum number of sequential redirects that the function will follow.
  - 💡 Helps to solve maximum redirect reached errors.
- **`enableCookies`** (*boolean*), default: `true`
  - Enables cookie storage to facilitate seamless navigation through login or other authentication challenges.
  - 💡 Helps to over-come sign-in challenges with callbacks.
