powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-intercom-zip.ps1"
@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo [1/4] Generating sitemap.xml via update-sitemap.ps1...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0update-sitemap.ps1"

echo [2/4] Staging and committing Sprints 1-5 changes...
git add .
git commit -m "feat: finalize Sprints 1-5 (Projects Showcase, Admin Studio, SEO, Live Chat & 4i4 Intercom)"

echo [3/4] Syncing with remote GitHub...
git pull origin main --rebase

echo [4/4] Pushing to GitHub Pages...
git push origin main

echo Done! Site will update in 1-2 minutes.
pause