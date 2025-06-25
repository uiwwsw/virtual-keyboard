import { forwardRef, type InputHTMLAttributes } from "react";

export const ComposedInput = forwardRef<
	HTMLInputElement,
	InputHTMLAttributes<HTMLInputElement>
>(function ComposedInput(props, ref) {
	return <input {...props} ref={ref} />;
});
