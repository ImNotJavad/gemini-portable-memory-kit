# Gemini Portable Memory Kit (v1.0.0)

**English** | [فارسی (Persian Documentation)](./README.fa.md)

A portable, durable, searchable, governed Markdown memory system for **Gemini CLI** — with zero databases, zero cloud dependencies, cross-platform Python 3 standard-library tools, loop-safe lifecycle hooks, an automatic verified one-line response status footer, and an optional local Knowledge Studio web UI.

---

## Key Features

- **Markdown-Only & Git-Friendly**: All durable project memory lives in plain Markdown files under `gemini-memory-kit/memory/` with strict size budgets (`<100` lines for `AGENT_MEMORY.md`, `<150` lines per memory file).
- **Verified Inline Response Status Footer**: A `BeforeAgent` hook (`memory_before.py`) computes live metrics via `tools/status_line.py` before every prompt so Gemini appends a truthful, one-line parenthetical summary at the end of every reply:
  `(Memory: loaded | 4 decisions, 1 task | next: Populate Project-Specific Memory Entries | health: ok)`
- **Loop-Safe Automatic Memory Review (`AfterAgent`)**: `memory_check.py` checks `git status --porcelain` after file changes, prompts Gemini once to review durable knowledge, and guards against infinite loops with `stop_hook_active`.
- **Governance & Secret Protection**: Strict rules forbid storing API keys, passwords, tokens, private keys, raw source code, or logs; `govern_memory.py` audits all memory files without modifying them.
- **Relationship Graph & Rolling Summaries**: `graph.md` tracks directed links (`affects`, `replaces`, `related file`) and `summarize_memory.py` keeps `summaries.md` condensed and dated.
- **One-Command Portable Installation**: Drop into any existing or new repository on Windows, macOS, or Linux using `install_kit.py` without overwriting existing project files.
- **Optional Local Knowledge Studio UI**: Browse memory files (Structured & Raw Markdown), search with `<mark>` highlights and last-5 query history, inspect the Relationship Graph, monitor the persistent **Project Status** header badge, and track task completion progress.

---

## Repository Structure

```text
.
├── GEMINI.md                                  # Root Gemini CLI entry importing index & rules
├── .gemini/
│   └── settings.json                          # Registers BeforeAgent & AfterAgent hooks
├── gemini-memory-kit/
│   ├── AGENT_MEMORY.md                        # Compact memory index (<100 lines)
│   ├── gemini/
│   │   ├── GEMINI.md                          # Full memory rules, entry schema & footer format
│   │   └── hooks/
│   │       ├── memory_before.py               # BeforeAgent hook: injects live verified status
│   │       └── memory_check.py                # AfterAgent hook: safe Git-aware review prompt
│   ├── memory/
│   │   ├── architecture.md                    # System boundaries & architectural decisions
│   │   ├── decisions.md                       # Confirmed decisions (approval needed to delete)
│   │   ├── user-preferences.md                # Stable user & workflow constraints
│   │   ├── bugs-and-lessons.md                # Root causes & verified operational lessons
│   │   ├── open-tasks.md                      # Active follow-up work & deferred tasks
│   │   ├── summaries.md                       # Rolling condensed summary
│   │   ├── graph.md                           # Directed relationship map
│   │   └── policies.md                        # Retention, safety, access & deletion rules
│   └── tools/
│       ├── install_kit.py                     # Portable non-destructive project installer
│       ├── status_line.py                     # Verified one-line parenthetical status generator
│       ├── search_memory.py                   # Keyword search with line numbers & context
│       ├── cleanup_memory.py                  # Read-only scanner for '- Status: obsolete'
│       ├── summarize_memory.py                # Regenerates memory/summaries.md
│       ├── govern_memory.py                   # Read-only scanner for secrets & credentials
│       └── validate_memory.py                 # Validates 100/150 line budgets & entry schema
├── install-windows.bat                        # Windows one-click / drag-and-drop installer
├── README.md                                  # English documentation
├── README.fa.md                               # Persian documentation (مستندات فارسی)
├── CHANGELOG.md                               # Release history
└── LICENSE                                    # MIT License
```

*(The repository also includes the optional Express + React local Knowledge Studio in `server.ts` and `src/`.)*

---

## Requirements

