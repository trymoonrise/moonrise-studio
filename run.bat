@echo off
echo Starting Moonrise Studio static app on http://localhost:3000
cd /d "%~dp0"
npx --yes serve -l 3000 .
