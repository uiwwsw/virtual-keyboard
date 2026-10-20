# Virtual Keyboard SEO and localization

Public origin: https://virtual-keyboard-uiwwsw.vercel.app. `/` is Korean, `/en/` English. Build output contains localized readable HTML, titles/descriptions, canonical and reciprocal language alternatives, SoftwareApplication JSON-LD, sitemap and robots.

Search intent: Virtual Keyboard, 버추얼 키보드, React 가상 키보드, Korean Hangul input, custom keypad, numeric/phone keyboard and React virtual keyboard. Product identity stays Virtual Keyboard; custom keyboards describe a capability.

Demo UI and keyboard accessibility/status labels support Korean and English through Provider.locale, independently of input mode. User input, Korean composition examples and configured custom key values are not machine-translated. The npm artifact is versioned separately from the demo deployment.

Run npm run check and verify both public languages and a keyboard interaction before release. Search engine registration/indexing status is tracked after deployment.

## 2026-10-20 production verification

Published Korean and English pages, sitemap and Google verification file return HTTP 200. Google Search Console ownership verification and sitemap submission completed. Naver ownership verification and sitemap submission completed on 2026-10-20 after the user completed the anti-bot CAPTCHA. Site-specific submission status must not be described as indexing completion.

Runtime source baseline: a08833e. GitHub description, homepage and relevant repository topics were updated.
Format, lint, 85 tests, demo/library builds, SSR package import and consumer type checks passed. English UI entered the Korean syllable 한 using the on-screen keys. Native package version remains 2.2.0; the new locale option is in repository/demo source, not yet a new npm release.

The final CI audit also exposed pre-existing vulnerable development-test dependencies. Vitest was moved to 5.0.5 (compatible with the existing Vite 7 / supported Node versions), and compatible transitive fixes were applied. The full check and audit passed with zero reported vulnerabilities. Built-in editing-key display labels are localized too; custom character key values stay unchanged.

## Domain migration — 2026-10-20

Public origin and package homepage moved to https://virtual-keyboard-uiwwsw.vercel.app/. Canonical, language alternatives, structured data, robots, sitemap and deployment health checks use the new origin. Naver issued new verification meta 48fc54f57a7a4a7d9a9ee979131bf3cd89f62859. Package 2.2.1 includes the current localized library source and updated README/homepage. Search-console completion is recorded after live verification. The previous Vercel hostname returned DEPLOYMENT_NOT_FOUND at migration start.
