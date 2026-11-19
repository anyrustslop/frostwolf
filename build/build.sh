#!/usr/bin/env bash
# Builds Frostwolf for Windows x64 on Linux.
#   bash build/build.sh <firefox ESR version, e.g. 153.7.0esr>
# Result: work/firefox-src/obj/dist/frostwolf-*.win64.zip (packaged by build/package.py).
set -euo pipefail

VER="$1"
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$HERE")"
WORK="${WORK:-$ROOT/work}"

echo "::group::Firefox $VER source"
python3 "$HERE/fetch_source.py" get "$VER" "$WORK"
SRC="$WORK/firefox-src"
echo "::endgroup::"

echo "::group::Frostwolf branding"
python3 "$HERE/branding/apply_branding.py" "$SRC"
cp "$HERE/mozconfig" "$SRC/mozconfig"
echo "::endgroup::"

cd "$SRC"
export MOZBUILD_STATE_PATH="${MOZBUILD_STATE_PATH:-$HOME/.mozbuild}"
export MACH_BUILD_PYTHON_NATIVE_PACKAGE_SOURCE=system

echo "::group::Toolchains (mach bootstrap)"
./mach --no-interactive bootstrap --application-choice browser
echo "::endgroup::"

echo "::group::Build"
./mach build
echo "::endgroup::"

echo "::group::Package"
./mach package
ls -la obj/dist/*.zip
echo "::endgroup::"
