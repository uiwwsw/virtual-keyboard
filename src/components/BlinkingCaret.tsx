export function BlinkingCaret() {
  return (
    <span
      className="blink"
      style={{
        margin: "0 -0.12em",
        position: "absolute",
      }}
    >
      |
    </span>
  );
}
