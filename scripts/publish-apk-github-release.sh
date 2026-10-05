#!/usr/bin/env bash
# ==============================================================================
# Bazu POS - Publish Android APK to GitHub Releases
# Repository: https://github.com/Njehia/BazuPOS
# Tag: POS
# ==============================================================================
set -e

RELEASE_TAG=${1:-"POS"}
REPO="Njehia/BazuPOS"
APK_FILE="Bazu.POS.1.2.0.apk"

echo "📡 Target GitHub Repository: $REPO"
echo "🏷️ Target Release Tag: $RELEASE_TAG"

if [ ! -f "$APK_FILE" ]; then
    if [ -f "public/$APK_FILE" ]; then
        cp "public/$APK_FILE" "$APK_FILE"
    else
        echo "⚠️ $APK_FILE not found locally. Running build script first..."
        ./scripts/build-apk.sh || true
    fi
fi

if command -v gh &> /dev/null; then
    echo "Uploading $APK_FILE to GitHub Release ($RELEASE_TAG)..."
    gh release upload "$RELEASE_TAG" "$APK_FILE" --repo "$REPO" --clobber
    echo "🎉 Successfully uploaded $APK_FILE to GitHub release $RELEASE_TAG!"
    echo "🔗 Direct Download Link: https://github.com/$REPO/releases/download/$RELEASE_TAG/$APK_FILE"
else
    echo "ℹ️ GitHub CLI ('gh') is not installed or not authenticated."
    echo "To upload manually or via terminal:"
    echo "  gh auth login"
    echo "  gh release upload $RELEASE_TAG $APK_FILE --repo $REPO --clobber"
    echo ""
    echo "Or trigger the GitHub Actions workflow in GitHub -> Actions -> 'Build and Release Android APK' -> Run Workflow."
fi
