[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Stop"

$baseUrl = "https://antiruskontrol.github.io/4i4"
$today = Get-Date -Format "yyyy-MM-dd"
$jsPath = Join-Path $PSScriptRoot "gallery-data.js"
$sitemapPath = Join-Path $PSScriptRoot "sitemap.xml"

# Безпечні символи Unicode (не залежать від кодування файлу .ps1)
$dash = [char]0x2014
$numSign = [char]0x2116

$rawJs = Get-Content -Path $jsPath -Raw -Encoding UTF8
$jsonText = $rawJs -replace '^\s*(export\s+)?(const|let|var)\s+EXHIBITIONS_DATA\s*=\s*', '' -replace ';\s*$', ''
$exhibitions = $jsonText | ConvertFrom-Json

function Encode-UrlPath([string]$path) {
    $segments = $path -split '/'
    $encodedSegments = $segments | ForEach-Object { [System.Uri]::EscapeDataString($_) }
    return ($encodedSegments -join '/')
}

$nsMain = "http://www.sitemaps.org" + "/schemas/sitemap/0.9"
$nsImg  = "http://www.google.com" + "/schemas/sitemap-image/1.1"

$xml = New-Object System.Text.StringBuilder
[void]$xml.AppendLine('<?xml version="1.0" encoding="UTF-8"?>')
[void]$xml.AppendLine("<urlset xmlns=`"$nsMain`"")
[void]$xml.AppendLine("        xmlns:image=`"$nsImg`">")

# 1. Головна сторінка студії (з постером)
[void]$xml.AppendLine('  <url>')
[void]$xml.AppendLine("    <loc>$baseUrl/</loc>")
[void]$xml.AppendLine("    <lastmod>$today</lastmod>")
[void]$xml.AppendLine('    <changefreq>weekly</changefreq>')
[void]$xml.AppendLine('    <priority>1.0</priority>')
if (Test-Path (Join-Path $PSScriptRoot "poster1.png")) {
    [void]$xml.AppendLine('    <image:image>')
    [void]$xml.AppendLine("      <image:loc>$baseUrl/poster1.png</image:loc>")
    [void]$xml.AppendLine('    </image:image>')
}
[void]$xml.AppendLine('  </url>')

# 2. Додаткові сторінки студії (Копілот та Каталог виставок)
$extraPages = @(
    @{ file = "copilot.html"; priority = "0.95" },
    @{ file = "exhibitions.html"; priority = "0.95" }
)

foreach ($p in $extraPages) {
    if (Test-Path (Join-Path $PSScriptRoot $p.file)) {
        [void]$xml.AppendLine('  <url>')
        [void]$xml.AppendLine("    <loc>$baseUrl/$($p.file)</loc>")
        [void]$xml.AppendLine("    <lastmod>$today</lastmod>")
        [void]$xml.AppendLine('    <changefreq>weekly</changefreq>')
        [void]$xml.AppendLine("    <priority>$($p.priority)</priority>")
        [void]$xml.AppendLine('  </url>')
    }
}

# 3. Сторінки художників та всі їхні картини
foreach ($artist in $exhibitions) {
    $pageLoc = "$baseUrl/$($artist.pageUrl)"
    [void]$xml.AppendLine('  <url>')
    [void]$xml.AppendLine("    <loc>$pageLoc</loc>")
    [void]$xml.AppendLine("    <lastmod>$today</lastmod>")
    [void]$xml.AppendLine('    <changefreq>weekly</changefreq>')
    [void]$xml.AppendLine('    <priority>0.9</priority>')

    if ($artist.tileImage) {
        $tilePath = Encode-UrlPath "$($artist.folder)/$($artist.tileImage)"
        $rawTile = "$($artist.artist) $dash $($artist.category)"
        $tileTitle = [System.Security.SecurityElement]::Escape($rawTile)
        [void]$xml.AppendLine('    <image:image>')
        [void]$xml.AppendLine("      <image:loc>$baseUrl/$tilePath</image:loc>")
        [void]$xml.AppendLine("      <image:title>$tileTitle</image:title>")
        [void]$xml.AppendLine('    </image:image>')
    }

    foreach ($section in $artist.sections) {
        if ($section.artworksCount -gt 0) {
            for ($i = 1; $i -le $section.artworksCount; $i++) {
                $imgPath = Encode-UrlPath "$($section.folder)/$i.webp"
                $rawTitle = "$($artist.artist): $($section.title) $dash $numSign$i"
                $safeTitle = [System.Security.SecurityElement]::Escape($rawTitle)
                $safeCaption = [System.Security.SecurityElement]::Escape($section.desc)

                [void]$xml.AppendLine('    <image:image>')
                [void]$xml.AppendLine("      <image:loc>$baseUrl/$imgPath</image:loc>")
                [void]$xml.AppendLine("      <image:title>$safeTitle</image:title>")
                [void]$xml.AppendLine("      <image:caption>$safeCaption</image:caption>")
                [void]$xml.AppendLine('    </image:image>')
            }
        }
    }
    [void]$xml.AppendLine('  </url>')
}

[void]$xml.AppendLine('</urlset>')

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($sitemapPath, $xml.ToString(), $utf8NoBom)

Write-Host "OK: sitemap.xml generated ($today)" -ForegroundColor Green