import { useMemo, useState, type ReactNode } from "react";
import "./App.css";
import { VirtualInput } from "./components/Input";
import { VirtualInputProvider } from "./components/Provider";
import type { KeypadLayout } from "./components/Keypad";

const numberPadLayout: KeypadLayout = [
  [
    { label: "1", value: "1", type: "char" },
    { label: "2", value: "2", type: "char" },
    { label: "3", value: "3", type: "char" },
  ],
  [
    { label: "4", value: "4", type: "char" },
    { label: "5", value: "5", type: "char" },
    { label: "6", value: "6", type: "char" },
  ],
  [
    { label: "7", value: "7", type: "char" },
    { label: "8", value: "8", type: "char" },
    { label: "9", value: "9", type: "char" },
  ],
  [
    { label: "·", value: ".", type: "char" },
    { label: "0", value: "0", type: "char" },
    { label: "⌫", value: "Backspace", type: "action" },
  ],
];

const dialerLayout: KeypadLayout = [
  [
    { label: "1", value: "1", type: "char" },
    { label: "2", value: "2", type: "char" },
    { label: "3", value: "3", type: "char" },
  ],
  [
    { label: "4", value: "4", type: "char" },
    { label: "5", value: "5", type: "char" },
    { label: "6", value: "6", type: "char" },
  ],
  [
    { label: "7", value: "7", type: "char" },
    { label: "8", value: "8", type: "char" },
    { label: "9", value: "9", type: "char" },
  ],
  [
    { label: "＊", value: "*", type: "char" },
    { label: "0", value: "0", type: "char" },
    { label: "#", value: "#", type: "char" },
  ],
  [
    { label: "저장된 010", value: "010", width: 2, type: "char" },
    { label: "⌫", value: "Backspace", type: "action" },
  ],
];

type ModeKey = "hangul" | "number" | "dialer";

const layoutModes: Record<ModeKey, {
  title: string;
  helper: string;
  layout?: KeypadLayout;
  defaultHangulMode?: boolean;
}> = {
  hangul: {
    title: "한/영 풀키보드",
    helper: "한국어 조합을 완벽히 처리하는 기본 QWERTY",
    layout: undefined,
    defaultHangulMode: true,
  },
  number: {
    title: "숫자 패드",
    helper: "계산기 · 결제 화면 · OTP 입력",
    layout: numberPadLayout,
    defaultHangulMode: false,
  },
  dialer: {
    title: "다이얼러 + 매크로 키",
    helper: "전화번호 전용 단축키와 함께",
    layout: dialerLayout,
    defaultHangulMode: false,
  },
};

function DemoCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <article className="demo-card">
      <div className="card-head">
        <div>
          <p className="eyebrow">데모</p>
          <h2>{title}</h2>
        </div>
        <p className="subtitle">{subtitle}</p>
      </div>
      {children}
    </article>
  );
}

function MobileShell({ children }: { children: ReactNode }) {
  return (
    <div className="mobile-shell">
      <div className="mobile-notch" />
      <div className="mobile-content">{children}</div>
    </div>
  );
}

function ModeButtons({
  active,
  onChange,
}: {
  active: ModeKey;
  onChange: (key: ModeKey) => void;
}) {
  return (
    <div className="mode-buttons">
      {(Object.keys(layoutModes) as ModeKey[]).map((mode) => (
        <button
          key={mode}
          type="button"
          className={`mode-button ${active === mode ? "is-active" : ""}`}
          onClick={() => onChange(mode)}
        >
          <span>{layoutModes[mode].title}</span>
          <small>{layoutModes[mode].helper}</small>
        </button>
      ))}
    </div>
  );
}

function App() {
  const [mode, setMode] = useState<ModeKey>("hangul");
  const activeLayout = layoutModes[mode];

  const modeDescription = useMemo(() => {
    switch (mode) {
      case "number":
        return "결제나 OTP 같이 숫자만 필요한 화면에서 네이티브 숫자 키패드를 완전히 대체합니다.";
      case "dialer":
        return "매크로 키와 전화번호 입력을 조합해 고객센터/사번 내선 같은 반복 입력을 빠르게 처리합니다.";
      default:
        return "표준 QWERTY 자판 위에 조합 로직을 올려 모바일 웹에서도 한글 타이핑을 안정적으로 유지합니다.";
    }
  }, [mode]);

  return (
    <div className="app-shell">
      <header className="hero">
        <p className="eyebrow">Virtual Keyboard Demo</p>
        <h1>
          모바일에서도 네이티브 키보드 대신<br /> 내가 만든 키보드를 띄우세요
        </h1>
        <p className="lead">
          한국어 조합 버그를 해결하고, 숫자/전화/OTP 등 상황별 맞춤 키패드를 구성할 수 있는 React 가상 키보드
          데모입니다.
        </p>
        <div className="hero-actions">
          <a className="btn primary" href="https://composed-input.vercel.app/" target="_blank" rel="noreferrer">
            새 창에서 전체 데모 열기 ↗
          </a>
          <span className="hint">실제 모바일 또는 DevTools 기기 모드에서 확인해보세요.</span>
        </div>
      </header>

      <section className="demo-grid">
        <DemoCard
          title="모바일 고정 키보드"
          subtitle="네이티브 키보드가 열리지 않고 가상 키보드만 보여집니다."
        >
          <MobileShell>
            <VirtualInputProvider>
              <div className="mobile-form">
                <label>
                  이름
                  <VirtualInput placeholder="홍길동" />
                </label>
                <label>
                  메모
                  <VirtualInput placeholder="오늘 일정 정리..." />
                </label>
                <p className="mobile-help">
                  모바일에서 접속하면 화면 하단에 이 라이브러리의 키보드만 표시됩니다.
                </p>
              </div>
            </VirtualInputProvider>
          </MobileShell>
        </DemoCard>

        <DemoCard
          title="모드 전환"
          subtitle="풀 키보드 ↔ 숫자 전용 ↔ 다이얼러를 즉시 바꿔보세요."
        >
          <ModeButtons active={mode} onChange={setMode} />
          <p className="mode-description">{modeDescription}</p>
          <VirtualInputProvider layout={activeLayout.layout} defaultHangulMode={activeLayout.defaultHangulMode}>
            <div className="mode-input">
              <VirtualInput placeholder="값을 입력하세요" />
            </div>
          </VirtualInputProvider>
        </DemoCard>
      </section>

      <section className="guide">
        <h3>모바일에서 테스트하는 방법</h3>
        <ol>
          <li>휴대폰으로 https://composed-input.vercel.app/ 에 접속합니다.</li>
          <li>입력 필드를 탭하면 네이티브 키보드가 차단되고, 커스텀 키보드가 화면 하단에서 등장합니다.</li>
          <li>개발자 도구 기기 모드에서도 User-Agent 를 모바일로 설정하면 동일한 동작을 확인할 수 있습니다.</li>
        </ol>
        <p>
          각 데모는 <code>VirtualInputProvider</code> 의 <code>layout</code> 속성만 바꿔서 구성했습니다. 필요한 모양을
          자유롭게 추가해보세요.
        </p>
      </section>
    </div>
  );
}

export default App;
