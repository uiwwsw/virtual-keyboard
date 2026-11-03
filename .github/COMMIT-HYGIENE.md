# Commit and public content hygiene

- Commit product behavior, reproducible setup, contributor guidance and honest limitations. Rewrite requested behavior as the final design; never copy personal commands, chat transcripts, approval or login progress, local handoffs, account status, or completion reports into tracked files or commit messages.
- Keep local work notes under `.local-notes/` (ignored). Keep credentials, signing keys, real environment files and private operational details out of Git, including agent instructions. Ignore rules do not untrack existing files or erase history.
- Public introductions must not describe the maintainer's active tokens, authentication mode, account configuration or secret inventory. Necessary contributor configuration uses placeholders and generic environment variable names in a dedicated guide; preserve legitimate product security documentation.
- Before every commit, inspect the exact staged diff and run `python3 .github/scripts/check-public-docs.py --staged`. Fix findings before committing; never bypass the check or print matched secret content. CI uses the same blocking check.
- Preserve unrelated changes. A discovered real credential must be removed from tracking and rotated by its owner; never claim that deleting a file revokes it or removes prior Git history.
