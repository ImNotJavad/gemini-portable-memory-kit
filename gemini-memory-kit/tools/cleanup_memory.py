#!/usr/bin/env python3
"""Scan memory files for entries marked '- Status: obsolete' (read-only)."""

from __future__ import annotations

import re
import sys
from pathlib import Path

OBSOLETE_PATTERN = re.compile(r"^\s*-\s*Status\s*:\s*obsolete\b", re.IGNORECASE)
HEADING_PATTERN = re.compile(r"^\s*###\s+(.+?)\s*$")


def get_memory_dir() -> Path:
    """Return the memory directory relative to this script."""
    return Path(__file__).resolve().parent.parent / "memory"


def find_obsolete_entries(file_path: Path) -> list[tuple[int, str]]:
    """Return list of (line_number, entry_title) for obsolete entries in a file."""
    try:
        lines = file_path.read_text(encoding="utf-8", errors="replace").splitlines()
    except OSError as exc:
        sys.stderr.write(f"Error reading {file_path}: {exc}\n")
        return []

    obsolete: list[tuple[int, str]] = []
    current_heading = "(untitled entry)"

    for idx, line in enumerate(lines, start=1):
        heading_match = HEADING_PATTERN.match(line)
        if heading_match:
            current_heading = heading_match.group(1)
            continue

        if OBSOLETE_PATTERN.match(line):
            obsolete.append((idx, current_heading))

    return obsolete


def main() -> int:
    memory_dir = get_memory_dir()
    if not memory_dir.is_dir():
        sys.stderr.write(f"Memory directory not found: {memory_dir}\n")
        return 1

    md_files = sorted(memory_dir.glob("*.md"))
    files_with_obsolete = 0
    total_obsolete = 0

    for md_file in md_files:
        entries = find_obsolete_entries(md_file)
        if not entries:
            continue
        files_with_obsolete += 1
        total_obsolete += len(entries)
        print(f"{md_file.name}: {len(entries)} obsolete entry(ies)")
        for line_no, title in entries:
            print(f"  - line {line_no}: {title}")

    if total_obsolete == 0:
        print(f"No obsolete entries found across {len(md_files)} memory file(s).")
    else:
        print(
            f"\nSummary: {total_obsolete} obsolete entry(ies) found in "
            f"{files_with_obsolete} file(s). No files were modified."
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
