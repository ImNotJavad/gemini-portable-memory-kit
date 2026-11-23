#!/usr/bin/env python3
"""Validate Gemini Portable Memory Kit v5 structure, line budgets, and entry schema."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ENTRY_FILES = {
    "architecture.md",
    "decisions.md",
    "user-preferences.md",
    "bugs-and-lessons.md",
    "open-tasks.md",
}
REQUIRED_FIELDS = {
    "type",
    "status",
    "priority",
    "tags",
    "details",
    "reason",
    "related files",
    "next action",
    "source",
    "confidence",
}
HEADING_RE = re.compile(r"^\s*###\s+\[(\d{4}-\d{2}-\d{2})\]\s+(.+?)\s*$")
FIELD_RE = re.compile(r"^\s*-\s*([A-Za-z ]+?)\s*:\s*(.*?)\s*$")


def get_kit_dir() -> Path:
    return Path(__file__).resolve().parent.parent


def validate_kit(kit_dir: Path) -> list[str]:
    issues: list[str] = []
    project_dir = kit_dir.parent

    index_file = kit_dir / "AGENT_MEMORY.md"
    if not index_file.is_file():
        issues.append("Missing AGENT_MEMORY.md")
    else:
        index_lines = len(index_file.read_text(encoding="utf-8", errors="replace").splitlines())
        if index_lines >= 100:
            issues.append(f"AGENT_MEMORY.md exceeds 100-line budget ({index_lines} lines)")

    settings_file = project_dir / ".gemini" / "settings.json"
    if settings_file.is_file():
        try:
            json.loads(settings_file.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            issues.append(f".gemini/settings.json invalid JSON: {exc}")

    memory_dir = kit_dir / "memory"
    if not memory_dir.is_dir():
        issues.append("Missing memory/ directory")
        return issues

    seen_titles: dict[str, str] = {}
    for md_file in sorted(memory_dir.glob("*.md")):
        lines = md_file.read_text(encoding="utf-8", errors="replace").splitlines()
        if len(lines) >= 150:
            issues.append(f"memory/{md_file.name} exceeds 150-line budget ({len(lines)} lines)")

        if md_file.name not in ENTRY_FILES:
            continue

        current_title = ""
        current_fields: set[str] = set()

        def flush() -> None:
            if not current_title:
                return
            missing = sorted(REQUIRED_FIELDS - current_fields)
            if missing:
                issues.append(
                    f"memory/{md_file.name} entry '{current_title}' missing fields: {', '.join(missing)}"
                )

        for line in lines:
            match = HEADING_RE.match(line)
            if match:
                flush()
                current_title = match.group(2).strip()
                key = current_title.lower()
                if key in seen_titles:
                    issues.append(
                        f"Duplicate entry title '{current_title}' in memory/{md_file.name} "
                        f"(already in {seen_titles[key]})"
                    )
                else:
                    seen_titles[key] = f"memory/{md_file.name}"
                current_fields = set()
                continue
            if current_title:
                fmatch = FIELD_RE.match(line)
                if fmatch:
                    current_fields.add(fmatch.group(1).strip().lower())
        flush()

    return issues


def main() -> int:
    kit_dir = get_kit_dir()
    issues = validate_kit(kit_dir)
    if not issues:
        print("Validation passed: all memory files comply with line budgets and schema rules.")
        return 0
    for issue in issues:
        print(f"ISSUE: {issue}")
    print(f"\nFound {len(issues)} validation issue(s).")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
