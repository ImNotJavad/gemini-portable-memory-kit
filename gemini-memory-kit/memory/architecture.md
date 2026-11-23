# Architecture Memory

Durable architectural structure, boundaries, and portability constraints. Keep under 150 lines.

### [2026-11-22] Portable Self-Contained Memory Kit Layout
- Type: decision
- Status: active
- Priority: high
- Tags: architecture, portability, gemini-cli, memory
- Details: All durable memory files, governance rules, hook scripts, and maintenance utilities live inside `gemini-memory-kit/`, wired into a host repository via root `GEMINI.md` and `.gemini/settings.json`.
- Reason: Keeps the memory system drop-in portable across any project without altering existing application source files or dependencies.
- Related files: GEMINI.md, .gemini/settings.json, gemini-memory-kit/AGENT_MEMORY.md
- Next action: None.
- Source: user
- Confidence: confirmed

### [2026-11-22] Two-Tier Memory Loading Model
- Type: constraint
- Status: active
- Priority: high
- Tags: architecture, context-window, indexing, memory
- Details: Root `GEMINI.md` imports only the compact `AGENT_MEMORY.md` index and `gemini/GEMINI.md` rules; detailed topic files under `memory/` are loaded on demand.
- Reason: Minimizes baseline prompt token usage while ensuring critical decisions, tasks, and governance rules are always loaded.
- Related files: GEMINI.md, gemini-memory-kit/AGENT_MEMORY.md, gemini-memory-kit/gemini/GEMINI.md
- Next action: Keep `AGENT_MEMORY.md` under 100 lines and each `memory/*.md` file under 150 lines.
- Source: user
- Confidence: confirmed

### [2026-11-22] Confined Express API and React Knowledge Studio
- Type: decision
- Status: active
- Priority: high
- Tags: architecture, ui, search, express, security
- Details: Serve memory Markdown files through allowlisted, path-confined `/api/memory/*` Express endpoints (`server.ts`) consumed by `MemoryVisualizer`, `MemorySearchBar`, `RelationshipGraphView`, and `GovernancePanel`.
- Reason: Enables live visual exploration, highlighted keyword search, and governance audits directly from real Markdown files without shell execution or path traversal risk.
- Related files: server.ts, src/lib/memoryParser.ts, src/components/MemoryVisualizer.tsx, src/components/MemorySearchBar.tsx
- Next action: None.
- Source: user
- Confidence: confirmed
