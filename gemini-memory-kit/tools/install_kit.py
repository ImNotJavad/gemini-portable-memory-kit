#!/usr/bin/env python3
"""Portable non-destructive installer for Gemini Portable Memory Kit.

Copies the memory kit into any target project without overwriting existing files,
wires root GEMINI.md imports safely, and merges .gemini/settings.json hooks.
"""

from __future__ import annotations

import argparse
import datetime
import json
import shutil
import sys
from pathlib import Path
from typing import Any

REQUIRED_IMPORTS = [
    "@./gemini-memory-kit/AGENT_MEMORY.md",
    "@./gemini-memory-kit/gemini/GEMINI.md",
]

ROOT_GEMINI_TEMPLATE = """# Project Memory Instructions

At the start of every task, read `gemini-memory-kit/AGENT_MEMORY.md` to load current project context.
Follow all memory governance, formatting, and maintenance rules defined in `gemini-memory-kit/gemini/GEMINI.md`.

@./gemini-memory-kit/AGENT_MEMORY.md
@./gemini-memory-kit/gemini/GEMINI.md
"""

HOOK_DEFINITIONS: dict[str, dict[str, Any]] = {
    "BeforeAgent": {
        "matcher": "*",
        "hooks": [
            {
                "name": "memory-status-context",
                "type": "command",
                "command": "python gemini-memory-kit/gemini/hooks/memory_before.py",
                "timeout": 10000,
            }
        ],
    },
    "AfterAgent": {
        "matcher": "*",
        "hooks": [
            {
                "name": "memory-check",
                "type": "command",
                "command": "python gemini-memory-kit/gemini/hooks/memory_check.py",
                "timeout": 15000,
            }
        ],
    },
}


def build_fresh_templates(today: str) -> dict[str, str]:
    """Return clean starter Markdown files for a brand-new host project."""
    return {
        "AGENT_MEMORY.md": (
            "# Agent Memory Index\n\n"
            "## Project Snapshot\n"
            "- Kit: Gemini Portable Memory Kit v1.0.0\n"
            "- Storage: Local Markdown files under `gemini-memory-kit/memory/`.\n"
            f"- Last Reviewed: {today}\n\n"
            "## Memory File Index\n"
            "- `memory/architecture.md` — System structure and boundaries.\n"
            "- `memory/decisions.md` — Confirmed technical and process decisions.\n"
            "- `memory/user-preferences.md` — Stable workflow and tooling preferences.\n"
            "- `memory/bugs-and-lessons.md` — Resolved pitfalls and lessons learned.\n"
            "- `memory/open-tasks.md` — Active follow-up engineering work.\n"
            "- `memory/summaries.md` — Rolling condensed summary of active memory.\n"
            "- `memory/graph.md` — Relationship map across decisions, modules, and files.\n"
            "- `memory/policies.md` — Retention, safety, access, and deletion rules.\n\n"
            "## Active Decisions\n"
            "- None recorded yet.\n\n"
            "## Open Tasks\n"
            "- None recorded yet.\n\n"
            "## Latest Changes\n"
            f"- {today}: Installed Gemini Portable Memory Kit.\n"
        ),
        "memory/architecture.md": (
            "# Architecture Memory\n\n"
            "Durable architectural structure, boundaries, and constraints. Keep under 150 lines.\n"
        ),
        "memory/decisions.md": (
            "# Decisions Memory\n\n"
            "Confirmed decisions. Active decisions require explicit user approval before deletion. Keep under 150 lines.\n"
        ),
        "memory/user-preferences.md": (
            "# User Preferences Memory\n\n"
            "Durable workflow, formatting, safety, and tooling preferences. Keep under 150 lines.\n"
        ),
        "memory/bugs-and-lessons.md": (
            "# Bugs and Lessons Memory\n\n"
            "Durable root causes, recurring pitfalls, and operational lessons. Keep under 150 lines.\n"
        ),
        "memory/open-tasks.md": (
            "# Open Tasks Memory\n\n"
            "Active follow-up engineering work and deferred items. Keep under 150 lines.\n"
        ),
        "memory/summaries.md": (
            "# Rolling Memory Summary\n\n"
            f"Last Updated: {today}\n\n"
            "## Current Summary\n"
            "Memory kit initialized. Run `python gemini-memory-kit/tools/summarize_memory.py` after adding decisions or lessons.\n\n"
            "## Key Active Decisions\n"
            "- None recorded.\n\n"
            "## Key Active Bugs & Lessons\n"
            "- None recorded.\n"
        ),
        "memory/graph.md": (
            "# Memory Relationship Graph\n\n"
            "Lightweight directed map linking decisions, modules, bugs, and files. Keep under 150 lines.\n"
        ),
    }


