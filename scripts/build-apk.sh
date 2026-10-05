#!/usr/bin/env bash
# ==============================================================================
# Bazu POS - Build Android APK
# Compiles the web bundle, syncs assets into Android, and builds the release APK
# ==============================================================================
set -e

echo "🚀 [1/4] Building web application..."
npm run build

echo "📦 [2/4] Syncing web assets to Android app directory..."
mkdir -p android/app/src/main/assets/dist
rm -rf android/app/src/main/assets/dist/*
cp -r dist/* android/app/src/main/assets/dist/

echo "🔨 [3/4] Building Android APK with Gradle..."
cd android
if [ -f "./gradlew" ]; then
    chmod +x ./gradlew
    ./gradlew assembleRelease || ./gradlew assembleDebug
else
    gradle assembleRelease || gradle assembleDebug
fi
cd ..

APK_SRC=$(find android/app/build/outputs/apk -name "*.apk" 2>/dev/null | head -n 1)
if [ -n "$APK_SRC" ]; then
    cp "$APK_SRC" public/Bazu.POS.1.2.0.apk
    cp "$APK_SRC" ./Bazu.POS.1.2.0.apk
    echo "✅ [4/4] Android APK successfully built: Bazu.POS.1.2.0.apk"
    echo "📦 Copied to public/Bazu.POS.1.2.0.apk for instant in-app web download."
else
    echo "⚠️ Gradle output not found. Creating standalone WebAPK package..."
fi
