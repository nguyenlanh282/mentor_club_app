# run-fetch-posts.ps1 - Wrapper chay fetch-posts-to-lark.js.
# Doc secret tu fetch-pages.local.json (dung chung), nap env roi goi node.
# Mac dinh chi THEM bai moi. Muon refresh chi so bai cu: .\run-fetch-posts.ps1 --update
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$env:Path = "$env:Path;$($env:ProgramFiles)\nodejs;$($env:APPDATA)\npm"

$cfgPath = Join-Path $here 'fetch-pages.local.json'
if (-not (Test-Path $cfgPath)) { throw "Thieu file cau hinh: $cfgPath" }
$cfg = Get-Content $cfgPath -Raw | ConvertFrom-Json
foreach ($k in 'LARK_APP_ID','LARK_APP_SECRET','LARK_APP_TOKEN','FB_USER_TOKEN','LARK_DOMAIN','FB_VERSION','POSTS_PER_PAGE') {
  if ($cfg.PSObject.Properties.Name -contains $k -and $cfg.$k) { Set-Item -Path "Env:$k" -Value ([string]$cfg.$k) }
}
if (-not $env:POSTS_PER_PAGE) { $env:POSTS_PER_PAGE = '100' }

$log = Join-Path $here ("run-fetch-posts-" + (Get-Date -Format 'yyyyMMdd') + ".log")
("==== " + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + " fetch-posts " + ($args -join ' ') + " ====") | Out-File -FilePath $log -Append -Encoding utf8
& node --no-deprecation (Join-Path $here 'fetch-posts-to-lark.js') @args 2>&1 | Tee-Object -FilePath $log -Append
