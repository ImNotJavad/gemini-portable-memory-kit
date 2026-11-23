#!/usr/bin/env python3
"""BeforeAgent hook for Gemini Portable Memory Kit v5.

Reads hook JSON from stdin, computes verified live memory status via
tools/status_line.py, and injects concise context so Gemini ends every
response with an accurate one-line English parenthetical status summary.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any


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


def load_status_summary(project_dir: Path) -> dict[str, Any] | None:
    """Import and execute status_line.collect_status safely."""
    tools_dir = project_dir / "gemini-memory-kit" / "tools"
    if not (tools_dir / "status_line.py").is_file():
        return None
    tools_str = str(tools_dir)
    if tools_str not in sys.path:
        sys.path.insert(0, tools_str)
    try:
        import status_line  # type: ignore[import-not-found]

        return status_line.collect_status(project_dir)
    except Exception:
        return None


def main() -> int:
    hook_data = read_hook_input()
    project_dir = resolve_cwd(hook_data)
    memory_kit_dir = project_dir / "gemini-memory-kit"

    if not memory_kit_dir.is_dir():
        emit(
            {
                "decision": "allow",
                "systemMessage": "gemini-memory-kit not found; status injection skipped.",
            }
        )
        return 0

    status = load_status_summary(project_dir)
    if not status:
        emit(
            {
                "decision": "allow",
                "systemMessage": "Memory kit loaded; status snapshot unavailable.",
            }
        )
        return 0

    line = status["status_line"]
    additional_context = (
        "Live Memory Kit Status Snapshot (verified before this turn):\n"
        f"{line}\n"
        "Instruction: At the very end of your response to the user, append exactly one "
        "short English status line in parentheses reflecting the true state at the end "
        "of your turn. If you did not modify memory files, reuse this verified line "
        "verbatim. If you updated any memory files during this turn, set `Memory: synced` "
        "and list the updated file name(s) under `updated: ...`."
    )

    emit(
        {
            "decision": "allow",
            "systemMessage": line,
            "hookSpecificOutput": {
                "hookEventName": "BeforeAgent",
                "additionalContext": additional_context,
            },
        }
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
