param(
  [string]$BaseUrl = "https://mtgsynergy.com",
  [string]$PostPath = "/es/combo-trelasarra-val/",
  [string]$MustContain = "Por qué este combo importa"
)

$ErrorActionPreference = "Stop"

function Invoke-Get([string]$Url) {
  # UseBasicParsing keeps it Windows/PS-compatible
  return Invoke-WebRequest -UseBasicParsing -Method GET -Uri $Url
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

function Assert-CloudflareHeaders([object]$Resp, [string]$Label) {
  $cfRay = Get-HeaderValue $Resp "cf-ray"
  $server = Get-HeaderValue $Resp "server"

  $hasCfRay = -not [string]::IsNullOrWhiteSpace($cfRay)
  $serverLooksCf = (-not [string]::IsNullOrWhiteSpace($server)) -and ($server -match "cloudflare")

  # Regla pro: debe haber señal Cloudflare.
  # Aceptamos cf-ray como prueba principal; server es refuerzo.
  if (-not $hasCfRay) {
    # Si no hay cf-ray, intentamos salvar por server=cloudflare (caso raro)
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
    # No fallamos si no está (depende de configuración), pero lo mostramos
    Write-Host "[WARN] $Label server header not 'cloudflare' (server='$server'). cf-ray is sufficient."
  }
}

# Normalize URL join
$base = $BaseUrl.TrimEnd("/")
$post = if ($PostPath.StartsWith("/")) { $PostPath } else { "/$PostPath" }

$homeUrl = "$base/"
$postUrl = "$base$post"

Write-Host "=== MTGSynergy Healthcheck (Prod) ==="
Write-Host "Home: $homeUrl"
Write-Host "Post: $postUrl"
Write-Host "MustContain: $MustContain"
Write-Host ""

# 1) Home
$homeResp = Invoke-Get $homeUrl
Assert-Status200 $homeResp "HOME"
Assert-CloudflareHeaders $homeResp "HOME"

# 2) Post
$postResp = Invoke-Get $postUrl
Assert-Status200 $postResp "POST"
Assert-CloudflareHeaders $postResp "POST"

# 3) Section present
Assert-Contains $postResp.Content $MustContain "POST BODY"

Write-Host ""
Write-Host "[PASS] Healthcheck completed successfully."
exit 0