- **Python 3.9+** (standard library only — no `pip install` needed).
- **Gemini CLI** installed and configured.
- **Git** (optional; hooks degrade gracefully in non-Git directories).
- **Node.js 20+** *(only if you also want to run the optional local Knowledge Studio web UI)*.

> **Cross-platform note**: `.gemini/settings.json` invokes `python` (not `python3`) for compatibility across Windows, macOS, and Linux. On Linux/macOS systems where only `python3` exists on `PATH`, either ensure `python` resolves to Python 3 (e.g., `sudo apt install python-is-python3` or shell alias/symlink) or adjust the command in your project's `.gemini/settings.json`.

---

## Installing Into Any Project

### Option 1: Automated One-Command Install (Recommended)

Clone this repository once, then install the memory kit into any target project using `install_kit.py`:

```bash
git clone https://github.com/<your-username>/gemini-portable-memory-kit.git
cd gemini-portable-memory-kit

# Preview what will be created/merged without modifying anything
python gemini-memory-kit/tools/install_kit.py /path/to/your-project --fresh --dry-run

# Install clean starter memory files into your project (non-destructive)
python gemini-memory-kit/tools/install_kit.py /path/to/your-project --fresh
```

What `install_kit.py` does safely:
- Copies `gemini-memory-kit/` into `<target>/gemini-memory-kit/` (never overwrites existing files — prints `SKIP` if present).
- With `--fresh`, writes clean starter templates for `AGENT_MEMORY.md` and `memory/*.md` (while preserving `memory/policies.md`, `gemini/GEMINI.md`, all hooks, and all tools).
- Creates root `GEMINI.md` — or appends the two `@./gemini-memory-kit/...` imports to an existing `GEMINI.md` without overwriting your project instructions.
- Creates `.gemini/settings.json` — or safely merges `BeforeAgent` and `AfterAgent` hooks into your existing `.gemini/settings.json`.

### Option 1B: Windows One-Click / Drag-and-Drop Installer (`install-windows.bat`)

Downloaded the ZIP on Windows? Extract it and use `install-windows.bat` in any of three ways:
- **Double-click `install-windows.bat`**: paste (or drag into the console) your target project path and press Enter.
- **Drag and drop**: drag your target project folder directly onto `install-windows.bat`.
- **Command Prompt / PowerShell**:
  ```bat
  install-windows.bat "C:\path\to\your-project"
  install-windows.bat "C:\path\to\your-project" --dry-run
  ```
It automatically detects Python 3.9+ (avoiding the Microsoft Store stub), runs `install_kit.py --fresh` safely without overwriting existing files, and executes post-install validation (`validate_memory.py`, `govern_memory.py`, `status_line.py`).

### Option 2: Manual Drop-In Installation

1. Copy the `gemini-memory-kit/` folder into the root of your target repository.
2. Add or append these lines to your project's root `GEMINI.md`:

   ```markdown
   # Project Memory Instructions

   At the start of every task, read `gemini-memory-kit/AGENT_MEMORY.md` to load current project context.
   Follow all memory governance, formatting, and maintenance rules defined in `gemini-memory-kit/gemini/GEMINI.md`.

   @./gemini-memory-kit/AGENT_MEMORY.md
   @./gemini-memory-kit/gemini/GEMINI.md
   ```

3. Create (or merge into) `.gemini/settings.json`:

   ```json
   {
     "hooks": {
       "BeforeAgent": [
         {
           "matcher": "*",
           "hooks": [
             {
               "name": "memory-status-context",
               "type": "command",
               "command": "python gemini-memory-kit/gemini/hooks/memory_before.py",
               "timeout": 10000
             }
           ]
         }
       ],
       "AfterAgent": [
         {
           "matcher": "*",
           "hooks": [
             {
               "name": "memory-check",
               "type": "command",
               "command": "python gemini-memory-kit/gemini/hooks/memory_check.py",
               "timeout": 15000
             }
           ]
         }
       ]
     }
   }
   ```

