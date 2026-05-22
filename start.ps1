# FilmDice - Start Script
# Sets up and launches the backend (FastAPI) and frontend (Next.js) in separate windows.

param(
    [switch]$SkipBrowser,  # Pass -SkipBrowser to suppress auto-opening localhost:3000
    [switch]$Network       # Pass -Network to expose on local WiFi (for phone access)
)

$ErrorActionPreference = "Stop"
$root     = Split-Path -Parent $MyInvocation.MyCommand.Definition
$backend  = Join-Path $root "movie-randomizer-backend"
$frontend = Join-Path $root "movie-randomizer-frontend"
$venv     = Join-Path $backend ".venv"
$python   = Join-Path $venv "Scripts\python.exe"

function Write-Step($msg) { Write-Host "`n  >> $msg" -ForegroundColor Cyan }
function Write-OK($msg)   { Write-Host "     OK  $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "     !   $msg" -ForegroundColor Yellow }
function Write-Fail($msg) { Write-Host "`n  ERROR: $msg`n" -ForegroundColor Red; exit 1 }

Clear-Host
Write-Host ""
Write-Host "  ===========================================" -ForegroundColor Magenta
Write-Host "   FilmDice - Startup" -ForegroundColor Magenta
Write-Host "  ===========================================" -ForegroundColor Magenta


# ---------------------------------------------------------------------------
# 1. Prerequisites
# ---------------------------------------------------------------------------
Write-Step "Checking prerequisites..."

try   { $v = python --version 2>&1; Write-OK "Python  $v" }
catch { Write-Fail "Python not found. Install from https://python.org" }

try   { $v = node --version 2>&1;   Write-OK "Node.js $v" }
catch { Write-Fail "Node.js not found. Install from https://nodejs.org" }

try {
    $dockerInfo = docker info 2>&1
    if ($LASTEXITCODE -ne 0) { throw }
    Write-OK "Docker  running"
} catch {
    Write-Fail "Docker is not running. Open Docker Desktop first, then re-run this script."
}


# ---------------------------------------------------------------------------
# 2. .env check
# ---------------------------------------------------------------------------
Write-Step "Checking environment config..."

$envFile = Join-Path $backend ".env"

if (-not (Test-Path $envFile)) {
    Write-Warn ".env not found - creating template"
    @"
TMDB_API_KEY=your_tmdb_api_key_here
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/moviedb
"@ | Out-File -FilePath $envFile -Encoding utf8
    Write-Host ""
    Write-Host "  A .env template has been created at:" -ForegroundColor Yellow
    Write-Host "  $envFile" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Add your TMDB API key, save the file, then re-run this script." -ForegroundColor Yellow
    Write-Host "  Get a free key at: https://www.themoviedb.org/settings/api" -ForegroundColor Gray
    Write-Host ""
    if (Get-Command notepad -ErrorAction SilentlyContinue) { notepad $envFile }
    exit 0
}

$envContent = Get-Content $envFile -Raw
if ($envContent -match "your_tmdb_api_key_here") {
    Write-Host ""
    Write-Host "  TMDB_API_KEY is still set to the placeholder." -ForegroundColor Yellow
    Write-Host "  Edit: $envFile" -ForegroundColor Yellow
    Write-Host "  Get a free key at: https://www.themoviedb.org/settings/api" -ForegroundColor Gray
    Write-Host ""
    if (Get-Command notepad -ErrorAction SilentlyContinue) { notepad $envFile }
    exit 0
}

Write-OK ".env found and configured"


# ---------------------------------------------------------------------------
# 3. Python virtual environment
# ---------------------------------------------------------------------------
Write-Step "Setting up Python virtual environment..."

if (-not (Test-Path $venv)) {
    Write-Host "     Creating venv..." -ForegroundColor Gray
    python -m venv $venv
    Write-OK "Virtual environment created"
} else {
    Write-OK "Virtual environment exists"
}

Write-Host "     Installing/updating Python dependencies..." -ForegroundColor Gray
& $python -m pip install -r (Join-Path $backend "requirements.txt") -q --disable-pip-version-check
Write-OK "Python dependencies up to date"


# ---------------------------------------------------------------------------
# 4. PostgreSQL via Docker Compose
# ---------------------------------------------------------------------------
Write-Step "Starting PostgreSQL (Docker)..."

Push-Location $backend
$ErrorActionPreference = "SilentlyContinue"
docker compose up -d *>$null
$composeExit = $LASTEXITCODE
$ErrorActionPreference = "Stop"
Pop-Location

if ($composeExit -ne 0) {
    Write-Fail "docker compose failed (exit $composeExit). Is Docker Desktop running?"
}
Write-OK "PostgreSQL running"


# ---------------------------------------------------------------------------
# 5. Node.js dependencies
# ---------------------------------------------------------------------------
Write-Step "Checking Node.js dependencies..."

$nodeModules = Join-Path $frontend "node_modules"
if (-not (Test-Path $nodeModules)) {
    Write-Host "     Running npm install (first time - this may take a minute)..." -ForegroundColor Gray
    Push-Location $frontend
    npm install --silent
    Pop-Location
    Write-OK "Node modules installed"
} else {
    Write-OK "Node modules exist"
}


# ---------------------------------------------------------------------------
# 6. Detect local IP if -Network was passed
# ---------------------------------------------------------------------------
$localIP = $null
if ($Network) {
    $localIP = (Get-NetIPAddress -AddressFamily IPv4 |
        Where-Object { $_.IPAddress -notmatch "^127\." -and $_.PrefixOrigin -eq "Dhcp" } |
        Select-Object -First 1).IPAddress
    if (-not $localIP) {
        Write-Warn "Could not detect a DHCP WiFi IP - falling back to localhost mode"
        $Network = $false
    } else {
        Write-OK "Local network IP: $localIP"

        # Patch NEXT_PUBLIC_API_URL directly in .env.local so Next.js picks it up
        $envLocal = Join-Path $frontend ".env.local"
        if (Test-Path $envLocal) {
            $lines = Get-Content $envLocal
            $found = $false
            $lines = $lines | ForEach-Object {
                if ($_ -match "^NEXT_PUBLIC_API_URL=") { $found = $true; "NEXT_PUBLIC_API_URL=http://${localIP}:8000" }
                else { $_ }
            }
            if (-not $found) { $lines += "NEXT_PUBLIC_API_URL=http://${localIP}:8000" }
            $lines | Set-Content $envLocal -Encoding utf8
            Write-OK "Set NEXT_PUBLIC_API_URL=http://${localIP}:8000 in .env.local"
        }
    }
}


# Restore .env.local to localhost when not in network mode
if (-not $Network) {
    $envLocal = Join-Path $frontend ".env.local"
    if (Test-Path $envLocal) {
        $lines = Get-Content $envLocal
        $lines = $lines | ForEach-Object {
            if ($_ -match "^NEXT_PUBLIC_API_URL=") { "NEXT_PUBLIC_API_URL=http://localhost:8000" }
            else { $_ }
        }
        $lines | Set-Content $envLocal -Encoding utf8
    }
}


# ---------------------------------------------------------------------------
# 7. Launch backend in a new window
# ---------------------------------------------------------------------------
Write-Step "Launching services..."

$uvicornArgs = if ($Network) { "--host 0.0.0.0 --reload" } else { "--reload" }

$backendScript = [System.IO.Path]::GetTempFileName() -replace '\.tmp$', '.ps1'
@"
`$Host.UI.RawUI.WindowTitle = "FilmDice Backend"
Write-Host ""
Write-Host "  FilmDice Backend" -ForegroundColor Cyan
Write-Host "  API docs: http://localhost:8000/docs" -ForegroundColor Yellow
Write-Host ""
Set-Location "$backend"
& "$python" -m uvicorn app.main:app $uvicornArgs
"@ | Out-File $backendScript -Encoding utf8

Start-Process powershell -ArgumentList "-NoExit", "-File", $backendScript


# ---------------------------------------------------------------------------
# 8. Launch frontend in a new window
# ---------------------------------------------------------------------------
$nextHost = if ($Network) { "-H 0.0.0.0" } else { "" }

$frontendScript = [System.IO.Path]::GetTempFileName() -replace '\.tmp$', '.ps1'
if ($Network) {
@"
`$Host.UI.RawUI.WindowTitle = "FilmDice Frontend"
`$env:NEXT_PUBLIC_API_URL = "http://${localIP}:8000"
Write-Host ""
Write-Host "  FilmDice Frontend" -ForegroundColor Cyan
Write-Host "  Local:   http://localhost:3000" -ForegroundColor Yellow
Write-Host "  Network: http://${localIP}:3000" -ForegroundColor Green
Write-Host ""
Set-Location "$frontend"
npm run dev -- -H 0.0.0.0
"@ | Out-File $frontendScript -Encoding utf8
} else {
@"
`$Host.UI.RawUI.WindowTitle = "FilmDice Frontend"
Write-Host ""
Write-Host "  FilmDice Frontend" -ForegroundColor Cyan
Write-Host "  App: http://localhost:3000" -ForegroundColor Yellow
Write-Host ""
Set-Location "$frontend"
npm run dev
"@ | Out-File $frontendScript -Encoding utf8
}

