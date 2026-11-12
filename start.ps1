# ============================================================================
# SECOND LIFE — Verified Student Experience Platform Launcher (PowerShell)
# ============================================================================
Set-Location $PSScriptRoot
if (Get-Command node -ErrorAction SilentlyContinue) {
  node --watch src/server.ts
} else {
  $env:ELECTRON_RUN_AS_NODE = "1"
  & "$env:LOCALAPPDATA\Programs\antigravity\Antigravity.exe" --watch src/server.ts | Out-Host
}
