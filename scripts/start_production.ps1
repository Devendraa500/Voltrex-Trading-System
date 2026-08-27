$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

$backend = Start-Process `
    -FilePath "$root\venv\Scripts\python.exe" `
    -ArgumentList "-m", "uvicorn", "api.main:app", "--host", "127.0.0.1", "--port", "8000" `
    -WorkingDirectory $root `
    -WindowStyle Hidden `
    -PassThru

$frontend = Start-Process `
    -FilePath "npm.cmd" `
    -ArgumentList "run", "start" `
    -WorkingDirectory "$root\frontend" `
    -WindowStyle Hidden `
    -PassThru

Write-Host "Voltrex Terminal started."
Write-Host "API PID: $($backend.Id) - http://127.0.0.1:8000/docs"
Write-Host "UI PID:  $($frontend.Id) - http://127.0.0.1:3000"
Write-Host "Press Ctrl+C to stop both services."

try {
    Wait-Process -Id $backend.Id, $frontend.Id
}
finally {
    Stop-Process -Id $backend.Id, $frontend.Id -ErrorAction SilentlyContinue
}
