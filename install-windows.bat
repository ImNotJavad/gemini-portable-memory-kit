@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul 2>&1

title Gemini Portable Memory Kit - Windows Installer

for %%I in ("%~dp0.") do set "KIT_ROOT=%%~fI"
set "INSTALLER_PY=%KIT_ROOT%\gemini-memory-kit\tools\install_kit.py"
set "EXIT_CODE=0"
set "PAUSE_ON_EXIT=0"

set "CMD_LINE=!cmdcmdline!"
if defined CMD_LINE (
    if /i not "!CMD_LINE!"=="!CMD_LINE:/c=!" set "PAUSE_ON_EXIT=1"
)

echo ================================================================
echo   Gemini Portable Memory Kit - Windows Installer (v1.0.0)
echo ================================================================
echo.

if not exist "%INSTALLER_PY%" (
    echo [ERROR] Could not find installer script:
    echo         "%INSTALLER_PY%"
    echo         Make sure you extracted the entire ZIP archive before running this file.
    set "EXIT_CODE=1"
    goto :finish
)

REM --- Detect a working Python 3.9+ interpreter (skips Microsoft Store stub) ---
set "PY_CMD="
set "HAS_PLAIN_PYTHON=0"

python -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 9) else 1)" >nul 2>&1
if not errorlevel 1 (
    set "PY_CMD=python"
    set "HAS_PLAIN_PYTHON=1"
)

if not defined PY_CMD (
    py -3 -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 9) else 1)" >nul 2>&1
    if not errorlevel 1 set "PY_CMD=py -3"
)

if not defined PY_CMD (
    python3 -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 9) else 1)" >nul 2>&1
    if not errorlevel 1 set "PY_CMD=python3"
)

if not defined PY_CMD (
    echo [ERROR] Python 3.9 or higher was not found on this machine.
    echo         Download Python from https://www.python.org/downloads/
    echo         and check "Add python.exe to PATH" during installation.
    set "EXIT_CODE=1"
    goto :finish
)

echo [OK] Using Python interpreter: !PY_CMD!
echo.

REM --- Parse arguments or prompt interactively ---
set "TARGET_DIR=%~1"
set "USE_FRESH=1"
set "DRY_RUN=0"
set "INTERACTIVE=0"

if defined TARGET_DIR goto :parse_cli_flags

set "INTERACTIVE=1"
set "PAUSE_ON_EXIT=1"
echo Enter or drag-and-drop your target project folder path below, then press Enter:
echo Example: C:\Projects\my-app
echo.
set /p "TARGET_DIR=Target project path: "
goto :flags_done

:parse_cli_flags
shift
:parse_flags_loop
if "%~1"=="" goto :flags_done
if /i "%~1"=="--dry-run" set "DRY_RUN=1"
if /i "%~1"=="--keep-sample" set "USE_FRESH=0"
if /i "%~1"=="--fresh" set "USE_FRESH=1"
shift
goto :parse_flags_loop

:flags_done
if not defined TARGET_DIR (
    echo.
    echo [ERROR] No target project path was provided. Installation cancelled.
    set "EXIT_CODE=1"
    goto :finish
)

REM --- Strip surrounding quotes, edge spaces, and unsafe trailing backslashes ---
set "TARGET_DIR=!TARGET_DIR:"=!"

:trim_leading_space
if "!TARGET_DIR:~0,1!"==" " (
    set "TARGET_DIR=!TARGET_DIR:~1!"
    goto :trim_leading_space
)

:trim_trailing_space
if "!TARGET_DIR:~-1!"==" " (
    set "TARGET_DIR=!TARGET_DIR:~0,-1!"
    goto :trim_trailing_space
)

:trim_trailing_slash
if "!TARGET_DIR:~-1!"=="\" (
    if not "!TARGET_DIR:~-2!"==":\" (
        set "TARGET_DIR=!TARGET_DIR:~0,-1!"
        goto :trim_trailing_slash
    )
)

