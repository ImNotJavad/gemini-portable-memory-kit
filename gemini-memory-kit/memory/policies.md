# Memory Governance Policies

Rules governing retention, safety, access, and deletion for Gemini Portable Memory Kit v5. Keep under 150 lines.

## 1. Retention Rules
- Store only durable, non-obvious knowledge: confirmed decisions, architectural constraints, recurring bugs/lessons, stable user preferences, and active open tasks.
- Enforce strict size budgets: `AGENT_MEMORY.md` must stay under 100 lines; every file under `memory/` must stay under 150 lines.
- Condense high-priority active knowledge into `memory/summaries.md` using `tools/summarize_memory.py` whenever major decisions or lessons change.
- Do not retain temporary debugging output, ephemeral task chatter, raw source code, diffs, stack traces, or facts trivially recoverable from the repository.

## 2. Safety Rules
- Never store secrets, API keys, passwords, bearer/OAuth tokens, private keys, certificates, connection strings with credentials, or private personal data.
- Never let maintenance scripts silently modify or delete memory entries except `summarize_memory.py`, which regenerates only `memory/summaries.md`.
- Run `python gemini-memory-kit/tools/govern_memory.py` before committing memory updates to verify no sensitive patterns were introduced.
- If a secret is ever discovered in a memory file, remove it immediately, rotate the exposed credential, and inspect Git history if already committed.

## 3. Access Rules
- All memory files are repository-scoped plain text readable by the user and Gemini CLI during normal project tasks.
- Gemini CLI reads `AGENT_MEMORY.md` at task start and opens specific `memory/*.md` files only as needed.
- Memory tools operate strictly on local files inside `gemini-memory-kit/` with zero network calls, external services, or telemetry.

## 4. Deletion Rules
- **Active decisions require explicit user approval before deletion.**
- When an active decision is superseded, mark it `- Status: obsolete`, reference the replacement in its details and `memory/graph.md`, and keep it until reviewed.
- Obsolete entries (`- Status: obsolete`) may be archived or removed during planned maintenance after inspecting them with `python gemini-memory-kit/tools/cleanup_memory.py`.
- Completed open tasks may be marked `- Status: obsolete` or removed once any durable outcomes are captured in `decisions.md`, `architecture.md`, or `bugs-and-lessons.md`.
