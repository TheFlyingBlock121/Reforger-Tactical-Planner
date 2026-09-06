$ErrorActionPreference = "Stop"

Write-Host "Reforger Tactical Planner - Windows setup" -ForegroundColor Green

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js was not found. Install the current Node.js LTS release, then run this script again." -ForegroundColor Red
    exit 1
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "npm was not found. Reinstall Node.js LTS, then run this script again." -ForegroundColor Red
    exit 1
}

Write-Host "Node: $(node --version)"
Write-Host "npm:  $(npm --version)"

Write-Host "Installing desktop dependencies..." -ForegroundColor Cyan
npm install

Write-Host "Installing relay dependencies..." -ForegroundColor Cyan
npm --prefix relay install

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Created .env from .env.example"
}

Write-Host "Setup complete." -ForegroundColor Green
Write-Host "Start relay: npm run relay"
Write-Host "Start app:   npm run dev"
Write-Host "Built-in maps: drop tiles into BUILT_IN_MAP_TILES\Everon and BUILT_IN_MAP_TILES\Serhiivka"
Write-Host "Installer build: double-click BUILD-INSTALLER-WINDOWS.bat"
