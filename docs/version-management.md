# Version Management Guide

This guide explains how to manage versions and create releases for Porter.

## Version Locations

Version numbers must be updated in **3 files**:

1. **package.json** - Line 3
   ```json
   "version": "0.1.0"
   ```

2. **src-tauri/Cargo.toml** - Line 3
   ```toml
   version = "0.1.0"
   ```

3. **src-tauri/tauri.conf.json** - Line 4
   ```json
   "version": "0.1.0"
   ```

## Release Process

### Step 1: Update Version Numbers

Manually update the version in all 3 files:

```bash
# Example: Bumping from 0.1.0 to 0.2.0

# 1. Update package.json
# Change "version": "0.1.0" to "version": "0.2.0"

# 2. Update src-tauri/Cargo.toml
# Change version = "0.1.0" to version = "0.2.0"

# 3. Update src-tauri/tauri.conf.json
# Change "version": "0.1.0" to "version": "0.2.0"
```

### Step 2: Update CHANGELOG.md

Add your changes to `CHANGELOG.md` following the [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format:

```markdown
## [0.2.0] - 2025-10-06

### Added
- New feature X
- New feature Y

### Changed
- Improved feature Z

### Fixed
- Fixed bug A
- Fixed bug B

### Removed
- Removed deprecated feature C
```

### Step 3: Commit Version Bump

```bash
git add package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json CHANGELOG.md
git commit -m "chore: bump version to 0.2.0"
git push origin main
```

### Step 4: Create and Push Tag

```bash
# Create tag
git tag v0.2.0

# Push tag (this triggers the release workflow)
git push origin v0.2.0
```

### Step 5: GitHub Actions Builds

The GitHub Actions workflow (`.github/workflows/release.yml`) will:

1. ✅ Detect the new tag
2. ✅ Build for Windows, macOS, and Linux
3. ✅ Create a **draft release**
4. ✅ Attach all build artifacts
5. ✅ Use the tag name for release title
6. ✅ Add a basic release body

### Step 6: Complete the Release

1. Go to: `https://github.com/t21dev/porter-app/releases`
2. Find your draft release
3. Click **"Edit"**
4. Copy the relevant section from `CHANGELOG.md`
5. Paste into the release description
6. Add screenshots if needed
7. Click **"Publish release"**

## Changelog Format

Use this format in `CHANGELOG.md`:

```markdown
## [Version] - YYYY-MM-DD

### Added
- New features

### Changed
- Changes to existing functionality

### Deprecated
- Features that will be removed in future

### Removed
- Removed features

### Fixed
- Bug fixes

### Security
- Security fixes
```

## What the GitHub Action Does

The `.github/workflows/release.yml` workflow:

```yaml
# Triggered by: git push origin v*
# Creates: Draft release with builds
# Attaches: CHANGELOG automatically (if configured)
```

**Current Behavior:**
- ✅ Builds Windows, macOS, Linux
- ✅ Creates draft release
- ✅ Attaches all installers/packages
- ⚠️ Uses basic release body (you add changelog manually)

**To Auto-Attach Changelog:**

Update `.github/workflows/release.yml` to extract from CHANGELOG.md:

```yaml
- name: Extract changelog
  id: changelog
  run: |
    VERSION=${GITHUB_REF#refs/tags/v}
    CHANGELOG=$(sed -n "/## \[$VERSION\]/,/## \[/p" CHANGELOG.md | sed '$d')
    echo "notes<<EOF" >> $GITHUB_OUTPUT
    echo "$CHANGELOG" >> $GITHUB_OUTPUT
    echo "EOF" >> $GITHUB_OUTPUT

- name: Build the app
  uses: tauri-apps/tauri-action@v0
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  with:
    tagName: ${{ github.ref_name }}
    releaseName: 'Porter v__VERSION__'
    releaseBody: ${{ steps.changelog.outputs.notes }}
    releaseDraft: true
    prerelease: false
```

## Version Bump Script (Optional)

Create a helper script to bump versions:

**bump-version.sh:**
```bash
#!/bin/bash

if [ -z "$1" ]; then
  echo "Usage: ./bump-version.sh <version>"
  echo "Example: ./bump-version.sh 0.2.0"
  exit 1
fi

VERSION=$1

# Update package.json
sed -i "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" package.json

# Update Cargo.toml
sed -i "s/version = \".*\"/version = \"$VERSION\"/" src-tauri/Cargo.toml

# Update tauri.conf.json
sed -i "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" src-tauri/tauri.conf.json

echo "Version bumped to $VERSION"
echo "Don't forget to:"
echo "1. Update CHANGELOG.md"
echo "2. Commit changes: git add . && git commit -m 'chore: bump version to $VERSION'"
echo "3. Create tag: git tag v$VERSION"
echo "4. Push: git push origin main && git push origin v$VERSION"
```

Make it executable:
```bash
chmod +x bump-version.sh
```

Usage:
```bash
./bump-version.sh 0.2.0
```

## Versioning Strategy

Follow [Semantic Versioning](https://semver.org/):

**Format: MAJOR.MINOR.PATCH**

- **MAJOR** (1.0.0): Breaking changes
  - API changes
  - Removed features
  - Major redesigns

- **MINOR** (0.1.0): New features (backwards compatible)
  - New functionality
  - Enhancements
  - Non-breaking changes

- **PATCH** (0.0.1): Bug fixes (backwards compatible)
  - Bug fixes
  - Performance improvements
  - Security patches

**Pre-release:**
- Alpha: `0.1.0-alpha`
- Beta: `0.1.0-beta`
- RC: `0.1.0-rc.1`

## Example Release Workflow

```bash
# 1. Make changes and commit
git add .
git commit -m "feat: add new port filtering feature"

# 2. Update versions (manual or script)
# Update package.json, Cargo.toml, tauri.conf.json to "0.2.0"

# 3. Update CHANGELOG.md
# Add entry for 0.2.0 with your changes

# 4. Commit version bump
git add package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json CHANGELOG.md
git commit -m "chore: bump version to 0.2.0"

# 5. Create and push tag
git tag v0.2.0
git push origin main
git push origin v0.2.0

# 6. Wait for GitHub Actions to build

# 7. Edit and publish draft release on GitHub
```

## Quick Reference

| Action | Command |
|--------|---------|
| Update version | Edit 3 files manually or use script |
| Update changelog | Edit `CHANGELOG.md` |
| Commit changes | `git commit -m "chore: bump version to X.Y.Z"` |
| Create tag | `git tag vX.Y.Z` |
| Push tag | `git push origin vX.Y.Z` |
| Trigger build | Push tag (automatic) |
| Publish release | Edit draft on GitHub |

## Troubleshooting

**Q: How do I fix a version mismatch?**
- Update all 3 files to the same version
- Create a new patch release

**Q: I pushed the wrong tag, how do I delete it?**
```bash
git tag -d v0.2.0              # Delete locally
git push origin :refs/tags/v0.2.0  # Delete remotely
```

**Q: The changelog wasn't included in the release**
- Currently manual: Copy from CHANGELOG.md to release notes
- Or update workflow to auto-extract (see above)

**Q: Build failed, can I re-run?**
- Delete the tag and re-push
- Or manually trigger the workflow from GitHub Actions tab
