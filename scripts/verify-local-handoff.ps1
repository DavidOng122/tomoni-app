[CmdletBinding()]
param(
  [string]$ExpectedCountsPath = "handoff/verification/original_counts.json",
  [string]$OutputPath = "handoff/verification/restored_counts.json"
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repoRoot

$config = Get-Content -Raw -LiteralPath "supabase/config.toml"
if ($config -notmatch '(?m)^project_id\s*=\s*"([^"]+)"') {
  throw "Could not read project_id from supabase/config.toml"
}

$dbContainer = "supabase_db_$($Matches[1])"
$running = docker inspect -f '{{.State.Running}}' $dbContainer 2>$null
if ($LASTEXITCODE -ne 0 -or $running -ne "true") {
  throw "Local Supabase database container '$dbContainer' is not running. Run: npx supabase start"
}

$sql = @'
select json_build_object(
  'auth.users', (select count(*) from auth.users),
  'auth.identities', (select count(*) from auth.identities),
  'public.users', (select count(*) from public.users),
  'public.profiles', (select count(*) from public.profiles),
  'public.fixed_plans', (select count(*) from public.fixed_plans),
  'public.events', (select count(*) from public.events),
  'public.event_participations', (select count(*) from public.event_participations),
  'public.invitations', (select count(*) from public.invitations),
  'public.invitation_plan_pairs', (select count(*) from public.invitation_plan_pairs),
  'public.connections', (select count(*) from public.connections),
  'public.conversations', (select count(*) from public.conversations),
  'public.conversation_members', (select count(*) from public.conversation_members),
  'public.messages', (select count(*) from public.messages),
  'public.public_places', (select count(*) from public.public_places),
  'storage.buckets', (select count(*) from storage.buckets),
  'storage.objects', (select count(*) from storage.objects)
)::text;
'@

$actualJson = docker exec $dbContainer psql --username postgres --dbname postgres --tuples-only --no-align --command $sql
if ($LASTEXITCODE -ne 0) {
  throw "Could not query restored database counts"
}

$actual = $actualJson.Trim() | ConvertFrom-Json
$expected = Get-Content -Raw -LiteralPath $ExpectedCountsPath | ConvertFrom-Json
$actual | ConvertTo-Json | Set-Content -LiteralPath $OutputPath -Encoding utf8

$rows = foreach ($property in $expected.PSObject.Properties) {
  $name = $property.Name
  $expectedValue = [int64]$property.Value
  $actualProperty = $actual.PSObject.Properties[$name]
  if ($null -eq $actualProperty) {
    [pscustomobject]@{ Data = $name; Original = $expectedValue; Restored = "MISSING"; Match = "NO" }
    continue
  }

  $actualValue = [int64]$actualProperty.Value
  [pscustomobject]@{
    Data = $name
    Original = $expectedValue
    Restored = $actualValue
    Match = if ($expectedValue -eq $actualValue) { "YES" } else { "NO" }
  }
}

$rows | Format-Table -AutoSize
if ($rows.Match -contains "NO") {
  throw "Local handoff verification failed: one or more counts differ"
}

Write-Host "All restored counts match the recorded current state."
