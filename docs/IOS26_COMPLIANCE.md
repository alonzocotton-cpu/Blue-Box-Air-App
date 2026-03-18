# iOS 26 & iPadOS 26 SDK Compliance Guide
## Blue Box Air, Inc. — App Store Submission

---

## Deadline: April 28, 2026

Starting **April 28, 2026**, all iOS/iPadOS apps submitted to the App Store **must** be built with:
- **Xcode 26** or later
- **iOS 26 SDK** / **iPadOS 26 SDK** or later
- macOS Sequoia 15.6 or later (required by Xcode 26)

---

## Current App Configuration

| Setting | Value |
|---------|-------|
| Bundle ID | `com.blueboxair.techapp` |
| App Version | 1.0.0 |
| Build Number | 2 |
| EAS Project ID | `5374137e-6924-4b8b-b7c2-f01b5ca3ac15` |
| New Architecture | ✅ Enabled |
| iPad Support | ✅ Enabled |
| Privacy Manifest | ✅ Configured |
| Xcode 26 Build Image | ✅ Configured in eas.json |

---

## Pre-Submission Checklist

### 1. Build Environment
- [ ] Install **Xcode 26** from the Mac App Store or developer.apple.com
- [ ] Ensure macOS **Sequoia 15.6+** is installed
- [ ] Install latest EAS CLI: `npm install -g eas-cli@latest`
- [ ] Log in to EAS: `eas login`

### 2. Build the App
```bash
# Development build (for testing)
eas build --profile development --platform ios

# Preview build (for TestFlight)
eas build --profile preview --platform ios

# Production build (for App Store)
eas build --profile production --platform ios
```

### 3. Privacy Manifest (Already Configured)
The app's `app.json` includes a complete `privacyManifests` section declaring:

**Collected Data Types:**
| Data Type | Linked | Tracking | Purpose |
|-----------|--------|----------|---------|
| Email Address | Yes | No | App Functionality |
| Name | Yes | No | App Functionality |
| Phone Number | Yes | No | App Functionality |
| Photos/Videos | Yes | No | App Functionality |
| Precise Location | Yes | No | App Functionality |
| User ID | Yes | No | App Functionality |

**Required Reason APIs:**
| API Category | Reason Code | Justification |
|-------------|-------------|---------------|
| UserDefaults | CA92.1 | App stores user preferences and auth state |
| File Timestamp | C617.1 | File management for photo/video uploads |
| Disk Space | E174.1 | Check storage before media downloads |
| System Boot Time | 35F9.1 | App analytics and session tracking |

**Tracking:** `false` — The app does not track users across apps.

### 4. iPad Compatibility
The app supports:
- [x] Portrait and landscape orientations on iPad
- [x] All 4 orientations on iPad (including upside-down)
- [x] Split View and Slide Over multitasking
- [x] `requireFullScreen: false` — Allows multitasking
- [x] Responsive layouts using Flexbox

### 5. Permissions Declared
**iOS (InfoPlist):**
| Permission | Description |
|-----------|-------------|
| Camera | Capture equipment photos and record service videos |
| Photo Library | Upload photos and videos from your gallery |
| Photo Library Add | Save service photos and reports to your gallery |
| Microphone | Record audio with equipment service videos |
| Location When In Use | Track your location for service visits |
| Location Always | Track location during service visits |
| Face ID | Use Face ID to quickly login to the app |

### 6. iOS 26 Specific Features
- [x] **New Architecture** enabled (`newArchEnabled: true`)
- [x] **Edge-to-edge rendering** via `react-native-safe-area-context`
- [x] **Dark mode** native support (`userInterfaceStyle: "dark"`)
- [x] **arm64 only** architecture (required)
- [x] **Non-exempt encryption** declared as `false`

---

## App Store Connect Submission Steps

### Step 1: Create App in App Store Connect
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click **My Apps** → **+** → **New App**
3. Fill in:
   - Platform: **iOS**
   - Name: **Blue Box Air, Inc.**
   - Primary Language: **English (U.S.)**
   - Bundle ID: **com.blueboxair.techapp**
   - SKU: **blueboxair-techapp-001**

### Step 2: App Information
- **Category:** Business
- **Subcategory:** Productivity
- **Content Rights:** Does not contain third-party content
- **Age Rating:** 4+ (no objectionable content)

### Step 3: Pricing
- **Price:** Free

### Step 4: Privacy
1. Go to **App Privacy** section
2. Click **Get Started**
3. Select: **Yes, we collect data**
4. Follow the Privacy Nutrition Label document (`/app/docs/PRIVACY_NUTRITION_LABEL.md`)
5. **Privacy Policy URL:** [Your privacy policy URL]

### Step 5: Upload Build
```bash
# Build for production
eas build --profile production --platform ios

# Submit to App Store
eas submit --platform ios --profile production
```

Or manually:
1. Download the `.ipa` file from EAS dashboard
2. Open **Transporter** app on Mac
3. Drag and drop the `.ipa`
4. Click **Deliver**

### Step 6: Fill in Submit for Review
- Screenshots required:
  - iPhone 6.7" (iPhone 15 Pro Max): 1290 x 2796
  - iPhone 6.5" (iPhone 14 Plus): 1284 x 2778
  - iPad Pro 12.9" (6th gen): 2048 x 2732
- App description and keywords
- Support URL
- Marketing URL (optional)

### Step 7: Review Notes
Add for Apple reviewers:
```
Demo credentials: Any username and password combination will work 
(e.g., username: demo, password: demo)

The app uses demo/mock data for demonstration purposes. 
Salesforce integration is planned for a future update.

Face ID/Touch ID login works after initial credential login.
Google login uses demo mode without a configured Google Client ID.
```

---

## Android (Google Play) Build

```bash
# Build for production
eas build --profile production --platform android

# Submit to Google Play
eas submit --platform android --profile production
```

**Google Play Data Safety:** Reference `/app/docs/PRIVACY_NUTRITION_LABEL.md`

---

## Testing Before Submission

### Physical Device Testing
1. Build development client: `eas build --profile development --platform ios`
2. Install on device via QR code or direct install
3. Test all flows:
   - [ ] Login (credentials, Google, Face ID)
   - [ ] Registration
   - [ ] Projects list and detail
   - [ ] Equipment readings (Pre/Post)
   - [ ] Photo/Video capture
   - [ ] AI Assistant chat
   - [ ] AI Report Summary
   - [ ] AI Troubleshoot
   - [ ] My Techs team view
   - [ ] Tech Profile detail
   - [ ] Org Chart
   - [ ] Project assignment
   - [ ] Profile editing
   - [ ] PDF report download

### iPad Testing
- [ ] Verify layouts in portrait and landscape
- [ ] Test Split View multitasking
- [ ] Verify touch targets (44pt minimum)
- [ ] Test keyboard handling on iPad

---

## Files Reference

| File | Purpose |
|------|---------|
| `frontend/app.json` | Main app config with iOS 26 settings |
| `frontend/eas.json` | EAS Build config with Xcode 26 image |
| `docs/PRIVACY_NUTRITION_LABEL.md` | Privacy declarations for App Store |
| `docs/ACCESSIBILITY_NUTRITION_LABEL.md` | Accessibility compliance |
| `docs/IOS26_COMPLIANCE.md` | This document |
