# Rolling Memory Summary

Last Updated: 2026-11-23

## Current Summary
Tracking 4 active decision(s) and 2 active bug/lesson record(s). Top priorities: Markdown-Only Zero-Dependency Portable Storage; Safe AfterAgent Hook With Loop Protection; Prevent Infinite Loops in AfterAgent Hooks.

## Key Active Decisions
- [2026-11-22] (critical) Markdown-Only Zero-Dependency Portable Storage: Store all durable project knowledge in plain Markdown files and implement all helper tools using only the Python 3 standard library without databases, cloud services, or vector stores.
- [2026-11-22] (critical) Safe AfterAgent Hook With Loop Protection: Register an `AfterAgent` hook (`memory_check.py`) that inspects `git status --porcelain`, returns strict JSON, immediately allows completion when `stop_hook_active` is true or no changes exist, and denies once when wo...
- [2026-11-23] (high) Inline Parenthetical Response Status Footer: Compute verified project memory status via `tools/status_line.py`, inject it before every turn with `BeforeAgent` (`memory_before.py`), and append one concise English parenthetical status line at the end of every agen...
- [2026-11-22] (high) Cross-Platform Python Invocation in Settings: Configure the hook command in `.gemini/settings.json` using `python` with a forward-slash relative path rather than `python3` or shell-specific environment variables.

## Key Active Bugs & Lessons
- [2026-11-22] (critical) Prevent Infinite Loops in AfterAgent Hooks: An AfterAgent hook that denies completion whenever Git has uncommitted edits will loop forever unless it checks `stop_hook_active` first and immediately returns `allow`.
- [2026-11-22] (high) Handle Non-Git Directories Gracefully in Hooks: If a workspace is not initialized as a Git repository or `git` is unavailable, `git status --porcelain` exits non-zero; the hook must catch errors and return valid JSON `allow`.
