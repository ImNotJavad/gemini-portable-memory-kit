#!/usr/bin/env python3
"""AfterAgent hook for Gemini Portable Memory Kit v5.

Reads hook JSON from stdin, checks for Git file changes safely, and instructs
Gemini to review durable memory once per agent turn without risking loops.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any

DENY_REASON = (
    "File changes were detected in this repository. Before finishing, perform a quick "
    "memory review: (1) Review the changed files. (2) Update the relevant file under "
    "gemini-memory-kit/memory/ only if there is durable, non-obvious knowledge to record. "
    "(3) Update gemini-memory-kit/AGENT_MEMORY.md only if needed. (4) Mark obsolete or "
    "remove duplicate entries in accordance with memory/policies.md. (5) Never store "
    "secrets, tokens, passwords, code, logs, or temporary details. (6) End your final "
    "response with the single-line English parenthetical status footer reflecting any "
    "memory files updated. (7) If no durable memory update is needed, finish normally."
)


def emit(payload: dict[str, Any]) -> None:
    """Write strict JSON output to stdout and flush."""
    sys.stdout.write(json.dumps(payload, ensure_ascii=True) + "\n")
    sys.stdout.flush()


def read_hook_input() -> dict[str, Any]:
    """Read and parse JSON payload from stdin safely."""
    try:
        raw = sys.stdin.read()
    except Exception:
        return {}
    if not raw or not raw.strip():
        return {}
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return {}
    return data if isinstance(data, dict) else {}


def resolve_cwd(hook_data: dict[str, Any]) -> Path:
    """Resolve the project working directory from hook input or current process."""
    cwd_value = hook_data.get("cwd")
    if isinstance(cwd_value, str) and cwd_value.strip():
        candidate = Path(cwd_value).expanduser()
        if candidate.is_dir():
            return candidate.resolve()
    return Path(os.getcwd()).resolve()


def has_git_changes(project_dir: Path) -> bool:
    """Return True if git status --porcelain reports working tree changes."""
    try:
        result = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=str(project_dir),
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=10,
            check=False,
        )
    except (OSError, subprocess.SubprocessError):
        return False

    if result.returncode != 0:
        return False
    return bool(result.stdout.strip())


def build_live_status_hint(project_dir: Path) -> str:
    """Return formatted detailed status line if tools/status_line.py is available."""
    tools_dir = project_dir / "gemini-memory-kit" / "tools"
    if not (tools_dir / "status_line.py").is_file():
        return ""
    tools_str = str(tools_dir)
    if tools_str not in sys.path:
        sys.path.insert(0, tools_str)
    try:
        import status_line  # type: ignore[import-not-found]

        status = status_line.collect_status(project_dir)
        return f" Current verified status: {status['detailed_status_line']}"
    except Exception:
        return ""


def main() -> int:
    hook_data = read_hook_input()

    if bool(hook_data.get("stop_hook_active")):
        emit(
            {
                "decision": "allow",
                "systemMessage": (
                    "Memory review already performed; allowing turn to finish."
                ),
            }
        )
        return 0

    project_dir = resolve_cwd(hook_data)
    memory_kit_dir = project_dir / "gemini-memory-kit"
    if not memory_kit_dir.is_dir():
        emit(
            {
                "decision": "allow",
                "systemMessage": (
                    "gemini-memory-kit not found; memory update skipped."
                ),
            }
        )
        return 0

    if not has_git_changes(project_dir):
        emit(
            {
                "decision": "allow",
                "systemMessage": (
                    "No file changes detected; memory update not required."
                ),
            }
        )
        return 0

    reason = DENY_REASON + build_live_status_hint(project_dir)
    emit({"decision": "deny", "reason": reason})
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
