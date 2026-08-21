$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

if (-not (Test-Path ".env")) {
    Write-Host "No .env found, copying .env.example -> .env"
    Copy-Item ".env.example" ".env"
}

$env:RUNTIME_MODE = "local"

if (Test-Path ".\.venv\Scripts\uvicorn.exe") {
    .\.venv\Scripts\uvicorn.exe app.main:app --reload --port 8000
} elseif (Test-Path ".\.venv\Scripts\python.exe") {
    .\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
} else {
    python -m uvicorn app.main:app --reload --port 8000
}
