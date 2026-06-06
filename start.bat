@echo off
title CRM Server
cd /d "%~dp0"
echo Starting CRM Server...
echo Open http://localhost:3000 in your browser
echo Press Ctrl+C to stop
npm start
pause
