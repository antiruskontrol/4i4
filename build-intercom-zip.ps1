$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$extDir = Join-Path $root "4i4-intercom-ext"
$zipPath = Join-Path $root "4i4-intercom-ext.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($extDir, $zipPath, [System.IO.Compression.CompressionLevel]::Optimal, $false)
Write-Host "OK: 4i4-intercom-ext.zip packed successfully." -ForegroundColor Green