# Device Detection Debug Page

This debug page helps developers troubleshoot device detection issues in the Reclaim SDK.

## Usage

### Access the Debug Page
Navigate to `/debug` in your example app:
```
http://localhost:3000/debug
```

### Features

1. **Real-time Detection Results**
   - Shows current device type (mobile/desktop)
   - Mobile OS detection (iOS/Android)
   - Live updates on window resize

2. **Detection Factors**
   - All scoring factors used in detection
   - Visual indicators for each factor
   - Screen dimensions and capabilities

3. **Environment Information**
   - User agent string
   - Platform and vendor details
   - Screen resolution and window size
   - Touch points and orientation

4. **Browser Capabilities**
   - Touch support
   - Geolocation, notifications, service workers
   - WebGL, WebRTC support
   - Device motion/orientation APIs

5. **Export Options**
   - Copy debug info as JSON
   - Download complete debug report
   - Share with issue reports

## Adding to Your App

To add this debug page to your own app:

1. Copy the debug page component to your app
2. Import the device detection functions from the SDK:
```typescript
import { 
  getDeviceType, 
  getMobileDeviceType, 
  isMobileDevice, 
  isDesktopDevice 
} from '@reclaimprotocol/js-sdk'
```

3. Add a route to access the debug page (keep it hidden in production)

## Reporting Issues

If you find a device that's incorrectly detected:

1. Visit the debug page on that device
2. Click "Download Report" 
3. Include the JSON file in your GitHub issue
4. Describe the expected vs actual behavior

## Common Detection Patterns

### Desktop with Touchscreen
- Touch Device: Yes
- Has Mouse: Yes  
- Large Screen: Yes
- Can Hover: Yes
- **Result**: Desktop ✓

### iPad Pro in Desktop Mode
- User Agent: Contains "Macintosh"
- Touch Device: Yes
- Mobile APIs: Yes
- **Result**: Mobile (iOS) ✓

### Android Tablet
- User Agent: Contains "Android"
- Touch Device: Yes
- Screen Size: Variable
- **Result**: Mobile (Android) ✓

### iPhone/Android Phone
- Small Screen: Yes
- Touch Device: Yes
- Mobile User Agent: Yes
- **Result**: Mobile ✓

## Privacy Note

The debug page only collects browser information locally. No data is sent to external servers unless you explicitly export and share it.