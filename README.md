<div align="center">

<img src="https://raw.githubusercontent.com/uiwwsw/virtual-keyboard/main/public/keyboard.svg" alt="Virtual Keyboard 로고" width="96" height="96">

<h1>Virtual Keyboard</h1>

<p>React용 화면 키보드 컴포넌트</p>

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

React용 화면 키보드 컴포넌트입니다. 한글 두벌식 조합 계산은 [es-hangul](https://github.com/toss/es-hangul)을 쓰고, 이 라이브러리는 편집 상태, 키패드, 실제 `<input>` 연결을 구현합니다.
단일 관리자가 유지하는 작은 패키지이며 아직 쓰는 사람이 거의 없습니다.

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

## 현재 위치

- 주간 npm 다운로드(최근 1주, api.npmjs.org): 이 패키지 80, react-simple-keyboard 237,797, simple-keyboard 80,748, es-hangul 173,386. 사용량 차이가 3,000배 가까이 납니다.
- 유지 관리자 1명. GitHub 기여자 1명, 스타 1개, 포크 0개. 알려진 실사용 사례가 없습니다.
- React 전용입니다. simple-keyboard는 프레임워크에 묶이지 않는 JavaScript 코어이고 React, Angular, Vue에서 쓸 수 있습니다.
- simple-keyboard는 별도 `simple-keyboard-layouts` 패키지로 한국어를 포함한 여러 언어 레이아웃을 제공합니다. 이 패키지의 레이아웃은 QWERTY, 숫자, 전화번호와 사용자 정의뿐입니다.
- 한글 조합 계산은 es-hangul에 의존합니다. 직접 만든 알고리즘이 아닙니다.
- 맞는 경우는 React에서 실제 `<input>`에 한글 두벌식 입력을 붙이고 커서·선택을 브라우저에 맡기려는 때입니다. 그 밖의 용도는 simple-keyboard가 낫습니다.

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
