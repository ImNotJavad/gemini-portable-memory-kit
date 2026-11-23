# Decisions Memory

Confirmed technical, architectural, and process decisions. Active decisions require explicit user approval before deletion. Keep under 150 lines.

### [2026-11-22] Markdown-Only Zero-Dependency Portable Storage
- Type: decision
- Status: active
- Priority: critical
- Tags: memory, markdown, portability, stdlib
- Details: Store all durable project knowledge in plain Markdown files and implement all helper tools using only the Python 3 standard library without databases, cloud services, or vector stores.
- Reason: Ensures human readability, Git diffability, zero external setup friction, and long-term portability across Windows, macOS, and Linux.
- Related files: gemini-memory-kit/memory/, gemini-memory-kit/tools/
- Next action: None.
- Source: user
- Confidence: confirmed

### [2026-11-22] Safe AfterAgent Hook With Loop Protection
- Type: decision
- Status: active
- Priority: critical
- Tags: hooks, gemini-cli, safety, automation
- Details: Register an `AfterAgent` hook (`memory_check.py`) that inspects `git status --porcelain`, returns strict JSON, immediately allows completion when `stop_hook_active` is true or no changes exist, and denies once when working-tree changes need memory review.
- Reason: Prompts timely durable memory updates after real file edits while strictly preventing infinite hook loops or hook crashes.
- Related files: .gemini/settings.json, gemini-memory-kit/gemini/hooks/memory_check.py
- Next action: None.
- Source: user
- Confidence: confirmed

### [2026-11-22] Cross-Platform Python Invocation in Settings
- Type: decision
- Status: active
- Priority: high
- Tags: portability, windows, macos, linux, settings
- Details: Configure the hook command in `.gemini/settings.json` using `python` with a forward-slash relative path rather than `python3` or shell-specific environment variables.
- Reason: Maximizes compatibility across Windows, macOS, and Linux environments where `python3` may not exist on Windows.
- Related files: .gemini/settings.json, gemini-memory-kit/gemini/hooks/memory_check.py
- Next action: None.
- Source: user
- Confidence: confirmed

### [2026-11-23] Inline Parenthetical Response Status Footer
- Type: decision
- Status: active
- Priority: high
- Tags: hooks, status-footer, cli-first, english, memory
- Details: Compute verified project memory status via `tools/status_line.py`, inject it before every turn with `BeforeAgent` (`memory_before.py`), and append one concise English parenthetical status line at the end of every agent response.
- Reason: Eliminates the need for a separate web dashboard by surfacing live decisions, next open task, updated memory files, and silent-until-warning health alerts directly inside every prompt reply.
- Related files: .gemini/settings.json, gemini-memory-kit/gemini/GEMINI.md, gemini-memory-kit/gemini/hooks/memory_before.py, gemini-memory-kit/tools/status_line.py
- Next action: None.
- Source: user
- Confidence: confirmed
