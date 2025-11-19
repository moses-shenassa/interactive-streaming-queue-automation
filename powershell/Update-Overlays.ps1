<#
.SYNOPSIS
    Updates text overlay files for a livestream based on a Google Apps Script
    queue API, and optionally triggers OBS WebSocket actions.

.DESCRIPTION
    - Calls a JSON endpoint exposed by the Google Apps Script web app
    - Writes:
        now_serving.txt
        up_next.txt
        served_count.txt
    - Optionally sends WebSocket commands to OBS (scene/source toggles)

    This is a sanitized example; you must plug in your own URLs, file paths,
    and OBS connection details.
#>

param(
    [int]$PollSeconds = 15
)

# --- CONFIG ------------------------------------------------------------------

# Base URL for your Apps Script web app (no query string).
# Example:
#   https://script.google.com/macros/s/AKfycbx1234567890/exec
$QueueApiBaseUrl = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec'

# Overlay text file paths (relative or absolute).
$OverlayDir = "C:\Overlays\Queue"
$NowServingPath    = Join-Path $OverlayDir "now_serving.txt"
$UpNextPath        = Join-Path $OverlayDir "up_next.txt"
$servedCountPath = Join-Path $OverlayDir "served_count.txt"

# OBS WebSocket settings (optional). Leave $UseObs = $false to disable.
$UseObs   = $false
$ObsHost  = "127.0.0.1"
$ObsPort  = 4455
$ObsPassword = "CHANGE_ME"

# Example scene/source names for optional toggles.
$ObsSceneName  = "Main"
$ObsSourceName = "FirstTimerToast"

# -----------------------------------------------------------------------------

function Get-QueueOverlayPayload {
    param(
        [string]$BaseUrl
    )

    $uri = "$BaseUrl?mode=overlay&format=json"

    try {
        $response = Invoke-RestMethod -Method Get -Uri $uri -TimeoutSec 10
        return $response
    }
    catch {
        Write-Warning "Failed to fetch overlay payload: $($_.Exception.Message)"
        return $null
    }
}

function Ensure-OverlayDir {
    param(
        [string]$Path
    )

    if (-not (Test-Path $Path)) {
        Write-Host "Creating overlay directory: $Path"
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
    }
}

function Write-OverlayFiles {
    param(
        [object]$Payload
    )

    if (-not $Payload) { return }

    $now   = $Payload.nowServing
    $next  = $Payload.upNext
    $done  = $Payload.served
    $total = $Payload.totalQueued

    $nowText   = if ($now)  { $now }  else { "" }
    $nextText  = if ($next) { $next } else { "" }
    $countText = "Completed: $done / Total: $total"

    Set-Content -LiteralPath $NowServingPath    -Value $nowText   -Encoding UTF8
    Set-Content -LiteralPath $UpNextPath        -Value $nextText  -Encoding UTF8
    Set-Content -LiteralPath $servedCountPath -Value $countText -Encoding UTF8

    Write-Host "Overlay updated. Now='$nowText' Next='$nextText' Count='$countText'"
}

# --- OPTIONAL: OBS WEBSOCKET CONTROL -----------------------------------------
# This is a minimal example showing how you might structure calls; you can
# replace it with your preferred module or .NET WebSocket implementation.

function Invoke-ObsAction {
    param(
        [string]$Action = "none"
    )

    if (-not $UseObs) { return }

    Write-Host "OBS action requested: $Action (placeholder implementation)"
    # In your real environment, you would:
    #  - Open a WebSocket connection to OBS
    #  - Authenticate with $ObsPassword
    #  - Send JSON-RPC requests to trigger scenes or sources
    #
    # This sanitized script only documents the intent.
}

# --- MAIN LOOP ---------------------------------------------------------------

Ensure-OverlayDir -Path $OverlayDir

Write-Host "Starting overlay updater. Poll interval: $PollSeconds seconds."
Write-Host "Press Ctrl+C to stop.`n"

while ($true) {
    $payload = Get-QueueOverlayPayload -BaseUrl $QueueApiBaseUrl
    if ($payload) {
        Write-OverlayFiles -Payload $payload

        # Example: trigger a short animation in OBS whenever there is a first-timer.
        # In the real system, this might be conditional on payload flags.
        # Invoke-ObsAction -Action "FirstTimerToast"
    }

    Start-Sleep -Seconds $PollSeconds
}