if not defined TARGET_DIR (
    echo.
    echo [ERROR] Target project path is empty. Installation cancelled.
    set "EXIT_CODE=1"
    goto :finish
)

for %%I in ("!TARGET_DIR!") do set "TARGET_FULL=%%~fI"

if /i "!TARGET_FULL!"=="!KIT_ROOT!" (
    echo.
    echo [ERROR] Target folder cannot be the Gemini Portable Memory Kit folder itself.
    echo         Please provide the path to another project folder.
    set "EXIT_CODE=1"
    goto :finish
)

if not "!INTERACTIVE!"=="1" goto :run_install

echo.
echo Target folder: "!TARGET_FULL!"
echo.
echo Choose install mode:
echo   [1] Fresh install - clean starter memory files (Recommended)
echo   [2] Dry-run preview - show changes without writing any files
echo   [3] Copy with sample entries - keep kit example entries
echo.
set "MODE_CHOICE=1"
set /p "MODE_CHOICE=Select option [1/2/3] (default 1): "
if "!MODE_CHOICE!"=="2" (
    set "DRY_RUN=1"
    set "USE_FRESH=1"
)
if "!MODE_CHOICE!"=="3" (
    set "USE_FRESH=0"
)

:run_install
set "INSTALL_ARGS="
if "!USE_FRESH!"=="1" set "INSTALL_ARGS=!INSTALL_ARGS! --fresh"
if "!DRY_RUN!"=="1" set "INSTALL_ARGS=!INSTALL_ARGS! --dry-run"

echo.
if "!DRY_RUN!"=="1" (
    echo [PREVIEW] Dry-run for: "!TARGET_FULL!"
) else (
    echo [INSTALL] Installing into: "!TARGET_FULL!"
)
echo ----------------------------------------------------------------

set "PYTHONDONTWRITEBYTECODE=1"
!PY_CMD! "%INSTALLER_PY%" "!TARGET_FULL!" !INSTALL_ARGS!
set "EXIT_CODE=!ERRORLEVEL!"

if not "!EXIT_CODE!"=="0" (
    echo.
    echo [ERROR] Installer exited with error code !EXIT_CODE!.
    goto :finish
)

if "!DRY_RUN!"=="1" (
    echo ----------------------------------------------------------------
    echo [DONE] Dry-run complete. No files were written.
    goto :finish
)

echo ----------------------------------------------------------------
echo [VERIFY] Running post-install checks inside target project...
echo.

pushd "!TARGET_FULL!"
!PY_CMD! "gemini-memory-kit\tools\validate_memory.py"
if errorlevel 1 set "EXIT_CODE=1"

!PY_CMD! "gemini-memory-kit\tools\govern_memory.py"
if errorlevel 1 set "EXIT_CODE=1"

!PY_CMD! "gemini-memory-kit\tools\status_line.py"
if errorlevel 1 set "EXIT_CODE=1"

set "HAS_GIT=1"
if not exist ".git" set "HAS_GIT=0"
popd

echo.
if not "!EXIT_CODE!"=="0" (
    echo [WARN] Installation completed, but one or more verification checks reported an issue.
    goto :finish
)

echo ================================================================
echo   [SUCCESS] Gemini Portable Memory Kit installed cleanly!
echo ================================================================
echo   Location: "!TARGET_FULL!"
if "!HAS_GIT!"=="0" (
    echo.
    echo   [TIP] No .git folder found in target project.
    echo         Run "git init" inside your project so the AfterAgent
    echo         hook can detect file changes automatically.
)
if "!HAS_PLAIN_PYTHON!"=="0" (
    echo.
    echo   [NOTE] Plain "python" was not found on PATH; used "!PY_CMD!".
    echo          Gemini CLI hooks in .gemini\settings.json invoke "python".
    echo          Ensure Python is on PATH, or update the command in
    echo          ".gemini\settings.json" to "!PY_CMD!".
)
echo.
echo   Next step: Open a terminal in your project and run "gemini".

:finish
echo.
if "!PAUSE_ON_EXIT!"=="1" pause
endlocal & exit /b %EXIT_CODE%
