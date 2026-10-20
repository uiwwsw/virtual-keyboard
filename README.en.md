# React Virtual Keyboard

[한국어](README.md) · [Live demo](https://virtual-keyboard-uiwwsw.vercel.app/en/) · [npm](https://www.npmjs.com/package/@uiwwsw/virtual-keyboard)

An accessible React on-screen keyboard with Korean Hangul composition, English input, numeric and phone keypads, custom layouts and input policies. Virtual Keyboard is the product name; custom keypads are one feature. Supports React 18 and 19.

## Installation

```sh
npm install @uiwwsw/virtual-keyboard
```

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
        mode="text"
        value={value}
        onValueChange={setValue}
        aria-label="Your message"
        maxLength={48}
      />
    </VirtualInputProvider>
  );
}
```

The `locale` option is available in the source update documented here; check the installed package version before using a newly added option. It changes keyboard labels, accessibility text and clipboard status messages, not user-entered text or the input language. Default: `ko`. `en` provides English labels.

## Input modes

| Mode         | Accepted input                                   |
| ------------ | ------------------------------------------------ |
| text         | Free text with Korean/English keyboard switching |
| hangul       | Korean composition                               |
| number       | Numeric input and decimal point                  |
| tel          | Digits and +, *, #                               |
| alpha        | English letters                                  |
| alphanumeric | English letters and digits                       |
| custom       | Your configured key layout and macro values      |

The same character policies apply to typing and pasting. Keyboard visibility can be auto, always or never. Themes can be light/dark or follow the system. Use value/onValueChange for string state, and provide an accessible input label. The input uses normal DOM, supports selection, editing, clipboard feedback and physical keys.

## Custom keys

```tsx
import type { KeypadLayout } from "@uiwwsw/virtual-keyboard";
const layout: KeypadLayout = [
  [
    { label: "Hello", value: "Hello! " },
    { label: "Thanks", value: "Thank you. " },
  ],
  [
    { value: "Backspace", type: "action" },
    { value: "Enter", type: "action" },
  ],
];
// Pass mode="custom" layout={layout} to VirtualInput.
```

## Development

Use a supported Node version from package.json. Run npm ci and npm run check; the demo build is demo-dist, the library build is dist. Follow workspace SSD rules when applicable. The Korean reference README covers the full API and migration notes; its code identifiers apply in either language.

MIT license. Use the GitHub issue tracker for bugs and feature requests.
