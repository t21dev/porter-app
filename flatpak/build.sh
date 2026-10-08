#!/bin/bash
# Builds the Porter Flatpak bundle from a .deb made by `tauri build`.
#
#   flatpak/build.sh <porter.deb> <output.flatpak>
#
# Needs flatpak. It uses flatpak-builder 1.3 or newer if installed, and
# otherwise Flathub's org.flatpak.Builder: older ones, such as Ubuntu 22.04's,
# run appstream-compose, which current GNOME SDKs no longer have. The GNOME
# runtime and SDK are installed from Flathub for the current user if missing.
# The bundle names Flathub as where its runtime comes from, so
# `flatpak install` fetches that too.
set -euo pipefail

DEB=$(realpath "$1")
OUT=$(realpath -m "$2")
HERE=$(cd "$(dirname "$0")" && pwd)
# Not under /tmp: org.flatpak.Builder runs in a sandbox with its own /tmp.
mkdir -p "${XDG_CACHE_HOME:-$HOME/.cache}"
WORK=$(mktemp -d "${XDG_CACHE_HOME:-$HOME/.cache}/porter-flatpak.XXXXXX")
trap 'rm -rf "$WORK"' EXIT

cp "$HERE"/com.triptoafsin.porter.{yml,desktop,metainfo.xml} "$WORK"/
cp "$DEB" "$WORK/porter.deb"

flatpak remote-add --user --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo
version=$(flatpak-builder --version 2>/dev/null | grep -o '[0-9][0-9.]*' || true)
if [ -n "$version" ] && [ "$(printf '1.3\n%s\n' "$version" | sort -V | head -1)" = 1.3 ]; then
  BUILDER=(flatpak-builder)
else
  flatpak install --user --noninteractive -y flathub org.flatpak.Builder
  BUILDER=(flatpak run org.flatpak.Builder)
fi
"${BUILDER[@]}" --user --install-deps-from=flathub --force-clean --disable-rofiles-fuse \
  --repo="$WORK/repo" "$WORK/build" "$WORK/com.triptoafsin.porter.yml"
flatpak build-bundle --runtime-repo=https://dl.flathub.org/repo/flathub.flatpakrepo \
  "$WORK/repo" "$OUT" com.triptoafsin.porter
echo "Built $OUT"
