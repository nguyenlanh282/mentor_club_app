# run-post-feed.ps1 - Wrapper chay post-feed-api.js (dang bai 14.3 len Facebook feed).
# Doc secret tu fetch-pages.local.json (dung chung). Token FB lay tu bang 14.1 Pages.
# Mac dinh dang that. Xem truoc khong dang: .\run-post-feed.ps1 --dry-run
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$env:Path = "$env:Path;$($env:ProgramFiles)\nodejs;$($env:APPDATA)\npm"

$cfgPath = Join-Path $here 'fetch-pages.local.json'
if (-not (Test-Path $cfgPath)) { throw "Thieu file cau hinh: $cfgPath" }
$cfg = Get-Content $cfgPath -Raw | ConvertFrom-Json
foreach ($k in 'LARK_APP_ID','LARK_APP_SECRET','LARK_APP_TOKEN','LARK_DOMAIN','GRAPH_VERSION','RESPECT_SCHEDULE') {
  if ($cfg.PSObject.Properties.Name -contains $k -and $cfg.$k) { Set-Item -Path "Env:$k" -Value ([string]$cfg.$k) }
}

$log = Join-Path $here ("run-post-feed-" + (Get-Date -Format 'yyyyMMdd') + ".log")
("==== " + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + " post-feed " + ($args -join ' ') + " ====") | Out-File -FilePath $log -Append -Encoding utf8
& node --no-deprecation (Join-Path $here 'post-feed-api.js') @args 2>&1 | Tee-Object -FilePath $log -Append
