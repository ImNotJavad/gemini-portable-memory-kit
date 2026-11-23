#!/usr/bin/env python3
"""Scan memory files for possible secrets or sensitive data (read-only)."""

from __future__ import annotations

import re
import sys
from pathlib import Path

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
    (
        "Private Key Block",
        re.compile(r"-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----"),
    ),
    (
        "Google API Key",
        re.compile(r"\bAIza[0-9A-Za-z\-_]{35}\b"),
    ),
    (
        "AWS Access Key ID",
        re.compile(r"\b(?:AKIA|ASIA)[0-9A-Z]{16}\b"),
    ),
    (
        "GitHub Token",
        re.compile(r"\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b"),
    ),
    (
        "Slack Token",
        re.compile(r"\bxox[baprs]-[A-Za-z0-9\-]{10,}\b"),
    ),
    (
        "GitLab Token",
        re.compile(r"\bglpat-[A-Za-z0-9\-_]{20,}\b"),
    ),
    (
        "OpenAI / Provider Secret Key",
        re.compile(r"\bsk-[A-Za-z0-9\-_]{20,}\b"),
    ),
    (
        "JWT Token",
        re.compile(
            r"\beyJ[A-Za-z0-9_\-]{10,}\.eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\b"
        ),
    ),
    (
        "Bearer Token",
        re.compile(r"\bBearer\s+[A-Za-z0-9\-._~+/]{16,}=*\b"),
    ),
    (
        "URL Embedded Credentials",
        re.compile(r"[a-zA-Z][a-zA-Z0-9+.-]*://[^/\s:@]+:[^/\s@]+@[^\s]+"),
    ),
    (
        "API Key Assignment",
        re.compile(
            r"(?i)\b(?:api[_-]?key|secret[_-]?key|client[_-]?secret)\s*[:=]\s*['\"]?([A-Za-z0-9_\-\/+=]{8,})['\"]?"
        ),
    ),
    (
        "Token Assignment",
        re.compile(
            r"(?i)\b(?:access[_-]?token|auth[_-]?token|refresh[_-]?token|token)\s*[:=]\s*['\"]?([A-Za-z0-9_\-\.\/+=]{8,})['\"]?"
        ),
    ),
    (
        "Password Assignment",
        re.compile(
            r"(?i)\b(?:password|passwd|pwd)\s*[:=]\s*['\"]?([^\s'\"`]{4,})['\"]?"
        ),
    ),
]


def get_kit_dir() -> Path:
    """Return the gemini-memory-kit root directory relative to this script."""
    return Path(__file__).resolve().parent.parent


def is_placeholder(value: str) -> bool:
    """Return True if a captured value looks like an obvious non-secret placeholder."""
    cleaned = value.strip().strip("'\"").lower()
    if cleaned in PLACEHOLDER_VALUES:
        return True
    if cleaned.startswith(("<", "${", "{{", "your_", "my_", "example_")):
        return True
    if set(cleaned) <= {"*", "x", "."}:
        return True
    return False


def scan_file(file_path: Path) -> list[tuple[int, str]]:
    """Scan a single file and return list of (line_number, rule_name) findings."""
    try:
        lines = file_path.read_text(encoding="utf-8", errors="replace").splitlines()
    except OSError as exc:
        sys.stderr.write(f"Error reading {file_path}: {exc}\n")
        return []

    findings: list[tuple[int, str]] = []
    for line_no, line in enumerate(lines, start=1):
        for rule_name, pattern in SECRET_PATTERNS:
            match = pattern.search(line)
            if not match:
                continue
            if match.groups():
                captured = match.group(1)
                if is_placeholder(captured):
                    continue
            findings.append((line_no, rule_name))
            break
    return findings


def collect_target_files(kit_dir: Path) -> list[Path]:
    """Collect AGENT_MEMORY.md and all Markdown files under memory/."""
    targets: list[Path] = []
    index_file = kit_dir / "AGENT_MEMORY.md"
    if index_file.is_file():
        targets.append(index_file)
    memory_dir = kit_dir / "memory"
    if memory_dir.is_dir():
        targets.extend(sorted(memory_dir.glob("*.md")))
    return targets


def main() -> int:
    kit_dir = get_kit_dir()
    targets = collect_target_files(kit_dir)
    if not targets:
        sys.stderr.write(f"No memory files found under: {kit_dir}\n")
        return 1

    total_warnings = 0
    for target in targets:
        findings = scan_file(target)
        for line_no, rule_name in findings:
            total_warnings += 1
            rel = target.relative_to(kit_dir).as_posix()
            print(
                f"WARNING: Possible sensitive data detected in {rel}:{line_no} "
                f"[{rule_name}] (content redacted)"
            )

    if total_warnings == 0:
        print(
            f"Governance check passed: no secrets or sensitive patterns found "
            f"across {len(targets)} memory file(s)."
        )
        return 0

    print(
        f"\nGovernance check found {total_warnings} warning(s). "
        "No files were modified; please review and redact immediately."
    )
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
