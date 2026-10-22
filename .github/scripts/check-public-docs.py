#!/usr/bin/env python3
"""Warn about personal work notes in added public documentation/UI lines."""
import argparse
import os
from pathlib import PurePosixPath
import re
import subprocess


RULES = [
    ("personal-path", re.compile(r"/Users/[^/\s]+/|/Volumes/|[A-Za-z]:\\Users\\")),
    ("request-history", re.compile(r"사용자(?:가|는|의)?\s*(?:요청했|요구했|요청에 따라|요청으로|요구:)|요청하신|the owner (?:asked|requested|clarified)|the user (?:asked|requested|clarified)", re.I)),
    ("session-handoff", re.compile(r"(?:owner|user) was asked to (?:unlock|log in|login)|(?:Mac|computer) (?:was|remained) locked|잠금\s*해제.{0,20}요청", re.I)),
    ("account-progress", re.compile(r"CAPTCHA.{0,60}(?:pending|completed|user)|(?:user|사용자).{0,60}CAPTCHA|(?:소유권 확인|소유확인|사이트맵 제출).{0,30}(?:완료했|보안절차|대기 중)", re.I)),
    ("personal-workflow", re.compile(r"이 Mac|관리자의 SSD|워크스페이스에서는.{0,30}devctl|Use the workspace devctl exec wrapper", re.I)),
]


def public_file(path):
    p = PurePosixPath(path)
    lower = path.lower()
    if any(part in {".git", ".github", ".workspace", ".cursor", "node_modules", "reports", "test", "tests", "fixtures"} for part in p.parts):
        return False
    if p.name.lower() in {"agents.md", "claude.md", "gemini.md", "copilot-instructions.md"}:
        return False
    return p.name.lower().startswith("readme") or p.suffix.lower() in {".md", ".mdx", ".rst", ".txt", ".html", ".tsx", ".jsx", ".vue", ".svelte", ".dart"}


def git(*args):
    return subprocess.check_output(["git", *args], text=True, encoding="utf-8", errors="replace")


def scan(base=None, head="HEAD", staged=False):
    args = ["diff", "--no-ext-diff", "--no-color", "--unified=0", "--diff-filter=ACMR"]
    args += ["--cached"] if staged else [base, head]
    names = git(*args[:1], "--name-only", "-z", *args[1:]).split("\0")
    findings = []
    for path in filter(public_file, filter(None, names)):
        patch = git(*args, "--", path)
        line_number = None
        for line in patch.splitlines():
            hunk = re.match(r"@@ .* \+(\d+)(?:,\d+)? @@", line)
            if hunk:
                line_number = int(hunk[1])
            elif line_number is not None and line.startswith("+"):
                for rule, pattern in RULES:
                    if pattern.search(line[1:]):
                        findings.append((path, line_number, rule))
                line_number += 1
            elif line_number is not None and line.startswith(" "):
                line_number += 1
    return findings


def escape(value, property=False):
    value = str(value).replace("%", "%25").replace("\r", "%0D").replace("\n", "%0A")
    return value.replace(",", "%2C").replace(":", "%3A") if property else value


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", help="Compare added lines against this Git revision")
    parser.add_argument("--head", default="HEAD")
    parser.add_argument("--staged", action="store_true", help="Inspect the staged diff instead")
    args = parser.parse_args()
    if args.staged and args.base:
        parser.error("Choose --staged or --base")
    base = args.base
    if not args.staged and not base:
        parser.error("Specify --staged or --base REV")
    if base and re.fullmatch("0+", base):
        base = subprocess.check_output(["git", "hash-object", "-t", "tree", "--stdin"], input=b"").decode().strip()
    findings = scan(base, args.head, args.staged)
    for path, line, rule in findings:
        message = f"Review public wording ({rule}); keep reader-facing facts and move personal work notes out of public content."
        if os.environ.get("GITHUB_ACTIONS") == "true":
            print(f"::warning file={escape(path, True)},line={line},title=Public documentation review::{escape(message)}")
        else:
            print(f"{path}:{line}: warning [{rule}]: {message}")
    print(f"Public documentation review: {len(findings)} warning(s). Advisory only; no files changed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
