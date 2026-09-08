export function isMobileAgent(userAgent?: string): boolean {
  if (userAgent !== undefined)
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      userAgent,
    );
  if (typeof navigator === "undefined") return false;
  return (
    isMobileAgent(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) ||
    (typeof window !== "undefined" &&
      !!window.matchMedia?.("(pointer: coarse)").matches)
  );
}
