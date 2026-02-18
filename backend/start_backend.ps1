# PowerShell script to start InBio Backend
Write-Host "Checking dependencies..." -ForegroundColor Cyan
if (-not (Test-Path "venv")) {
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    python -m venv venv
}

Write-Host "Activating virtual environment..." -ForegroundColor Yellow
. .\venv\Scripts\Activate.ps1

Write-Host "Installing/Updating requirements..." -ForegroundColor Yellow
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

Write-Host "Starting FastAPI server..." -ForegroundColor Green
python -m uvicorn server:app --reload --host 0.0.0.0 --port 8000
