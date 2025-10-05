# PowerShell version bump script for Windows

param(
    [Parameter(Mandatory=$true)]
    [string]$Version
)

# Validate version format
if ($Version -notmatch '^\d+\.\d+\.\d+(-[a-zA-Z0-9]+)?$') {
    Write-Host "Error: Invalid version format" -ForegroundColor Red
    Write-Host "Version should be in format: MAJOR.MINOR.PATCH (e.g., 0.2.0)"
    Write-Host "Or with pre-release: 0.2.0-alpha"
    exit 1
}

Write-Host "Bumping version to $Version..." -ForegroundColor Blue

# Update package.json
(Get-Content package.json) -replace '"version": ".*"', "`"version`": `"$Version`"" | Set-Content package.json
Write-Host "✓ Updated package.json" -ForegroundColor Green

# Update Cargo.toml
(Get-Content src-tauri/Cargo.toml) -replace 'version = ".*"', "version = `"$Version`"" | Set-Content src-tauri/Cargo.toml
Write-Host "✓ Updated src-tauri/Cargo.toml" -ForegroundColor Green

# Update tauri.conf.json
(Get-Content src-tauri/tauri.conf.json) -replace '"version": ".*"', "`"version`": `"$Version`"" | Set-Content src-tauri/tauri.conf.json
Write-Host "✓ Updated src-tauri/tauri.conf.json" -ForegroundColor Green

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Blue
Write-Host "1. Update CHANGELOG.md with your changes"
Write-Host "2. Review the changes: git diff"
Write-Host "3. Commit: git add . && git commit -m 'chore: bump version to $Version'"
Write-Host "4. Create tag: git tag v$Version"
Write-Host "5. Push: git push origin main && git push origin v$Version"
Write-Host ""
Write-Host "Or run this one-liner (after updating CHANGELOG.md):" -ForegroundColor Blue
Write-Host "git add . ; git commit -m 'chore: bump version to $Version' ; git tag v$Version ; git push origin main ; git push origin v$Version"
