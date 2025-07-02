export function isHangul(char: string) {
	return /^[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]$/.test(char);
}
