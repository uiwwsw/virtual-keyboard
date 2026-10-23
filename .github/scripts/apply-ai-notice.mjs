#!/usr/bin/env node
/** Carry the rights-holder notice into generated web and package artifacts. */
import { readFile, writeFile, readdir, access, mkdir } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const config = JSON.parse(await readFile(join(root, '.github/ai-notice.json'), 'utf8'));
const notice = await readFile(join(root, 'AI-TRAINING-NOTICE.md'), 'utf8');
const short = '사전 서면 동의 없는 AI 학습·미세조정 및 학습용 데이터 수집에 반대합니다.';
const english = 'No AI training, fine-tuning or training-data collection without prior written consent.';
const footer = `<details data-ai-training-notice="true" class="ai-training-notice"><summary>AI 학습·수집 반대 · AI training opt-out</summary><p>${short}</p><p lang="en">${english}</p><p>기존 라이선스와 제삼자·사용자 콘텐츠의 권리는 유지됩니다. Existing licenses and third-party/user rights remain unchanged.</p><a href="./ai-training-notice.txt">전문 · Full notice</a></details>`;
const css = '.ai-training-notice{box-sizing:border-box;max-width:72rem;margin:1rem auto;padding:.75rem 1rem;font:inherit;font-size:.875rem;line-height:1.6;overflow-wrap:anywhere}.ai-training-notice summary{cursor:pointer;min-height:2.75rem;display:list-item;align-content:center}.ai-training-notice p{margin:.5rem 0}.ai-training-notice a{color:inherit;text-decoration:underline}@media print{.ai-training-notice{display:none!important}}\n';
const bots = ['GPTBot', 'ClaudeBot', 'Google-Extended', 'Applebot-Extended', 'CCBot'];
const robotBlock = '\n# AI training and training-data collection opt-out\n' + bots.map(bot => `User-agent: ${bot}\nDisallow: /\n`).join('\n');
async function exists(path) { try { await access(path); return true; } catch { return false; } }
const ignored = new Set(['node_modules', '.git', 'vendor', 'fixtures', 'sandbox', 'runner', 'worker']);
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory() && !ignored.has(entry.name)) await walk(file);
    if (!entry.isFile() || !entry.name.endsWith('.html')) continue;
    let html = await readFile(file, 'utf8');
    if (!/<!doctype html|<html[\s>]/i.test(html)) continue;
    if (!html.includes('data-ai-training-notice')) {
      html = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, footer + '\n</body>') : html.replace(/<\/html>/i, footer + '\n</html>');
    }
    if (!html.includes('ai-training-notice.css')) {
      html = /<\/head>/i.test(html) ? html.replace(/<\/head>/i, '<link rel="stylesheet" href="./ai-training-notice.css">\n</head>') : html.replace(/<html[^>]*>/i, '$&<head><link rel="stylesheet" href="./ai-training-notice.css"></head>');
    }
    await writeFile(file, html);
    await writeFile(join(dirname(file), 'ai-training-notice.txt'), notice);
    await writeFile(join(dirname(file), 'ai-training-notice.css'), css);
  }
}
let count = 0;
for (const output of config.outputs ?? []) {
  const directory = join(root, output);
  if (!await exists(directory)) continue;
  await writeFile(join(directory, 'ai-training-notice.txt'), notice);
  const robots = join(directory, 'robots.txt');
  let text = await exists(robots) ? await readFile(robots, 'utf8') : 'User-agent: *\nAllow: /\n';
  if (!text.includes('# AI training and training-data collection opt-out')) text = text.trimEnd() + '\n' + robotBlock;
  await writeFile(robots, text);
  await walk(directory);
  count++;
}
console.log(`AI notice retained in ${count} generated output root(s).`);
