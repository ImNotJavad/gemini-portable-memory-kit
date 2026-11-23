# Memory Relationship Graph

Lightweight directed map linking decisions, modules, bugs, and files. Keep under 150 lines.

[Decision] Markdown-Only Zero-Dependency Portable Storage
-> affects: memory storage and maintenance tools
-> replaces: ad-hoc session notes and external vector databases
-> related file: gemini-memory-kit/memory/decisions.md

[Decision] Portable Self-Contained Memory Kit Layout
-> affects: repository root and Gemini CLI integration
-> replaces: scattered project-specific prompt instructions
-> related file: GEMINI.md

[Decision] Safe AfterAgent Hook With Loop Protection
-> affects: Gemini CLI AfterAgent lifecycle
-> replaces: manual end-of-session memory reminders
-> related file: gemini-memory-kit/gemini/hooks/memory_check.py

[Decision] Cross-Platform Python Invocation in Settings
-> affects: hook execution on Windows, macOS, and Linux
-> replaces: OS-specific python3 or shell variable commands
-> related file: .gemini/settings.json

[Lesson] Prevent Infinite Loops in AfterAgent Hooks
-> affects: AfterAgent hook control flow
-> replaces: unconditional deny on dirty working tree
-> related file: gemini-memory-kit/gemini/hooks/memory_check.py

[Lesson] Handle Non-Git Directories Gracefully in Hooks
-> affects: AfterAgent hook Git inspection
-> replaces: unhandled subprocess failure in non-Git projects
-> related file: gemini-memory-kit/gemini/hooks/memory_check.py

[Decision] Confined Express API and React Knowledge Studio
-> affects: interactive memory visualization, search highlighting, and governance UI
-> replaces: CLI-only inspection of memory Markdown files
-> related file: src/components/MemoryVisualizer.tsx

[Decision] Inline Parenthetical Response Status Footer
-> affects: BeforeAgent context injection, AfterAgent review, and every agent response
-> replaces: separate web dashboard for routine memory status checks
-> related file: gemini-memory-kit/tools/status_line.py
