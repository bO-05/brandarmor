param(
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

function Read-DotEnvValue([string]$Name) {
  $envPath = Join-Path $ProjectRoot ".env.local"
  foreach ($line in Get-Content -LiteralPath $envPath) {
    if ($line -match '^\s*#') { continue }
    if ($line -match '^\s*([^=]+)=(.*)$' -and $matches[1].Trim() -eq $Name) {
      return $matches[2].Trim().Trim('"').Trim("'")
    }
  }
  return $null
}

$env:VERCEL = "1"
$env:TMP = "C:\tmp"
$env:TEMP = "C:\tmp"

@(
  "ANTHROPIC_API_KEY",
  "MISTRAL_API_KEY",
  "PERPLEXITY_API_KEY",
  "BRANDARMOR_OCR_PROVIDER",
  "BRANDARMOR_OCR_MODEL",
  "BRANDARMOR_LLM_JUDGE_PROVIDER",
  "BRANDARMOR_LLM_JUDGE_MODEL",
  "BRANDARMOR_LLM_JUDGE_FALLBACK_PROVIDER",
  "BRANDARMOR_LLM_JUDGE_FALLBACK_MODEL"
) | ForEach-Object {
  $value = Read-DotEnvValue $_
  if ($null -ne $value) {
    Set-Item -Path "Env:$_" -Value $value
  }
}

Set-Location $ProjectRoot
npm run start
