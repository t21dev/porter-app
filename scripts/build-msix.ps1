# Packs the release exe into an MSIX for the Microsoft Store.
#
#   npm run tauri build -- --no-bundle     # or any build that leaves the release exe
#   pwsh scripts/build-msix.ps1            # unsigned, for uploading to Partner Center
#   pwsh scripts/build-msix.ps1 -Cert devcert.pfx   # signed with a test cert, to install locally
#
# Needs the winapp CLI: winget install microsoft.winappcli --source winget
# The Store signs the package itself, so the upload stays unsigned.
param(
    [string]$Exe = "src-tauri/target/release/porter-app.exe",
    [string]$Cert,
    [string]$CertPassword = "password",
    [string]$OutDir = "src-tauri/target/msix"
)
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

# The Store wants Major.Minor.Build.0: the last part is reserved for it.
$version = (Get-Content src-tauri/tauri.conf.json -Raw | ConvertFrom-Json).version
$msixVersion = "$($version.Split('-')[0]).0"

$layout = Join-Path $OutDir "layout"
if (Test-Path $layout) { Remove-Item -Recurse -Force $layout }
New-Item -ItemType Directory -Force $layout | Out-Null

Copy-Item $Exe (Join-Path $layout "Porter.exe")
Copy-Item -Recurse msix/Assets (Join-Path $layout "Assets")
(Get-Content msix/Package.appxmanifest -Raw) -replace 'Version="0\.0\.0\.0"', "Version=`"$msixVersion`"" |
    Set-Content (Join-Path $layout "AppxManifest.xml") -Encoding utf8

$output = Join-Path $OutDir "Porter_${version}_x64.msix"
[string[]]$signing = if ($Cert) { "--cert", $Cert, "--cert-password", $CertPassword } else { "--no-sign" }
winapp package $layout --manifest (Join-Path $layout "AppxManifest.xml") --output $output @signing
if ($LASTEXITCODE -ne 0) { throw "winapp package failed with exit code $LASTEXITCODE" }
Write-Host "MSIX: $output"
