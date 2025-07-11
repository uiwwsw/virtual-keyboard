/** biome-ignore-all lint/a11y/useFocusableInteractive: <explanation> */
import { isMobileAgent } from "../utils/isMobileAgent";
import qwerty from "../assets/qwerty.json";
import { useInputContext } from "./Context";

export function Keyboard() {
  const { isFocused, insertCharacter, handleFocus, handleBlur } =
    useInputContext();

  if (!isFocused || !isMobileAgent()) return null;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: <explanation>
    <div
      data-virtual-keyboard="true"
      onFocus={handleFocus}
      onBlur={handleBlur}
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
      {qwerty.rows.map((row, i) => (
        <div
          style={{
            display: "flex",
          }}
          key={i}
        >
          {row.map((cell, j) => (
            <button
              type="button"
              onClick={() => insertCharacter(cell.value)}
              style={{ flex: 1 }}
              key={`${i}-${j}`}
            >
              {cell.label}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
