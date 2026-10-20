import { readFile, writeFile, mkdir } from "node:fs/promises";
const origin = "https://virtual-keyboard-uiwwsw.vercel.app",
  template = await readFile("demo-dist/index.html", "utf8");
const esc = (v) =>
  String(v)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll('"', "&quot;");
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
  const content = `<main><a href="/">한국어</a> <a href="/en/">English</a><h1>${esc(title)}</h1><p>${esc(desc)}</p><h2>${en ? "Custom React keyboard and Korean composition" : "리액트 커스텀 키보드와 한글 조합"}</h2><p>${en ? "Choose free text, Korean, English letters, alphanumeric, number, telephone or macro input. Configure keyboard visibility, light/dark themes and custom key labels. Keyboard labels and accessibility messages support Korean and English." : "자유 입력·한국어·영문·영문 숫자·숫자·전화번호·매크로 입력을 지원합니다. 가상 키보드 표시·라이트/다크 테마·키 라벨을 설정할 수 있고 키보드 조작 안내는 한·영으로 제공됩니다."}</p><a href="https://github.com/uiwwsw/virtual-keyboard/blob/main/${en ? "README.en.md" : "README.md"}">${en ? "Installation and API guide" : "설치·API 가이드"}</a><pre>npm install @uiwwsw/virtual-keyboard</pre></main>`;
  const html = template
    .replace(/<html lang="ko">/, `<html lang="${lang}">`)
    .replace(/<title>[\s\S]*?<\/title>/, "")
    .replace(/<meta\s+name="description"[\s\S]*?\/>/, "")
    .replace("</head>", meta + "</head>")
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
