# GitHub Release Guide

This guide explains how to create a GitHub release for Porter with cross-platform builds.

## Prerequisites

1. GitHub repository set up at `https://github.com/t21dev/porter-app`
2. Repository secrets configured (if needed)
3. Code pushed to the `main` branch

## Automated Release (Recommended)

### Step 1: Create and Push a Tag

```bash
# Make sure you're on main branch and up to date
git checkout main
git pull

# Create a new tag (e.g., v0.1.0)
git tag v0.1.0

# Push the tag to GitHub
git push origin v0.1.0
```

### Step 2: Wait for GitHub Actions

1. Go to `https://github.com/t21dev/porter-app/actions`
2. The "Release" workflow will start automatically
3. Wait for all three builds to complete (Windows, macOS, Linux)
4. This usually takes 10-15 minutes

### Step 3: Edit the Draft Release

1. Go to `https://github.com/t21dev/porter-app/releases`
2. You'll see a draft release created by the workflow
3. Click "Edit" on the draft release
4. Copy content from `.github/RELEASE_TEMPLATE.md`
5. Update version numbers and release notes as needed
6. Add screenshots if available
7. Click "Publish release"

## Manual Release (Alternative)

If you prefer to build locally and create a manual release:

### Step 1: Build for Windows (Local)

Already built! Files are at:
- `src-tauri/target/release/bundle/msi/Porter_0.1.0_x64_en-US.msi`
- `src-tauri/target/release/bundle/nsis/Porter_0.1.0_x64-setup.exe`

### Step 2: Build for macOS

On a macOS machine:

```bash
# Clone the repository
git clone https://github.com/t21dev/porter-app
cd porter-app

# Install dependencies
npm install

# Build
npm run tauri:build
```

Files will be at:
- `src-tauri/target/release/bundle/dmg/Porter_0.1.0_x64.dmg`
- `src-tauri/target/release/bundle/macos/Porter.app`

### Step 3: Build for Linux

On a Linux machine (Ubuntu 22.04+):

```bash
# Install system dependencies
sudo apt-get update
sudo apt-get install -y libgtk-3-dev libwebkit2gtk-4.1-dev \
  libappindicator3-dev librsvg2-dev patchelf

# Clone and build
git clone https://github.com/t21dev/porter-app
cd porter-app
npm install
npm run tauri:build
```

Files will be at:
- `src-tauri/target/release/bundle/appimage/Porter_0.1.0_amd64.AppImage`
- `src-tauri/target/release/bundle/deb/Porter_0.1.0_amd64.deb`

### Step 4: Create GitHub Release Manually

1. Go to `https://github.com/t21dev/porter-app/releases/new`
2. Choose or create a tag (e.g., `v0.1.0`)
3. Set release title: `Porter v0.1.0`
4. Copy release notes from `.github/RELEASE_TEMPLATE.md`
5. Attach all build artifacts:
   - Windows: MSI and NSIS files
   - macOS: DMG file
   - Linux: AppImage and DEB files
6. Click "Publish release"

## Release Checklist

Before publishing:

- [ ] All builds completed successfully
- [ ] Version numbers are correct in:
  - [ ] package.json
  - [ ] src-tauri/Cargo.toml
  - [ ] src-tauri/tauri.conf.json
- [ ] CHANGELOG.md updated
- [ ] Screenshots added to release
- [ ] Release notes reviewed
- [ ] All platform installers tested
- [ ] Download links verified

## Versioning

Porter follows [Semantic Versioning](https://semver.org/):

- **Major** (1.0.0): Breaking changes
- **Minor** (0.1.0): New features, backwards compatible
- **Patch** (0.0.1): Bug fixes, backwards compatible

## Troubleshooting

### Build fails on macOS
- Ensure Xcode Command Line Tools are installed: `xcode-select --install`
- Check macOS version compatibility (10.15+)

### Build fails on Linux
- Verify all system dependencies are installed
- Check GTK and WebKit versions
- Try using Ubuntu 22.04 or 24.04

### Build fails on Windows
- Ensure Visual Studio Build Tools are installed
- Check that WiX Toolset is available for MSI creation

### GitHub Actions fails
- Check Actions tab for detailed logs
- Verify repository secrets are set correctly
- Ensure all dependencies are in package.json

## Post-Release

After publishing:

1. Update version in `main` branch to next development version
2. Announce release on social media / Discord / etc.
3. Update documentation if needed
4. Monitor GitHub Issues for bug reports

## Resources

- [Tauri Release Guide](https://tauri.app/v1/guides/distribution/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Semantic Versioning](https://semver.org/)
