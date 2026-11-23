# Gemini Portable Memory Kit v5 — Memory Rules

## Core Workflow
1. Read `gemini-memory-kit/AGENT_MEMORY.md` at the start of every task.
2. Open targeted files under `gemini-memory-kit/memory/` only when relevant to the task.
3. Update memory only after meaningful, durable, non-obvious changes (architecture changes, confirmed decisions, persistent constraints, recurring bugs/lessons, user preferences, or active open tasks).
4. Update `gemini-memory-kit/AGENT_MEMORY.md` only when the snapshot, active decisions, open tasks, or latest changes genuinely shift.
5. Keep `gemini-memory-kit/AGENT_MEMORY.md` under 100 lines and every file under `gemini-memory-kit/memory/` under 150 lines.

## Response Status Footer (Required on Every Prompt)
At the very end of every response, append exactly one short English status line enclosed in parentheses. Never clutter the main answer with extra status paragraphs.
- Prefer the live verified snapshot injected by `BeforeAgent` or produced by `python gemini-memory-kit/tools/status_line.py`; never fabricate counts.
- **Compact default** (normal turns without file changes):
  `(Memory: loaded | 3 decisions, 1 task | next: <short next task> | health: ok)`
- **Detailed** (when files or memory changed during the turn):
  `(Memory: synced | updated: decisions.md, graph.md | 4 decisions, 1 task | next: <short next task> | health: ok)`
- **Silent-until-warning health**: show `health: ok` when clean; replace with `alert: ...` only when a secret warning, near/over line budget (`>=85%`), or obsolete entry exists.
- Keep the entire project and status footer strictly in English.

## Strict Prohibition Rules
Never store any of the following in memory files:
- Secrets, API keys, passwords, tokens, certificates, private keys, or credentials.
- Personal or private user data not explicitly meant for project memory.
- Source code blocks, patches, diffs, stack traces, build logs, or terminal output.
- Ephemeral task chatter, temporary debug notes, or details easily derived from files or git history.

## Quality & Deduplication Rules
- Search existing memory before adding a new entry (`python gemini-memory-kit/tools/search_memory.py <keyword>`).
- Never create duplicate records; update the existing entry instead.
- When a new decision or fact supersedes an older one, mark the old entry `- Status: obsolete`, explain the replacement, and record the link in `memory/graph.md`.
- Follow all retention, safety, access, and deletion rules in `gemini-memory-kit/memory/policies.md`.
- Never delete an active decision without explicit user approval.

## Required Entry Format
Every entry in `architecture.md`, `decisions.md`, `user-preferences.md`, `bugs-and-lessons.md`, and `open-tasks.md` must use this exact structure:

### [YYYY-MM-DD] Short title
- Type: decision / constraint / lesson / open task / bug
- Status: active / obsolete
- Priority: critical / high / normal / low
- Tags: comma-separated-tags
- Details: Concise durable fact or decision.
- Reason: Why this matters or why it was chosen.
- Related files: Relative file paths affected.
- Next action: Follow-up step or None.
- Source: user / agent / test
- Confidence: confirmed / inferred

## Maintenance Tools
- Live status footer: `python gemini-memory-kit/tools/status_line.py [--detailed | --json]`
- Search memory: `python gemini-memory-kit/tools/search_memory.py <keywords...>`
- Inspect obsolete entries: `python gemini-memory-kit/tools/cleanup_memory.py`
- Refresh rolling summary: `python gemini-memory-kit/tools/summarize_memory.py`
- Audit for sensitive data: `python gemini-memory-kit/tools/govern_memory.py`
- Validate budgets & schema: `python gemini-memory-kit/tools/validate_memory.py`
- Install into another project: `python gemini-memory-kit/tools/install_kit.py <target-dir> [--fresh] [--dry-run]`
