$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$extDir = Join-Path $root "4i4-intercom-ext"
$manifestPath = Join-Path $extDir "manifest.json"
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)

$manifestRaw = [System.IO.File]::ReadAllText($manifestPath, $utf8NoBom)
$manifest = $manifestRaw | ConvertFrom-Json
$parts = ($manifest.version -split '\.')
if ($parts.Count -ge 3) {
    $patchNum = [int]($parts | Select-Object -Last 1) + 1
    $parts.SetValue([string]$patchNum, $parts.Count - 1)
    $ver = $parts -join '.'
} else {
    $ver = "1.0.2"
}
$manifestRaw = [regex]::Replace($manifestRaw, '"version"\s*:\s*"[^"]+"', ('"version": "' + $ver + '"'), 1)
[System.IO.File]::WriteAllText($manifestPath, $manifestRaw, $utf8NoBom)

Get-ChildItem -Path $root -Filter "4i4-intercom-ext-v*.zip" -ErrorAction SilentlyContinue | Remove-Item -Force
$legacyZip = Join-Path $root "4i4-intercom-ext.zip"
if (Test-Path $legacyZip) { Remove-Item $legacyZip -Force }

$versionedZipName = "4i4-intercom-ext-v$ver.zip"
$versionedZipPath = Join-Path $root $versionedZipName

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($extDir, $versionedZipPath, [System.IO.Compression.CompressionLevel]::Optimal, $false)
Copy-Item -Path $versionedZipPath -Destination $legacyZip -Force

Write-Host "OK: $versionedZipName packed successfully." -ForegroundColor Green
