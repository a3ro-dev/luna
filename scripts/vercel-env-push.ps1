# Adds all .env vars to Vercel for production + preview environments.
# Run from d:\poookie-cutie: .\scripts\vercel-env-push.ps1

$envFile = Join-Path $PSScriptRoot ".." ".env"
$environments = @("production", "preview", "development")

Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    # Skip comments and blank lines
    if ($line -eq "" -or $line.StartsWith("#")) { return }

    # Parse KEY=VALUE (value may be quoted)
    if ($line -match '^([^=]+)=(.*)$') {
        $key   = $Matches[1].Trim()
        $value = $Matches[2].Trim().Trim('"').Trim("'")

        foreach ($env in $environments) {
            Write-Host "  Adding $key → $env" -ForegroundColor Cyan
            $value | vercel env add $key $env --force 2>&1 | Out-Null
        }
        Write-Host "  ✓ $key" -ForegroundColor Green
    }
}

Write-Host "`nDone! Run 'vercel env ls' to verify." -ForegroundColor Yellow
