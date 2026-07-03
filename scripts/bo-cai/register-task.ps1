# register-task.ps1 - Register Scheduled Task to auto-post Reels every 15 minutes.
# Run ONCE (normal PowerShell, runs as current user).
# NOTE: keep this file ASCII-only (PS 5.1 mis-reads UTF-8 .ps1 as mojibake).

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$ws   = (Get-Command wscript.exe).Source
$vbs  = Join-Path $here 'run-hidden.vbs'
$taskName = 'HOA - Dang Reel Facebook'

# Chay qua wscript + run-hidden.vbs => KHONG co cua so PowerShell nhap nhay (chay an tuyet doi).
$action  = New-ScheduledTaskAction -Execute $ws -Argument "`"$vbs`""

# Every 2 minutes, all day. Chay an nen khong gay phien; lock trong script chong chay chong.
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).Date `
  -RepetitionInterval (New-TimeSpan -Minutes 2) -RepetitionDuration (New-TimeSpan -Days 3650)

$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd `
  -ExecutionTimeLimit (New-TimeSpan -Hours 1) -MultipleInstances IgnoreNew -Hidden

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger `
  -Settings $settings -Description 'Auto-post video Reel from Lark Base to Facebook Page (TT Reel = Cho dang) - hidden' -Force

Write-Host "Registered task: $taskName (runs every 2 minutes, hidden)."
Write-Host "Run now:  Start-ScheduledTask -TaskName '$taskName'"
Write-Host "Remove:   Unregister-ScheduledTask -TaskName '$taskName' -Confirm:`$false"
