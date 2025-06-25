import type { InputHTMLAttributes } from "react";

export function ComposedInput(props: InputHTMLAttributes<HTMLInputElement>) {
	return <input {...props} />;
}
