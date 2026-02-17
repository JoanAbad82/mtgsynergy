param(
  [string]$BaseUrl = "https://mtgsynergy.com"
)

$ErrorActionPreference = "Stop"

function Get-HeadInfo {
  param([string]$Url)
  try {
    $resp = Invoke-WebRequest -Method Head -Uri $Url -MaximumRedirection 5 -TimeoutSec 20
    $status = "$($resp.StatusCode) $($resp.StatusDescription)"
    $headers = $resp.Headers
    return [pscustomobject]@{
      Url = $Url
      Ok = $true
      Status = $status
      Headers = $headers
    }
  } catch {
    return [pscustomobject]@{
      Url = $Url
      Ok = $false
      Status = $_.Exception.Message
      Headers = @{}
    }
  }
}

function Format-Headers {
  param($Headers)
  $keys = @(
    "server",
    "date",
    "content-type",
    "cache-control",
    "etag",
    "last-modified",
    "cf-ray",
    "cf-cache-status",
    "x-vercel-id",
    "x-nf-request-id",
    "x-powered-by"
  )
  $out = @()
  foreach ($k in $keys) {
    if ($Headers.ContainsKey($k)) {
      $out += ("  {0}: {1}" -f $k, ($Headers[$k] -join ", "))
    }
  }
  return $out
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmm"
$outFile = "OPS_DEPLOY_DIAG_{0}.txt" -f $timestamp
$outPath = Join-Path (Get-Location) $outFile

$lines = @()
$lines += "MTGSynergy Deploy Diagnostics"
$lines += "Timestamp: $(Get-Date -Format o)"
$lines += "BaseUrl: $BaseUrl"
$lines += ""

$targets = @(
  "$BaseUrl/es/analizador-de-mazos-mtg/",
  "$BaseUrl/data/cards_index/_meta.json",
  "$BaseUrl/data/cards_index/l.json"
)

$lines += "== HTTP HEAD checks =="
$summary = @()
foreach ($t in $targets) {
  $info = Get-HeadInfo -Url $t
  $lines += "URL: $($info.Url)"
  $lines += "Status: $($info.Status)"
  if ($info.Ok) {
    $lines += (Format-Headers -Headers $info.Headers)
  }
  $lines += ""
  $summary += ("{0} -> {1}" -f $t, $info.Status)
}

$lines += "== Repo state =="
$lines += (git status -sb)
$lines += (git branch -vv)
$lines += (git remote -v)
$lines += ""

$lines += "== Workflows =="
if (Test-Path .github/workflows) {
  $wfFiles = Get-ChildItem .github/workflows -Filter *.yml -File
  if ($wfFiles.Count -eq 0) {
    $lines += "(no .yml workflows found)"
  } else {
    foreach ($wf in $wfFiles) {
      $lines += "Workflow: $($wf.Name)"
      $content = Get-Content $wf.FullName
      $hasPushMain = $false
      $inPush = $false
      foreach ($line in $content) {
        if ($line -match '^\s*push\s*:') { $inPush = $true; continue }
        if ($inPush -and $line -match '^\s*branches\s*:') { continue }
        if ($inPush -and $line -match '\bmain\b') { $hasPushMain = $true; break }
        if ($line -match '^\s*pull_request\s*:') { $inPush = $false }
      }
      $lines += ("  push->main: {0}" -f $hasPushMain)
    }
  }
} else {
  $lines += "(no .github/workflows directory)"
}

$lines += ""
$lines += "== Summary =="
$lines += $summary

$lines | Set-Content -Path $outPath

Write-Host "Wrote: $outFile"
Write-Host "Summary:"
$summary | ForEach-Object { Write-Host " - $_" }
