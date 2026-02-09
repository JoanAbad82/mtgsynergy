param(
  [string]$BaseUrl = "https://mtgsynergy.com",
  [string]$PostPath = "/es/combo-trelasarra-val/",
  [string]$MustContain = "Por qué este combo importa"
)

$ErrorActionPreference = "Stop"

function Invoke-Get([string]$url) {
  # UseBasicParsing keeps it Windows/PS-compatible
  return Invoke-WebRequest -UseBasicParsing -Uri $url -Method GET
}

function Assert-Status200($resp, [string]$label) {
  if ($resp.StatusCode -ne 200) {
    throw "[FAIL] $label expected 200, got $($resp.StatusCode)"
  }
  Write-Host "[OK] $label -> 200"
}

function Assert-Contains([string]$content, [string]$needle, [string]$label) {
  if ($content -notmatch [regex]::Escape($needle)) {
    throw "[FAIL] $label missing expected text: '$needle'"
  }
  Write-Host "[OK] $label contains: '$needle'"
}

# Normalize URL join
$base = $BaseUrl.TrimEnd("/")
$post = if ($PostPath.StartsWith("/")) { $PostPath } else { "/$PostPath" }

$homeUrl = "$base/"
$postUrl = "$base$post"

Write-Host "=== MTGSynergy Healthcheck ==="
Write-Host "Home: $homeUrl"
Write-Host "Post: $postUrl"
Write-Host "MustContain: $MustContain"
Write-Host ""

# 1) Home
$homeResp = Invoke-Get $homeUrl
Assert-Status200 $homeResp "HOME"

# 2) Post
$p = Invoke-Get $postUrl
Assert-Status200 $p "POST"

# 3) Section present
Assert-Contains $p.Content $MustContain "POST BODY"

Write-Host ""
Write-Host "[PASS] Healthcheck completed successfully."
exit 0
