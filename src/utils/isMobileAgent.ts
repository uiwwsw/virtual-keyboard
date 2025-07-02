export function isMobileAgent(
	userAgent: string = navigator.userAgent,
): boolean {
	const mobileRegex =
		/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
	return mobileRegex.test(userAgent);
}
