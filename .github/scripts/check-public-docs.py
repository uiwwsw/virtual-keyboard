#!/usr/bin/env python3
"""Block personal work notes in public content and recognizable credentials in tracked changes."""
import argparse
import os
from pathlib import PurePosixPath
import re
import subprocess


RULES = [
    ("personal-command", re.compile(r"사용자(?:의|가)?\s*(?:최신\s*)?(?:지시|요청으로|요청에 따라|요청:)|the user instructed|per the user.s request", re.I)),
    ("active-authentication", re.compile(r"(?:현재|사용 중|사용중).{0,30}(?:개인 세션 토큰|게시 토큰|PAT 인증)|(?:currently using|we use|maintainer uses).{0,30}(?:access token|PAT authentication)", re.I)),
    ("personal-path", re.compile(r"/Users/[^/\s]+/|/Volumes/|[A-Za-z]:\\Users\\")),
    ("request-history", re.compile(r"사용자(?:가|는|의)?\s*(?:요청했|요구했|요청에 따라|요청으로|요구:)|요청하신|the owner (?:asked|requested|clarified)|the user (?:asked|requested|clarified)", re.I)),
    ("session-handoff", re.compile(r"(?:owner|user) was asked to (?:unlock|log in|login)|(?:Mac|computer) (?:was|remained) locked|잠금\s*해제.{0,20}요청", re.I)),
    ("account-progress", re.compile(r"CAPTCHA.{0,60}(?:pending|completed|user)|(?:user|사용자).{0,60}CAPTCHA|(?:소유권 확인|소유확인|사이트맵 제출).{0,30}(?:완료했|보안절차|대기 중)", re.I)),
    ("personal-workflow", re.compile(r"이 Mac|관리자의 SSD|워크스페이스에서는.{0,30}devctl|Use the workspace devctl exec wrapper", re.I)),
]


SECRET_RULES = [
    ("credential", re.compile(r"(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|npm_[A-Za-z0-9]{30,}|sk-(?:proj-)?[A-Za-z0-9_-]{30,}|AKIA[A-Z0-9]{16})")),
    ("private-key", re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----")),
]


def sensitive_file(path):
    p = PurePosixPath(path)
    name = p.name.lower()
    if any(part.lower() in {'.private', '.secrets', '.local-notes'} for part in p.parts):
        return True
    return name in {"agents.md", "claude.md", "gemini.md"} or ((name == ".env" or name.startswith(".env.")) and not name.endswith((".example", ".sample", ".template"))) or p.suffix.lower() in {".p12", ".pfx", ".jks", ".keystore", ".p8", ".mobileprovision", ".provisionprofile"}


def public_file(path):
    p = PurePosixPath(path)
    if any(part in {".git", ".github", ".workspace", ".cursor", "node_modules", "reports", "test", "tests", "fixtures"} for part in p.parts):
        return False
    if p.name.lower() in {"agents.md", "claude.md", "gemini.md", "copilot-instructions.md"}:
        return False
    if p.name.endswith(("_test.dart", ".test.ts", ".test.tsx", ".test.js", ".test.mjs")):
        return False
    return p.name.lower().startswith("readme") or p.suffix.lower() in {".md", ".mdx", ".rst", ".txt", ".html", ".tsx", ".jsx", ".vue", ".svelte", ".dart"}


def git(*args):
    return subprocess.check_output(["git", *args], text=True, encoding="utf-8", errors="replace")


def scan(base=None, head="HEAD", staged=False, all_tracked=False):
    args = ["diff", "--no-ext-diff", "--no-color", "--unified=0", "--diff-filter=ACMR"]
    args += ["--cached"] if staged else [base, head]
    names = (git("ls-files", "-z") if all_tracked else git(*args[:1], "--name-only", "-z", *args[1:])).split("\0")
    text_paths = set(git("grep", "--cached", "-I", "-l", "-z", "-e", "").split("\0")) if all_tracked else None
    findings = []
    for path in filter(None, names):
        if sensitive_file(path):
            findings.append((path, 1, "private-file"))
        if all_tracked:
            if path not in text_paths:
                continue
            try:
                content = git("show", ":" + path)
            except subprocess.CalledProcessError:
                raise RuntimeError("Cannot inspect tracked content") from None
            lines = enumerate(content.splitlines(), 1)
        else:
            patch = git(*args, "--", path)
            added = []
            line_number = None
            for line in patch.splitlines():
                hunk = re.match(r"@@ .* \+(\d+)(?:,\d+)? @@", line)
                if hunk:
                    line_number = int(hunk[1])
                elif line_number is not None and line.startswith("+"):
                    added.append((line_number, line[1:]))
                    line_number += 1
                elif line_number is not None and line.startswith(" "):
                    line_number += 1
            lines = added
        for number, line in lines:
            rules = SECRET_RULES + (RULES if public_file(path) else [])
            for rule, pattern in rules:
                if pattern.search(line):
                    findings.append((path, number, rule))
    return findings


def escape(value, property=False):
    value = str(value).replace("%", "%25").replace("\r", "%0D").replace("\n", "%0A")
    return value.replace(",", "%2C").replace(":", "%3A") if property else value


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", help="Compare added lines against this Git revision")
    parser.add_argument("--head", default="HEAD")
    parser.add_argument("--staged", action="store_true", help="Inspect the staged diff instead")
    parser.add_argument("--all-tracked", action="store_true", help="Audit every tracked file in the index")
    args = parser.parse_args()
    if sum([bool(args.staged), bool(args.base), bool(args.all_tracked)]) > 1:
        parser.error("Choose --staged or --base")
    base = args.base
    if not args.staged and not base and not args.all_tracked:
        parser.error("Specify --staged or --base REV")
    if base and re.fullmatch("0+", base):
        base = subprocess.check_output(["git", "hash-object", "-t", "tree", "--stdin"], input=b"").decode().strip()
    findings = scan(base, args.head, args.staged, args.all_tracked)
    for path, line, rule in findings:
        message = f"Commit hygiene violation ({rule}); remove private content or rewrite as reader-facing product facts. Matched content withheld."
        if os.environ.get("GITHUB_ACTIONS") == "true":
            print(f"::error file={escape(path, True)},line={line},title=Public documentation review::{escape(message)}")
        else:
            print(f"{path}:{line}: error [{rule}]: {message}")
    print(f"Commit hygiene review: {len(findings)} finding(s). No matched content printed.")
    return 1 if findings else 0


if __name__ == "__main__":
    raise SystemExit(main())
