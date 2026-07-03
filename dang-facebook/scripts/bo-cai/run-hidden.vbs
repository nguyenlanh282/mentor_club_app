' run-hidden.vbs - Chay run-reels.ps1 AN HOAN TOAN (khong cua so PowerShell nhap nhay).
' Task Scheduler goi: wscript.exe "run-hidden.vbs"
Dim sh, here
here = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\"))
Set sh = CreateObject("WScript.Shell")
' Tham so 0 = cua so an ; False = khong cho doi (ps tu chay nen)
sh.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & here & "run-reels.ps1""", 0, False
