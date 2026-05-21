# FilmDice - Stop Script
# Stops the uvicorn backend, Next.js dev server, and PostgreSQL Docker container.

$root    = Split-Path -Parent $MyInvocation.MyCommand.Definition
$backend = Join-Path $root "movie-randomizer-backend"

function Write-Step($msg) { Write-Host "`n  >> $msg" -ForegroundColor Cyan }
function Write-OK($msg)   { Write-Host "     OK  $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "     !   $msg" -ForegroundColor Yellow }

Clear-Host
Write-Host ""
Write-Host "  ===========================================" -ForegroundColor Magenta
Write-Host "   FilmDice - Shutdown" -ForegroundColor Magenta
Write-Host "  ===========================================" -ForegroundColor Magenta


# ---------------------------------------------------------------------------
# Stop uvicorn (backend)
# ---------------------------------------------------------------------------
Write-Step "Stopping backend (uvicorn)..."

$uvicornProcs = Get-Process -Name python -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -like "*uvicorn*" }

if ($uvicornProcs) {
    $uvicornProcs | Stop-Process -Force
    Write-OK "uvicorn stopped ($($uvicornProcs.Count) process(es))"
} else {
    # Fallback: find any python process running uvicorn via WMI
    $wmiProcs = Get-CimInstance Win32_Process -Filter "Name='python.exe'" |
        Where-Object { $_.CommandLine -like "*uvicorn*" }
    if ($wmiProcs) {
        $wmiProcs | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
        Write-OK "uvicorn stopped"
    } else {
        Write-Warn "uvicorn process not found (may already be stopped)"
    }
}


# ---------------------------------------------------------------------------
# Stop Next.js dev server (node)
# ---------------------------------------------------------------------------
Write-Step "Stopping frontend (Next.js)..."

$nextProcs = Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
    Where-Object { $_.CommandLine -like "*next*dev*" -or $_.CommandLine -like "*next-server*" }

if ($nextProcs) {
    $nextProcs | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
    Write-OK "Next.js stopped ($($nextProcs.Count) process(es))"
} else {
    Write-Warn "Next.js process not found (may already be stopped)"
}


# ---------------------------------------------------------------------------
# Stop Docker Compose (PostgreSQL)
# ---------------------------------------------------------------------------
Write-Step "Stopping PostgreSQL (Docker)..."

try {
    Push-Location $backend
    $ErrorActionPreference = "SilentlyContinue"
    docker compose stop *>$null
    $ErrorActionPreference = "Stop"
    Pop-Location
    Write-OK "PostgreSQL stopped"
} catch {
    Write-Warn "Could not stop Docker containers (Docker may not be running)"
    Pop-Location
}


Write-Host ""
Write-Host "  ===========================================" -ForegroundColor Green
Write-Host "   FilmDice stopped." -ForegroundColor Green
Write-Host "  ===========================================" -ForegroundColor Green
Write-Host ""
Write-Host "   To start again, run:  .\start.ps1" -ForegroundColor Gray
Write-Host ""
