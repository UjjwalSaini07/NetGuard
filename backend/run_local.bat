@echo off
cd /d "%~dp0"
if not exist ".env" (
    echo No .env found, copying .env.example -^> .env
    copy .env.example .env
)
set RUNTIME_MODE=local
if exist ".\.venv\Scripts\uvicorn.exe" (
    .\.venv\Scripts\uvicorn.exe app.main:app --reload --port 8000
) else (
    python -m uvicorn app.main:app --reload --port 8000
)
