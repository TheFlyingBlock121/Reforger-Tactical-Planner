$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

Add-Type -AssemblyName System.Drawing

function Tile-Name([int]$Row, [int]$Column, [string]$Extension = "png") {
    return "tile_r{0:D3}_c{1:D3}.{2}" -f $Row, $Column, $Extension
}

function Get-DirectoryBytes([string]$Path) {
    if (-not (Test-Path $Path)) { return [int64]0 }
    $sum = (Get-ChildItem $Path -Recurse -File -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum
    if ($null -eq $sum) { return [int64]0 }
    return [int64]$sum
}

function New-LodTile(
    [string]$SourceDir,
    [string]$Destination,
    [int]$Row,
    [int]$Column,
    [int]$SourceRows,
    [int]$SourceColumns,
    [int]$TileWidth,
    [int]$TileHeight,
    [string]$SourceExtension
) {
    $doubleWidth = $TileWidth * 2
    $doubleHeight = $TileHeight * 2
    $canvas = [System.Drawing.Bitmap]::new($doubleWidth, $doubleHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($canvas)
    try {
        $graphics.Clear([System.Drawing.Color]::FromArgb(255, 52, 75, 85))
        $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy

        for ($dy = 0; $dy -lt 2; $dy++) {
            for ($dx = 0; $dx -lt 2; $dx++) {
                $sourceRow = $Row * 2 + $dy
                $sourceColumn = $Column * 2 + $dx
                if ($sourceRow -ge $SourceRows -or $sourceColumn -ge $SourceColumns) { continue }

                $sourcePath = Join-Path $SourceDir (Tile-Name $sourceRow $sourceColumn $SourceExtension)
                if (-not (Test-Path $sourcePath)) { continue }

                $image = [System.Drawing.Image]::FromFile($sourcePath)
                try {
                    $graphics.DrawImageUnscaled($image, $dx * $TileWidth, $dy * $TileHeight)
                }
                finally {
                    $image.Dispose()
                }
            }
        }

        $output = [System.Drawing.Bitmap]::new($TileWidth, $TileHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $outGraphics = [System.Drawing.Graphics]::FromImage($output)
        try {
            $outGraphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
            $outGraphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighSpeed
            $outGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBilinear
            $outGraphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
            $outGraphics.DrawImage($canvas, 0, 0, $TileWidth, $TileHeight)
            $output.Save($Destination, [System.Drawing.Imaging.ImageFormat]::Jpeg)
        }
        finally {
            $outGraphics.Dispose()
            $output.Dispose()
        }
    }
    finally {
        $graphics.Dispose()
        $canvas.Dispose()
    }
}

function Build-MapLod([string]$Id, [string]$Folder) {
    $manifestPath = Join-Path $ProjectRoot "builtin-map-manifests\$Id\map.json"
    if (-not (Test-Path $manifestPath)) { throw "Missing $manifestPath. Run maps:check first." }
    $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
    if ($null -eq $manifest.detected) { throw "$Id manifest has no detected tile information." }

    $sourceDir = Join-Path $ProjectRoot "BUILT_IN_MAP_TILES\$Folder"
    $packOut = Join-Path $ProjectRoot "generated-map-lod\$Id"
    $infoPath = Join-Path $packOut "lod-info.json"
    $fingerprint = "{0}x{1}|{2}x{3}|{4}" -f $manifest.detected.rows, $manifest.detected.columns, $manifest.detected.tileWidth, $manifest.detected.tileHeight, $manifest.detected.sourceBytes

    if (Test-Path $infoPath) {
        try {
            $old = Get-Content $infoPath -Raw | ConvertFrom-Json
            if ($old.fingerprint -eq $fingerprint -and [int]$old.lodLevels -gt 0) {
                $manifest | Add-Member -NotePropertyName lodLevels -NotePropertyValue ([int]$old.lodLevels) -Force
                $manifest | ConvertTo-Json -Depth 8 | Set-Content $manifestPath -Encoding UTF8
                Write-Host "[$Folder] LOD is already current ($($old.lodLevels) levels)." -ForegroundColor DarkGray
                return
            }
        } catch { }
    }

    Remove-Item $packOut -Recurse -Force -ErrorAction SilentlyContinue
    New-Item -ItemType Directory -Path $packOut -Force | Out-Null

    $tileWidth = [int]$manifest.detected.tileWidth
    $tileHeight = [int]$manifest.detected.tileHeight
    $sourceRows = [int]$manifest.detected.rows
    $sourceColumns = [int]$manifest.detected.columns
    $previousDir = $sourceDir
    $previousExtension = "png"
    $lod = 0

    Write-Host "[$Folder] Creating automatic zoom LOD..." -ForegroundColor Cyan

    while ($sourceRows -gt 1 -or $sourceColumns -gt 1) {
        $lod++
        $rows = [int][Math]::Ceiling($sourceRows / 2.0)
        $columns = [int][Math]::Ceiling($sourceColumns / 2.0)
        $destinationDir = Join-Path $packOut "lod$lod"
        New-Item -ItemType Directory -Path $destinationDir -Force | Out-Null
        $total = $rows * $columns
        $done = 0

        Write-Host "  LOD $lod : $rows x $columns ($total tiles)" -ForegroundColor DarkCyan
        for ($row = 0; $row -lt $rows; $row++) {
            for ($column = 0; $column -lt $columns; $column++) {
                $destination = Join-Path $destinationDir (Tile-Name $row $column "jpg")
                New-LodTile $previousDir $destination $row $column $sourceRows $sourceColumns $tileWidth $tileHeight $previousExtension
                $done++
                if (($done % 25) -eq 0 -or $done -eq $total) {
                    Write-Progress -Activity "$Folder LOD $lod" -Status "$done / $total" -PercentComplete (($done / $total) * 100)
                }
            }
        }
        Write-Progress -Activity "$Folder LOD $lod" -Completed
        $sourceRows = $rows
        $sourceColumns = $columns
        $previousDir = $destinationDir
        $previousExtension = "jpg"
    }

    $bytes = Get-DirectoryBytes $packOut
    $info = [ordered]@{
        fingerprint = $fingerprint
        lodLevels = $lod
        generatedBytes = $bytes
        generatedAt = (Get-Date).ToString("o")
    }
    $info | ConvertTo-Json | Set-Content $infoPath -Encoding UTF8

    $manifest | Add-Member -NotePropertyName lodLevels -NotePropertyValue $lod -Force
    $manifest | Add-Member -NotePropertyName lodFormat -NotePropertyValue "jpg" -Force
    $manifest | Add-Member -NotePropertyName lodGeneratedBytes -NotePropertyValue $bytes -Force
    $manifest | Add-Member -NotePropertyName lodGeneratedAt -NotePropertyValue ((Get-Date).ToString("o")) -Force
    $manifest | ConvertTo-Json -Depth 8 | Set-Content $manifestPath -Encoding UTF8
    Write-Host "  Done: $lod LOD levels." -ForegroundColor Green
}

Write-Host "Reforger Tactical Planner v0.7 - map LOD generator" -ForegroundColor Green
Build-MapLod "everon" "Everon"
Build-MapLod "serhiivka" "Serhiivka"
Write-Host "Automatic map LOD ready." -ForegroundColor Green
