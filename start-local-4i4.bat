@echo off
title Local Server 4i4 (localhost:8000)
cd /d "C:\Users\Dell\Documents\GitHub\4i4"
start "" "http://localhost:8000/"
python -m http.server 8000
