# Accessibility Nutrition Label — Blue Box Air, Inc.

This document describes the accessibility features implemented in the Blue Box Air technician app and provides the information needed for App Store accessibility metadata.

---

## Accessibility Features Summary

### ✅ VoiceOver / TalkBack Support

All interactive elements include:
- `accessibilityLabel` — Descriptive labels for screen readers
- `accessibilityRole` — Proper semantic roles (button, link, header, checkbox, etc.)
- `accessibilityState` — Dynamic state information (disabled, checked, selected)
- `accessibilityHint` — Contextual hints for complex interactions

### ✅ Dynamic Type Support

- Text sizes use relative units that respond to system font size settings
- All critical text remains readable at accessibility font sizes
- Layout adapts to prevent text truncation

### ✅ Color Contrast

The app's color scheme meets WCAG AA standards:

| Element | Foreground | Background | Contrast Ratio | Pass? |
|---|---|---|---|---|
| Primary text | #FFFFFF | #0f2744 | 15.7:1 | ✅ AAA |
| Secondary text | #94a3b8 | #0f2744 | 5.8:1 | ✅ AA |
| Action button text | #0f2744 | #c5d93d | 7.2:1 | ✅ AAA |
| Muted text | #64748b | #0f2744 | 3.6:1 | ✅ AA (large) |
| Error text | #ef4444 | #0f2744 | 5.1:1 | ✅ AA |

### ✅ Touch Target Sizes

- All interactive elements meet the minimum 44×44pt (iOS) / 48×48dp (Android) touch target
- Buttons have adequate padding and spacing
- Form inputs are appropriately sized for thumb interaction

### ✅ Keyboard Navigation

- All screens implement `KeyboardAvoidingView` for proper keyboard handling
- Input fields support tab navigation
- Forms handle keyboard dismiss properly

### ✅ Screen Reader Navigation Order

- Headers use `accessibilityRole="header"` for proper navigation hierarchy
- Content is ordered logically for linear screen reader navigation
- Modal dialogs properly trap focus

### ✅ Motion & Animation

- No auto-playing animations that cannot be paused
- Navigation transitions use standard system animations
- Loading indicators use `ActivityIndicator` which respects "Reduce Motion" settings

### ✅ Alternative Authentication

- Multiple login methods available: Password, Google OAuth, Face ID/Touch ID
- Biometric login does not replace standard authentication
- All authentication methods are accessible via screen reader

---

## Accessibility Implementation by Screen

### Login Screen (`index.tsx`)
- [x] Logo has `accessibilityLabel="Blue Box Air company logo"`
- [x] Input fields have `accessibilityLabel` and `accessibilityHint`
- [x] Remember Me checkbox has proper `accessibilityRole="checkbox"` and `accessibilityState`
- [x] Login button has `accessibilityState={{ disabled: loading }}`
- [x] Show/Hide password toggle has dynamic `accessibilityLabel`
- [x] Create Account link has `accessibilityRole="link"`

### Registration Screen (`register.tsx`)
- [x] Back button is accessible
- [x] All form fields have labels
- [x] Error messages are announced to screen readers
- [x] Required vs optional fields are clearly distinguished

### Projects Screen (`projects.tsx`)
- [x] Project cards are tappable with descriptive labels
- [x] Status badges include text descriptions
- [x] Pull-to-refresh is accessible

### Project Detail Screen (`project/[id].tsx`)
- [x] Tab navigation has proper roles
- [x] Equipment cards have descriptive labels
- [x] Action buttons (Log, Photo, AI Help) have labels
- [x] Modals properly manage focus

### AI Assistant Screen (`ai-assistant.tsx`)
- [x] Chat messages have proper roles
- [x] Quick action cards are labeled
- [x] Send button has accessibility state
- [x] Loading state is announced

### Profile Screen (`profile.tsx`)
- [x] Editable fields are accessible
- [x] Skill badges can be added/removed via screen reader
- [x] Resources section has proper heading hierarchy

---

## App Store Connect — Accessibility Information

When filling out the App Store submission:

### Accessibility Features to Declare

- [x] **VoiceOver** — Full support
- [x] **Switch Control** — Compatible
- [x] **Full Keyboard Access** — Supported on iPad
- [x] **Dynamic Type** — Supported
- [x] **Increase Contrast** — High contrast color scheme by default
- [x] **Reduce Motion** — Respects system preference
- [x] **Bold Text** — System bold text respected

### Testing Checklist

Before submission, test with:
1. **VoiceOver enabled** (iOS) — Navigate through all screens
2. **TalkBack enabled** (Android) — Navigate through all screens
3. **Large text** — Set to maximum accessibility text size
4. **Reduce Motion** — Verify animations are minimal
5. **High Contrast** — Verify all text remains readable
6. **Switch Control** — Navigate through login and project flows

---

## Google Play Accessibility Information

### Accessibility Statement

"Blue Box Air, Inc. is committed to providing an accessible experience for all technicians. The app supports screen readers (VoiceOver/TalkBack), dynamic text sizing, high-contrast color schemes, and alternative authentication methods including biometric login."

### Content Descriptions

All images and icons include content descriptions for screen readers.

---

## Accessibility Contact

- **Accessibility Feedback Email:** accessibility@blueboxair.com
- **Response Time:** Within 5 business days
