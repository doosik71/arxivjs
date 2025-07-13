@echo off

cd /d %~dp0

rem set HOST=0.0.0.0
set HOST=localhost
set PORT=8766
set TARGET=http://localhost:8765

npm run dev
