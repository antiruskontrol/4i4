@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 4i4 Local Studio Server (127.0.0.1:8080)
echo Starting 4i4 Local Studio Server (auto-save + auto-push)...
start "" "http://127.0.0"
python local-studio-server.py
pause