# run-reels.ps1 - Wrapper chay post-reels.js. Portable (chay tren may bat ky).
# ASCII-only de PS 5.1 doc dung (khong mojibake).

$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path

# Bao dam Node + lark-cli (npm global) co trong PATH du Task Scheduler khong nap PATH day du.
$nodeDir = Join-Path $env:ProgramFiles 'nodejs'
$npmDir  = Join-Path $env:APPDATA 'npm'
$env:Path = "$env:Path;$nodeDir;$npmDir"

$log = Join-Path $here ("run-" + (Get-Date -Format 'yyyyMMdd') + ".log")
("==== " + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + " run post-reels ====") | Out-File -FilePath $log -Append -Encoding utf8

& node --no-deprecation (Join-Path $here 'post-reels.js') @args 2>&1 | Tee-Object -FilePath $log -Append
