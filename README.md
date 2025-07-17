[![npm version](https://img.shields.io/npm/v/@uiwwsw/virtual-keyboard.svg)](https://www.npmjs.com/package/@uiwwsw/virtual-keyboard)
[![License](https://img.shields.io/github/license/uiwwsw/virtual-keyboard)](https://github.com/uiwwsw/virtual-keyboard/blob/main/LICENSE)
[![Stars](https://img.shields.io/github/stars/uiwwsw/virtual-keyboard?style=flat)](https://github.com/uiwwsw/virtual-keyboard/stargazers)

# virtual-keyboard: 한글 Composition 이슈를 해결한 혁신적인 가상 키보드 솔루션
![Virtual Keyboard Banner](https://raw.githubusercontent.com/uiwwsw/virtual-keyboard/main/docs/banner.png)


[데모](https://composed-input-y46p.vercel.app/)

> 🚀 **웹 한글 입력의 혁신: Composition 오류 없는 완벽한 입력 환경 제공**  
> **기존 가상 키보드의 한계를 넘어, 한글 조합 이슈를 근본적으로 해결합니다.**  
> 커스텀 디자인된 키보드와 함께, 웹에서 네이티브와 같은 한글 UX를 경험하세요.

---

## 설치

```bash
npm install @uiwwsw/virtual-keyboard
```

---

## 🥁 왜 `virtual-keyboard`가 획기적인가요?

기존 웹 환경에서 한글 입력 시 발생하는 `composition` 이벤트의 불안정성은  
**크로스워드, 게임 UI, 커스텀 에디터, 모바일 웹앱** 등에서 치명적인 문제로 작용했습니다.  
❌ 네이티브 키보드와의 충돌  
❌ 예측 불가능한 커서 이동  
❌ 조합 중인 한글 깨짐  
이러한 고질적인 문제들은 개발자와 사용자 모두에게 큰 불편함을 주었습니다.

`virtual-keyboard`는 이러한 문제를 **근본적으로 해결**합니다.  
**기존의 `composition` 이벤트를 우회하고, 라이브러리 자체적으로 한글 조합 로직을 완벽하게 제어**함으로써,  
어떤 환경에서도 안정적이고 예측 가능한 한글 입력 경험을 제공합니다.  
이는 단순한 가상 키보드를 넘어, **웹 한글 입력 방식의 패러다임을 바꾸는 혁신**입니다.

---

## 🧩 `virtual-keyboard`는 무엇으로 구성되어 있나요?

`virtual-keyboard`는 다음 두 가지 핵심 요소로 구성된 통합 솔루션입니다:

### 1. 🧠 `전용 Input` — 한글 Composition 이슈를 해결한 혁신적인 입력 필드

- **Composition Free**: 네이티브 IME의 `composition` 이벤트를 사용하지 않고, 라이브러리 내부에서 한글 조합을 직접 처리하여 **조합 중인 한글 깨짐, 커서 이동 오류 등의 문제를 원천 봉쇄**합니다.
- 커스텀 API 제공: 개발자가 입력 로직을 완벽하게 제어할 수 있도록 유연한 API를 제공합니다.
- 버추얼 키보드와 네이티브처럼 연동: `VirtualKeyboard`와 완벽하게 통합되어 마치 하나의 시스템처럼 작동합니다.
- 다양한 커스텀 키보드 지원: 전화번호 전용 키패드, 숫자 전용 키패드, 천지인 등 특정 목적에 맞는 커스텀 키보드를 쉽게 구현하고 연동할 수 있습니다.

### 2. 🎹 `VirtualKeyboard` — 웹 전용 **고성능 가상 한글 키보드 UI**

- **모바일 네이티브 키보드 차단**: 모바일 웹 환경에서 불필요한 네이티브 키보드 노출을 막아 **일관된 입력 UX를 제공**합니다.
- `전용 Input`과 자동 연동: 별도의 설정 없이 `전용 Input`과 매끄럽게 연결됩니다.
- 가볍고 설치 없는 웹 앱 최적화: 웹 애플리케이션에 특화된 경량 솔루션으로, 사용자에게 추가 설치 부담을 주지 않습니다.

---

## 🎯 주요 사용 사례

- 🔤 **크로스워드, 퍼즐 게임**: 정확하고 오류 없는 글자 입력이 필수적인 게임 환경.
- 🧱 **커스텀 에디터, 드로잉 툴**: 자체적인 커서 시스템이나 복잡한 입력 로직을 필요로 하는 애플리케이션.
- 📱 **모바일 웹 앱**: 키보드 UI를 완벽하게 커스터마이징하고 일관된 사용자 경험을 제공하고자 할 때.
- 🌐 **다국어 웹 앱**: 특히 한글과 같이 복잡한 입력기를 직접 제어하여 안정적인 다국어 입력 환경을 구축하고자 할 때.

---

## 🚧 Coming Soon...

- 조합 상태 시각화 (`onComposeUpdate`)
- 커스텀 키보드 레이아웃 지원
- `<textarea>` 유사 인터페이스 확장

---

## 📌 요약하면

> `virtual-keyboard`은 단순한 가상 키보드가 아닙니다.  
> **웹 한글 입력의 고질적인 `composition` 이슈를 해결하고, 개발자가 입력 과정을 완벽하게 제어할 수 있도록 돕는 혁신적인 `전용 Input`과 고성능 `VirtualKeyboard`를 통합한 솔루션**입니다.

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=uiwwsw/virtual-keyboard&type=Date)](https://www.star-history.com/#uiwwsw/virtual-keyboard&Date)
