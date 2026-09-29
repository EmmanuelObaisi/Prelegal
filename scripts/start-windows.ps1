$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker is not installed or is not on PATH. Install Docker Desktop and try again."
}

if (-not (Test-Path -LiteralPath (Join-Path $projectRoot '.env'))) {
    throw "Missing .env file in $projectRoot. Create it with your application settings before starting."
}

Push-Location $projectRoot
try {
    docker info --format '{{.ServerVersion}}' | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Docker is not running. Start Docker Desktop and try again."
    }

    docker compose version
    if ($LASTEXITCODE -ne 0) {
        throw "Docker Compose is unavailable. Install or update Docker Desktop and try again."
    }

    Write-Host "Building and starting Prelegal..."
    docker compose up --build -d
    if ($LASTEXITCODE -ne 0) {
        throw "Prelegal failed to start. Check the Docker output above."
    }

    Write-Host "Prelegal containers started. The app will be available at http://localhost:8000"
    Write-Host "View logs: docker compose logs -f"
    Write-Host "Stop: .\scripts\stop-windows.ps1"
}
finally {
    Pop-Location
}
