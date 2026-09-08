import {
  createElement,
  useCallback,
  useState,
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

/** Reuse an existing root during StrictMode ref reattachment. */
export function ShadowWrapper({
  tagName,
  css,
  children,
  hostRef,
  ...props
}: HTMLAttributes<HTMLElement> & {
  tagName: string;
  css?: string;
  children: ReactNode;
  hostRef?: RefObject<HTMLElement | null>;
}) {
  const [root, setRoot] = useState<ShadowRoot | null>(null);
  const attach = useCallback(
    (host: HTMLElement | null) => {
      if (hostRef) hostRef.current = host;
      if (host) setRoot(host.shadowRoot ?? host.attachShadow({ mode: "open" }));
    },
    [hostRef],
  );
  return createElement(
    tagName,
    { ...props, ref: attach },
    root &&
      createPortal(
        <>
          {css && <style>{css}</style>}
          {children}
        </>,
        root,
      ),
  );
}
