@echo off
REM ============================================================================
REM SECOND LIFE — Verified Student Experience Platform Launcher (Windows)
REM Automatically uses system Node.js or bundled Antigravity Node v24 runtime
REM ============================================================================
cd /d "%~dp0"
where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  node --watch src/server.ts
) else (
  set ELECTRON_RUN_AS_NODE=1
  "%LOCALAPPDATA%\Programs\antigravity\Antigravity.exe" --watch src/server.ts
)
