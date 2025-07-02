export function BlinkingCaret() {
	return (
		<>
			<style>
				{`
        @keyframes blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        .blink {
          animation: blink 1s step-start infinite;
        }
      `}
			</style>
			<span
				className="blink"
				style={{
					margin: "0 -0.12em",
					position: "absolute",
				}}
			>
				|
			</span>
		</>
	);
}
