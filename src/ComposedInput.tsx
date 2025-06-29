import { forwardRef, type InputHTMLAttributes, useRef } from "react";
export type ComposedInputProps = InputHTMLAttributes<HTMLInputElement>;
export const ComposedInput = forwardRef<HTMLInputElement, ComposedInputProps>(
	function ComposedInput(
		{
			onChange,
			onCompositionStart,
			onCompositionUpdate,
			onCompositionEnd,
			...props
		},
		ref,
	) {
		const isCmpositionRef = useRef<true>(null);

		return (
			<input
				{...props}
				onChange={(e) => {
					if (isCmpositionRef.current === null) {
						e.preventDefault();
						e.stopPropagation();
						return;
					}
					onChange?.(e);
				}}
				onCompositionStart={(e) => {
					isCmpositionRef.current = true;
					onCompositionStart?.(e);
				}}
				onCompositionUpdate={(e) => {
					isCmpositionRef.current = true;
					onCompositionUpdate?.(e);
				}}
				onCompositionEnd={(e) => {
					isCmpositionRef.current = true;
					onCompositionEnd?.(e);
				}}
				ref={ref}
			/>
		);
	},
);
ComposedInput.displayName = "ComposedInput";
