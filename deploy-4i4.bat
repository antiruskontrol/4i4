@echo off
echo [1/3] Generating sitemap.xml from gallery-data.js...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0update-sitemap.ps1"

echo [2/3] Staging and committing changes...
git add .
git commit -m "Update SEO metadata, sitemap.xml and gallery"

echo [3/3] Pushing to GitHub Pages...
git push

echo Done! Site will update in 1-2 minutes.
pause