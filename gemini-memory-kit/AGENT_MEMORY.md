# Agent Memory Index

## Project Snapshot
- Kit: Gemini Portable Memory Kit v5
- Purpose: Portable, durable, searchable, governed Markdown memory system for Gemini CLI.
- Storage: Local Markdown files under `gemini-memory-kit/memory/` with zero external dependencies.
- Last Reviewed: 2026-11-23

## Memory File Index
- `memory/architecture.md` — System structure, module boundaries, and portability invariants.
- `memory/decisions.md` — Confirmed technical and process decisions with rationale.
- `memory/user-preferences.md` — Stable workflow, tooling, and output preferences.
- `memory/bugs-and-lessons.md` — Resolved pitfalls, failure modes, and operational lessons.
- `memory/open-tasks.md` — Active follow-up work and deferred engineering tasks.
- `memory/summaries.md` — Rolling condensed summary of high-priority active memory.
- `memory/graph.md` — Lightweight relationship map across decisions, modules, and files.
- `memory/policies.md` — Retention, safety, access, and deletion governance rules.

## Active Decisions
- [2026-11-22] Markdown-only zero-dependency portable memory kit (`memory/decisions.md`)
- [2026-11-22] Safe AfterAgent hook with stop_hook_active loop guard (`memory/decisions.md`)
- [2026-11-22] Cross-platform python invocation in settings.json (`memory/decisions.md`)
- [2026-11-23] Inline parenthetical English response status via `BeforeAgent` and `status_line.py` (`memory/decisions.md`)

## Open Tasks
- [2026-11-22] Record project-specific architecture and decisions as application work progresses (`memory/open-tasks.md`)

## Latest Changes
- 2026-11-23: Prepared v1.0.0 GitHub release with portable non-destructive installer (`tools/install_kit.py`, `install-windows.bat`), bilingual documentation (`README.md`, `README.fa.md`), `CHANGELOG.md`, and MIT `LICENSE`.
- 2026-11-23: Added live verified inline parenthetical status system (`tools/status_line.py`, `BeforeAgent` hook `memory_before.py`, updated `memory_check.py`, `.gemini/settings.json`, and `gemini/GEMINI.md` footer rules).
- 2026-11-22: Initialized Gemini Portable Memory Kit v5 with memory files, governance policies, relationship graph, AfterAgent hook, and stdlib CLI tools.
