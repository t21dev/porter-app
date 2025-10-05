#!/bin/bash

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

if [ -z "$1" ]; then
  echo -e "${RED}Error: Version number required${NC}"
  echo "Usage: ./bump-version.sh <version>"
  echo "Example: ./bump-version.sh 0.2.0"
  exit 1
fi

VERSION=$1

# Validate version format (basic check)
if ! [[ $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9]+)?$ ]]; then
  echo -e "${RED}Error: Invalid version format${NC}"
  echo "Version should be in format: MAJOR.MINOR.PATCH (e.g., 0.2.0)"
  echo "Or with pre-release: 0.2.0-alpha"
  exit 1
fi

echo -e "${BLUE}Bumping version to ${VERSION}...${NC}"

# Update package.json
if [[ "$OSTYPE" == "darwin"* ]] || [[ "$OSTYPE" == "linux-gnu"* ]]; then
  sed -i.bak "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" package.json && rm package.json.bak
  sed -i.bak "s/version = \".*\"/version = \"$VERSION\"/" src-tauri/Cargo.toml && rm src-tauri/Cargo.toml.bak
  sed -i.bak "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" src-tauri/tauri.conf.json && rm src-tauri/tauri.conf.json.bak
else
  # Windows with Git Bash
  sed -i "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" package.json
  sed -i "s/version = \".*\"/version = \"$VERSION\"/" src-tauri/Cargo.toml
  sed -i "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" src-tauri/tauri.conf.json
fi

echo -e "${GREEN}✓ Updated package.json${NC}"
echo -e "${GREEN}✓ Updated src-tauri/Cargo.toml${NC}"
echo -e "${GREEN}✓ Updated src-tauri/tauri.conf.json${NC}"

echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Update CHANGELOG.md with your changes"
echo "2. Review the changes: git diff"
echo "3. Commit: git add . && git commit -m 'chore: bump version to $VERSION'"
echo "4. Create tag: git tag v$VERSION"
echo "5. Push: git push origin main && git push origin v$VERSION"
echo ""
echo -e "${BLUE}Or run this one-liner (after updating CHANGELOG.md):${NC}"
echo "git add . && git commit -m 'chore: bump version to $VERSION' && git tag v$VERSION && git push origin main && git push origin v$VERSION"
