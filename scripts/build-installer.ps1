param(
    [string]$RelayUrl = ""
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

function Require-Command([string]$Name, [string]$Message) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) { throw $Message }
}

function Read-ExistingRelayUrl {
    $envFile = Join-Path $ProjectRoot ".env.production.local"
    if (-not (Test-Path $envFile)) { return "" }
    foreach ($line in Get-Content $envFile) {
        if ($line -match '^\s*VITE_RELAY_URL\s*=\s*(.+?)\s*$') { return $Matches[1].Trim() }
    }
    return ""
}

function Validate-RelayUrl([string]$Value) {
    if ([string]::IsNullOrWhiteSpace($Value)) { return $false }
    try {
        $uri = [Uri]$Value
        return ($uri.Scheme -eq "https" -and -not [string]::IsNullOrWhiteSpace($uri.Host))
    } catch { return $false }
}

Write-Host "========================================================" -ForegroundColor DarkGreen
Write-Host " Reforger Tactical Planner v0.7 - WINDOWS INSTALLER " -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor DarkGreen
Write-Host ""
Write-Host "This creates ONE Setup.exe containing Everon, Serhiivka and automatic map LOD." -ForegroundColor Cyan
Write-Host "Friends install it normally and connect through your public relay; no router port forwarding." -ForegroundColor DarkGray
Write-Host ""

Require-Command "node" "Node.js was not found. Install Node.js LTS, restart PowerShell, then run this again."
Require-Command "npm" "npm was not found. Install Node.js LTS, restart PowerShell, then run this again."

Write-Host "1/7 Checking the two map tile folders..." -ForegroundColor Cyan
node scripts/validate-drop-maps.mjs --write-manifests
if ($LASTEXITCODE -ne 0) { throw "Map validation failed. Fix the tile folders shown above." }

Write-Host ""
if (-not (Test-Path "node_modules")) {
    Write-Host "2/7 Installing app dependencies (first build only)..." -ForegroundColor Cyan
    npm install
    if ($LASTEXITCODE -ne 0) { throw "npm install failed." }
} else {
    Write-Host "2/7 Dependencies already installed." -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "3/7 Creating low-memory automatic map LOD..." -ForegroundColor Cyan
powershell -ExecutionPolicy Bypass -File .\scripts\generate-map-lod.ps1
if ($LASTEXITCODE -ne 0) { throw "LOD generation failed." }

Write-Host ""
Write-Host "4/7 Configuring internet multiplayer relay..." -ForegroundColor Cyan
if ([string]::IsNullOrWhiteSpace($RelayUrl)) { $RelayUrl = Read-ExistingRelayUrl }
while (-not (Validate-RelayUrl $RelayUrl)) {
    Write-Host "Paste the HTTPS address of your Render relay." -ForegroundColor Yellow
    Write-Host "Example format: https://reforger-planner-relay-xxxx.onrender.com" -ForegroundColor DarkGray
    $RelayUrl = Read-Host "Relay URL"
    if ([string]::IsNullOrWhiteSpace($RelayUrl)) {
        throw "A public HTTPS relay URL is required for a shareable installer. See RELAY-SETUP.md."
    }
}
Set-Content -Path (Join-Path $ProjectRoot ".env.production.local") -Value "VITE_RELAY_URL=$RelayUrl" -Encoding UTF8
Write-Host "Relay saved for this build: $RelayUrl" -ForegroundColor Green

Write-Host ""
Write-Host "5/7 Building and type-checking the application UI..." -ForegroundColor Cyan
npm run build:web
if ($LASTEXITCODE -ne 0) { throw "Frontend build failed. Read the first TypeScript error shown above." }

$releaseDir = Join-Path $ProjectRoot "release-installer"
Remove-Item $releaseDir -Recurse -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "6/7 Building the assisted Windows installer..." -ForegroundColor Cyan
npx electron-builder --win nsis --x64 --config.directories.output=release-installer
if ($LASTEXITCODE -ne 0) { throw "Installer build failed." }

Write-Host ""
Write-Host "7/7 Checking the finished installer..." -ForegroundColor Cyan
$installer = Get-ChildItem $releaseDir -Filter "*-Setup.exe" -File | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($null -eq $installer) { throw "Setup.exe was not created." }

$sizeGiB = [Math]::Round($installer.Length / 1GB, 2)
$sizeMiB = [Math]::Round($installer.Length / 1MB, 0)
Write-Host ""
Write-Host "BUILD COMPLETE" -ForegroundColor Green
Write-Host "Installer: $($installer.FullName)" -ForegroundColor White
Write-Host "Size: $sizeMiB MiB ($sizeGiB GiB)" -ForegroundColor DarkGray
Write-Host "Relay: $RelayUrl" -ForegroundColor DarkGray
Write-Host ""
if ($installer.Length -ge 2GB) {
    Write-Warning "The installer is at/above GitHub's 2 GiB per-release-asset limit. Use a different file host or reduce the included map payload."
} elseif ($installer.Length -ge 1.85GB) {
    Write-Warning "The installer is close to GitHub's 2 GiB per-release-asset limit."
} else {
    Write-Host "This installer is below GitHub's 2 GiB release-asset limit." -ForegroundColor Green
}
Write-Host "Next: follow GITHUB-RELEASE.md to upload this Setup.exe as a GitHub Release asset." -ForegroundColor Yellow
