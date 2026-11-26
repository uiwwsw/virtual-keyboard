<div align="center">

<img src="https://raw.githubusercontent.com/uiwwsw/virtual-keyboard/main/public/keyboard.svg" alt="Virtual Keyboard 로고" width="96" height="96">

<h1>Virtual Keyboard</h1>

<p>누르는 대로 한글이 조합되는 React 화면 키보드</p>

<p>
  <a href="https://www.npmjs.com/package/@uiwwsw/virtual-keyboard"><img alt="npm version" src="https://img.shields.io/npm/v/%40uiwwsw%2Fvirtual-keyboard?style=flat-square"></a>
  <a href="https://github.com/uiwwsw/virtual-keyboard/blob/main/LICENSE"><img alt="license" src="https://img.shields.io/npm/l/%40uiwwsw%2Fvirtual-keyboard?style=flat-square"></a>
  <a href="https://github.com/uiwwsw/virtual-keyboard/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/uiwwsw/virtual-keyboard/ci.yml?branch=main&label=CI&style=flat-square"></a>
  <a href="https://www.npmjs.com/package/@uiwwsw/virtual-keyboard"><img alt="react peer dependency" src="https://img.shields.io/npm/dependency-version/%40uiwwsw%2Fvirtual-keyboard/peer/react?style=flat-square"></a>
  <a href="https://www.npmjs.com/package/@uiwwsw/virtual-keyboard"><img alt="types" src="https://img.shields.io/npm/types/%40uiwwsw%2Fvirtual-keyboard?style=flat-square"></a>
  <a href="https://github.com/toss/es-hangul"><img alt="uses es-hangul" src="https://img.shields.io/badge/uses-es--hangul-blue?style=flat-square"></a>
</p>

<p>
  <a href="https://virtual-keyboard-uiwwsw.vercel.app/">데모</a> ·
  <a href="https://www.npmjs.com/package/@uiwwsw/virtual-keyboard">npm</a> ·
  <a href="./CHANGELOG.md">변경 내역</a> ·
  <a href="./README.en.md">English</a>
</p>

</div>

화면 키보드에서 한글을 입력할 때 생기는 조합 문제를 해결한 React 컴포넌트입니다. 자모를 누르면 후보를 고를 필요 없이 바로 글자로 합쳐지고, 조합 중 지우기·커서 이동·실행 취소가 실제 한글 입력기처럼 동작합니다. 음절 계산은 토스의 [es-hangul](https://github.com/toss/es-hangul)을 쓰고, 이 라이브러리는 그 위의 편집 동작과 키패드를 맡습니다.

## 다른 키보드와 다른 점

- **누르는 대로 조합됩니다.** `ㄱ`, `ㅏ`, `ㄴ`을 누르면 입력란에 바로 `간`이 됩니다. [simple-keyboard](https://github.com/hodgef/simple-keyboard)의 한국어 레이아웃은 자모를 누른 뒤 후보 상자에서 완성 글자를 골라야 합니다.
- **조합 중 지우기가 자모 단위입니다.** `간`에서 지우면 `가`가 됩니다. 글자 전체가 사라지지 않습니다.
- **한 글자 조합이 실행 취소 한 번입니다.** 자모마다 되돌리지 않습니다.
- **실제 `<input>`을 씁니다.** `inputMode="none"`으로 시스템 키보드만 막고, 커서·선택·길게 누르기·복사 메뉴는 브라우저 기본 동작을 그대로 씁니다. 폼, 접근성 도구, 자동 테스트가 일반 입력란처럼 다룹니다.
- **입력 규칙이 붙여넣기까지 지켜집니다.** `filterKey`, `sanitizeValue`, `maxLength`가 키 입력과 붙여넣기에 같이 적용되고, 길이를 넘는 입력은 뒤쪽 글자를 지우지 않고 거절합니다.
- **앱 CSS와 섞이지 않습니다.** 키패드는 Shadow DOM 안의 `<button>`으로 그려집니다.

## 지금 되는 것

- `VirtualInputProvider`, `VirtualInput` 두 컴포넌트와 `InputMode`, `InputPolicy`, `Key`, `KeypadLayout` 타입
- 입력 모드: `text`, `hangul`, `number`, `tel`, `alpha`, `alphanumeric`, `custom`
- 한글 두벌식 입력과 한영 전환
- QWERTY, 숫자, 전화번호 키패드, 기호·편집 화면
- 레이아웃 JSON으로 만드는 사용자 정의 키패드와 여러 글자 매크로 키
- `filterKey`, `sanitizeValue`, `maxLength`로 입력·붙여넣기 제한
- `inputMode="none"`인 실제 `<input>`. 커서·선택은 브라우저가 처리
- Shadow DOM 안의 `<button>` 키패드
- 입력란별 실행 취소·다시 실행(최대 100개), 복사·잘라내기·붙여넣기 버튼
- 물리 키보드 입력, 라이트·다크 테마, 키패드 표시 조건(`auto`, `always`, `never`), 한국어·영어 라벨(`locale`)
- TypeScript 타입 포함, ESM 패키지

## 아직 안 되는 것 / 진행 예정

- VoiceOver, TalkBack으로 검증하지 않았음. axe 자동 검사만 통과
- `type="password"`, 자동완성, `name`을 통한 폼 제출 없음
- 한 줄 입력만 지원. 여러 줄 입력란 없음
- 천지인 등 두벌식 외 한글 배열 없음
- 운영체제 IME 대체 아님
- `number` 모드는 문자 필터. 소수점 개수, 부호, 금액 범위 검증은 앱에서 해야 함
- `inputMode="none"`의 시스템 키보드 억제는 브라우저·기기별로 다를 수 있음
- 모바일 판단은 휴리스틱. 정확한 표시가 필요하면 `keyboardVisibility`를 직접 지정해야 함
- React 외 프레임워크용 코어 없음

## Installation

```bash
npm install @uiwwsw/virtual-keyboard
```

React, React DOM 18 또는 19가 필요합니다.

## Usage

```tsx
import { useState } from "react";
import { VirtualInput, VirtualInputProvider } from "@uiwwsw/virtual-keyboard";

export default function App() {
  const [name, setName] = useState("");

  return (
    <VirtualInputProvider keyboardVisibility="always">
      <VirtualInput
        aria-label="이름"
        value={name}
        onValueChange={setName}
        maxLength={40}
      />
    </VirtualInputProvider>
  );
}
```

## 문서

- [레퍼런스(모드, 레이아웃, API, 접근성, 복사·붙여넣기, 구성, 개발, 마이그레이션, 데모)](https://github.com/uiwwsw/virtual-keyboard/blob/main/docs/REFERENCE.md)
- [변경 내역](https://github.com/uiwwsw/virtual-keyboard/blob/main/CHANGELOG.md)
- [기여 안내](https://github.com/uiwwsw/virtual-keyboard/blob/main/CONTRIBUTING.md)
- [English README](https://github.com/uiwwsw/virtual-keyboard/blob/main/README.en.md)

## License

[MIT](https://github.com/uiwwsw/virtual-keyboard/blob/main/LICENSE)
