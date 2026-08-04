# Security Policy

Security is a top priority at privacy.sexy.
Please report any discovered vulnerabilities responsibly.

## Reporting a Vulnerability

Efforts to responsibly disclose findings are greatly appreciated. To report a security vulnerability, follow these steps:

- For general vulnerabilities, [open an issue](https://github.com/Turtlecute33/Privacy.sexy-Revamped/issues/new/choose) using the bug report template.
- For sensitive matters, [contact Turtlecute](https://github.com/Turtlecute33) without posting details publicly.

## Security Report Handling

Upon receiving a security report, the process involves:

- Confirming the report and identifying affected components.
- Assessing the impact and severity of the issue.
- Fixing the vulnerability and planning a release to address it.
- Keeping the reporter informed about progress.

## Security Practices

### Application Security

privacy.sexy adopts a defense in depth strategy to protect users on multiple layers:

- **Link Protection:**
  privacy.sexy ensures each external link has special attributes for your privacy and security.
  These attributes block the new site from accessing the privacy.sexy page, increasing your online safety and privacy.
- **Content Security Policies (CSP):**
  privacy.sexy actively follows security guidelines from the Open Web Application Security Project (OWASP) at strictest level.
  This approach protects against attacks like Cross Site Scripting (XSS) and data injection.
- **Client-side only processing:**
  This is a static site with no backend. Your selections and the scripts generated from them never leave your
  browser: the script text is assembled locally and saved through a normal browser download.
- **No script execution:**
  The application only generates script files; it never runs them and never requests elevated privileges.
  You review the generated script and choose to run it yourself, which keeps the decision and the audit trail with you.
- **Minimal third-party surface:**
  The only network request beyond the site's own static assets is to a self-hosted
  [Umami](https://umami.is) instance for anonymous, cookie-free page counts. No third-party
  advertising, tracking, or CDN scripts are loaded.

### Update Security and Integrity

privacy.sexy benefits from automated update processes including security tests. Every commit merged to
`master` is built and deployed straight from source, so the served site always mirrors the published
source code with no manual step in between. This aligns the deployed application with the expected source
code, enhancing transparency and trust. For more details, see [CI/CD Documentation](./docs/ci-cd.md).

### Testing

privacy.sexy's testing approach includes a mix of automated and community-driven tests.
Details on testing practices are available in the [Testing Documentation](./docs/tests.md).

## Support

For help or any questions, [submit a GitHub issue](https://github.com/Turtlecute33/Privacy.sexy-Revamped/issues/new/choose). Addressing security concerns is a priority, and we ensure the necessary support.

---

Active contribution to the safety and security of privacy.sexy is thanked. This collaborative effort keeps the project resilient and trustworthy for all.
