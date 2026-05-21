@echo off
:: FilmDice — double-click launcher
:: Opens PowerShell and runs start.ps1

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1"
