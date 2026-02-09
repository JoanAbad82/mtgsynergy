$ErrorActionPreference = "Stop"

function Get-RequiredEnv {
  param(
    [Parameter(Mandatory = $true)][string]$Name
  )
  $value = [Environment]::GetEnvironmentVariable($Name)
  if ([string]::IsNullOrWhiteSpace($value)) {
    Write-Error "Missing required environment variable: $Name"
    exit 1
  }
  return $value
}

$cfToken = Get-RequiredEnv -Name "CF_API_TOKEN"
$cfAccountId = Get-RequiredEnv -Name "CF_ACCOUNT_ID"
$cfZoneId = Get-RequiredEnv -Name "CF_ZONE_ID"

$project = "mtgsynergy"
$apiBase = "https://api.cloudflare.com/client/v4"
$headers = @{
  "Authorization" = "Bearer $cfToken"
  "Content-Type"  = "application/json"
}

try {
  $deploymentsUrl = "$apiBase/accounts/$cfAccountId/pages/projects/$project/deployments?per_page=1"
  $latest = Invoke-RestMethod -Method Get -Uri $deploymentsUrl -Headers $headers
  if (-not $latest.success -or -not $latest.result -or $latest.result.Count -lt 1) {
    Write-Error "Failed to fetch latest deployment for $project"
    exit 1
  }

  $latestId = $latest.result[0].id
  $retryUrl = "$apiBase/accounts/$cfAccountId/pages/projects/$project/deployments/$latestId/retry"
  $retry = Invoke-RestMethod -Method Post -Uri $retryUrl -Headers $headers
  if (-not $retry.success) {
    Write-Error "Redeploy failed for deployment $latestId"
    exit 1
  }

  $redeployId = $retry.result.id
  Write-Host "Redeploy triggered: $redeployId"

  $purgeUrl = "$apiBase/zones/$cfZoneId/purge_cache"
  $purgeBody = @{
    files = @(
      "https://mtgsynergy.com/",
      "https://mtgsynergy.com/es/combo-trelasarra-val/"
    )
  } | ConvertTo-Json -Depth 3

  $purge = Invoke-RestMethod -Method Post -Uri $purgeUrl -Headers $headers -Body $purgeBody
  if (-not $purge.success) {
    Write-Error "Cache purge failed"
    exit 1
  }

  $purgeId = $purge.result.id
  Write-Host "Cache purged: $purgeId"
  exit 0
} catch {
  Write-Error $_.Exception.Message
  exit 1
}
