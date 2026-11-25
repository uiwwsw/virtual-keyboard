# Reference

Detail moved out of the [README](https://github.com/uiwwsw/virtual-keyboard/blob/main/README.en.md). Content is unchanged.

## Usage notes

The `locale` option changes keyboard labels, accessibility text and clipboard status messages, not user-entered text or the input language. Default: `ko`. `en` provides English labels.

## Built on

- [es-hangul](https://github.com/toss/es-hangul) (Toss, MIT): source of the Hangul composition and decomposition functions. A required dependency of this package.
- [React](https://react.dev/): rendering and `createPortal`. A peer dependency, not bundled.
- Browser standards: the [inputmode attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/inputmode), [Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM), [Intl.Segmenter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Segmenter) and the [Visual Viewport API](https://developer.mozilla.org/en-US/docs/Web/API/Visual_Viewport_API)
- The Hangul syllable block is defined in section 3.12 of the [Unicode Standard](https://www.unicode.org/versions/latest/) and the [Hangul Syllables chart](https://www.unicode.org/charts/PDF/UAC00.pdf).
- Similar libraries: [simple-keyboard](https://github.com/hodgef/simple-keyboard) and [react-simple-keyboard](https://github.com/hodgef/react-simple-keyboard) (MIT) are general-purpose on-screen keyboards with swappable layouts. This package uses none of their code. They are broader and have a larger layout ecosystem; this package narrows its scope to Hangul composition and syncing with a real `<input>` selection. Check their documentation for how they handle Hangul.
- Similar libraries: [Hangul.js](https://github.com/e-/Hangul.js) (MIT) is a Hangul composition and decomposition library covering the same area as es-hangul. Not used here.

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

## Architecture

### Source modules

`src/index.ts` exports `VirtualInput`, `VirtualInputProvider` and their types (`InputMode`, `InputPolicy`, `Key`, `KeypadLayout`, and others). Every other module is internal.

| Path                               | Role                                                                                                                                                                           |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `components/Provider.tsx`          | Tracks the one focused input and holds Shift, Hangul/English, selection mode, theme and visibility. Portals the keypad into `document.body` and reserves space for its height. |
| `components/Context.tsx`           | React context and types shared by the provider, inputs and keypad.                                                                                                             |
| `components/Input.tsx`             | Wraps `<input inputMode="none">`. Connects keypad keys, physical keys, native IME, selection, clipboard and undo to the editing engine.                                        |
| `components/Keypad.tsx`            | The on-screen keypad. Renders layout JSON as `<button>` elements and handles Shift, symbols and edit screens, the top toolbar and clipboard status text.                       |
| `components/ShadowWrapper.tsx`     | Attaches a shadow root to a host element and portals `<style>` and children into it, so keypad CSS stays separate from the page.                                               |
| `hooks/usePress.ts`                | Runs a key on release, ignores presses that leave the key or are cancelled, and repeats delete and arrow keys while held.                                                      |
| `hooks/useStorage.ts`              | Persists the Hangul/English preference in `localStorage`. Keeps in-memory state when storage is blocked and syncs changes within and across tabs.                              |
| `hooks/useVisualViewport.ts`       | Reads size, scale and offset from `window.visualViewport` so the keypad sits at the bottom of the visible area; falls back to window size.                                     |
| `hooks/useSystemTheme.ts`          | Reads `prefers-color-scheme` for the theme used when `theme` is omitted.                                                                                                       |
| `utils/editing.ts`                 | DOM-independent editing state (`value`, `caret`, `anchor`, `composing`): insert, delete, move. Hangul composition calls into es-hangul.                                        |
| `utils/nativeEditing.ts`           | Finds the range a browser changed in the input value and applies the input policy and length limit to it. Used when a native IME finishes composing and for default paste.     |
| `utils/history.ts`                 | Per-input undo/redo history (up to 100 entries). One Hangul composition run is one step.                                                                                       |
| `utils/inputPolicy.ts`             | Per-mode default layout, key filter and sanitizer, plus the forced language per mode (`hangul` is Korean; `alpha`, `number` and similar are English).                          |
| `utils/keyboard.ts`                | Turns a key definition into the character to insert. In Korean mode, Latin keys map to two-set jamo through es-hangul's `convertQwertyToHangul`.                               |
| `utils/parseKeyInput.ts`           | Interprets physical key events under the same rules. Distinguishes keys that already arrive as Hangul (for example from the macOS IME) and Ctrl/Cmd combinations.              |
| `utils/isHangul.ts`                | Regex test for Hangul jamo and syllable ranges (`U+1100-11FF`, `U+3130-318F`, `U+AC00-D7AF`).                                                                                  |
| `utils/isMobileAgent.ts`           | Decides what "mobile" means for `keyboardVisibility="auto"` from the user agent, touch points and `(pointer: coarse)`. It is a heuristic and can be wrong.                     |
| `types/`                           | `InputPolicy`, `InputMode`, `Key`, `KeypadLayout`, `Viewport` types.                                                                                                           |
| `assets/*.json`                    | Key arrays for QWERTY, number pad, phone pad, symbols and the edit screen.                                                                                                     |
| `uiLanguage.ts`, `uiMessages.json` | Korean-to-English dictionary for keypad labels and status text. Korean is the default; `locale="en"` translates. Typed characters are never translated.                        |
| `App.tsx`, `App.css`, `main.tsx`   | The demo site. Not part of the package (`files` lists only `dist`).                                                                                                            |
| `*.test.ts(x)`, `test/setup.ts`    | Vitest unit and component tests. Browser behavior is covered by Playwright specs in `e2e/`.                                                                                    |

### Dependencies

| Package                       | Kind       | Purpose                                                                                                                                                                                     |
| ----------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `react`, `react-dom` (18, 19) | peer       | Rendering and `createPortal`. Not bundled.                                                                                                                                                  |
| `es-hangul`                   | dependency | `assemble` (join jamo into syllables), `removeLastCharacter` (remove the last jamo) and `convertQwertyToHangul` (Latin key to two-set jamo). Not bundled; installed alongside this package. |

No other npm package is used at runtime. Development tools are Vite, TypeScript, ESLint, Prettier, Vitest, Testing Library, jsdom, Playwright and `@axe-core/playwright`. Browser APIs in use: `Intl.Segmenter` (grapheme and word boundaries), Shadow DOM, `inputMode`, Pointer Events, `ResizeObserver`, Visual Viewport, Clipboard API, `localStorage` and `matchMedia`.

### What is written here and what is borrowed

Written in this repository: editing state handling (selection replacement, emoji and combining-mark boundaries, deletion rules during composition, rejecting edits that exceed the length limit), undo history, extraction of the range changed by the browser, input policies, release-to-activate key handling, the provider's focus and visibility logic, and the keypad UI and layout data.

The Hangul composition algorithm is not implemented here. Joining and splitting jamo is done by `es-hangul`. This repository decides when to call it (whether a composition is in progress and whether the previous character is Hangul) and ties the result to caret, selection and undo. The two-set (dubeolsik) key arrangement and the Hangul syllable composition rules are standards.

## Development

Use a supported Node version from package.json. Run npm ci and npm run check; the demo build is demo-dist, the library build is dist. Follow workspace SSD rules when applicable. The [Korean reference](https://github.com/uiwwsw/virtual-keyboard/blob/main/docs/REFERENCE.md) covers the full API and migration notes; its code identifiers apply in either language.