Start-Process powershell -ArgumentList "-NoExit", "-File", $frontendScript


# ---------------------------------------------------------------------------
# 9. Done
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "  ===========================================" -ForegroundColor Green
Write-Host "   FilmDice is starting up!" -ForegroundColor Green
Write-Host "  ===========================================" -ForegroundColor Green
Write-Host ""

if ($Network -and $localIP) {
    Write-Host "   PC browser  http://localhost:3000" -ForegroundColor Yellow
    Write-Host "   Phone       http://${localIP}:3000" -ForegroundColor Green
    Write-Host "   API docs    http://localhost:8000/docs" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Open http://${localIP}:3000 on your phone (same WiFi)" -ForegroundColor Green
    Write-Host "   Then tap the 3-dot menu in Chrome > 'Add to Home screen'" -ForegroundColor Green
} else {
    Write-Host "   App      http://localhost:3000" -ForegroundColor Yellow
    Write-Host "   API docs http://localhost:8000/docs" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "   Two new terminal windows have opened." -ForegroundColor Gray
Write-Host "   Wait ~5 seconds for both services to be ready." -ForegroundColor Gray
Write-Host ""
Write-Host "   To stop everything, run:  .\stop.ps1" -ForegroundColor Gray
Write-Host ""

if (-not $SkipBrowser) {
    Write-Host "   Opening browser in 6 seconds..." -ForegroundColor Gray
    Start-Sleep -Seconds 6
    Start-Process "http://localhost:3000"
}
