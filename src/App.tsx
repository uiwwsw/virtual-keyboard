import { useState } from "react";
import {
  VirtualInput,
  VirtualInputProvider,
  type InputMode,
  type KeypadLayout,
} from "./index.js";
import "./App.css";

const modes: {
  id: InputMode;
  title: string;
  mark: string;
  description: string;
  placeholder: string;
  example: string;
}[] = [
  {
    id: "text",
    title: "자유 입력",
    mark: "Aa",
    description:
      "한글과 영문을 오가며 자유롭게 입력해 보세요. 한 / EN 키로 언어를 바꿀 수 있습니다.",
    placeholder: "여기서 첫 문장을 시작해 보세요",
    example: "안녕하세요, 반가워요!",
  },
  {
    id: "hangul",
    title: "한국어",
    mark: "한",
    description:
      "두벌식 자판으로 초성부터 받침까지. 조합 중에는 자모 단위로 지워집니다.",
    placeholder: "한글을 한 글자씩 눌러보세요",
    example: "매일 조금씩 더 나은 입력",
  },
  {
    id: "number",
    title: "숫자",
    mark: "123",
    description:
      "숫자와 소수점만 허용합니다. 붙여넣은 내용에도 같은 문자 규칙이 적용됩니다.",
    placeholder: "수량 또는 금액 입력",
    example: "12800",
  },
  {
    id: "tel",
    title: "전화번호",
    mark: "↗",
    description:
      "숫자와 +, *, #을 지원하는 다이얼 패드입니다. 붙여넣을 때 구분 기호를 제거합니다.",
    placeholder: "01012345678",
    example: "01012345678",
  },
  {
    id: "alpha",
    title: "영문",
    mark: "abc",
    description:
      "영문 알파벳만 입력합니다. Shift를 두 번 누르면 대문자 입력이 고정됩니다.",
    placeholder: "영문 이름 또는 태그",
    example: "HelloWorld",
  },
  {
    id: "alphanumeric",
    title: "영문 + 숫자",
    mark: "A1",
    description:
      "영문과 숫자로 구성된 코드에 사용해 보세요. 물리 키보드 입력도 지원합니다.",
    placeholder: "WELCOME2026",
    example: "WELCOME2026",
  },
  {
    id: "custom",
    title: "커스텀",
    mark: "⌘",
    description:
      "한 번에 여러 글자를 입력하는 매크로 키입니다. 키에 표시할 이름과 실제 값을 따로 설정할 수 있습니다.",
    placeholder: "빠른 문구를 선택해 보세요",
    example: "안녕하세요! 감사합니다. ",
  },
];
const macroLayout: KeypadLayout = [
  [
    { label: "인사", value: "안녕하세요! " },
    { label: "감사", value: "감사합니다. " },
    { label: "확인", value: "확인했습니다. " },
  ],
  [
    { label: "←", value: "ArrowLeft", type: "action" },
    { label: "공백", value: " ", type: "action" },
    { label: "⌫", value: "Backspace", type: "action" },
    { label: "완료", value: "Enter", type: "action" },
  ],
];

