@echo off
echo [1/4] Generating sitemap.xml from gallery-data.js...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0update-sitemap.ps1"

echo [2/4] Staging and committing changes...
git add .
git commit -m "Update SEO metadata, sitemap.xml and gallery"

echo [3/4] Syncing with remote GitHub...
git pull origin main --rebase

echo [4/4] Pushing to GitHub Pages...
git push origin main

echo Done! Site will update in 1-2 minutes.
pause