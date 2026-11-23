# Bugs and Lessons Memory

Durable root causes, recurring pitfalls, and verified operational lessons. Keep under 150 lines.

### [2026-11-22] Prevent Infinite Loops in AfterAgent Hooks
- Type: lesson
- Status: active
- Priority: critical
- Tags: hooks, loop-prevention, reliability, memory
- Details: An AfterAgent hook that denies completion whenever Git has uncommitted edits will loop forever unless it checks `stop_hook_active` first and immediately returns `allow`.
- Reason: Editing memory files during a review turn leaves the repository dirty, so checking `stop_hook_active` guarantees at most one review pass per turn.
- Related files: gemini-memory-kit/gemini/hooks/memory_check.py, .gemini/settings.json
- Next action: Preserve the `stop_hook_active` guard before any Git or filesystem checks.
- Source: agent
- Confidence: confirmed

### [2026-11-22] Handle Non-Git Directories Gracefully in Hooks
- Type: lesson
- Status: active
- Priority: high
- Tags: hooks, git, resilience, portability
- Details: If a workspace is not initialized as a Git repository or `git` is unavailable, `git status --porcelain` exits non-zero; the hook must catch errors and return valid JSON `allow`.
- Reason: Prevents hook failures or malformed stdout from blocking Gemini CLI turns in non-Git or freshly scaffolded directories.
- Related files: gemini-memory-kit/gemini/hooks/memory_check.py
- Next action: Keep non-zero Git exit handling and strict JSON-only stdout output intact.
- Source: test
- Confidence: confirmed
