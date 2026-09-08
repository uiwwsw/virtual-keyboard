# Contributing

이슈에는 재현 순서, 기대 결과, 실제 결과, 브라우저·장치, 입력 모드를 적어 주세요. 한글 문제라면 입력한 키 순서와 커서·선택 위치도 도움이 됩니다.

## Local setup

Node.js 24.15 이상(24 LTS)과 npm이 필요합니다.

```bash
npm ci
npm run dev
```

의존성 변경 시 `package.json`과 `package-lock.json`을 함께 업데이트합니다.

## Before a pull request

```bash
npm run format
npm run check
npx playwright install chromium webkit
npm run test:e2e
```

CI는 포맷, ESLint, TypeScript, 단위·컴포넌트 테스트, 두 종류의 빌드, 패키지의 서버 렌더링, 브라우저 동작, 자동 접근성 검사를 실행합니다. 회귀 테스트는 실제 사용자 동작이나 수정한 오류를 검증하도록 작성하세요.

## Project structure

- `src/components`: 입력란, Provider, Shadow DOM 키패드
- `src/utils/editing.ts`: DOM과 무관한 텍스트 편집·한글 조합 엔진
- `src/utils/inputPolicy.ts`: 모드별 필터, 정리 함수, 레이아웃
- `src/types`: 공개 입력 정책과 키 레이아웃 타입
- `src/App.tsx`, `src/App.css`: 데모
- `e2e`: 데스크톱·모바일 Chromium 및 모바일 WebKit 회귀 검사

## Build and release

`npm run build`는 `demo-dist/`에 사이트를, `npm run build-package`는 `dist/`에 배포 가능한 ESM과 선언 파일을 만듭니다. 배포 패키지에 React를 번들하지 않습니다. `npm pack --dry-run`으로 포함 파일을 검토할 수 있습니다.

기존 main 브랜치 publish 워크플로는 검증을 모두 통과하고 아직 게시되지 않은 버전일 때만 npm에 게시합니다. 변경의 호환성을 검토한 후 유지관리자가 버전과 배포 시점을 결정합니다.

PR에는 사용자가 겪은 문제, 수정 후 동작, 실행한 검증을 적어 주세요. 기여한 코드는 프로젝트의 MIT License를 따릅니다.
