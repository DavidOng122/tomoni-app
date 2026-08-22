[CmdletBinding()]
param(
  [switch]$ResetDatabase
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repoRoot

if (-not $ResetDatabase) {
  throw "This operation replaces local Supabase data. Re-run explicitly with: powershell -ExecutionPolicy Bypass -File scripts/restore-local-handoff.ps1 -ResetDatabase"
}

$requiredFiles = @(
  "handoff/database/prepare_exact_restore.sql",
  "handoff/database/remove_auth_trigger_users.sql",
  "handoff/database/local_public_data.sql",
  "handoff/auth/local_auth_data.sql",
  "handoff/storage/local_storage_metadata.sql",
  "handoff/verification/original_counts.json",
  "handoff/verification/SHA256SUMS.txt"
)

foreach ($file in $requiredFiles) {
  if (-not (Test-Path -LiteralPath $file -PathType Leaf)) {
    throw "Required handoff file is missing: $file"
  }
}

$handoffRoot = (Resolve-Path -LiteralPath "handoff").Path
foreach ($line in Get-Content -LiteralPath "handoff/verification/SHA256SUMS.txt") {
  if ($line -notmatch '^([0-9a-f]{64})  (.+)$') {
    throw "Invalid handoff checksum line: $line"
  }

  $expectedHash = $Matches[1]
  $relativePath = $Matches[2].Replace('/', [IO.Path]::DirectorySeparatorChar)
  $artifactPath = Join-Path $handoffRoot $relativePath
  if (-not (Test-Path -LiteralPath $artifactPath -PathType Leaf)) {
    throw "Handoff artifact listed by checksum is missing: $relativePath"
  }

  $actualHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $artifactPath).Hash.ToLowerInvariant()
  if ($actualHash -ne $expectedHash) {
    throw "Handoff artifact checksum mismatch: $relativePath"
  }
}

Write-Host "Handoff artifact checksums verified."

docker info *> $null
if ($LASTEXITCODE -ne 0) {
  throw "Docker Desktop / Docker Engine is not running"
}

$config = Get-Content -Raw -LiteralPath "supabase/config.toml"
if ($config -notmatch '(?m)^project_id\s*=\s*"([^"]+)"') {
  throw "Could not read project_id from supabase/config.toml"
}

$dbContainer = "supabase_db_$($Matches[1])"

Write-Host "Rebuilding local schema from repository migrations and ordinary seeds..."
& npx supabase db reset
if ($LASTEXITCODE -ne 0) {
  throw "supabase db reset failed; no handoff data was restored"
}

function Invoke-LocalSqlFile {
  param(
    [Parameter(Mandatory = $true)][string]$LocalPath,
    [Parameter(Mandatory = $true)][string]$ContainerPath
  )

  $resolved = (Resolve-Path -LiteralPath $LocalPath).Path
  docker cp $resolved "${dbContainer}:${ContainerPath}" | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "Could not copy SQL file into local database container: $LocalPath"
  }

  docker exec $dbContainer psql --username postgres --dbname postgres --set ON_ERROR_STOP=1 --file $ContainerPath
  if ($LASTEXITCODE -ne 0) {
    throw "SQL restore failed: $LocalPath"
  }
}

try {
  Write-Host "Clearing ordinary seed data..."
  Invoke-LocalSqlFile "handoff/database/prepare_exact_restore.sql" "/tmp/yorimi_prepare_exact_restore.sql"

  Write-Host "Restoring local development Auth users and identities..."
  Invoke-LocalSqlFile "handoff/auth/local_auth_data.sql" "/tmp/yorimi_local_auth_data.sql"

  Write-Host "Removing trigger-created public.users placeholders..."
  Invoke-LocalSqlFile "handoff/database/remove_auth_trigger_users.sql" "/tmp/yorimi_remove_auth_trigger_users.sql"

  Write-Host "Restoring current public application data..."
  Invoke-LocalSqlFile "handoff/database/local_public_data.sql" "/tmp/yorimi_local_public_data.sql"

  Write-Host "Restoring Storage bucket metadata..."
  Invoke-LocalSqlFile "handoff/storage/local_storage_metadata.sql" "/tmp/yorimi_local_storage_metadata.sql"
}
finally {
  docker exec $dbContainer sh -lc "rm -f /tmp/yorimi_*_data.sql /tmp/yorimi_prepare_exact_restore.sql /tmp/yorimi_remove_auth_trigger_users.sql" 2>$null | Out-Null
}

Write-Host "Comparing restored counts with the recorded current state..."
& powershell -ExecutionPolicy Bypass -File "scripts/verify-local-handoff.ps1"
if ($LASTEXITCODE -ne 0) {
  throw "Restored database count verification failed"
}

Write-Host "Exact local Yorimi handoff restore completed successfully."
