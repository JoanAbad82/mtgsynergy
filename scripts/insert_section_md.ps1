$ErrorActionPreference = "Stop"

$targetPath = "site/content/posts/2026-02-06-combo-trelasarra-val.md"
$sectionHeading = "## Por qué este combo importa"
$anchorHeading = "## ¿Qué hace cada carta?"

if (-not (Test-Path -Path $targetPath)) {
  Write-Error "Target file not found: $targetPath"
  exit 1
}

$content = Get-Content -Raw -Path $targetPath

if ($content -match [regex]::Escape($sectionHeading)) {
  Write-Host "Section already present. No changes."
  exit 0
}

$anchorIndex = $content.IndexOf($anchorHeading, [System.StringComparison]::Ordinal)
if ($anchorIndex -lt 0) {
  Write-Error "Anchor heading not found: $anchorHeading"
  exit 2
}

$nl = [Environment]::NewLine
$sectionBlock = $sectionHeading + $nl + $nl
$updated = $content.Insert($anchorIndex, $sectionBlock)

Set-Content -Path $targetPath -Value $updated
Write-Host "Section inserted: $sectionHeading"
