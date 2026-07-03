# setup.ps1 - Trinh cai dat 1-cham he thong dang Reel Facebook (cho hoc vien).
# ASCII-only de PS 5.1 doc dung. Goi tu CAI-DAT.bat.

$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $here

function Hr { Write-Host ("-" * 60) -ForegroundColor DarkGray }
Write-Host ""
Write-Host "  CAI DAT HE THONG DANG REEL FACEBOOK" -ForegroundColor Cyan
Write-Host "  (lam theo huong dan, chi can dan vai thong tin)" -ForegroundColor Gray
Hr

# Chuan bi PATH cho phien nay
$nodeDir = Join-Path $env:ProgramFiles 'nodejs'
$npmDir  = Join-Path $env:APPDATA 'npm'
$env:Path = "$env:Path;$nodeDir;$npmDir"

# --- Buoc 1: Node.js ---
Write-Host "[1/5] Kiem tra Node.js ..." -ForegroundColor Yellow
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "  Chua co Node. Dang thu cai tu dong (winget)..." -ForegroundColor Gray
  $ok = $false
  if (Get-Command winget -ErrorAction SilentlyContinue) {
    try { winget install -e --id OpenJS.NodeJS.LTS --silent --accept-source-agreements --accept-package-agreements; $ok = $true } catch {}
  }
  $env:Path = "$env:Path;$nodeDir;$npmDir"
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "  !! Khong tu cai duoc Node." -ForegroundColor Red
    Write-Host "     Hay vao  https://nodejs.org  tai ban LTS, cai xong roi chay lai CAI-DAT.bat" -ForegroundColor Red
    Start-Process "https://nodejs.org/en/download"
    Read-Host "  (Nhan Enter de thoat)"; exit 1
  }
}
Write-Host "  OK: $(node -v)" -ForegroundColor Green

# --- Buoc 2: lark-cli ---
Write-Host "[2/5] Kiem tra lark-cli ..." -ForegroundColor Yellow
if (-not (Test-Path (Join-Path $npmDir 'lark-cli.cmd'))) {
  Write-Host "  Dang cai lark-cli (npm i -g @larksuite/cli) ..." -ForegroundColor Gray
  & npm i -g '@larksuite/cli' | Out-Null
}
$env:Path = "$env:Path;$npmDir"
Write-Host "  OK." -ForegroundColor Green

# --- Buoc 3: Nap App Lark ---
Write-Host "[3/5] Nap App Lark ..." -ForegroundColor Yellow
$appJson = Join-Path $here '_app.json'
$app = Get-Content $appJson -Raw -Encoding UTF8 | ConvertFrom-Json
if (-not $app.APP_SECRET) {
  Write-Host "  !! File _app.json chua co APP_SECRET. ADMIN can dien truoc khi gui bo nay." -ForegroundColor Red
  Read-Host "  (Nhan Enter de thoat)"; exit 1
}
& node (Join-Path $here 'init-app.js')
Write-Host "  OK." -ForegroundColor Green

# --- Buoc 4: Dang nhap Lark (mo trinh duyet) ---
Write-Host "[4/5] Dang nhap Lark cua BAN ..." -ForegroundColor Yellow
Write-Host "  Mot duong link/QR se hien ra -> mo trinh duyet -> bam Dong y (Authorize)." -ForegroundColor Gray
& lark-cli auth login --recommend
Write-Host "  OK." -ForegroundColor Green

# --- Buoc 5: Dan thong tin ---
Hr
Write-Host "[5/5] Dan thong tin (lay tu nguoi huong dan):" -ForegroundColor Yellow
$link = Read-Host "  1) Dan LINK Base cua ban (dang https://.../base/xxxx?table=tblyyyy)"
$baseToken = ''; $tableId = ''
if ($link -match '/base/([A-Za-z0-9]+)') { $baseToken = $Matches[1] }
if ($link -match '[?&]table=(tbl[A-Za-z0-9]+)') { $tableId = $Matches[1] }
if (-not $baseToken) { $baseToken = Read-Host "     Khong doc duoc base token. Dan rieng base token" }
if (-not $tableId)   { $tableId   = Read-Host "     Khong doc duoc table id. Dan rieng table id (tbl...)" }
$pageId  = Read-Host "  2) Dan FB PAGE ID (nguoi huong dan cung cap)"
$token   = Read-Host "  3) Dan FB PAGE TOKEN (nguoi huong dan cung cap)"

# Ghi config.local.json (UTF-8 khong BOM)
$cfgPath = Join-Path $here 'config.local.json'
$cfg = Get-Content $cfgPath -Raw -Encoding UTF8 | ConvertFrom-Json
$cfg.BASE_TOKEN = $baseToken
$cfg.TABLE_ID = $tableId
$cfg.FB_PAGE_ID = $pageId
$cfg.FB_PAGE_TOKEN = $token
$json = $cfg | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText($cfgPath, $json, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "  Da luu cau hinh." -ForegroundColor Green

# --- Dang thu ngay 1 lan (ON-DEMAND - KHONG tao task nen) ---
Hr
Write-Host "Che do: ON-DEMAND (chi dang khi ban chay, KHONG quet nen)." -ForegroundColor Yellow
Write-Host "Dang chay thu 1 lan ..." -ForegroundColor Gray
& node --no-deprecation (Join-Path $here 'post-reels.js')

Hr
Write-Host "  HOAN TAT! He thong da san sang (che do on-demand)." -ForegroundColor Green
Write-Host "  Cach dung: trong Base, dinh video vao 'Anh/video', viet 'Noi dung'," -ForegroundColor Gray
Write-Host "  dat 'TT Reel' = Cho dang. Roi bam dup 'DANG-NGAY.bat' de dang." -ForegroundColor Gray
Write-Host "  (KHONG tu dang theo gio - moi lan muon dang thi chay DANG-NGAY.bat)" -ForegroundColor Gray
Hr
Read-Host "  (Nhan Enter de dong)"
