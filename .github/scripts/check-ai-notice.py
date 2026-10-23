#!/usr/bin/env python3
"""Verify the cross-surface notice and voluntary training-crawler preferences."""
from pathlib import Path
import json
import re
import sys
from urllib.robotparser import RobotFileParser

root = Path(__file__).resolve().parents[2]
config = json.loads((root / '.github/ai-notice.json').read_text())
failures = []
notice_path = root / 'AI-TRAINING-NOTICE.md'
notice = notice_path.read_text() if notice_path.exists() else ''
for phrase in ['사전 서면 동의', 'prior written consent', 'does not amend existing', 'user-created content']:
    if phrase not in notice:
        failures.append('Root notice is missing its scope, consent or license clarification')
for path in root.glob('README*.md'):
    if 'AI-TRAINING-NOTICE.md' not in path.read_text():
        failures.append(str(path.relative_to(root)) + ': notice link missing')
for filename in config.get('assets', []):
    path = root / filename
    if not path.exists() or path.read_text() != notice:
        failures.append(filename + ': full notice asset missing or out of sync')
for filename in config.get('surfaces', []):
    path = root / filename
    text = path.read_text() if path.exists() else ''
    if not any(marker in text for marker in ['data-ai-training-notice', 'AiTrainingNotice', 'AI training notice', 'AI-TRAINING-NOTICE.md']):
        failures.append(filename + ': visible notice missing')
robots_sources = '\n'.join((root / filename).read_text() for filename in config.get('robots', []) if (root / filename).exists())
bots = ['GPTBot', 'ClaudeBot', 'Google-Extended', 'Applebot-Extended', 'CCBot']
for filename in config.get('robots', []):
    path = root / filename
    if not path.exists():
        failures.append(filename + ': robots source missing')
        continue
    if filename.endswith('robots.txt'):
        parser = RobotFileParser()
        parser.parse(path.read_text().splitlines())
        for bot in bots:
            if parser.can_fetch(bot, '/'):
                failures.append(filename + ': training crawler opt-out missing for ' + bot)
if config.get('robots') and not all(bot in robots_sources for bot in bots):
    failures.append('Generated robots source does not retain every configured training-crawler control')
for filename in config.get('packages', []):
    path = root / filename
    package = json.loads(path.read_text())
    if 'AI-TRAINING-NOTICE.md' not in package.get('files', []):
        failures.append(filename + ': package files omit the notice')
    if not (path.parent / 'AI-TRAINING-NOTICE.md').exists():
        failures.append(filename + ': distributed notice missing')
if '--built' in sys.argv:
    outputs = config.get('outputs', [])
    if outputs and not any((root / output).exists() for output in outputs):
        failures.append('declared build output missing: build at least one configured artifact before publication')
    for output in config.get('outputs', []):
        path = root / output
        if not path.exists():
            continue
        if not (path / 'ai-training-notice.txt').exists():
            failures.append(output + ': built notice missing')
        parser = RobotFileParser()
        robots = path / 'robots.txt'
        if not robots.exists():
            failures.append(output + ': built robots missing')
        else:
            parser.parse(robots.read_text().splitlines())
            if any(parser.can_fetch(bot, '/') for bot in bots):
                failures.append(output + ': built training-crawler opt-out missing')
for failure in failures:
    print('AI notice check: ' + failure)
print(f'AI notice check: {len(failures)} failure(s).')
sys.exit(bool(failures))
