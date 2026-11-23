# Changelog

All notable changes to **Gemini Portable Memory Kit** will be documented in this file.

## [1.0.0] - 2026-11-23

### Added
- **Portable Markdown Memory Architecture (`gemini-memory-kit/`)**:
  - Compact root entry (`GEMINI.md`) importing `AGENT_MEMORY.md` (<100 lines) and `gemini/GEMINI.md`.
  - Structured topic files under `memory/`: `architecture.md`, `decisions.md`, `user-preferences.md`, `bugs-and-lessons.md`, `open-tasks.md`, `summaries.md`, `graph.md`, and `policies.md` (each budgeted under 150 lines).
- **Verified Inline Response Status System**:
  - `tools/status_line.py` computing live verified counts, top-priority next task, Git changes, and silent-until-warning health alerts.
  - `BeforeAgent` hook (`gemini/hooks/memory_before.py`) injecting the verified status snapshot before every turn.
  - Mandatory single-line English parenthetical response footer rule in `gemini/GEMINI.md`.
- **Safe Post-Turn Memory Review (`AfterAgent`)**:
  - `gemini/hooks/memory_check.py` checking `git status --porcelain`, returning strict JSON, and preventing infinite loops via `stop_hook_active`.
  - Cross-platform `.gemini/settings.json` invoking `python` across Windows, macOS, and Linux.
- **Zero-Dependency Python 3 Maintenance CLI Tools**:
  - `install_kit.py` (non-destructive project installer with `--fresh`, `--dry-run`, and safe JSON hook merging) and root `install-windows.bat` (interactive / drag-and-drop Windows wrapper with automatic post-install verification)
  - `search_memory.py` (keyword search with line numbers and surrounding context)
  - `cleanup_memory.py` (read-only `- Status: obsolete` scanner)
  - `summarize_memory.py` (dated rolling summary generator for `summaries.md`)
  - `govern_memory.py` (read-only secret and credential scanner)
  - `validate_memory.py` (line-budget, duplicate-title, and entry-schema validator)
- **Optional Local Knowledge Studio Web UI**:
  - Confined Express API (`server.ts`) and React + Tailwind dashboard featuring `MemoryVisualizer`, highlighted live search with last-5 query history, `RelationshipGraphView`, persistent `ProjectStatusBadge`, and `GovernancePanel` with task completion progress bar.
- **Bilingual GitHub Documentation**:
  - Complete English (`README.md`) and Persian (`README.fa.md`) guides plus MIT `LICENSE`.