def _hook_already_registered(event_entries: list[Any], command: str) -> bool:
    for entry in event_entries:
        if not isinstance(entry, dict):
            continue
        hooks = entry.get("hooks")
        if not isinstance(hooks, list):
            continue
        for hook in hooks:
            if isinstance(hook, dict) and hook.get("command") == command:
                return True
    return False


def install_settings_json(target_dir: Path, *, dry_run: bool) -> None:
    settings_path = target_dir / ".gemini" / "settings.json"
    rel_display = ".gemini/settings.json"

    if not settings_path.exists():
        payload = {"hooks": {k: [v] for k, v in HOOK_DEFINITIONS.items()}}
        if not dry_run:
            settings_path.parent.mkdir(parents=True, exist_ok=True)
            settings_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        print(f"CREATE {rel_display}")
        return

    try:
        existing = json.loads(settings_path.read_text(encoding="utf-8"))
        if not isinstance(existing, dict):
            raise ValueError("settings.json root must be a JSON object")
    except Exception as exc:
        print(f"SKIP {rel_display} (could not parse existing JSON: {exc})")
        return

    hooks_obj = existing.setdefault("hooks", {})
    if not isinstance(hooks_obj, dict):
        print(f"SKIP {rel_display} (existing 'hooks' field is not an object)")
        return

    changed = False
    for event_name, hook_block in HOOK_DEFINITIONS.items():
        cmd = hook_block["hooks"][0]["command"]
        event_list = hooks_obj.setdefault(event_name, [])
        if not isinstance(event_list, list):
            continue
        if not _hook_already_registered(event_list, cmd):
            event_list.append(hook_block)
            changed = True

    if changed:
        if not dry_run:
            settings_path.write_text(json.dumps(existing, indent=2) + "\n", encoding="utf-8")
        print(f"MERGE {rel_display}")
    else:
        print(f"SKIP {rel_display}")


def install_root_gemini_md(target_dir: Path, *, dry_run: bool) -> None:
    gemini_path = target_dir / "GEMINI.md"
    if not gemini_path.exists():
        if not dry_run:
            gemini_path.write_text(ROOT_GEMINI_TEMPLATE, encoding="utf-8")
        print("CREATE GEMINI.md")
        return

    content = gemini_path.read_text(encoding="utf-8", errors="replace")
    missing = [imp for imp in REQUIRED_IMPORTS if imp not in content]
    if not missing:
        print("SKIP GEMINI.md")
        return

    addition = "\n\n# Project Memory Kit Imports\n" + "\n".join(missing) + "\n"
    if not dry_run:
        gemini_path.write_text(content.rstrip() + addition, encoding="utf-8")
    print("MERGE GEMINI.md")


def install_kit(source_kit_dir: Path, target_dir: Path, *, fresh: bool, dry_run: bool) -> int:
    if not source_kit_dir.is_dir():
        sys.stderr.write(f"Source gemini-memory-kit not found: {source_kit_dir}\n")
        return 1

    target_dir = target_dir.resolve()
    if not dry_run:
        target_dir.mkdir(parents=True, exist_ok=True)

    today = datetime.date.today().isoformat()
    fresh_templates = build_fresh_templates(today) if fresh else {}

    dest_kit_dir = target_dir / "gemini-memory-kit"
    for src_file in sorted(source_kit_dir.rglob("*")):
        if src_file.is_dir():
            continue
        if "__pycache__" in src_file.parts or src_file.suffix == ".pyc":
            continue

        rel_inside_kit = src_file.relative_to(source_kit_dir).as_posix()
        dest_file = dest_kit_dir / rel_inside_kit
        display_path = f"gemini-memory-kit/{rel_inside_kit}"

        if dest_file.exists():
            print(f"SKIP {display_path}")
            continue

        if not dry_run:
            dest_file.parent.mkdir(parents=True, exist_ok=True)
            if fresh and rel_inside_kit in fresh_templates:
                dest_file.write_text(fresh_templates[rel_inside_kit], encoding="utf-8")
            else:
                shutil.copy2(src_file, dest_file)
        print(f"CREATE {display_path}")

    install_root_gemini_md(target_dir, dry_run=dry_run)
    install_settings_json(target_dir, dry_run=dry_run)
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Install Gemini Portable Memory Kit safely into any target project."
    )
    parser.add_argument(
        "target",
        help="Path to the target project directory.",
    )
    parser.add_argument(
        "--fresh",
        action="store_true",
        help="Initialize clean empty starter memory files instead of copying current project entries.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview files that would be created, merged, or skipped without writing anything.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    source_kit_dir = Path(__file__).resolve().parent.parent
    return install_kit(
        source_kit_dir,
        Path(args.target),
        fresh=args.fresh,
        dry_run=args.dry_run,
    )


if __name__ == "__main__":
    raise SystemExit(main())
