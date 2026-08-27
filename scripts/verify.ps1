$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

Set-Location $root
& "$root\venv\Scripts\python.exe" -m unittest -v `
    test_scanner_engine `
    tests.test_database `
    tests.test_api
& "$root\venv\Scripts\python.exe" -m compileall -q api engines scanners services

Set-Location "$root\frontend"
& npm.cmd run build
