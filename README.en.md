<div align="center">

<img src="https://raw.githubusercontent.com/uiwwsw/virtual-keyboard/main/public/keyboard.svg" alt="Virtual Keyboard logo" width="96" height="96">

<h1>React Virtual Keyboard</h1>

<p>On-screen keyboard component for React</p>

<p>
  <a href="https://www.npmjs.com/package/@uiwwsw/virtual-keyboard"><img alt="npm version" src="https://img.shields.io/npm/v/%40uiwwsw%2Fvirtual-keyboard?style=flat-square"></a>
  <a href="https://github.com/uiwwsw/virtual-keyboard/blob/main/LICENSE"><img alt="license" src="https://img.shields.io/npm/l/%40uiwwsw%2Fvirtual-keyboard?style=flat-square"></a>
  <a href="https://github.com/uiwwsw/virtual-keyboard/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/uiwwsw/virtual-keyboard/ci.yml?branch=main&label=CI&style=flat-square"></a>
  <a href="https://www.npmjs.com/package/@uiwwsw/virtual-keyboard"><img alt="react peer dependency" src="https://img.shields.io/npm/dependency-version/%40uiwwsw%2Fvirtual-keyboard/peer/react?style=flat-square"></a>
  <a href="https://www.npmjs.com/package/@uiwwsw/virtual-keyboard"><img alt="types" src="https://img.shields.io/npm/types/%40uiwwsw%2Fvirtual-keyboard?style=flat-square"></a>
  <a href="https://github.com/toss/es-hangul"><img alt="uses es-hangul" src="https://img.shields.io/badge/uses-es--hangul-blue?style=flat-square"></a>
</p>

<p>
  <a href="https://virtual-keyboard-uiwwsw.vercel.app/en/">Demo</a> ·
  <a href="https://www.npmjs.com/package/@uiwwsw/virtual-keyboard">npm</a> ·
  <a href="./CHANGELOG.md">Changelog</a> ·
  <a href="./README.md">한국어</a>
</p>

</div>

On-screen keyboard component for React. Hangul two-set composition is computed by [es-hangul](https://github.com/toss/es-hangul); this library implements editing state, keypads and the wiring to a real `<input>`.
It is a small package with a single maintainer and almost no users.

## What works now

- `VirtualInputProvider` and `VirtualInput`, plus the types `InputMode`, `InputPolicy`, `Key`, `KeypadLayout`
- Input modes: `text`, `hangul`, `number`, `tel`, `alpha`, `alphanumeric`, `custom`
- Korean two-set input with Korean/English switching
- QWERTY, number and phone keypads, symbol and edit screens
- Custom keypads from layout JSON, including multi-character macro keys
- `filterKey`, `sanitizeValue` and `maxLength` for typing and pasting
- A real `<input inputMode="none">`; the browser handles the caret and selection
- A keypad of `<button>` elements inside a Shadow DOM
- Per-input undo and redo (up to 100 entries); copy, cut and paste buttons
- Physical keyboard input, light and dark themes, keypad visibility (`auto`, `always`, `never`), Korean or English labels (`locale`)
- TypeScript types included, ESM package

## Not done / planned

- Not tested with VoiceOver or TalkBack. Only automated axe checks pass
- No `type="password"`, autofill or form submission through `name`
- Single-line input only. No multi-line field
- No Korean layouts other than two-set, such as Cheonjiin
- Does not replace the operating system IME
- `number` mode is a character filter. Decimal count, sign and range checks are left to the app
- Suppressing the system keyboard with `inputMode="none"` differs across browsers and devices
- Mobile detection is a heuristic. Set `keyboardVisibility` explicitly for fixed behavior
- No framework-agnostic core for non-React frameworks

## Where it stands

- Weekly npm downloads (last week, api.npmjs.org): this package 80, react-simple-keyboard 237,797, simple-keyboard 80,748, es-hangul 173,386. The gap is roughly 3,000 times.
- One maintainer. One GitHub contributor, 1 star, 0 forks, and no known production users.
- React only. simple-keyboard is a framework-agnostic JavaScript core that can be used from React, Angular and Vue.
- simple-keyboard has a separate `simple-keyboard-layouts` package with layouts for many languages, Korean included. This package has QWERTY, number, phone and custom layouts only.
- Hangul composition depends on es-hangul. It is not an algorithm written here.
- It fits when you need Korean two-set input in React on a real `<input>` and want the browser to keep the caret and selection. For other uses, simple-keyboard is the better choice.

## Installation

```sh
npm install @uiwwsw/virtual-keyboard
```

Requires React and React DOM 18 or 19.

## Usage

```tsx
"use client";
import { useState } from "react";
import { VirtualInput, VirtualInputProvider } from "@uiwwsw/virtual-keyboard";

export default function Example() {
  const [value, setValue] = useState("");
  return (
    <VirtualInputProvider locale="en" keyboardVisibility="always">
      <VirtualInput
        value={value}
        onValueChange={setValue}
        aria-label="Your message"
        maxLength={48}
      />
    </VirtualInputProvider>
  );
}
```

## Docs

- [Reference (modes, custom keys, architecture, development, built on)](https://github.com/uiwwsw/virtual-keyboard/blob/main/docs/REFERENCE.en.md)
- [Korean reference with the full API, accessibility, clipboard and migration notes](https://github.com/uiwwsw/virtual-keyboard/blob/main/docs/REFERENCE.md)
- [Changelog](https://github.com/uiwwsw/virtual-keyboard/blob/main/CHANGELOG.md)
- [Contributing](https://github.com/uiwwsw/virtual-keyboard/blob/main/CONTRIBUTING.md)
- [한국어 README](https://github.com/uiwwsw/virtual-keyboard/blob/main/README.md)

## License

[MIT](https://github.com/uiwwsw/virtual-keyboard/blob/main/LICENSE)
