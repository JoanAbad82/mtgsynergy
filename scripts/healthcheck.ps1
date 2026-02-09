param(
  [string]$BaseUrl = "https://mtgsynergy.com",
  [string]$PostPath = "/es/combo-trelasarra-val/",
  [string]$MustContain = "Por qué este combo importa",
  [int]$TimeoutSec = 20
)

$ErrorActionPreference = "Stop"

function Invoke-Get([string]$Url, [int]$TimeoutSec) {
  # UseBasicParsing keeps it Windows/PS-compatible
  return Invoke-WebRequest -UseBasicParsing -Method GET -Uri $Url -TimeoutSec $TimeoutSec
}

function Assert-Status200([object]$Resp, [string]$Label) {
  if ($Resp.StatusCode -ne 200) {
    throw "[FAIL] $Label expected 200, got $($Resp.StatusCode)"
  }
  Write-Host "[OK] $Label -> 200"
}

function Assert-Contains([string]$Content, [string]$Needle, [string]$Label) {
  if ($Content -notmatch [regex]::Escape($Needle)) {
    throw "[FAIL] $Label missing expected text: '$Needle'"
  }
  Write-Host "[OK] $Label contains: '$Needle'"
}

function Get-HeaderValue([object]$Resp, [string]$Name) {
  try {
    $v = $Resp.Headers[$Name]
    if ($null -eq $v) { return $null }
    if ($v -is [array]) { return ($v -join ", ") }
    return [string]$v
  } catch {
    return $null
  }
}

function Assert-HeaderPresent([object]$Resp, [string]$HeaderName, [string]$Label) {
  $v = Get-HeaderValue $Resp $HeaderName
  if ([string]::IsNullOrWhiteSpace($v)) {
    throw "[FAIL] $Label missing header: $HeaderName"
  }
  Write-Host "[OK] $Label header '$HeaderName': $v"
}

function Assert-HeaderAbsent([object]$Resp, [string]$HeaderName, [string]$Label) {
  $v = Get-HeaderValue $Resp $HeaderName
  if (-not [string]::IsNullOrWhiteSpace($v)) {
    throw "[FAIL] $Label unexpected header present: $HeaderName='$v'"
  }
  Write-Host "[OK] $Label header '$HeaderName' absent"
}

function Assert-CloudflareHeaders([object]$Resp, [string]$Label) {
  $cfRay  = Get-HeaderValue $Resp "cf-ray"
  $server = Get-HeaderValue $Resp "server"
  $cfCache = Get-HeaderValue $Resp "cf-cache-status"

  $hasCfRay = -not [string]::IsNullOrWhiteSpace($cfRay)
  $serverLooksCf = (-not [string]::IsNullOrWhiteSpace($server)) -and ($server -match "cloudflare")

  if (-not $hasCfRay) {
    if (-not $serverLooksCf) {
      throw "[FAIL] $Label not behind Cloudflare (missing cf-ray and server!=cloudflare). server='$server'"
    }
  }

  if ($hasCfRay) {
    Write-Host "[OK] $Label CF header cf-ray: $cfRay"
  } else {
    Write-Host "[OK] $Label CF inferred via server header: $server"
  }

  if ($serverLooksCf) {
    Write-Host "[OK] $Label server: $server"
  } else {
    Write-Host "[WARN] $Label server header not 'cloudflare' (server='$server'). cf-ray is sufficient."
  }

  # Optional but useful signal (not all setups expose it consistently)
  if (-not [string]::IsNullOrWhiteSpace($cfCache)) {
    Write-Host "[OK] $Label CF header cf-cache-status: $cfCache"
  } else {
    Write-Host "[WARN] $Label missing cf-cache-status (not fatal)."
  }
}

# Normalize URL join
$base = $BaseUrl.TrimEnd("/")

$homeUrl = "$base/"
$esUrl   = "$base/es/"
$post = if ($PostPath.StartsWith("/")) { $PostPath } else { "/$PostPath" }
$postUrl = "$base$post"

Write-Host "=== MTGSynergy Healthcheck (Prod, Hardened) ==="
Write-Host "TimeoutSec: $TimeoutSec"
Write-Host "Home: $homeUrl"
Write-Host "ES:   $esUrl"
Write-Host "Post: $postUrl"
Write-Host "MustContain: $MustContain"
Write-Host ""

# 1) HOME
$homeResp = Invoke-Get $homeUrl $TimeoutSec
Assert-Status200 $homeResp "HOME"
Assert-CloudflareHeaders $homeResp "HOME"
Assert-HeaderPresent $homeResp "cache-control" "HOME"
Assert-HeaderAbsent  $homeResp "x-powered-by"  "HOME"

# 2) /es/
$esResp = Invoke-Get $esUrl $TimeoutSec
Assert-Status200 $esResp "ES"
Assert-CloudflareHeaders $esResp "ES"
Assert-HeaderPresent $esResp "cache-control" "ES"
Assert-HeaderAbsent  $esResp "x-powered-by"  "ES"

# 3) POST
$postResp = Invoke-Get $postUrl $TimeoutSec
Assert-Status200 $postResp "POST"
Assert-CloudflareHeaders $postResp "POST"
Assert-HeaderPresent $postResp "cache-control" "POST"
Assert-HeaderAbsent  $postResp "x-powered-by"  "POST"

# 4) Content present (post)
Assert-Contains $postResp.Content $MustContain "POST BODY"

Write-Host ""
Write-Host "[PASS] Healthcheck completed successfully."
exit 0