4. Reset `gemini-memory-kit/AGENT_MEMORY.md` and `gemini-memory-kit/memory/*.md` (except `policies.md`) for your target project, then verify the installation (see [Verification](#verification)).

---

## How It Works During Every Gemini CLI Turn

1. **Task Start (`BeforeAgent` -> `memory_before.py`)**:
   - Inspects `gemini-memory-kit/` and Git status via `tools/status_line.py`.
   - Injects a verified live status snapshot (`hookSpecificOutput.additionalContext`) so Gemini never fabricates decision/task counts or health alerts.
2. **Response Footer**:
   - Gemini answers your prompt normally and appends one concise English parenthetical line at the very end:
     - Clean turn: `(Memory: loaded | 4 decisions, 1 task | next: Add auth tests | health: ok)`
     - Updated memory: `(Memory: synced | updated: decisions.md, graph.md | 5 decisions, 1 task | health: ok)`
     - Warning state: `(Memory: loaded | 4 decisions, 1 task | alert: 1 secret warning, 2 obsolete)`
3. **Turn End (`AfterAgent` -> `memory_check.py`)**:
   - If `stop_hook_active` is `true` -> returns `allow` immediately (guarantees zero infinite loops).
   - If no Git changes exist (or non-Git workspace) -> returns `allow`.
   - If files changed -> returns `deny` once with the verified status snapshot and instructs Gemini to update memory only if durable, non-obvious knowledge emerged.

---

## CLI Maintenance Tools

All tools use only Python 3's standard library and work from any working directory:

| Command | Purpose | Modifies Files? |
| :--- | :--- | :--- |
| `python gemini-memory-kit/tools/status_line.py [--detailed \| --json]` | Print verified one-line parenthetical status summary | No |
| `python gemini-memory-kit/tools/search_memory.py <keywords...>` | Case-insensitive search across `memory/*.md` with line numbers & context | No |
| `python gemini-memory-kit/tools/cleanup_memory.py` | List entries marked `- Status: obsolete` | No |
| `python gemini-memory-kit/tools/govern_memory.py` | Scan memory files for API keys, tokens, passwords & private keys | No |
| `python gemini-memory-kit/tools/validate_memory.py` | Check 100/150 line budgets, duplicate titles & entry schema | No |
| `python gemini-memory-kit/tools/summarize_memory.py` | Regenerate `memory/summaries.md` from active decisions & lessons | `summaries.md` only |
| `python gemini-memory-kit/tools/install_kit.py <target> [--fresh] [--dry-run]` | Install the memory kit safely into another project | Target project only |

---

## Verification

Run these checks inside any project after installing:

```bash
python gemini-memory-kit/tools/validate_memory.py
python gemini-memory-kit/tools/govern_memory.py
python gemini-memory-kit/tools/cleanup_memory.py
python gemini-memory-kit/tools/summarize_memory.py
python gemini-memory-kit/tools/status_line.py
python gemini-memory-kit/tools/search_memory.py "memory"

# Test BeforeAgent and AfterAgent hooks directly
echo '{"cwd": "'"$PWD"'"}' | python gemini-memory-kit/gemini/hooks/memory_before.py
echo '{"cwd": "'"$PWD"'"}' | python gemini-memory-kit/gemini/hooks/memory_check.py
```

---

## Optional: Local Knowledge Studio Web UI

If you want a local browser view of your memory files in addition to the CLI workflow:

```bash
npm install
npm run dev
```

Open `http://localhost:3000` to access:
- **Knowledge Explorer**: Structured entry cards with Status/Priority filters and Raw Markdown view with line-budget indicators.
- **Live Highlighted Search & Recent Queries**: Full-text search across memory Markdown files with `<mark>` highlights, jump-to-line, and persistent last-5 search history.
- **Relationship Graph**: Directed relationship view parsed directly from `memory/graph.md`.
- **Governance & Health + Project Status Badge**: Live secret scan, obsolete entry report, schema validation, task completion progress bar, and a persistent top-right **Project Status** badge that refreshes whenever workspace data updates.

---

## Governance & Safety Policies

Full rules live in `gemini-memory-kit/memory/policies.md` and `gemini-memory-kit/gemini/GEMINI.md`:
- **Never store secrets**: No API keys, passwords, bearer/OAuth tokens, private keys, or credential URLs.
- **Never store noise**: No source code blocks, terminal logs, diffs, or facts recoverable from Git.
- **Active decision protection**: Active decisions require explicit user approval before deletion; superseded entries are marked `- Status: obsolete`.
- **Strict size budgets**: Keep `AGENT_MEMORY.md` under 100 lines and each `memory/*.md` file under 150 lines.

---

## License

Released under the [MIT License](./LICENSE).
