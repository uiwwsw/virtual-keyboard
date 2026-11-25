# Virtual Keyboard

[![npm version](https://img.shields.io/npm/v/%40uiwwsw%2Fvirtual-keyboard?style=flat-square)](https://www.npmjs.com/package/@uiwwsw/virtual-keyboard)
[![npm monthly downloads](https://img.shields.io/npm/dm/%40uiwwsw%2Fvirtual-keyboard?style=flat-square)](https://www.npmjs.com/package/@uiwwsw/virtual-keyboard)
[![CI on main](https://github.com/uiwwsw/virtual-keyboard/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/uiwwsw/virtual-keyboard/actions/workflows/ci.yml)
[![MIT license](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](https://github.com/uiwwsw/virtual-keyboard/blob/main/LICENSE)

한글 조합과 커스텀 키패드를 지원하는 React 가상 키보드입니다. 입력란은 실제 `<input inputMode="none">`을 사용해 커서·길게 누르기·선택을 브라우저에 맡기며, 화면 키패드는 Shadow DOM 안의 실제 버튼으로 렌더링됩니다.

[데모](https://virtual-keyboard-uiwwsw.vercel.app/) · [npm](https://www.npmjs.com/package/@uiwwsw/virtual-keyboard) · [MIT License](./LICENSE)

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

추가 CSS 파일을 불러올 필요가 없습니다. `className`과 `style`은 입력란을 감싼 컨테이너에 적용됩니다. 내부 input은 여백·글꼴·색상을 이어받고 컨테이너 전체를 터치 영역으로 사용합니다. 기본 `keyboardVisibility="auto"`는 모바일 또는 터치 중심 장치에서 화면 키보드를 표시합니다. 데스크톱 데모에는 `always`, 물리 키보드만 사용할 때는 `never`를 지정하세요.

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

`HTMLAttributes<HTMLDivElement>` 호환 속성을 지원합니다. `id`, `tabIndex`, `aria-*`는 실제 input에, `className`, `style`과 이벤트 핸들러는 컨테이너에 적용합니다. `onFocus`, `onBlur`, `onKeyDown`, 포인터·클립보드 이벤트는 input에서 버블링하며 `currentTarget`은 기존처럼 컨테이너입니다. 소비자 이벤트 핸들러의 `preventDefault()`를 존중합니다.

입력란은 한 줄 텍스트 input입니다. `inputMode="none"`으로 시스템 화면 키보드를 억제하고 가상 키패드를 사용합니다. 네이티브 IME 조합 중에는 키를 가로채지 않고 조합 완료 시 입력 정책을 적용합니다. 공개 API에 `type="password"`, 자동완성, `name`을 통한 폼 제출 설정은 제공하지 않습니다. 폼에 연결할 때는 부모의 상태로 제출을 처리하세요. `Enter`는 조합을 끝내며 `onKeyDown`에서 앱의 완료 동작을 연결할 수 있습니다. `onChange`의 호환 이벤트를 실제 DOM 이벤트로 사용하지 마세요.

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

- 입력란에 `aria-label`, `aria-labelledby` 또는 `id`와 연결한 `label htmlFor`를 제공하세요.
- 물리 키보드의 영문 키를 현재 한글 모드에 맞춰 해석하며, 이미 전달된 한글 키도 지원합니다. 운영체제 IME 전체를 대체하는 입력란은 아닙니다.
- 한글 조합 중 Backspace는 자모를 지우고, 조합이 끝나면 글자 단위로 지웁니다. 이모지·결합 문자는 중간에서 나누지 않습니다.
- 방향키, Home/End, Shift + 방향키, Ctrl/Cmd + A, 복사·잘라내기·붙여넣기, Escape를 지원합니다.
- Ctrl/Cmd + Z로 실행 취소, Ctrl/Cmd + Shift + Z 또는 Ctrl + Y로 다시 실행합니다. 기록은 입력란별로 최대 100개를 보관하고 외부에서 제어 값이 바뀌면 초기화합니다.
- 키패드 상단의 숫자·기호 전환으로 숫자·구두점·특수문자를 입력할 수 있습니다.
- Shift는 한 번 누르면 다음 문자에 적용되고, 두 번 누르면 고정됩니다. 세 번째 입력으로 해제됩니다.
- 탭, 길게 누르기, 드래그, 스크롤은 실제 input의 기본 제스처로 처리합니다. 앱에서 터치 위치를 커서로 환산하거나 손을 뗄 때 다시 선택하지 않습니다.
- `selectionStart`·`selectionEnd`·`selectionDirection`을 편집 엔진과 동기화합니다. 자체 길게 누르기 타이머와 가짜 커서가 없어 브라우저가 정한 커서·선택 상태를 뒤늦게 덮어쓰지 않습니다.
- 선택하면 현재 자판 위에 `복사`·`잘라내기`·`붙여넣기`가 바로 표시됩니다. `전체 선택`은 `편집` 화면에서 사용할 수 있습니다. 선택 손잡이와 기본 복사 메뉴의 표시·모양은 기기와 브라우저가 결정합니다. `편집` 키의 화살표·범위 조절도 계속 사용할 수 있습니다.
- 화면 키는 손을 뗄 때 실행됩니다. 누른 채 키 밖으로 움직이거나 터치가 취소되면 실행하지 않습니다. 지우기·화살표는 길게 누르면 반복하고 키 밖으로 움직이면 멈춥니다.
- 키패드의 클립보드 버튼은 보안 컨텍스트와 브라우저 권한이 필요할 수 있습니다. 복사는 Clipboard API 실패 시 실제 선택 영역의 기본 복사 이벤트를 대체 경로로 시도합니다. 실패는 보이는 상태 메시지와 `onClipboardError`로 전달합니다. 기본 복사 메뉴와 물리 키보드 단축키도 지원합니다.

입력란과 키는 실제 HTML input·button으로 렌더링되며 스크린 리더에 노출됩니다. 자동 접근성 검사는 보조기기 실기기 검증을 대체하지 않습니다.

## Copy and paste

- **처음 들어와 붙여넣기:** 입력란을 탭하고 키패드 상단의 `붙여넣기`를 누릅니다. 빈 입력란과 숫자·전화번호 모드에서도 바로 사용할 수 있습니다.
- **복사한 내용을 다른 위치에 붙여넣기:** 글자를 선택해 `복사`한 다음 같은 입력란이나 다른 입력란에서 원하는 위치를 탭하고 `붙여넣기`를 누릅니다. 선택 범위가 있으면 그 부분을 교체합니다.
- 붙여넣은 내용 끝에 커서를 두고 입력란으로 포커스를 돌려 계속 입력할 수 있습니다. 붙여넣기는 한 번의 실행 취소로 되돌릴 수 있습니다.

클립보드는 붙여넣기를 명시적으로 실행할 때 읽습니다. 읽는 동안 버튼에 진행 상태를 표시하고 연속 실행을 막습니다. 대기 중 커서·값·입력란·입력 정책이 바뀌면 요청을 취소하므로 새 위치에서 다시 눌러 주세요. 빈 클립보드, 허용되지 않는 내용, 길이 제한, 부모가 거절한 값은 완료 메시지와 구분해 알립니다.

브라우저가 클립보드 읽기를 제한하면 현재 선택 범위를 유지하고 기본 붙여넣기 메뉴를 안내합니다. 입력란을 길게 눌러 `붙여넣기`를 선택하거나 Ctrl/Cmd + V를 사용할 수 있습니다. 기본 붙여넣기 이벤트에도 같은 입력 정책과 실행 취소를 적용합니다. OS의 권한 창과 붙여넣기 메뉴는 브라우저가 표시합니다. [Clipboard API의 브라우저별 제약](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API#security_considerations)을 참고하세요.

## 구성

### 소스 모듈

`src/index.ts`가 공개하는 것은 `VirtualInput`, `VirtualInputProvider`와 타입(`InputMode`, `InputPolicy`, `Key`, `KeypadLayout` 등)뿐입니다. 나머지는 내부 모듈입니다.

| 경로                               | 역할                                                                                                                                               |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/Provider.tsx`          | 포커스된 입력란 하나를 추적하고 Shift·한영·선택 모드·테마·표시 조건을 관리합니다. 키패드를 `document.body`에 포털로 띄우고 높이만큼 여백을 둡니다. |
| `components/Context.tsx`           | Provider와 입력란·키패드가 공유하는 React Context와 타입                                                                                           |
| `components/Input.tsx`             | `<input inputMode="none">`을 감싼 입력란. 키 입력, 물리 키보드, 네이티브 IME, 선택, 복사·붙여넣기, 실행 취소를 편집 엔진에 연결합니다.             |
| `components/Keypad.tsx`            | 화면 키패드. 레이아웃 JSON을 `<button>`으로 그리고 Shift·기호·편집 화면 전환, 상단 도구 모음, 클립보드 상태 표시를 처리합니다.                     |
| `components/ShadowWrapper.tsx`     | 호스트 요소에 Shadow Root를 붙이고 `<style>`과 자식을 포털로 넣어 키패드 CSS가 페이지와 섞이지 않게 합니다.                                        |
| `hooks/usePress.ts`                | 키를 손 뗄 때 실행하고, 키 밖으로 벗어나거나 취소되면 실행하지 않으며, 지우기·화살표는 길게 누르면 반복합니다.                                     |
| `hooks/useStorage.ts`              | 한영 선호도를 `localStorage`에 저장합니다. 저장소가 막혀 있어도 메모리 상태는 갱신하며 같은 탭·다른 탭의 변경을 동기화합니다.                      |
| `hooks/useVisualViewport.ts`       | `window.visualViewport`의 크기·확대·오프셋을 읽어 키패드를 보이는 영역 아래에 맞춥니다. 지원하지 않으면 `window` 크기를 사용합니다.                |
| `hooks/useSystemTheme.ts`          | `prefers-color-scheme`을 읽어 `theme`을 생략했을 때 쓸 테마를 정합니다.                                                                            |
| `utils/editing.ts`                 | DOM과 무관한 편집 상태(`value`, `caret`, `anchor`, `composing`)의 삽입·삭제·커서 이동. 한글 조합은 es-hangul을 호출해 처리합니다.                  |
| `utils/nativeEditing.ts`           | 브라우저가 바꾼 input 값에서 달라진 구간만 찾아 입력 정책과 길이 제한을 적용합니다. 네이티브 IME 조합 완료와 기본 붙여넣기 경로에 쓰입니다.        |
| `utils/history.ts`                 | 입력란별 실행 취소·다시 실행 기록(최대 100개). 한글 조합 한 번을 한 단계로 묶습니다.                                                               |
| `utils/inputPolicy.ts`             | 모드별 기본 레이아웃·키 필터·정리 함수와 강제 언어 모드(`hangul`은 한글, `alpha`·`number` 등은 영문)                                               |
| `utils/keyboard.ts`                | 키 정의를 실제 입력 문자로 바꿉니다. 한글 모드의 영문 키는 es-hangul의 `convertQwertyToHangul`로 두벌식 자모에 대응시킵니다.                       |
| `utils/parseKeyInput.ts`           | 물리 키보드 이벤트를 같은 규칙으로 해석합니다. 이미 한글로 들어온 키(macOS IME 등)와 Ctrl/Cmd 조합은 구분합니다.                                   |
| `utils/isHangul.ts`                | 한글 자모·음절 범위(`U+1100–11FF`, `U+3130–318F`, `U+AC00–D7AF`) 정규식 검사                                                                       |
| `utils/isMobileAgent.ts`           | User-Agent, 터치 지점 수, `(pointer: coarse)`로 `keyboardVisibility="auto"`의 모바일 판단을 합니다. 휴리스틱이라 오판할 수 있습니다.               |
| `types/`                           | `InputPolicy`, `InputMode`, `Key`, `KeypadLayout`, `Viewport` 타입                                                                                 |
| `assets/*.json`                    | QWERTY, 숫자 패드, 전화 패드, 기호, 편집 화면의 키 배열 데이터                                                                                     |
| `uiLanguage.ts`, `uiMessages.json` | 키패드 라벨·상태 문구의 한국어→영어 사전. 기본 한국어이며 `locale="en"`일 때 번역합니다. 입력 문자는 번역하지 않습니다.                            |
| `App.tsx`, `App.css`, `main.tsx`   | 데모 사이트. 패키지에는 포함되지 않습니다(`files`가 `dist`만 가리킴).                                                                              |
| `*.test.ts(x)`, `test/setup.ts`    | Vitest 단위·컴포넌트 테스트. 브라우저 동작은 `e2e/`의 Playwright가 검사합니다.                                                                     |

### 의존성

| 패키지                       | 구분       | 용도                                                                                                                                                                             |
| ---------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `react`, `react-dom` (18·19) | peer       | 컴포넌트 렌더링과 `createPortal`. 번들에 포함하지 않습니다.                                                                                                                      |
| `es-hangul`                  | dependency | 자모를 음절로 합치는 `assemble`, 마지막 자모를 지우는 `removeLastCharacter`, 영문 키를 두벌식 자모로 바꾸는 `convertQwertyToHangul`. 번들에 포함하지 않고 설치 시 함께 받습니다. |

실행 시 이 외의 npm 패키지는 쓰지 않습니다. 개발 도구로 Vite, TypeScript, ESLint, Prettier, Vitest, Testing Library, jsdom, Playwright, `@axe-core/playwright`를 사용합니다. 브라우저 표준 API는 `Intl.Segmenter`(글자·단어 경계), Shadow DOM, `inputMode`, Pointer Events, `ResizeObserver`, Visual Viewport, Clipboard API, `localStorage`, `matchMedia`입니다.

### 직접 만든 것과 가져온 것

직접 만든 부분은 편집 상태 처리(선택 교체, 이모지·결합 문자 경계, 조합 중 삭제 규칙, 길이 제한 시 편집 거절), 실행 취소 기록, 네이티브 변경 구간 추출, 입력 정책, 손 뗄 때 실행하는 키 처리, Provider의 포커스·표시 조정, 키패드 UI와 레이아웃 데이터입니다.

한글 조합 알고리즘은 직접 구현하지 않았습니다. 자모를 음절로 합치고 분해하는 계산은 `es-hangul`에 맡기며, 이 저장소는 그 함수를 호출하는 시점(조합 중인지, 이전 글자가 한글인지)과 커서·선택·실행 취소와의 연결을 담당합니다. 두벌식 배열과 한글 음절 조합 규칙 자체는 표준입니다.

### 비슷한 라이브러리와 크레딧

- [es-hangul](https://github.com/toss/es-hangul) (Toss, MIT): 한글 조합·분해 함수의 출처입니다. 이 패키지의 필수 의존성입니다.
- [simple-keyboard](https://github.com/hodgef/simple-keyboard)와 [react-simple-keyboard](https://github.com/hodgef/react-simple-keyboard) (MIT): 레이아웃을 바꿔 쓸 수 있는 범용 화면 키보드입니다. 이 패키지는 이들 코드를 쓰지 않으며, 범용성과 레이아웃 생태계는 이쪽이 넓습니다. 이 패키지는 한글 조합과 실제 `<input>` 선택 상태의 연동에 범위를 좁혔습니다. 한글 지원 방식은 각 문서를 확인하세요.
- [Hangul.js](https://github.com/e-/Hangul.js) (MIT): 한글 조합·분해 라이브러리입니다. 사용하지 않지만 es-hangul과 같은 영역을 다룹니다.
- 표준 문서: [inputmode 속성](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/inputmode), [Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM), [Intl.Segmenter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Segmenter), [Visual Viewport API](https://developer.mozilla.org/en-US/docs/Web/API/Visual_Viewport_API), 한글 음절 영역은 [Unicode Standard 3.12절](https://www.unicode.org/versions/latest/)과 [Hangul Syllables 차트](https://www.unicode.org/charts/PDF/UAC00.pdf)에 정의돼 있습니다.

### 한계

- 운영체제 IME 전체를 대체하지 않습니다. 한글 조합은 두벌식 기준이며 천지인 같은 다른 배열의 조합은 구현하지 않았습니다.
- `inputMode="none"`의 시스템 키보드 억제는 브라우저·기기별로 동작이 다를 수 있습니다.
- 모바일 판단은 휴리스틱입니다. 정확한 표시가 필요하면 `keyboardVisibility`를 직접 지정하세요.
- 자동 접근성 검사(axe, WCAG A/AA 규칙)를 통과하더라도 VoiceOver·TalkBack 같은 보조기기에서의 사용성은 검증하지 않았습니다.

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

## Migration from 2.0

2.1부터 입력란 내부는 실제 input입니다. 공개 값·ref API와 컨테이너의 `className`/`style`은 유지합니다. 내부 문자 span이나 가짜 커서를 선택하던 CSS·DOM 코드는 제거하세요. 선택 범위를 직접 읽을 때는 input의 `selectionStart`, `selectionEnd`, `selectionDirection`을 사용합니다. `id`와 접근성 속성은 실제 input으로 이동하므로 `label htmlFor`를 연결할 수 있습니다.

## 데모 언어와 검색

[한국어 데모](https://virtual-keyboard-uiwwsw.vercel.app/) · [English demo](https://virtual-keyboard-uiwwsw.vercel.app/en/) · [English README](README.en.md)

Virtual Keyboard(버추얼 키보드)가 제품·패키지 이름입니다. 커스텀 키패드는 지원 기능 중 하나입니다. 데모는 한·영 UI, 언어별 제목·설명·초기 HTML·canonical/hreflang·사이트맵을 제공합니다. Provider의 `locale="ko" | "en"`(기본 ko)는 키보드 버튼·접근성·클립보드 상태 안내의 표시 언어이며 입력 모드와 독립적입니다. 입력 문자를 자동 번역하지 않습니다. [SEO 기록](docs/SEO.md).

### Demo first paint

The deployed Korean/English demo is prerendered from the actual `App` component, then hydrated in place. Keep the initial HTML and React tree identical; do not inject a separate SEO-only placeholder into `#root`. Demo UI uses locally served SUITE with a font preload; its license is in `public/fonts/LICENSE`. Library consumers still control their own page typography.

### Demo address

The demo is hosted at `https://virtual-keyboard-uiwwsw.vercel.app/`. The legacy `composed-input.vercel.app` domain is retained only as a Vercel project-domain 301 redirect to the current origin, preserving paths. Do not serve a separate demo on it. Canonical URLs and the sitemap use the current origin.
