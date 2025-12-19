import { useEffect, useState, memo } from "react";
import ReactDOM from "react-dom";

/**
 * @description 자식 요소를 Shadow DOM에 렌더링하는 최적화된 컴포넌트
 * @param children 렌더링할 React 노드
 * @param css 스타일을 문자열로 받아서 <style>로 삽입
 * @returns Shadow DOM 안에 children과 style을 렌더링
 */
export const ShadowWrapper = memo(
  (props: {
    children: React.ReactNode;
    css?: string;
    tagName: string;
    hostRef?: React.MutableRefObject<HTMLElement | null>;
  } & React.HTMLAttributes<HTMLElement>) => {
    const [host, setHost] = useState<HTMLElement | null>(null);
    const [shadowRoot, setShadowRoot] = useState<ShadowRoot | null>(null);
    const { tagName, css, children, hostRef, ...rest } = props;
    const Component = tagName as any;

    // host div가 마운트되면 shadowRoot를 생성합니다. 이 작업은 한 번만 실행됩니다.
    useEffect(() => {
      if (host && !shadowRoot) {
        const shadow = host.attachShadow({ mode: "open" });
        setShadowRoot(shadow);
      }
      if (hostRef) {
        hostRef.current = host;
      }
    }, [host, shadowRoot, hostRef]); // host가 설정될 때만 실행

    return (
      <Component ref={setHost} {...rest}>
        {shadowRoot &&
          ReactDOM.createPortal(
            <>
              {/* CSS를 React 엘리먼트로 직접 렌더링하여 선언적으로 관리 */}
              {css && <style>{css}</style>}
              {children}
            </>,
            shadowRoot
          )}
      </Component>
    );
  }
);

// displayName 설정 (디버깅 시 유용)
ShadowWrapper.displayName = "ShadowWrapper";