function App() {
  const [mode, setMode] = useState<InputMode>("text");
  const [values, setValues] = useState<Partial<Record<InputMode, string>>>({});
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [showKeyboard, setShowKeyboard] = useState(true);
  const [copyStatus, setCopyStatus] = useState("");
  const [codeStatus, setCodeStatus] = useState("");
  const active = modes.find((item) => item.id === mode)!;
  const value = values[mode] ?? "";
  const installation = "npm install @uiwwsw/virtual-keyboard";
  const code = `<VirtualInputProvider\n  keyboardVisibility="${showKeyboard ? "always" : "never"}"\n  theme="${theme}"\n>\n  <VirtualInput\n    mode="${mode}"${mode === "custom" ? "\n    layout={macroLayout}" : ""}\n    value={value}\n    onValueChange={setValue}\n    aria-label="입력 내용"\n    maxLength={48}\n  />\n</VirtualInputProvider>`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(installation);
      setCopyStatus("설치 명령어를 복사했습니다.");
    } catch {
      setCopyStatus("복사할 수 없습니다. 아래 명령어를 직접 선택해 주세요.");
    }
  };
  const copyExample = async () => {
    const example = `"use client";
import { useState } from "react";
import { VirtualInput, VirtualInputProvider${mode === "custom" ? ", type KeypadLayout" : ""} } from "@uiwwsw/virtual-keyboard";
${
  mode === "custom"
    ? `const macroLayout: KeypadLayout = ${JSON.stringify(macroLayout, null, 2)};
`
    : ""
}
export default function Example() {
  const [value, setValue] = useState("");
  return (
${code
  .split("\n")
  .map((line) => "    " + line)
  .join("\n")}
  );
}
`;
    try {
      await navigator.clipboard.writeText(example);
      setCodeStatus("실행 가능한 전체 예제를 복사했습니다.");
    } catch {
      setCodeStatus("복사할 수 없습니다. 코드를 직접 선택해 주세요.");
    }
  };
  return (
    <div className="app" data-theme={theme}>
      <a href="#playground" className="skip-link">
        키보드 체험으로 건너뛰기
      </a>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Virtual Keyboard 홈">
          <span className="brand-icon" aria-hidden="true">
            ▦
          </span>{" "}
          virtual<span>keyboard</span>
          <span className="version">React</span>
        </a>
        <nav aria-label="주요 메뉴">
          <a href="#guide">사용 방법</a>
          <a
            className="github-link"
            href="https://github.com/uiwwsw/virtual-keyboard"
            target="_blank"
            rel="noreferrer"
          >
            GitHub ↗
          </a>
        </nav>
      </header>
      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="status-dot" /> A SMALL KEYBOARD. MORE
              POSSIBILITIES.
            </p>
            <h1 id="hero-title">
              입력의 감각까지,
              <br />
              <em>직접 설계하세요.</em>
            </h1>
            <p className="lead">
              한글 조합부터 나만의 키패드까지.
              <br />
              웹에서 자연스럽게 이어지는 입력 경험을 만드세요.
            </p>
            <a className="primary-link" href="#playground">
              직접 눌러보기 <span>↓</span>
            </a>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="art-caption">
              <span>DESIGNED FOR YOUR INPUT</span>
              <span>01 / 07</span>
            </div>
            <div className="sample-word">
              ㅎ<span> + </span>ㅏ<span> + </span>ㄴ<span> = </span>
              <b>한</b>
              <i />
            </div>
            <div className="keycap-row">
              <span>ㅎ</span>
              <span>ㅏ</span>
              <span className="accent-key">ㄴ</span>
              <span>↵</span>
            </div>
            <div className="art-bottom">
              <span className="status-dot" /> 생각에서 글자로, 끊김 없이.
            </div>
          </div>
        </section>
        <div className="feature-strip">
          <span>
            <b>한글 조합</b> 초성부터 받침까지
          </span>
          <span>
            <b>7가지 모드</b> 입력에 맞춘 키패드
          </span>
          <span>
            <b>React 18 · 19</b> 간결한 컴포넌트 API
          </span>
        </div>
        <section
          id="playground"
          className="playground"
          aria-labelledby="playground-title"
        >
          <div className="section-heading">
            <div>
              <p className="eyebrow">PLAYGROUND</p>
              <h2 id="playground-title">눌러보면 알 수 있어요.</h2>
            </div>
            <div className="theme-switch" role="group" aria-label="테마">
              <button
                type="button"
                aria-pressed={theme === "light"}
                onClick={() => setTheme("light")}
              >
                ☀ 라이트
              </button>
              <button
                type="button"
                aria-pressed={theme === "dark"}
                onClick={() => setTheme("dark")}
              >
                ☾ 다크
              </button>
            </div>
          </div>
          <div className="workbench">
            <aside className="mode-rail">
              <p className="rail-label">INPUT MODES</p>
              <div className="mode-list" role="group" aria-label="입력 모드">
                {modes.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    aria-pressed={mode === item.id}
                    className="mode-button"
                    onClick={() => setMode(item.id)}
                  >
                    <span className="mode-mark">{item.mark}</span>
                    <span>{item.title}</span>
                    <span className="mode-arrow">↗</span>
                  </button>
                ))}
              </div>
              <p className="rail-note">
                필요한 문자만,
                <br />
                원하는 방식으로.
              </p>
            </aside>
            <div className="preview">
              <div className="panel-top">
                <span>
                  <span className="status-dot" /> LIVE PREVIEW
                </span>
                <span>직접 입력해 보세요</span>
              </div>
              <h3>{active.title}</h3>
              <p className="mode-description" id="mode-description">
                {active.description}
              </p>
              <VirtualInputProvider
                keyboardVisibility={showKeyboard ? "always" : "never"}
                theme={theme}
              >
                <div className="field-heading">
                  <label id="input-label">입력 내용</label>
                  <button
                    className="text-button"
                    type="button"
                    onClick={() =>
                      setValues((previous) => ({ ...previous, [mode]: "" }))
                    }
                    disabled={!value}
                  >
                    초기화 ↺
                  </button>
                </div>
                <VirtualInput
                  key={mode}
                  aria-labelledby="input-label"
                  aria-describedby="mode-description"
                  className="demo-input"
                  mode={mode}
                  layout={mode === "custom" ? macroLayout : undefined}
                  placeholder={active.placeholder}
                  value={value}
                  maxLength={48}
                  onValueChange={(next) =>
                    setValues((previous) => ({ ...previous, [mode]: next }))
                  }
                />
                <div className="field-meta">
                  <span>길게 눌러 선택 · 선택 범위를 조절하고 바로 복사</span>
                  <span>{value.length} / 48</span>
                </div>
                <div className="result">
                  <div>
                    <span className="code-label">VALUE</span>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() =>
                        setValues((previous) => ({
                          ...previous,
                          [mode]: active.example,
                        }))
                      }
                    >
                      예시 채우기 ↗
                    </button>
                  </div>
                  <output aria-label="현재 값">{JSON.stringify(value)}</output>
                </div>
                <label className="keyboard-toggle">
                  <input
                    type="checkbox"
                    checked={showKeyboard}
                    onChange={(event) => setShowKeyboard(event.target.checked)}
                  />
                  <span>화면에 가상 키보드 표시</span>
                </label>
              </VirtualInputProvider>
            </div>
            <div className="code-panel">
              <div className="code-heading">
                <span>React</span>
                <button
                  className="copy-code"
                  type="button"
                  onClick={copyExample}
                >
                  예제 복사 ⧉
                </button>
              </div>
              <pre>
                <code>{code}</code>
              </pre>
              <p role="status">
                {codeStatus || "선택한 모드와 테마가 코드에 바로 반영됩니다."}
              </p>
            </div>
          </div>
          <p className="playground-hint">
            <kbd>Tab</kbd> 입력란 이동 <span>·</span> <kbd>Shift</kbd> +{" "}
            <kbd>← →</kbd> 범위 선택 <span>·</span> <kbd>Esc</kbd> 키보드 닫기
          </p>
        </section>
        <section id="guide" className="guide" aria-labelledby="guide-title">
          <div>
            <p className="eyebrow">READY WHEN YOU ARE</p>
            <h2 id="guide-title">
              프로젝트에 더하는 건,
              <br />몇 줄이면 충분해요.
            </h2>
            <p>
              Provider로 감싸고 VirtualInput을 추가하세요.
              <br />
              기본 스타일과 키패드를 바로 사용할 수 있습니다.
            </p>
            <a
              href="https://github.com/uiwwsw/virtual-keyboard#usage"
              target="_blank"
              rel="noreferrer"
            >
              API 문서 살펴보기 ↗
            </a>
          </div>
          <div className="install-block">
            <div>
              <span>01 — INSTALL</span>
              <button type="button" onClick={copy}>
                명령어 복사 ⧉
              </button>
            </div>
            <code>{installation}</code>
            <p role="status">
              {copyStatus || "추가 스타일시트 없이 바로 시작하세요."}
            </p>
          </div>
        </section>
      </main>
      <footer>
        <a className="brand" href="#top">
          virtual<span>keyboard</span>
        </a>
        <span>Built for thoughtful input. · MIT License</span>
        <a
          href="https://github.com/uiwwsw/virtual-keyboard/issues"
          target="_blank"
          rel="noreferrer"
        >
          의견 남기기 ↗
        </a>
      </footer>
    </div>
  );
}
export default App;
