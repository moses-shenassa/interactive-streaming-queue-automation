@echo off
pushd "%~dp0"
powershell -ExecutionPolicy Bypass -NoProfile -File ".\powershell\update_overlays.ps1" -Advance
popd
