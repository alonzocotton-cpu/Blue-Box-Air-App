# Privacy Nutrition Label — Blue Box Air, Inc.

This document provides the information required for the **Apple App Store Privacy Nutrition Label** and **Google Play Data Safety Section** when submitting the app.

---

## App Store Connect — App Privacy

When filling out the privacy section in App Store Connect, use the following responses:

### 1. Contact Info

| Data Type | Collected | Linked to User | Used for Tracking | Purpose |
|---|---|---|---|---|
| **Name** | ✅ Yes | ✅ Yes | ❌ No | App Functionality |
| **Email Address** | ✅ Yes | ✅ Yes | ❌ No | App Functionality |
| **Phone Number** | ✅ Yes (Optional) | ✅ Yes | ❌ No | App Functionality |

### 2. Identifiers

| Data Type | Collected | Linked to User | Used for Tracking | Purpose |
|---|---|---|---|---|
| **User ID** | ✅ Yes | ✅ Yes | ❌ No | App Functionality |
| **Device ID** | ❌ No | — | — | — |

### 3. Location

| Data Type | Collected | Linked to User | Used for Tracking | Purpose |
|---|---|---|---|---|
| **Precise Location** | ✅ Yes | ✅ Yes | ❌ No | App Functionality |
| **Coarse Location** | ✅ Yes | ✅ Yes | ❌ No | App Functionality |

**Justification:** Location is used to tag service visit locations and track technician routes for job scheduling.

### 4. Photos or Videos

| Data Type | Collected | Linked to User | Used for Tracking | Purpose |
|---|---|---|---|---|
| **Photos** | ✅ Yes | ✅ Yes | ❌ No | App Functionality |
| **Videos** | ✅ Yes | ✅ Yes | ❌ No | App Functionality |

**Justification:** Photos and videos are captured to document equipment condition before and after service.

### 5. Sensitive Info

| Data Type | Collected | Linked to User | Used for Tracking | Purpose |
|---|---|---|---|---|
| **Biometric Data** | ❌ No | — | — | — |

**Note:** Face ID / Touch ID is used only for local device authentication. No biometric data is collected, stored, or transmitted to servers. This is handled entirely by the device OS.

### 6. User Content

| Data Type | Collected | Linked to User | Used for Tracking | Purpose |
|---|---|---|---|---|
| **Other User Content** | ✅ Yes | ✅ Yes | ❌ No | App Functionality |

**Justification:** Service readings, equipment notes, and report data entered by technicians.

### 7. Usage Data

| Data Type | Collected | Linked to User | Used for Tracking | Purpose |
|---|---|---|---|---|
| **Product Interaction** | ❌ No | — | — | — |
| **Advertising Data** | ❌ No | — | — | — |
| **Other Usage Data** | ❌ No | — | — | — |

### 8. Diagnostics

| Data Type | Collected | Linked to User | Used for Tracking | Purpose |
|---|---|---|---|---|
| **Crash Data** | ❌ No | — | — | — |
| **Performance Data** | ❌ No | — | — | — |
| **Other Diagnostic Data** | ❌ No | — | — | — |

---

## Summary Answers for App Store Connect

1. **Does your app collect data?** → **Yes**
2. **Does your app track users?** → **No**
3. **Data types collected:**
   - Contact Info (Name, Email, Phone)
   - Location (Precise, Coarse)
   - Photos or Videos
   - User Content (Service readings & notes)
   - Identifiers (User ID)
4. **All data is:**
   - Linked to the user's identity
   - NOT used for tracking
   - Used for: **App Functionality** only
5. **Third-party data sharing:** Data may be shared with:
   - **Salesforce** (CRM - for syncing service data)
   - **Claude AI / Anthropic** (for AI troubleshooting - messages only, no PII)

---

## Google Play Data Safety Section

### Data Collected

| Category | Data Type | Required? | Shared? | Purpose |
|---|---|---|---|---|
| Personal info | Name | Yes | No | App functionality |
| Personal info | Email | Yes | No | Account management |
| Personal info | Phone | No | No | App functionality |
| Location | Approximate location | Yes | No | App functionality |
| Location | Precise location | Yes | No | App functionality |
| Photos & videos | Photos | Yes | No | App functionality |
| Photos & videos | Videos | Yes | No | App functionality |

### Security Practices

- ✅ Data is encrypted in transit (HTTPS)
- ✅ Users can request data deletion
- ✅ App follows Google Play Families policy requirements

### Data Deletion

- Users can delete their account by contacting support
- Associated data (readings, photos, reports) will be deleted within 30 days

---

## Data Retention Policy

| Data Type | Retention Period | Deletion Method |
|---|---|---|
| Account Data | Until account deletion | Automated on request |
| Service Readings | Project lifecycle + 1 year | Automated after period |
| Photos/Videos | Project lifecycle + 1 year | Automated after period |
| Location Data | 90 days | Automated after period |
| AI Chat History | Session-based (not persisted) | Immediate after session |

---

## Contact Information for Privacy

- **Privacy Contact Email:** privacy@blueboxair.com
- **Data Protection Officer:** [Your DPO name]
- **Privacy Policy URL:** [Your privacy policy URL]
