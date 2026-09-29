$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker is not installed or is not on PATH. Install Docker Desktop and try again."
}

Push-Location $projectRoot
try {
    docker info --format '{{.ServerVersion}}' | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Cannot connect to Docker. Start Docker Desktop and try again."
    }

    docker compose version
    if ($LASTEXITCODE -ne 0) {
        throw "Docker Compose is unavailable. Install or update Docker Desktop and try again."
    }

    Write-Host "Stopping Prelegal..."
    docker compose down
    if ($LASTEXITCODE -ne 0) {
        throw "Prelegal failed to stop. Check the Docker output above."
    }

    Write-Host "Prelegal stopped"
}
finally {
    Pop-Location
}
