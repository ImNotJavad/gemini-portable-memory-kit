#!/usr/bin/env python3
"""Compute a live, verified one-line parenthetical memory status summary.

Dependency-free Python 3 utility used directly from CLI or imported by hooks
so Gemini never guesses project memory counts, next tasks, or health alerts.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Any

HEADING_RE = re.compile(r"^\s*###\s+\[(\d{4}-\d{2}-\d{2})\]\s+(.+?)\s*$")
FIELD_RE = re.compile(r"^\s*-\s*([A-Za-z ]+?)\s*:\s*(.*?)\s*$")
OBSOLETE_RE = re.compile(r"^\s*-\s*Status\s*:\s*obsolete\b", re.IGNORECASE)

PRIORITY_RANK = {
    "critical": 0,
    "high": 1,
    "normal": 2,
    "low": 3,
}

PLACEHOLDER_VALUES = {
    "none",
    "null",
    "true",
    "false",
    "redacted",
    "changeme",
    "example",
    "placeholder",
    "your_api_key",
    "my_gemini_api_key",
    "test",
    "dummy",
}

SECRET_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("Private Key Block", re.compile(r"-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----")),
    ("Google API Key", re.compile(r"\bAIza[0-9A-Za-z\-_]{35}\b")),
    ("AWS Access Key ID", re.compile(r"\b(?:AKIA|ASIA)[0-9A-Z]{16}\b")),
    ("GitHub Token", re.compile(r"\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b")),
    ("Slack Token", re.compile(r"\bxox[baprs]-[A-Za-z0-9\-]{10,}\b")),
    ("GitLab Token", re.compile(r"\bglpat-[A-Za-z0-9\-_]{20,}\b")),
    ("Provider Secret Key", re.compile(r"\bsk-[A-Za-z0-9\-_]{20,}\b")),
    ("JWT Token", re.compile(r"\beyJ[A-Za-z0-9_\-]{10,}\.eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\b")),
    ("Bearer Token", re.compile(r"\bBearer\s+[A-Za-z0-9\-._~+/]{16,}=*\b")),
    ("URL Embedded Credentials", re.compile(r"[a-zA-Z][a-zA-Z0-9+.-]*://[^/\s:@]+:[^/\s@]+@[^\s]+")),
    (
        "API Key Assignment",
        re.compile(r"(?i)\b(?:api[_-]?key|secret[_-]?key|client[_-]?secret)\s*[:=]\s*['\"]?([A-Za-z0-9_\-\/+=]{8,})['\"]?"),
    ),
    (
        "Token Assignment",
        re.compile(r"(?i)\b(?:access[_-]?token|auth[_-]?token|refresh[_-]?token|token)\s*[:=]\s*['\"]?([A-Za-z0-9_\-\.\/+=]{8,})['\"]?"),
    ),
    (
        "Password Assignment",
        re.compile(r"(?i)\b(?:password|passwd|pwd)\s*[:=]\s*['\"]?([^\s'\"`]{4,})['\"]?"),
    ),
]


def _is_placeholder(value: str) -> bool:
    cleaned = value.strip().strip("'\"").lower()
    if cleaned in PLACEHOLDER_VALUES:
        return True
    if cleaned.startswith(("<", "${", "{{", "your_", "my_", "example_")):
        return True
    return bool(cleaned) and set(cleaned) <= {"*", "x", "."}


def _parse_entries(file_path: Path) -> list[dict[str, str]]:
    if not file_path.is_file():
        return []
    lines = file_path.read_text(encoding="utf-8", errors="replace").splitlines()
    entries: list[dict[str, str]] = []
    current_date = ""
    current_title = ""
    fields: dict[str, str] = {}

    def flush() -> None:
        if not current_title:
            return
        entries.append(
            {
                "date": current_date,
                "title": current_title,
                "status": fields.get("status", "active").strip().lower(),
                "priority": fields.get("priority", "normal").strip().lower(),
            }
        )

    for line in lines:
        heading_match = HEADING_RE.match(line)
        if heading_match:
            flush()
            current_date = heading_match.group(1)
            current_title = heading_match.group(2).strip()
            fields = {}
            continue
        if current_title:
            field_match = FIELD_RE.match(line)
            if field_match:
                fields[field_match.group(1).strip().lower()] = field_match.group(2).strip()
    flush()
    return entries


def _count_secrets(files: list[Path]) -> int:
    warnings = 0
    for path in files:
        if not path.is_file():
            continue
        for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
            for _name, pattern in SECRET_PATTERNS:
                match = pattern.search(line)
                if not match:
                    continue
                if match.groups() and _is_placeholder(match.group(1)):
                    continue
                warnings += 1
                break
    return warnings


def _read_git_changes(project_dir: Path) -> tuple[bool, list[str], list[str]]:
    """Return (git_available, updated_memory_files, changed_project_files)."""
    try:
        result = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=str(project_dir),
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=5,
            check=False,
        )
    except (OSError, subprocess.SubprocessError):
        return False, [], []

    if result.returncode != 0:
        return False, [], []

    updated_memory: list[str] = []
    changed_project: list[str] = []

    for raw_line in result.stdout.splitlines():
        if len(raw_line) < 4:
            continue
        path_part = raw_line[3:].strip()
        if " -> " in path_part:
            path_part = path_part.split(" -> ", 1)[1].strip()
        path_part = path_part.strip('"').replace("\\", "/")
        if not path_part:
            continue

        if path_part.startswith("gemini-memory-kit/memory/") or path_part == "gemini-memory-kit/AGENT_MEMORY.md":
            updated_memory.append(Path(path_part).name)
        else:
            changed_project.append(path_part)

    return True, sorted(set(updated_memory)), sorted(set(changed_project))


def _truncate(text: str, limit: int = 44) -> str:
    if len(text) <= limit:
        return text
    return text[: limit - 3].rstrip() + "..."


def collect_status(project_dir: Path) -> dict[str, Any]:
    """Inspect gemini-memory-kit and Git state for project_dir."""
    kit_dir = project_dir / "gemini-memory-kit"
    memory_dir = kit_dir / "memory"
    index_file = kit_dir / "AGENT_MEMORY.md"

    decisions = [
        e for e in _parse_entries(memory_dir / "decisions.md") if e["status"] == "active"
    ]
    open_tasks = [
        e for e in _parse_entries(memory_dir / "open-tasks.md") if e["status"] == "active"
    ]
    open_tasks.sort(
        key=lambda e: (
            PRIORITY_RANK.get(e["priority"], 2),
            -int(e["date"].replace("-", "")) if e["date"].replace("-", "").isdigit() else 0,
            e["title"].lower(),
        )
    )
    next_task = open_tasks[0]["title"] if open_tasks else ""

    memory_md_files = sorted(memory_dir.glob("*.md")) if memory_dir.is_dir() else []
    scan_targets = ([index_file] if index_file.is_file() else []) + memory_md_files

    obsolete_count = 0
    budget_warnings: list[str] = []

    if index_file.is_file():
        idx_lines = len(index_file.read_text(encoding="utf-8", errors="replace").splitlines())
        if idx_lines >= 85:
            budget_warnings.append(f"AGENT_MEMORY.md {idx_lines}/100")

    for md_file in memory_md_files:
        lines = md_file.read_text(encoding="utf-8", errors="replace").splitlines()
        if len(lines) >= 130:
            budget_warnings.append(f"{md_file.name} {len(lines)}/150")
        for line in lines:
            if OBSOLETE_RE.match(line):
                obsolete_count += 1

    secret_warnings = _count_secrets(scan_targets)
    git_available, updated_memory, changed_project = _read_git_changes(project_dir)

    if updated_memory:
        state = "synced"
    elif changed_project:
        state = "review needed"
    else:
        state = "loaded"

    alerts: list[str] = []
    if secret_warnings > 0:
        alerts.append(
            f"{secret_warnings} secret {'warning' if secret_warnings == 1 else 'warnings'}"
        )
    if budget_warnings:
        alerts.append(", ".join(budget_warnings[:2]))
    if obsolete_count > 0:
        alerts.append(f"{obsolete_count} obsolete")

    status_data: dict[str, Any] = {
        "state": state,
        "git_available": git_available,
        "updated_memory_files": updated_memory,
        "changed_project_files": changed_project,
        "active_decisions": len(decisions),
        "open_tasks": len(open_tasks),
        "next_task": next_task,
        "obsolete_count": obsolete_count,
        "secret_warnings": secret_warnings,
        "budget_warnings": budget_warnings,
        "alerts": alerts,
    }
    status_data["status_line"] = format_status_line(status_data, detailed=False)
    status_data["detailed_status_line"] = format_status_line(status_data, detailed=True)
    return status_data


def format_status_line(status: dict[str, Any], *, detailed: bool = False) -> str:
    """Render a crisp single-line English parenthetical status string."""
    parts: list[str] = [f"Memory: {status['state']}"]

    updated = status.get("updated_memory_files") or []
    changed = status.get("changed_project_files") or []

    if updated:
        shown = ", ".join(updated[:3])
        if len(updated) > 3:
            shown += f" +{len(updated) - 3}"
        parts.append(f"updated: {shown}")
    elif detailed or changed:
        if changed:
            count = len(changed)
            parts.append(f"changes: {count} {'file' if count == 1 else 'files'}")
        else:
            parts.append("updated: none")

    d_count = int(status.get("active_decisions", 0))
    t_count = int(status.get("open_tasks", 0))
    parts.append(
        f"{d_count} {'decision' if d_count == 1 else 'decisions'}, "
        f"{t_count} {'task' if t_count == 1 else 'tasks'}"
    )

    next_task = str(status.get("next_task") or "").strip()
    if next_task:
        parts.append(f"next: {_truncate(next_task)}")

    alerts = status.get("alerts") or []
    if alerts:
        parts.append(f"alert: {', '.join(alerts)}")
    else:
        parts.append("health: ok")

    return "(" + " | ".join(parts) + ")"


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Print a live one-line parenthetical status summary for Gemini Memory Kit."
    )
    parser.add_argument(
        "--cwd",
        default="",
        help="Project root directory (defaults to parent of gemini-memory-kit).",
    )
    parser.add_argument(
        "--detailed",
        action="store_true",
        help="Include explicit change/update summary even when unchanged.",
    )
    parser.add_argument(
        "--json",
        dest="as_json",
        action="store_true",
        help="Output machine-readable JSON instead of the parenthetical line.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.cwd:
        project_dir = Path(args.cwd).expanduser().resolve()
    else:
        project_dir = Path(__file__).resolve().parent.parent.parent

    if not (project_dir / "gemini-memory-kit").is_dir():
        project_dir = Path(os.getcwd()).resolve()

    if not (project_dir / "gemini-memory-kit").is_dir():
        sys.stderr.write(f"gemini-memory-kit not found under: {project_dir}\n")
        return 1

    status = collect_status(project_dir)
    if args.as_json:
        print(json.dumps(status, indent=2, ensure_ascii=True))
    else:
        print(format_status_line(status, detailed=args.detailed))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except BrokenPipeError:
        sys.stderr.close()
        raise SystemExit(0)
