# Voltrex Terminal — Full Stack Startup Script
# Run from the project root: .\scripts\start_all.ps1
# Requires: Python venv at .\venv, Node.js in PATH

param(
    [switch]$BackendOnly,
    [switch]$FrontendOnly,
    [int]$BackendPort = 8000,
    [int]$FrontendPort = 3000
)

$Root = Split-Path -Parent $PSScriptRoot
$BackendEnv = Join-Path $Root "venv\Scripts\Activate.ps1"
$FrontendDir = Join-Path $Root "frontend"

Write-Host ""
Write-Host "  ╔═══════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "  ║   VOLTREX TERMINAL — STACK LAUNCHER   ║" -ForegroundColor Cyan
Write-Host "  ║   Voltrex Equilibrium Engine          ║" -ForegroundColor Cyan
Write-Host "  ╚═══════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ── Preflight checks ────────────────────────────────────────
$Errors = @()

if (-not (Test-Path (Join-Path $Root ".env"))) {
    $Errors += "Missing .env file. Copy .env.example and fill in ZERODHA_API_KEY + ZERODHA_ACCESS_TOKEN."
}

if (-not (Test-Path $BackendEnv)) {
    $Errors += "Python venv not found at .\venv — run: python -m venv venv && .\venv\Scripts\Activate.ps1 && pip install -r requirements.txt"
}

if (-not (Test-Path (Join-Path $FrontendDir "node_modules"))) {
    Write-Host "  [WARN] node_modules missing — installing..." -ForegroundColor Yellow
    Push-Location $FrontendDir
    npm install --silent
    Pop-Location
}

if ($Errors.Count -gt 0) {
    Write-Host "  [ERROR] Preflight failed:" -ForegroundColor Red
    $Errors | ForEach-Object { Write-Host "    • $_" -ForegroundColor Red }
    exit 1
}

# ── Backend ─────────────────────────────────────────────────
if (-not $FrontendOnly) {
    Write-Host "  ► Starting FastAPI backend on http://localhost:$BackendPort ..." -ForegroundColor Green
    $BackendJob = Start-Job -ScriptBlock {
        param($root, $port, $envPath)
        & $envPath
        Set-Location $root
        & uvicorn api.main:app --host 127.0.0.1 --port $port --reload
    } -ArgumentList $Root, $BackendPort, $BackendEnv

    # Give backend a moment to start
    Start-Sleep -Seconds 3

    # Health check
    try {
        $health = Invoke-RestMethod "http://localhost:$BackendPort/api/v1/health" -TimeoutSec 5
        Write-Host "  ✓ Backend online  — zerodha_configured: $($health.zerodha_configured)" -ForegroundColor Green
    } catch {
        Write-Host "  ✗ Backend health check failed (may still be starting)" -ForegroundColor Yellow
    }
}

# ── Frontend ────────────────────────────────────────────────
if (-not $BackendOnly) {
    Write-Host "  ► Starting Next.js frontend on http://localhost:$FrontendPort ..." -ForegroundColor Cyan
    $FrontendJob = Start-Job -ScriptBlock {
        param($dir, $port)
        Set-Location $dir
        $env:PORT = $port
        npm run dev
    } -ArgumentList $FrontendDir, $FrontendPort

    Start-Sleep -Seconds 4
    Write-Host "  ✓ Frontend started" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "  ┌─────────────────────────────────────────┐" -ForegroundColor DarkCyan
Write-Host "  │  Backend  → http://localhost:$BackendPort       │" -ForegroundColor DarkCyan
Write-Host "  │  Docs     → http://localhost:$BackendPort/docs  │" -ForegroundColor DarkCyan
Write-Host "  │  Frontend → http://localhost:$FrontendPort      │" -ForegroundColor DarkCyan
Write-Host "  │                                         │" -ForegroundColor DarkCyan
Write-Host "  │  Press CTRL+C to stop all services      │" -ForegroundColor DarkCyan
Write-Host "  └─────────────────────────────────────────┘" -ForegroundColor DarkCyan
Write-Host ""

# ── Keep alive and stream logs ───────────────────────────────
try {
    while ($true) {
        Start-Sleep -Seconds 2
        if ($BackendJob)  { Receive-Job -Job $BackendJob  -Keep | Where-Object { $_ } | ForEach-Object { Write-Host "  [API] $_" -ForegroundColor DarkGray } }
        if ($FrontendJob) { Receive-Job -Job $FrontendJob -Keep | Where-Object { $_ } | ForEach-Object { Write-Host "  [UI]  $_" -ForegroundColor DarkGray } }
    }
} finally {
    Write-Host "`n  Shutting down..." -ForegroundColor Yellow
    if ($BackendJob)  { Stop-Job $BackendJob;  Remove-Job $BackendJob }
    if ($FrontendJob) { Stop-Job $FrontendJob; Remove-Job $FrontendJob }
    Write-Host "  Done." -ForegroundColor Green
}
