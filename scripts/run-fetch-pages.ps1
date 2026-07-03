# run-fetch-pages.ps1 - Wrapper chay fetch-pages-to-lark.js.
# Doc secret tu fetch-pages.local.json (cung thu muc), nap env roi goi node.
# Mac dinh chay --update de refresh token + info cho page da co.
# Tham so truyen them: .\run-fetch-pages.ps1 --dry-run   (chi in, khong ghi)
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path

# Node co trong PATH (Task Scheduler co the khong nap PATH day du).
$env:Path = "$env:Path;$($env:ProgramFiles)\nodejs;$($env:APPDATA)\npm"

# Nap secret tu file local.
$cfgPath = Join-Path $here 'fetch-pages.local.json'
if (-not (Test-Path $cfgPath)) { throw "Thieu file cau hinh: $cfgPath" }
$cfg = Get-Content $cfgPath -Raw | ConvertFrom-Json
foreach ($k in 'LARK_APP_ID','LARK_APP_SECRET','LARK_APP_TOKEN','LARK_TABLE_ID','FB_USER_TOKEN','LARK_DOMAIN','FB_VERSION') {
  if ($cfg.PSObject.Properties.Name -contains $k -and $cfg.$k) { Set-Item -Path "Env:$k" -Value ([string]$cfg.$k) }
}

# Mac dinh --update; neu nguoi dung tu truyen tham so thi dung tham so do.
$fwd = if ($args.Count -gt 0) { $args } else { @('--update') }

$log = Join-Path $here ("run-fetch-pages-" + (Get-Date -Format 'yyyyMMdd') + ".log")
("==== " + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + " fetch-pages " + ($fwd -join ' ') + " ====") | Out-File -FilePath $log -Append -Encoding utf8
& node --no-deprecation (Join-Path $here 'fetch-pages-to-lark.js') @fwd 2>&1 | Tee-Object -FilePath $log -Append
