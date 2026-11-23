#!/usr/bin/env python3
"""Generate or update memory/summaries.md from active decisions and lessons."""

from __future__ import annotations

import datetime
import re
import sys
from dataclasses import dataclass
from pathlib import Path

HEADING_RE = re.compile(r"^\s*###\s+\[(\d{4}-\d{2}-\d{2})\]\s+(.+?)\s*$")
FIELD_RE = re.compile(r"^\s*-\s*([A-Za-z ]+?)\s*:\s*(.*?)\s*$")

PRIORITY_ORDER = {
    "critical": 0,
    "high": 1,
    "normal": 2,
    "low": 3,
}

MAX_DECISIONS = 12
MAX_LESSONS = 12
MAX_TOTAL_LINES = 145


@dataclass
class MemoryEntry:
    date: str
    title: str
    entry_type: str
    status: str
    priority: str
    details: str
    source_file: str


def get_memory_dir() -> Path:
    """Return the memory directory relative to this script."""
    return Path(__file__).resolve().parent.parent / "memory"


def parse_active_entries(file_path: Path) -> list[MemoryEntry]:
    """Parse structured memory entries and return only active entries."""
    if not file_path.is_file():
        return []

    lines = file_path.read_text(encoding="utf-8", errors="replace").splitlines()
    entries: list[MemoryEntry] = []
    current_date = ""
    current_title = ""
    fields: dict[str, str] = {}

    def flush() -> None:
        if not current_title:
            return
        status = fields.get("status", "").strip().lower()
        if status != "active":
            return
        priority = fields.get("priority", "normal").strip().lower()
        if priority not in PRIORITY_ORDER:
            priority = "normal"
        entries.append(
            MemoryEntry(
                date=current_date,
                title=current_title,
                entry_type=fields.get("type", "").strip().lower(),
                status=status,
                priority=priority,
                details=fields.get("details", "").strip(),
                source_file=file_path.name,
            )
        )

    for line in lines:
        heading_match = HEADING_RE.match(line)
        if heading_match:
            flush()
            current_date = heading_match.group(1)
            current_title = heading_match.group(2)
            fields = {}
            continue

        if current_title:
            field_match = FIELD_RE.match(line)
            if field_match:
                key = field_match.group(1).strip().lower()
                value = field_match.group(2).strip()
                fields[key] = value

    flush()
    return entries


def rank_entries(entries: list[MemoryEntry], limit: int) -> list[MemoryEntry]:
    """Sort entries by priority (highest first) then newest date first."""
    ranked = sorted(
        entries,
        key=lambda e: (
            PRIORITY_ORDER.get(e.priority, 2),
            -int(e.date.replace("-", "")) if e.date.replace("-", "").isdigit() else 0,
            e.title.lower(),
        ),
    )
    return ranked[:limit]


def format_bullet(entry: MemoryEntry) -> str:
    detail = entry.details if entry.details else "No details recorded."
    if len(detail) > 220:
        detail = detail[:217].rstrip() + "..."
    return f"- [{entry.date}] ({entry.priority}) {entry.title}: {detail}"


def build_summary_markdown(
    today: str,
    decisions: list[MemoryEntry],
    lessons: list[MemoryEntry],
) -> str:
    """Build concise rolling summary Markdown staying strictly under 150 lines."""
    top_titles = [e.title for e in (decisions[:2] + lessons[:1])]
    if top_titles:
        highlights = "; ".join(top_titles)
        overview = (
            f"Tracking {len(decisions)} active decision(s) and "
            f"{len(lessons)} active bug/lesson record(s). "
            f"Top priorities: {highlights}."
        )
    else:
        overview = (
            "No active decisions or lessons recorded yet. "
            "Add durable entries to `decisions.md` and `bugs-and-lessons.md`."
        )

    lines: list[str] = [
        "# Rolling Memory Summary",
        "",
        f"Last Updated: {today}",
        "",
        "## Current Summary",
        overview,
        "",
        "## Key Active Decisions",
    ]

    if decisions:
        for entry in decisions:
            lines.append(format_bullet(entry))
    else:
        lines.append("- None recorded.")

    lines.extend(["", "## Key Active Bugs & Lessons"])
    if lessons:
        for entry in lessons:
            lines.append(format_bullet(entry))
    else:
        lines.append("- None recorded.")

    if len(lines) > MAX_TOTAL_LINES:
        lines = lines[:MAX_TOTAL_LINES]

    return "\n".join(lines) + "\n"


def main() -> int:
    memory_dir = get_memory_dir()
    if not memory_dir.is_dir():
        sys.stderr.write(f"Memory directory not found: {memory_dir}\n")
        return 1

    decisions_file = memory_dir / "decisions.md"
    lessons_file = memory_dir / "bugs-and-lessons.md"
    summaries_file = memory_dir / "summaries.md"

    active_decisions = rank_entries(
        parse_active_entries(decisions_file),
        limit=MAX_DECISIONS,
    )
    active_lessons = rank_entries(
        parse_active_entries(lessons_file),
        limit=MAX_LESSONS,
    )

    today = datetime.date.today().isoformat()
    content = build_summary_markdown(today, active_decisions, active_lessons)
    summaries_file.write_text(content, encoding="utf-8")

    print(
        f"Updated {summaries_file.name} ({today}) with "
        f"{len(active_decisions)} active decision(s) and "
        f"{len(active_lessons)} active bug/lesson entry(ies)."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
