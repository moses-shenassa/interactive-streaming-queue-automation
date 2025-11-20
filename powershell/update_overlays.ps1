param([switch]$Advance)

$ErrorActionPreference = 'Stop'

# ===== CONFIG =====
$BaseUrl = 'https://YOUR_WEB_APP_URL/exec'

# --- OBS WebSocket (v5) ---
$ObsWsUrl        = 'ws://127.0.0.1:4455'
$ObsPassword     = 'CHANGE_ME'
$ToastGroupName  = 'First Timer Toast!'
$FrameItemName   = 'Frame'
$ToastHoldMs     = 4000
$PreGapMs        = 1

# ===== Paths / Logging =====
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir
$logPath   = Join-Path $scriptDir 'last_run.log'
$jsonPath  = Join-Path $scriptDir 'last_response.json'
$firstTimerNamePath = Join-Path $scriptDir 'first_timer_name.txt'

function Log($m){ ("[{0:yyyy-MM-dd HH:mm:ss}] {1}" -f (Get-Date), $m) | Add-Content $logPath }

function Make-Uri($base, $query){
  if ($query -and $query[0] -ne '?') { $query = '?' + $query }
  [System.Uri]::new($base + $query)
}
function Write-Utf8-NoNewline($path, $text){
  if ($null -eq $text) { $text = '' }
  [System.IO.File]::WriteAllText($path, [string]$text, [System.Text.Encoding]::UTF8)
}

# ===== OBS helpers =====
function ObsSend($sock, $obj){
  if ($null -eq $obj) { $obj = @{ } }
  $msg = $obj | ConvertTo-Json -Depth 12
  if ([string]::IsNullOrEmpty($msg)) { $msg = '{}' }
  if ($sock.State -ne [System.Net.WebSockets.WebSocketState]::Open) {
    throw "OBS WebSocket not open (state: $($sock.State))."
  }
  $arr = [Text.Encoding]::UTF8.GetBytes($msg)
  $seg = New-Object System.ArraySegment[byte] ($arr, 0, $arr.Length)
  $sock.SendAsync($seg, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, [Thread.CancellationToken]::None).Wait()
}
function ObsRecv($sock){
  $buf = New-Object byte[] 16384
  $res = $sock.ReceiveAsync([ArraySegment[byte]]$buf, [Thread.CancellationToken]::None).Result
  if ($res.Count -le 0) { throw "OBS closed connection." }
  [Text.Encoding]::UTF8.GetString($buf,0,$res.Count) | ConvertFrom-Json
}
function ObsReq($ws, $type, $data=@{}){
  $rid = [Guid]::NewGuid().ToString()
  ObsSend $ws @{ op=6; d=@{ requestType=$type; requestId=$rid; requestData=$data } }
  do { $resp = ObsRecv $ws } while (-not ($resp -and $resp.d -and $resp.d.requestId -eq $rid))
  return $resp
}
function ObsConnect([string]$wsUrl, [string]$password) {
  $ws = [System.Net.WebSockets.ClientWebSocket]::new()
  $ws.ConnectAsync($wsUrl, [Thread.CancellationToken]::None).Wait()

  $hello = ObsRecv $ws
  $authB64 = $null
  if ($hello.d -and $hello.d.authentication) {
    $sha256    = [System.Security.Cryptography.SHA256]::Create()
    $salt      = $hello.d.authentication.salt
    $challenge = $hello.d.authentication.challenge
    $secretRaw = $sha256.ComputeHash([Text.Encoding]::UTF8.GetBytes("$password$salt"))
    $secretB64 = [Convert]::ToBase64String($secretRaw)
    $authRaw   = $sha256.ComputeHash([Text.Encoding]::UTF8.GetBytes("$secretB64$challenge"))
    $authB64   = [Convert]::ToBase64String($authRaw)
  }

  ObsSend $ws @{ op=1; d=@{ rpcVersion=1; authentication=$authB64 } }
  $identified = ObsRecv $ws
  if ($identified.op -ne 2) { throw "OBS identify failed." }
  return $ws
}
function ObsGetCurrentSceneName($ws){
  (ObsReq $ws 'GetCurrentProgramScene').d.responseData.currentProgramSceneName
}
function ObsGetSceneItemId($ws, $sceneName, $sourceName){
  (ObsReq $ws 'GetSceneItemId' @{ sceneName=$sceneName; sourceName=$sourceName }).d.responseData.sceneItemId
}
function ObsSetSceneItemEnabled($ws, $sceneName, $sceneItemId, $enabled){
  ObsReq $ws 'SetSceneItemEnabled' @{ sceneName=$sceneName; sceneItemId=$sceneItemId; sceneItemEnabled=$enabled } | Out-Null
}

# ===== RUN =====
try {
  Log "---- START (Advance=$($Advance.IsPresent)) ----"
  $ts = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()

  if ($Advance) {
    $nextUri = Make-Uri $BaseUrl "next=true&t=$ts"
    Log "Calling NEXT: $nextUri"
    Invoke-WebRequest -Uri $nextUri -UseBasicParsing | Out-Null
    Start-Sleep -Milliseconds 200
  }

  $getUri = Make-Uri $BaseUrl "t=$ts"
  Log "Fetching state: $getUri"
  $data = Invoke-RestMethod -Uri $getUri -Method GET
  if ($null -eq $data) { throw "No JSON returned." }

  ($data | ConvertTo-Json -Depth 6) | Out-File -FilePath $jsonPath -Encoding utf8

  $nowStr    = if ($null -ne $data.now)   { [string]$data.now }   else { '' }
  $countStr  = if ($null -ne $data.count) { [string]$data.count } else { '0' }
  $upNextStr = if ($null -ne $data.upNext){ [string]$data.upNext } else { '' }
  $upNextStr = $upNextStr -replace "\\n", [Environment]::NewLine

  Write-Utf8-NoNewline (Join-Path $scriptDir 'now_active.txt')    $nowStr
  Write-Utf8-NoNewline (Join-Path $scriptDir 'session_count.txt') $countStr
  Write-Utf8-NoNewline (Join-Path $scriptDir 'up_next.txt')        $upNextStr

  Log "WROTE files: now='$nowStr' count=$countStr"

  # Optional: first-timer toast (requires adding 'first' in your JSON if you use it)
  if ($false) {
    $ws        = ObsConnect $ObsWsUrl $ObsPassword
    $sceneName = ObsGetCurrentSceneName $ws
    $frameId   = ObsGetSceneItemId $ws $sceneName $FrameItemName
    $toastId   = ObsGetSceneItemId $ws $sceneName $ToastGroupName
    if ($frameId -and $toastId) {
      ObsSetSceneItemEnabled $ws $sceneName $frameId $false
      Start-Sleep -Milliseconds $PreGapMs
      ObsSetSceneItemEnabled $ws $sceneName $toastId $true
      Start-Sleep -Milliseconds $ToastHoldMs
      ObsSetSceneItemEnabled $ws $sceneName $frameId $true
      ObsSetSceneItemEnabled $ws $sceneName $toastId $false
    }
    $ws.Dispose()
  }

  Log "---- END OK ----`r`n"
}
catch {
  Log "ERROR: $($_.Exception.Message)"
  Log "---- END ERROR ----`r`n"
  throw
}
