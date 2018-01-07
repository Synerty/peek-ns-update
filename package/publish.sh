#!/usr/bin/env bash

PACKAGE="nativescript-peek-update"

set -o nounset
set -o errexit

if [ -n "$(git status --porcelain)" ]; then
    echo "There are uncomitted changes, please make sure all changes are comitted" >&2
    exit 1
fi

if ! [ -f "package.json" ]; then
    echo "publish.sh must be run in the directory where package.json is" >&2
    exit 1
fi

VER="${1:?You must pass a version of the format 0.0.0 as the only argument}"

if git tag | grep -q "${VER}"; then
    echo "Git tag for version ${VER} already exists." >&2
    exit 1
fi

echo "Setting version to $VER"


echo "Updating package version"
npm version $VER

echo "Pushing to Git"
git push
git push --tags

echo "Publishing to NPM"
npm publish --access=public


echo
echo "Done"
echo