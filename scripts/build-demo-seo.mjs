import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createServer } from "vite";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
const origin = "https://virtual-keyboard-uiwwsw.vercel.app",
  template = await readFile("demo-dist/index.html", "utf8");
const esc = (v) =>
  String(v)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll('"', "&quot;");
const usageConfig = {
  service: "virtual-keyboard",
  origin: "https://virtual-keyboard-uiwwsw.vercel.app",
  hosts: ["virtual-keyboard-uiwwsw.vercel.app"],
  routes: [
    { match: "^/$", path: "/", name: "home_ko" },
    { match: "^/en/?$", path: "/en/", name: "home_en" },
  ],
  sections: { top: "home", playground: "playground", guide: "guide" },
  controls: [
    "mode_text",
    "mode_hangul",
    "mode_number",
    "mode_tel",
    "mode_alpha",
    "mode_alphanumeric",
    "mode_custom",
  ],
  outbound: [
    { url: "https://github.com/uiwwsw/virtual-keyboard", name: "github" },
    {
      url: "https://www.npmjs.com/package/@uiwwsw/virtual-keyboard",
      name: "npm",
    },
  ],
};
const usageTag = `<script type="module" src="/usage-analytics.js" data-usage-config="${esc(JSON.stringify(usageConfig))}"></script>`;
for (const en of [false, true]) {
  const lang = en ? "en" : "ko",
    path = en ? "/en/" : "/";
  const title = en
    ? "React Virtual Keyboard — Custom Keypad & Korean Input"
    : "버추얼 키보드 — React 가상 키보드·한글 입력·숫자 키패드";
  const desc = en
    ? "An accessible React virtual keyboard with Korean Hangul composition, English input, numeric and phone keypads, custom layouts and paste policies. Try seven input modes in the live demo."
    : "한글 조합·영문·숫자·전화번호·커스텀 키패드를 지원하는 React 가상 키보드 라이브러리입니다. 7가지 입력 모드와 붙여넣기 정책을 데모에서 체험하세요.";
  const meta = `<title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><meta name="keywords" content="커스텀키보드, 가상 키보드, 리액트 키보드, 한글 입력, 한글 조합, 숫자 키패드, React virtual keyboard, custom keyboard, custom keypad, Korean Hangul input, on-screen keyboard, numeric keypad"><link rel="canonical" href="${origin}${path}"><link rel="alternate" hreflang="ko" href="${origin}/"><link rel="alternate" hreflang="en" href="${origin}/en/"><link rel="alternate" hreflang="x-default" href="${origin}/en/"><meta name="robots" content="index,follow,max-image-preview:large"><meta property="og:type" content="website"><meta property="og:site_name" content="React Virtual Keyboard"><meta property="og:locale" content="${en ? "en_US" : "ko_KR"}"><meta property="og:url" content="${origin}${path}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:image" content="${origin}/keyboard.svg"><meta name="twitter:card" content="summary"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${origin}/keyboard.svg"><script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "SoftwareApplication", name: "React Virtual Keyboard", alternateName: ["Virtual Keyboard", "버추얼 키보드", "가상 키보드"], description: desc, url: origin + path, inLanguage: lang, applicationCategory: "DeveloperApplication", operatingSystem: "Web", isAccessibleForFree: true, sameAs: ["https://github.com/uiwwsw/virtual-keyboard", "https://www.npmjs.com/package/@uiwwsw/virtual-keyboard"] }).replaceAll("<", "\\u003c")}</script>`;
  // Render the actual demo, not a different SEO-only page that flashes before React.
  const server = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
    define: { __DEMO_LOCALE__: JSON.stringify(lang) },
  });
  let content;
  try {
    const { default: App } = await server.ssrLoadModule("/src/App.tsx");
    content = renderToString(createElement(App));
  } finally {
    await server.close();
  }
  const html = template
    .replace(/<html lang="ko">/, `<html lang="${lang}">`)
    .replace(/<title>[\s\S]*?<\/title>/, "")
    .replace(/<meta\s+name="description"[\s\S]*?\/>/, "")
    .replace("</head>", meta + usageTag + "</head>")
    .replace('<div id="root"></div>', `<div id="root">${content}</div>`);
  await mkdir(`demo-dist${path}`, { recursive: true });
  await writeFile(`demo-dist${path}index.html`, html);
}
await writeFile(
  "demo-dist/robots.txt",
  `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`,
);
await writeFile(
  "demo-dist/sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${["/", "/en/"].map((p) => `<url><loc>${origin}${p}</loc><xhtml:link rel="alternate" hreflang="ko" href="${origin}/"/><xhtml:link rel="alternate" hreflang="en" href="${origin}/en/"/><xhtml:link rel="alternate" hreflang="x-default" href="${origin}/en/"/></url>`).join("")}</urlset>`,
);
await writeFile(
  "demo-dist/404.html",
  '<!doctype html><html lang="en"><meta name="robots" content="noindex"><title>Page not found</title><h1>Page not found</h1><a href="/">Virtual Keyboard</a></html>',
);
