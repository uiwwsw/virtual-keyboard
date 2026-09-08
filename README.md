# Virtual Keyboard

한글 조합과 커스텀 키패드를 지원하는 React 가상 키보드입니다. 입력란은 `input`이나 `contentEditable` 대신 `div role="textbox"`를 사용하며, 화면 키패드는 Shadow DOM 안의 실제 버튼으로 렌더링됩니다.

[데모](https://composed-input.vercel.app/) · [npm](https://www.npmjs.com/package/@uiwwsw/virtual-keyboard) · [MIT License](./LICENSE)

## Installation

```bash
npm install @uiwwsw/virtual-keyboard
```

React / React DOM 18 또는 19가 필요합니다. `Intl.Segmenter`, Pointer Events, ResizeObserver를 지원하는 최신 브라우저를 대상으로 합니다. 개발·빌드에는 Node.js 24.15 이상(24 LTS)과 npm을 사용합니다.

## Usage

```tsx
import { useState } from "react";
import { VirtualInput, VirtualInputProvider } from "@uiwwsw/virtual-keyboard";

export default function App() {
  const [name, setName] = useState("");

  return (
    <VirtualInputProvider keyboardVisibility="always">
      <p id="name-label">이름</p>
      <VirtualInput
        aria-labelledby="name-label"
        value={name}
        onValueChange={setName}
        placeholder="이름을 입력하세요"
        maxLength={40}
      />
    </VirtualInputProvider>
  );
}
```

추가 CSS 파일을 불러올 필요가 없습니다. `className`과 `style`로 입력란을 꾸밀 수 있습니다. 기본 `keyboardVisibility="auto"`는 모바일 또는 터치 중심 장치에서 화면 키보드를 표시합니다. 데스크톱 데모에는 `always`, 물리 키보드만 사용할 때는 `never`를 지정하세요.

`value`를 제공하면 부모가 입력 상태를 관리합니다. `defaultValue`는 최초 값에만 사용됩니다. 입력 정책은 사용자의 새 입력과 붙여넣기에 적용되며, 부모가 전달하는 `value`와 기존 값은 임의로 변경하지 않습니다.

## Input modes

| `mode`         | 허용 문자 / 동작                               | 기본 키패드         |
| -------------- | ---------------------------------------------- | ------------------- |
| `text`         | 자유 입력, 한영 전환 가능                      | QWERTY              |
| `hangul`       | 한글 자판 고정, 영문 제거. 숫자·공백·기호 허용 | QWERTY              |
| `number`       | `0–9`, `.`                                     | 숫자 패드           |
| `tel`          | `0–9`, `+`, `*`, `#`                           | 전화 패드           |
| `alpha`        | `A–Z`, `a–z`                                   | QWERTY              |
| `alphanumeric` | 영문과 숫자                                    | 숫자 행 + QWERTY    |
| `custom`       | 사용자 정의 필터·값·레이아웃                   | Provider의 레이아웃 |

`number`는 문자 필터입니다. 소수점 개수, 부호, 금액 범위 같은 업무 규칙은 앱에서 검증하세요. 모든 모드는 한 줄 입력이며 붙여넣은 줄바꿈·탭은 기본 자유 입력에서 공백으로 바뀝니다.

모드별 레이아웃보다 입력란의 `layout`이 우선합니다. `text`와 `custom` 입력란은 자신의 레이아웃이 없으면 Provider의 레이아웃을 사용합니다. 강제 언어 모드는 자유 입력의 저장된 언어 선호도를 바꾸지 않습니다.

## Custom layout

`label`은 화면 표시용이며 실제로 입력되는 것은 `value`입니다. `type`을 생략하면 문자 또는 여러 글자 매크로로 처리합니다.

```tsx
import {
  VirtualInput,
  VirtualInputProvider,
  type KeypadLayout,
} from "@uiwwsw/virtual-keyboard";

const phoneLayout: KeypadLayout = [
  [{ value: "1" }, { value: "2" }, { value: "3" }],
  [{ value: "4" }, { value: "5" }, { value: "6" }],
  [{ value: "7" }, { value: "8" }, { value: "9" }],
  [
    { label: "휴대폰", value: "010", width: 2 },
    { value: "0" },
    { label: "⌫", value: "Backspace", type: "action" },
  ],
];

function PhoneField() {
  return (
    <VirtualInputProvider>
      <VirtualInput aria-label="전화번호" mode="tel" layout={phoneLayout} />
    </VirtualInputProvider>
  );
}
```

동작 키에는 `type: "action"`을 사용하세요. 지원 값은 `Backspace`, `Delete`, `Shift`, `HangulMode`, `Enter`, `ArrowLeft`, `ArrowRight`, `EnterSelectionMode`, `ExitSelectionMode`, `ToggleSelectionAdjust`, `Copy`, `Paste`, `Cut`, `SelectAll`, `Undo`, `Redo`입니다. `value: " "`는 공백, `value: "\n"`는 `Enter`로 처리합니다. `width`는 행 안에서 차지하는 상대 너비이며 `height`는 호환성을 위해 타입에 남아 있지만 행 높이를 변경하지 않습니다.

```tsx
<VirtualInput
  aria-label="분류 코드"
  mode="custom"
  filterKey={(key) => /^[ABC123]+$/.test(key)}
  sanitizeValue={(text) => text.replace(/[^ABC123]/g, "")}
/>
```

`filterKey`는 문자·매크로 입력을 허용하거나 거절합니다. `sanitizeValue`는 삽입할 문자열을 정리하며 붙여넣기에도 적용됩니다. 두 함수는 같은 문자 정책을 사용하도록 작성하세요.

## API

### VirtualInputProvider

| 속성                 | 타입 / 기본값                              | 설명                             |
| -------------------- | ------------------------------------------ | -------------------------------- |
| `children`           | `ReactNode`                                | 입력란을 포함한 콘텐츠           |
| `layout`             | `KeypadLayout` / QWERTY                    | 자유·커스텀 모드의 기본 레이아웃 |
| `defaultHangulMode`  | `boolean` / `true`                         | 저장된 설정이 없을 때의 언어     |
| `theme`              | `"light" \| "dark"` / 시스템 설정          | 키패드 테마                      |
| `keyboardVisibility` | `"auto" \| "always" \| "never"` / `"auto"` | 화면 키패드 표시 조건            |

키패드는 현재 포커스된 편집 가능한 입력란이 있을 때 표시됩니다. 한 페이지에 Provider가 여러 개 있어도 하나만 열립니다. 장치의 화면 크기와 safe area에 맞춰 배치하고, 기존 `body` 스타일을 덮어쓰지 않습니다.

### VirtualInput

| 속성                    | 타입 / 기본값                                    | 설명                                                        |
| ----------------------- | ------------------------------------------------ | ----------------------------------------------------------- |
| `value`, `defaultValue` | `string`                                         | 제어 값 / 초기 값                                           |
| `onValueChange`         | `(value: string) => void`                        | 값이 실제로 바뀔 때 호출하는 권장 API                       |
| `onChange`              | `(event: ChangeEvent<HTMLInputElement>) => void` | 기존 API 호환. `target.value`, `currentTarget.value`만 제공 |
| `mode`                  | `InputMode` / `"text"`                           | 입력 정책                                                   |
| `layout`                | `KeypadLayout`                                   | 입력란별 키패드                                             |
| `filterKey`             | `(key: string) => boolean`                       | 문자·매크로 필터                                            |
| `sanitizeValue`         | `(text: string) => string`                       | 삽입 문자열 정리                                            |
| `placeholder`           | `string`                                         | 비어 있을 때 표시하는 안내                                  |
| `disabled`, `readOnly`  | `boolean` / `false`                              | 편집 차단. 화면 키패드를 열지 않음                          |
| `maxLength`             | `number`                                         | UTF-16 단위 최대 길이. 초과 편집은 전체 거절                |
| `onClipboardError`      | `(error: Error) => void`                         | 클립보드 API 사용 실패 알림                                 |

`id`, `className`, `style`, `aria-*`, `onFocus`, `onBlur`, `onKeyDown`, 포인터·클립보드 이벤트 등 `HTMLAttributes<HTMLDivElement>`도 지원합니다. 소비자 이벤트 핸들러의 `preventDefault()`를 존중합니다.

입력란은 실제 HTML input이 아니므로 `type="password"`, 자동완성, 네이티브 폼 제출, 브라우저 IME·음성 입력를 제공하지 않습니다. 폼에 연결할 때는 부모의 상태로 제출을 처리하세요. `Enter`는 조합을 끝내며 `onKeyDown`에서 앱의 완료 동작을 연결할 수 있습니다. `onChange`의 호환 이벤트를 실제 DOM 이벤트로 사용하지 마세요.

### Ref API

`ref`로 `VirtualInputHandle`을 받을 수 있습니다. `focus(options?)`, `blur()`, `getValue()`, `setSelectionRange(start, end)`, `selectAll()`, `undo()`, `redo()`를 제공합니다.

```tsx
import { useRef } from "react";
import type { VirtualInputHandle } from "@uiwwsw/virtual-keyboard";

const ref = useRef<VirtualInputHandle>(null);
// <VirtualInput ref={ref} aria-label="이름" />
ref.current?.focus();
ref.current?.setSelectionRange(0, 2);
```

## Keyboard and accessibility

- 입력란에 `aria-label` 또는 `aria-labelledby`를 제공하세요. `label htmlFor`만으로는 div와 연결되지 않습니다.
- 물리 키보드의 영문 키를 현재 한글 모드에 맞춰 해석하며, 이미 전달된 한글 키도 지원합니다. 운영체제 IME 전체를 대체하는 입력란은 아닙니다.
- 한글 조합 중 Backspace는 자모를 지우고, 조합이 끝나면 글자 단위로 지웁니다. 이모지·결합 문자는 중간에서 나누지 않습니다.
- 방향키, Home/End, Shift + 방향키, Ctrl/Cmd + A, 복사·잘라내기·붙여넣기, Escape를 지원합니다.
- Ctrl/Cmd + Z로 실행 취소, Ctrl/Cmd + Shift + Z 또는 Ctrl + Y로 다시 실행합니다. 기록은 입력란별로 최대 100개를 보관하고 외부에서 제어 값이 바뀌면 초기화합니다.
- 키패드 상단의 숫자·기호 전환으로 숫자·구두점·특수문자를 입력할 수 있습니다.
- Shift는 한 번 누르면 다음 문자에 적용되고, 두 번 누르면 고정됩니다. 세 번째 입력으로 해제됩니다.
- 입력란을 탭하면 커서를 옮깁니다. 스크롤이나 취소된 터치는 커서·포커스를 바꾸지 않습니다.
- 단어를 550ms 이상 길게 누르면 단어를 선택하고 편집 도구를 엽니다. `편집` 키로도 커서·선택·클립보드 도구를 열 수 있습니다.
- 화면 키는 손을 뗄 때 실행됩니다. 누른 채 키 밖으로 움직이거나 터치가 취소되면 실행하지 않습니다. 지우기·화살표는 길게 누르면 반복하고 키 밖으로 움직이면 멈춥니다.
- 키패드의 클립보드 버튼은 보안 컨텍스트와 브라우저 권한이 필요합니다. 실패는 상태 메시지와 `onClipboardError`로 전달합니다. 물리 키보드 단축키는 별도의 네이티브 클립보드 이벤트를 사용합니다.

텍스트와 키는 DOM에 존재하며 스크린 리더에 노출됩니다. 자동 접근성 검사는 보조기기 실기기 검증을 대체하지 않습니다.

## Development

```bash
npm ci
npm run dev
npm run check
npx playwright install chromium webkit
npm run test:e2e
```

| 명령어                  | 결과                                                       |
| ----------------------- | ---------------------------------------------------------- |
| `npm run build`         | 데모 사이트 → `demo-dist/`                                 |
| `npm run build-package` | 라이브러리 JavaScript·타입 → `dist/`                       |
| `npm run test:package`  | 패키지 포함 파일·ESM import·서버 렌더링 검사               |
| `npm test`              | 입력 엔진·컴포넌트 회귀 테스트                             |
| `npm run test:e2e`      | 데스크톱·모바일 Chromium 및 모바일 WebKit 동작·접근성 검사 |
| `npm run format`        | Prettier 포맷 적용                                         |
| `npm run check`         | 포맷·린트·테스트·빌드·패키지 검증                          |

npm의 `package-lock.json`을 의존성 기준으로 사용합니다. Vite 라이브러리 빌드에서 React, React DOM, es-hangul은 외부 의존성으로 유지합니다. 데모를 호스팅할 때 출력 디렉터리를 `demo-dist`로 설정하세요. Next.js처럼 React Server Components를 사용하는 앱에서는 상태를 사용하는 예제 컴포넌트에 `"use client"`를 추가하세요.

[개선 내역과 검증 범위](./docs/functional-assessment.md) · [기여 안내](./CONTRIBUTING.md)

## Migration from 1.x

2.0은 React 18 이상을 지원하며 입력란을 일반 DOM 요소로 렌더링합니다. 이전 custom element 또는 Canvas 구조를 선택하던 CSS를 `className`/`style`로 옮기세요. 기존 `onChange`는 유지되며 문자열 상태에는 `onValueChange`를 권장합니다. 데모 빌드 경로는 `demo-dist/`로 변경되었고 Vercel 설정에도 반영했습니다. [전체 변경 내역](./CHANGELOG.md)을 참고하세요.
