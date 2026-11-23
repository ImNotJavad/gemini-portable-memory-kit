# User Preferences Memory

Durable user preferences for workflow, formatting, safety, and tooling. Keep under 150 lines.

### [2026-11-22] Non-Destructive File Creation and Strict Hygiene
- Type: constraint
- Status: active
- Priority: high
- Tags: preferences, safety, hygiene, memory
- Details: Prefer minimal, readable, production-ready artifacts with zero unnecessary files, no overwrites of existing project files, and concise status reporting.
- Reason: Keeps repositories clean, predictable, and safe when copying the memory kit into existing projects.
- Related files: gemini-memory-kit/memory/policies.md, gemini-memory-kit/gemini/GEMINI.md
- Next action: None.
- Source: user
- Confidence: confirmed

### [2026-11-22] Strict No-Secrets and No-Noise Memory Policy
- Type: constraint
- Status: active
- Priority: critical
- Tags: preferences, security, governance, memory
- Details: Never record secrets, credentials, source code dumps, terminal logs, or easily recoverable implementation details in memory files.
- Reason: Prevents credential leakage into version control and preserves high signal-to-noise ratio in agent context.
- Related files: gemini-memory-kit/memory/policies.md, gemini-memory-kit/tools/govern_memory.py
- Next action: Run `govern_memory.py` during periodic memory maintenance.
- Source: user
- Confidence: confirmed

### [2026-11-23] English-Only Project and CLI-First Inline Status
- Type: constraint
- Status: active
- Priority: high
- Tags: preferences, english, cli-first, status-footer
- Details: Keep the entire project, memory entries, tools, and end-of-response parenthetical status summaries strictly in English without requiring a separate website UI.
- Reason: Matches user workflow inside Gemini CLI and keeps the portable memory kit self-contained across repositories.
- Related files: gemini-memory-kit/gemini/GEMINI.md, gemini-memory-kit/tools/status_line.py
- Next action: None.
- Source: user
- Confidence: confirmed
