/** biome-ignore-all lint/a11y/useFocusableInteractive: <explanation> */
import { isMobileAgent } from "../utils/isMobileAgent";
import { useInputContext } from "./Context";
import { useCallback, type MouseEvent } from "react";
import LAYOUT from "../assets/layout.json";
import { useStorage } from "../hooks/useStorage";
import { ShadowWrapper } from "./ShadowWrapper";

export type KeyboardName = "QWERTY" | "QWERTYKO";
export function Keyboard({ defaultLayout }: { defaultLayout?: KeyboardName }) {
  const [layout, setLayout] = useStorage(
    "virtual-keyboard-layout",
    defaultLayout
  );
  const { focusId, onBlur, onFocus, inputRef } = useInputContext();

  const handleFocus = useCallback(() => {
    if (!focusId) return;
    onFocus(focusId);
  }, [onFocus, focusId]);
  const insertCharacter = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      const target = e.target;
      if (!(target instanceof HTMLButtonElement)) return;

      const value = target.value;
      const event = new KeyboardEvent("keydown", {
        key: value,
        code: `Key${value.toUpperCase()}`,
        bubbles: true,
        cancelable: true,
      });
      inputRef.current?.handleKeyDown(event);
      const layout = target.dataset.layout;
      if (layout) setLayout(layout as KeyboardName);
    },
    [inputRef, setLayout]
  );
  if (!focusId || !isMobileAgent()) return null;
  return (
    <ShadowWrapper tagName={"virtual-keyboard" as "div"}>
      <div
        onFocus={handleFocus}
        onBlur={onBlur}
        tabIndex={-1}
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          height: 200,
          background: "gray",
        }}
      >
        {layout &&
          LAYOUT[layout]?.map((row, i) => (
            <div
              style={{
                display: "flex",
              }}
              key={i}
            >
              {row.map((cell, j) => (
                <button
                  type="button"
                  value={cell.value}
                  data-layout={cell.layout}
                  onClick={insertCharacter}
                  style={{ flex: 1 }}
                  key={`${i}-${j}`}
                >
                  {cell.label}
                </button>
              ))}
            </div>
          ))}
      </div>
    </ShadowWrapper>
  );
}
