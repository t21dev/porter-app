# Release Checklist

Quick reference for creating a new release.

## 🚀 Quick Release (Automated)

### 1. Bump Version

**Windows (PowerShell):**
```powershell
.\bump-version.ps1 0.2.0
```

**Linux/Mac:**
```bash
./bump-version.sh 0.2.0
```

### 2. Update CHANGELOG.md

Add your changes under a new version section:

```markdown
## [0.2.0] - 2025-10-06

### Added
- New feature X

### Changed
- Improved Y

### Fixed
- Fixed bug Z
```

### 3. Commit and Tag

```bash
# Review changes
git diff

# Commit
git add .
git commit -m "chore: bump version to 0.2.0"

# Tag
git tag v0.2.0

# Push (this triggers the build)
git push origin main
git push origin v0.2.0
```

### 4. Wait for GitHub Actions

- Go to: https://github.com/t21dev/porter-app/actions
- Wait for "Release" workflow to complete (~10-15 min)
- Builds Windows, macOS, and Linux automatically

### 5. Publish Release

- Go to: https://github.com/t21dev/porter-app/releases
- Find the draft release
- Click "Edit"
- Review auto-generated notes from CHANGELOG
- Add screenshots if needed
- Click "Publish release"

## ✅ Pre-Release Checklist

Before tagging:

- [ ] Version bumped in all 3 files (package.json, Cargo.toml, tauri.conf.json)
- [ ] CHANGELOG.md updated with changes
- [ ] All tests passing locally
- [ ] Build works locally (`npm run tauri:build`)
- [ ] No pending commits
- [ ] On main branch

## 📝 Version Files

Must update these 3 files:

1. `package.json` → Line 3
2. `src-tauri/Cargo.toml` → Line 3
3. `src-tauri/tauri.conf.json` → Line 4

## 🎯 Release Types

### Patch (0.0.X) - Bug fixes
```bash
./bump-version.ps1 0.1.1
```

### Minor (0.X.0) - New features
```bash
./bump-version.ps1 0.2.0
```

### Major (X.0.0) - Breaking changes
```bash
./bump-version.ps1 1.0.0
```

### Pre-release
```bash
./bump-version.ps1 0.2.0-beta
```

## 🔧 What GitHub Actions Does

The workflow automatically:

1. ✅ Extracts changelog for the version
2. ✅ Builds Windows (MSI, NSIS)
3. ✅ Builds macOS (DMG, App)
4. ✅ Builds Linux (AppImage, DEB)
5. ✅ Creates draft release
6. ✅ Attaches all installers
7. ✅ Includes changelog in release notes

## 📦 Build Artifacts

After release, users can download:

**Windows:**
- `Porter_0.2.0_x64_en-US.msi` (recommended)
- `Porter_0.2.0_x64-setup.exe`

**macOS:**
- `Porter_0.2.0_x64.dmg`
- `Porter.app.tar.gz`

**Linux:**
- `Porter_0.2.0_amd64.AppImage`
- `Porter_0.2.0_amd64.deb`

## 🐛 Troubleshooting

### Wrong tag pushed?
```bash
git tag -d v0.2.0                    # Delete local
git push origin :refs/tags/v0.2.0   # Delete remote
```

### Build failed?
- Check GitHub Actions logs
- Re-run workflow from Actions tab
- Or delete tag and re-push

### Forgot to update changelog?
- Can edit release notes manually on GitHub
- Or delete tag, update changelog, re-tag

## 📚 Full Documentation

See `docs/version-management.md` for complete details.
