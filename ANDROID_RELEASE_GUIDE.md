# Bazu POS - Android Release & GitHub Releases Guide

## 1. Overview
The Bazu Point of Sale (POS) system is fully converted and optimized for Android devices (smartphones, tablets, and handheld retail terminals such as Sunmi V2/V2 Pro, Telpo, and PAX devices).

---

## 2. GitHub Releases Configuration

- **Repository**: [https://github.com/Njehia/BazuPOS](https://github.com/Njehia/BazuPOS)
- **Official Release Tag**: `POS`
- **Release Page**: [https://github.com/Njehia/BazuPOS/releases/tag/POS](https://github.com/Njehia/BazuPOS/releases/tag/POS)
- **Direct APK Release Download Link**:  
  `https://github.com/Njehia/BazuPOS/releases/download/POS/Bazu.POS.1.2.0.apk`

---

## 3. Automated CI/CD: GitHub Actions Workflow
The project contains an automated GitHub Actions workflow configured in:  
`.github/workflows/build-android-apk.yml`

### How It Works:
1. **Triggering the Build**:
   - Pushing the tag `POS` or any version tag (`git tag POS -f && git push origin POS -f`) automatically triggers the build.
   - Or, go to **GitHub -> Actions -> "Build and Release Android APK" -> Click "Run workflow"**.
2. **Build Process**:
   - Compiles web assets with `npm run build`
   - Configures Java 17 and Android SDK 34
   - Compiles Android APK (`./gradlew assembleRelease`)
   - Uses `softprops/action-gh-release` to upload `Bazu.POS.1.2.0.apk` directly into the release assets on the GitHub page!

---

## 4. Manual Upload with GitHub CLI (`gh`)
To upload the compiled APK to your existing GitHub release immediately:

```bash
# 1. Ensure you are authenticated with GitHub
gh auth login

# 2. Package the APK
npm run build:apk

# 3. Upload to the POS release tag
npm run release:apk
# or run directly:
gh release upload POS Bazu.POS.1.2.0.apk --repo Njehia/BazuPOS --clobber
```

---

## 5. Android Features & Mobile Responsiveness Added

1. **Android Handheld & Phone Layout**:
   - **Sticky Floating Cart Bar**: On mobile devices, products take full screen height for easy thumb scrolling. An interactive cart bar floats above the navigation, showing current item count and total KES.
   - **Slide-up Cart Drawer**: One-tap bottom sheet drawer for adjusting quantities (`+` / `-`), clearing, and proceeding to payment.
   - **Android Safe Areas**: Handled with `safe-area-pt` and `safe-area-pb` supporting gesture navigation bars, notches, and rounded corners.
   - **Touch Target Sizes**: All key buttons are enlarged (minimum 48px height) with fast haptic-like active tap feedback (`active:scale-95`).

2. **Camera Barcode Scanner**:
   - Integrated camera scanning supported via HTML5 camera feed and native Android permissions in `MainActivity.java`.

3. **Multi-Install Distribution**:
   - **Direct Standalone APK**: `Bazu.POS.1.2.0.apk` for Sunmi, Telpo, or sideloading without Google Play.
   - **Local Mirror**: Served directly by the local server at `/Bazu.POS.1.2.0.apk`.
   - **WebAPK (PWA)**: Installable directly to the Android home screen with offline IndexedDB storage.
