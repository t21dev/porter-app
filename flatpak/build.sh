#!/bin/bash
# Builds the Porter Flatpak bundle from a .deb made by `tauri build`.
#
#   flatpak/build.sh <porter.deb> <output.flatpak>
#
# Needs flatpak and flatpak-builder. The GNOME runtime and SDK are installed
# from Flathub for the current user if missing. The bundle names Flathub as
# where its runtime comes from, so `flatpak install` fetches that too.
set -euo pipefail

DEB=$(realpath "$1")
OUT=$(realpath -m "$2")
HERE=$(cd "$(dirname "$0")" && pwd)
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

cp "$HERE"/com.triptoafsin.porter.{yml,desktop,metainfo.xml} "$WORK"/
cp "$DEB" "$WORK/porter.deb"

flatpak remote-add --user --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo
flatpak-builder --user --install-deps-from=flathub --force-clean --disable-rofiles-fuse \
  --repo="$WORK/repo" "$WORK/build" "$WORK/com.triptoafsin.porter.yml"
flatpak build-bundle --runtime-repo=https://dl.flathub.org/repo/flathub.flatpakrepo \
  "$WORK/repo" "$OUT" com.triptoafsin.porter
echo "Built $OUT"
