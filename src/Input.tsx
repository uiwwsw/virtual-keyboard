import { forwardRef, type InputHTMLAttributes } from "react";
import root from "react-shadow";
export type InputProps = InputHTMLAttributes<HTMLInputElement>;
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
	{
		onChange,
		onCompositionStart,
		onCompositionUpdate,
		onCompositionEnd,
		...props
	},
	ref,
) {
	return (
		<root.div {...props}>
			<span ref={ref} className="inline-flex min-w-64"></span>
		</root.div>
	);
});
Input.displayName = "Input";
