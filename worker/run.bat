@echo off
echo Starting Moonrise Studio worker on http://localhost:8787
cd /d "%~dp0"
if not exist .env (
  echo Copy .env.example to .env and fill secrets first.
  pause
  exit /b 1
)
npm start
