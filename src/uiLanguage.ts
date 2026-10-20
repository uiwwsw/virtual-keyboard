import messages from "./uiMessages.json";
export const uiLanguage =
  typeof window !== "undefined" &&
  /^\/en(?:\/|$)/.test(window.location.pathname)
    ? "en"
    : "ko";
export function translate(text: string, locale: "ko" | "en"): string {
  return locale === "en"
    ? ((messages as Record<string, string>)[text] ?? text)
    : text;
}
export function t(text: string): string {
  return translate(text, uiLanguage);
}
