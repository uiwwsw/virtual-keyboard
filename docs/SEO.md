# Virtual Keyboard SEO and localization

Public origin: https://virtual-keyboard-uiwwsw.vercel.app. `/` is Korean, `/en/` English. Build output contains localized readable HTML, titles/descriptions, canonical and reciprocal language alternatives, SoftwareApplication JSON-LD, sitemap and robots.

Search intent: Virtual Keyboard, 버추얼 키보드, React 가상 키보드, Korean Hangul input, custom keypad, numeric/phone keyboard and React virtual keyboard. Product identity stays Virtual Keyboard; custom keyboards describe a capability.

Demo UI and keyboard accessibility/status labels support Korean and English through Provider.locale, independently of input mode. User input, Korean composition examples and configured custom key values are not machine-translated. The npm artifact is versioned separately from the demo deployment.

Run npm run check and verify both public languages and a keyboard interaction before release. Search engine registration/indexing status is tracked after deployment.

## Domain redirects

The previous demo domain `composed-input.vercel.app` permanently redirects to
`virtual-keyboard-uiwwsw.vercel.app`, preserving paths such as `/en/`.
When changing the primary origin, update canonical URLs, language alternatives,
structured data, robots, sitemap and package homepage together.
