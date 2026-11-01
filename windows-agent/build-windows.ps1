$ErrorActionPreference = "Stop"

$agentDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$outputDirectory = Join-Path $agentDirectory "..\frontend\public"
$outputPath = Join-Path $outputDirectory "SpendWiseAgent.exe"
$previousGoos = $env:GOOS
$previousGoarch = $env:GOARCH

New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
Push-Location $agentDirectory
try {
    $env:GOOS = "windows"
    $env:GOARCH = "amd64"
    go build -trimpath -ldflags "-s -w" -o $outputPath .
    if ($LASTEXITCODE -ne 0) {
        throw "Windows agent build failed with exit code $LASTEXITCODE."
    }
}
finally {
    if ($null -eq $previousGoos) {
        Remove-Item Env:GOOS -ErrorAction SilentlyContinue
    } else {
        $env:GOOS = $previousGoos
    }
    if ($null -eq $previousGoarch) {
        Remove-Item Env:GOARCH -ErrorAction SilentlyContinue
    } else {
        $env:GOARCH = $previousGoarch
    }
    Pop-Location
}

Write-Host "Built $outputPath"
