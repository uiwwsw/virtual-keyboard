#!/usr/bin/env node
/** Carry the rights-holder notice into generated web and package artifacts. */
import { readFile, writeFile, readdir, access, mkdir } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const config = JSON.parse(await readFile(join(root, '.github/ai-notice.json'), 'utf8'));
if (config.exempt) { console.log('Profile repository is exempt from the shared AI notice.'); process.exit(0); }
const notice = await readFile(join(root, 'AI-TRAINING-NOTICE.md'), 'utf8');
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
    // Remove the former shared footer when processing an older build output.
    html = html.replace(/<details\b[^>]*data-ai-training-notice[^>]*>[\s\S]*?<\/details>/gi, '')
      .replace(/<link\b[^>]*href=["'][^"']*ai-training-notice\.css["'][^>]*>/gi, '');
    await writeFile(file, html);
    await writeFile(join(dirname(file), 'ai-training-notice.txt'), notice);
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
