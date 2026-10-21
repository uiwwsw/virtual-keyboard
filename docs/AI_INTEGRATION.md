# AI-friendly integration

Virtual Keyboard provides typed React APIs, runnable examples, and explicit behavior boundaries so developers and coding assistants can integrate it from the source rather than inventing API names. The README badge describes these project-maintained resources; it is not a third-party certification or a claim of better AI performance.

한국어: AI가 API를 추측하지 않고 실제 타입·예제·제약을 확인하며 연동할 수 있도록 정리한 안내입니다. AI-friendly 배지는 프로젝트 자체 설명이며 외부 인증이나 AI 성능 보장을 뜻하지 않습니다.

## Start with verified interfaces

- [Public exports](../src/index.ts): `VirtualInput`, `VirtualInputProvider`, their props and handle types, `InputMode`, `InputPolicy`, `Key`, and `KeypadLayout`.
- [Input props and ref methods](../src/components/Input.tsx): controlled/uncontrolled values, string callbacks, input policies, selection, and clipboard operations.
- [Provider props](../src/components/Provider.tsx): layout, keyboard visibility, theme, and UI locale.
- [Korean usage guide](../README.md) / [English usage guide](../README.en.md).
- [Type-checked consumer example](../scripts/consumer-check.tsx) and [package/SSR checks](../scripts/check-package.mjs).
- [Interactive Korean demo](https://virtual-keyboard-uiwwsw.vercel.app/) / [English demo](https://virtual-keyboard-uiwwsw.vercel.app/en/).

Use the installed package's declarations as the authority for that version. Repository `main` can contain options not yet published to npm.

## Minimal integration

```tsx
"use client";

import { useState } from "react";
import { VirtualInput, VirtualInputProvider } from "@uiwwsw/virtual-keyboard";

export default function Example() {
  const [value, setValue] = useState("");

  return (
    <VirtualInputProvider keyboardVisibility="always">
      <VirtualInput
        aria-label="Name"
        value={value}
        onValueChange={setValue}
        mode="text"
      />
    </VirtualInputProvider>
  );
}
```

## Integration boundaries

- Requires React and React DOM 18 or 19. Use a client component for interactive Next.js integration.
- Prefer `onValueChange` for string state. The compatibility `onChange` callback exposes a value; do not assume its target is a native input element.
- `number` and `tel` are character policies, not business validation. Validate amounts, decimal counts, and phone rules in the consuming app.
- Controlled `value` is application-owned. Input policies do not silently rewrite values supplied by the parent.
- Provide an accessible label. The native input handles browser selection; the on-screen keypad buttons live in Shadow DOM. Do not assume ordinary page selectors or CSS reach inside it.
- `keyboardVisibility="auto"` targets mobile/touch devices. Use `always` to demonstrate the keypad on desktop.
- Clipboard availability and permission depend on the browser. Handle `onClipboardError` instead of assuming a successful paste.
- This is an input library. Using it does not require XERJ, an AI model, an API key, or an external AI service.

## XERJ Corpus Hub

The maintainer has approved inclusion in the [XERJ Corpus Hub](https://hub.xerj.org/), which lets AI agents retrieve reference material from pinned open-source repositories. A public listing for this project has not yet been verified as of 2026-10-21, so no “listed”, “certified”, or official XERJ badge is claimed here. Inclusion is separate from this library's runtime dependencies and MIT license.

한국어: 관리자는 XERJ Corpus Hub 등록에 동의했습니다. 2026-10-21 기준 공개 등재는 아직 확인하지 못했으므로 등록 완료·공식 인증으로 표시하지 않습니다. 이 라이브러리를 사용하는 데 XERJ 설치는 필요하지 않습니다.

## Verification

From this repository, run `npm run check` for formatting, lint, unit tests, demo build, package build, SSR import/render checks, and consumer type checks. Follow the workspace's `devctl exec --` build-environment contract when working in the MOVV workspace. Source behavior and executable checks take precedence over generated suggestions.
