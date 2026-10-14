# Local Sprint 4 preflight while GitHub-hosted Actions runners are unavailable.
# Run from any location: powershell -ExecutionPolicy Bypass -File .\scripts\check-s4-rbac.ps1
param(
    [switch]$SkipInstall,
    [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$oldApiUrl = $env:NEXT_PUBLIC_API_URL
$oldTelemetry = $env:NEXT_TELEMETRY_DISABLED

function Invoke-Checked([string]$Description, [scriptblock]$Command) {
    Write-Host "[Sprint 4 QA] $Description" -ForegroundColor Cyan
    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "$Description failed (exit code $LASTEXITCODE)."
    }
}

Push-Location $projectRoot
try {
    if (-not $env:NEXT_PUBLIC_API_URL) {
        $env:NEXT_PUBLIC_API_URL = 'https://api.example.invalid/api'
    }
    $env:NEXT_TELEMETRY_DISABLED = '1'
    Invoke-Checked 'Node.js version' { node --version }
    Invoke-Checked 'npm version' { npm --version }

    if (-not $SkipInstall) {
        Invoke-Checked 'Install dependencies from lockfile' { npm ci }
    }

    Invoke-Checked 'Repair or verify Chart.js dependency' { node scripts/ensure-chartjs.mjs }
    Invoke-Checked 'TypeScript type-check' { npx --no-install tsc --noEmit }

    if (-not $SkipBuild) {
        Invoke-Checked 'Next.js production build' { npx --no-install next build --no-lint }
    }

    Write-Host '[Sprint 4 QA] Local checks passed. Manual application testing is still required.' -ForegroundColor Green
    Write-Host '[Sprint 4 QA] This does NOT indicate GitHub Actions has passed.' -ForegroundColor Yellow
}
finally {
    $env:NEXT_PUBLIC_API_URL = $oldApiUrl
    $env:NEXT_TELEMETRY_DISABLED = $oldTelemetry
    Pop-Location
}
