#!/usr/bin/env python3
"""Keyword search across all Markdown files in gemini-memory-kit/memory/."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path


def get_memory_dir() -> Path:
    """Return the memory directory relative to this script."""
    return Path(__file__).resolve().parent.parent / "memory"


def line_matches(
    line: str,
    keywords: list[str],
    *,
    case_sensitive: bool,
    match_all: bool,
) -> bool:
    haystack = line if case_sensitive else line.lower()
    needles = keywords if case_sensitive else [k.lower() for k in keywords]
    if match_all:
        return all(needle in haystack for needle in needles)
    return any(needle in haystack for needle in needles)


def search_file(
    file_path: Path,
    keywords: list[str],
    *,
    context: int,
    case_sensitive: bool,
    match_all: bool,
) -> list[tuple[int, list[tuple[int, str, bool]]]]:
    """Search a single Markdown file and return match blocks with context."""
    try:
        lines = file_path.read_text(encoding="utf-8", errors="replace").splitlines()
    except OSError as exc:
        sys.stderr.write(f"Error reading {file_path}: {exc}\n")
        return []

    matches: list[tuple[int, list[tuple[int, str, bool]]]] = []
    total_lines = len(lines)
    for idx, line in enumerate(lines):
        if line_matches(
            line,
            keywords,
            case_sensitive=case_sensitive,
            match_all=match_all,
        ):
            start = max(0, idx - context)
            end = min(total_lines, idx + context + 1)
            snippet = [
                (pos + 1, lines[pos], pos == idx) for pos in range(start, end)
            ]
            matches.append((idx + 1, snippet))
    return matches


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Search Markdown memory files for one or more keywords."
    )
    parser.add_argument(
        "keywords",
        nargs="+",
        help="One or more keywords to search for.",
    )
    parser.add_argument(
        "-c",
        "--context",
        type=int,
        default=2,
        help="Number of surrounding context lines to display (default: 2).",
    )
    parser.add_argument(
        "--case-sensitive",
        action="store_true",
        help="Enable case-sensitive matching.",
    )
    parser.add_argument(
        "--all",
        dest="match_all",
        action="store_true",
        help="Require all keywords to appear on the same line.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    memory_dir = get_memory_dir()
    if not memory_dir.is_dir():
        sys.stderr.write(f"Memory directory not found: {memory_dir}\n")
        return 1

    context_lines = max(0, args.context)
    md_files = sorted(memory_dir.glob("*.md"))
    total_matches = 0

    for md_file in md_files:
        file_matches = search_file(
            md_file,
            args.keywords,
            context=context_lines,
            case_sensitive=args.case_sensitive,
            match_all=args.match_all,
        )
        for line_no, snippet in file_matches:
            total_matches += 1
            print(f"=== {md_file.name}:{line_no} ===")
            for ctx_line_no, text, is_hit in snippet:
                marker = ">" if is_hit else " "
                print(f"{marker} {ctx_line_no:4d} | {text}")
            print()

    if total_matches == 0:
        print(f"No matches found for: {', '.join(args.keywords)}")
    else:
        print(f"Found {total_matches} match(es) across {len(md_files)} memory file(s).")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except BrokenPipeError:
        sys.stderr.close()
        raise SystemExit(0)
