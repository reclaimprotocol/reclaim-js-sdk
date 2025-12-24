<div>
    <div>
        <img src="https://raw.githubusercontent.com/reclaimprotocol/.github/main/assets/banners/JS-SDK.png"  />
    </div>
</div>

# Reclaim Protocol JavaScript SDK Integration Guide

This guide will walk you through integrating the Reclaim Protocol JavaScript SDK into your application. We'll create a simple React application that demonstrates how to use the SDK to generate proofs and verify claims.

## Prerequisites

Before we begin, make sure you have:

1. An application ID from Reclaim Protocol.
2. An application secret from Reclaim Protocol.
3. A provider ID for the specific service you want to verify.

You can obtain these details from the [Reclaim Developer Portal](https://dev.reclaimprotocol.org/).

## Step 1: Create a new React application

Let's start by creating a new React application:

```bash
npx create-react-app reclaim-app
cd reclaim-app
```

## Step 2: Install necessary dependencies

Install the Reclaim Protocol SDK and a QR code generator:

```bash
npm install @reclaimprotocol/js-sdk react-qr-code
```

**Current SDK Version**: 4.4.0

## Step 3: Set up your React component

Replace the contents of `src/App.js` with the following code:

```javascript
import React, { useState, useEffect } from "react";
import { ReclaimProofRequest, verifyProof, ClaimCreationType } from "@reclaimprotocol/js-sdk";
import QRCode from "react-qr-code";

function App() {
  const [reclaimProofRequest, setReclaimProofRequest] = useState(null);
  const [requestUrl, setRequestUrl] = useState("");
  const [statusUrl, setStatusUrl] = useState("");
  const [proofs, setProofs] = useState(null);

  useEffect(() => {
    async function initializeReclaim() {
      const APP_ID = "YOUR_APPLICATION_ID_HERE";
      const APP_SECRET = "YOUR_APPLICATION_SECRET_HERE";
      const PROVIDER_ID = "YOUR_PROVIDER_ID_HERE";

      const proofRequest = await ReclaimProofRequest.init(APP_ID, APP_SECRET, PROVIDER_ID);
      setReclaimProofRequest(proofRequest);
    }

    initializeReclaim();
  }, []);

  async function handleCreateClaim() {
    if (!reclaimProofRequest) {
      console.error("Reclaim Proof Request not initialized");
      return;
    }

    const url = await reclaimProofRequest.getRequestUrl();
    setRequestUrl(url);

    const status = reclaimProofRequest.getStatusUrl();
    setStatusUrl(status);
    console.log("Status URL:", status);

    await reclaimProofRequest.startSession({
      onSuccess: (proofs) => {
        if (proofs && typeof proofs === "string") {
          // When using a custom callback url, the proof is returned to the callback url and we get a message instead of a proof
          console.log("SDK Message:", proofs);
          setProofs(proofs);
        } else if (proofs && typeof proofs !== "string") {
          // When using the default callback url, we get a proof
          if (Array.isArray(proofs)) {
            // when using the cascading providers, providers having more than one proof will return an array of proofs
            console.log(JSON.stringify(proofs.map((p) => p.claimData.context)));
          } else {
            console.log("Proof received:", proofs?.claimData.context);
          }
          setProofs(proofs);
        }
      },
      onFailure: (error) => {
        console.error("Verification failed", error);
      },
    });
  }

  return (
    <div className="App">
      <h1>Reclaim Protocol Demo</h1>
      <button onClick={handleCreateClaim}>Create Claim</button>
      {requestUrl && (
        <div>
          <h2>Scan this QR code to start the verification process:</h2>
          <QRCode value={requestUrl} />
        </div>
      )}
      {proofs && (
        <div>
          <h2>Verification Successful!</h2>
          <pre>{JSON.stringify(proofs, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

export default App;
```

## Step 4: Understanding the code

Let's break down what's happening in this code:

1. We initialize the Reclaim SDK with your application ID, secret, and provider ID. This happens once when the component mounts.

2. When the user clicks the "Create Claim" button, we:

   - Generate a request URL using `getRequestUrl()`. This URL is used to create the QR code.
   - Get the status URL using `getStatusUrl()`. This URL can be used to check the status of the claim process.
   - Start a session with `startSession()`, which sets up callbacks for successful and failed verifications.

3. We display a QR code using the request URL. When a user scans this code, it starts the verification process.

4. The status URL is logged to the console. You can use this URL to check the status of the claim process programmatically.

5. When the verification is successful, we display the proof data on the page.

## Step 5: New Streamlined Flow with Browser Extension Support

The Reclaim SDK now provides a simplified `triggerReclaimFlow()` method that automatically handles the verification process across different platforms and devices. This method intelligently chooses the best verification method based on the user's environment.

### Using triggerReclaimFlow()

Replace the `handleCreateClaim` function in your React component with this simpler approach:

```javascript
async function handleCreateClaim() {
  if (!reclaimProofRequest) {
    console.error("Reclaim Proof Request not initialized");
    return;
  }

  try {
    // Start the verification process automatically
    await reclaimProofRequest.triggerReclaimFlow();

    // Listen for the verification results
    await reclaimProofRequest.startSession({
      onSuccess: (proofs) => {
        if (proofs && typeof proofs === "string") {
          console.log("SDK Message:", proofs);
          setProofs(proofs);
        } else if (proofs && typeof proofs !== "string") {
          if (Array.isArray(proofs)) {
            console.log(JSON.stringify(proofs.map((p) => p.claimData.context)));
          } else {
            console.log("Proof received:", proofs?.claimData.context);
          }
          setProofs(proofs);
        }
      },
      onFailure: (error) => {
        console.error("Verification failed", error);
      },
    });
  } catch (error) {
    console.error("Error triggering Reclaim flow:", error);
  }
}
```

### How triggerReclaimFlow() Works

The `triggerReclaimFlow()` method automatically detects the user's environment and chooses the optimal verification method:

#### On Desktop Browsers:

1. **Browser Extension First**: If the Reclaim browser extension is installed, it will use the extension for a seamless in-browser verification experience.
2. **QR Code Fallback**: If the extension is not available, it automatically displays a QR code modal for mobile scanning.

#### On Mobile Devices:

1. **iOS Devices**: Automatically redirects to the Reclaim App Clip for native iOS verification.
2. **Android Devices**: Automatically redirects to the Reclaim Instant App for native Android verification.

### Browser Extension Support

The SDK now includes built-in support for the Reclaim browser extension, providing users with a seamless verification experience without leaving their current browser tab.

#### Features:

- **Automatic Detection**: The SDK automatically detects if the Reclaim browser extension is installed
- **Seamless Integration**: No additional setup required - the extension integration works out of the box
- **Fallback Support**: If the extension is not available, the SDK gracefully falls back to QR code or mobile app flows

#### Manual Extension Detection:

You can also manually check if the browser extension is available:

```javascript
const isExtensionAvailable = await reclaimProofRequest.isBrowserExtensionAvailable();
if (isExtensionAvailable) {
  console.log("Reclaim browser extension is installed");
} else {
  console.log("Browser extension not available, will use alternative flow");
}
```

#### Configuring Browser Extension Options:

You can customize the browser extension behavior during SDK initialization:

```javascript
const proofRequest = await ReclaimProofRequest.init(APP_ID, APP_SECRET, PROVIDER_ID, {
  useBrowserExtension: true, // Enable/disable browser extension (default: true)
  extensionID: "custom-extension-id", // Use custom extension ID if needed
  // ... other options
});
```

### Modal Customization

When the QR code modal is displayed (fallback on desktop), you can customize its appearance and behavior:

```javascript
// Set modal options before triggering the flow
reclaimProofRequest.setModalOptions({
  title: "Custom Verification Title",
  description: "Scan this QR code with your mobile device to verify your account",
  darkTheme: true, // Enable dark theme (default: false)
  modalPopupTimer: 5, // Auto-close modal after 5 minutes (default: 1 minute)
  showExtensionInstallButton: true, // Show extension install button (default: false)
  extensionUrl: "https://custom-extension-url.com", // Custom extension download URL
  onClose: () => {
    console.log("Modal was closed");
  }, // Callback when modal is closed
});

await reclaimProofRequest.triggerReclaimFlow();
```

### Benefits of the New Flow:

1. **Platform Adaptive**: Automatically chooses the best verification method for each platform
2. **User-Friendly**: Provides the most seamless experience possible for each user
3. **Simplified Integration**: Single method call handles all verification scenarios
4. **Extension Support**: Leverages browser extension for desktop users when available
5. **Mobile Optimized**: Native app experiences on mobile devices

## Step 6: Run your application

Start your development server:

```bash
npm start
```

Your Reclaim SDK demo should now be running. Click the "Create Claim" button to generate a QR code. Scan this code to start the verification process.

## Understanding the Claim Process

1. **Creating a Claim**: When you click "Create Claim", the SDK generates a unique request for verification.

2. **QR Code**: The QR code contains the request URL. When scanned, it initiates the verification process.

3. **Status URL**: This URL (logged to the console) can be used to check the status of the claim process. It's useful for tracking the progress of verification.

4. **Verification**: The `onSuccess` is called when verification is successful, providing the proof data. When using a custom callback url, the proof is returned to the callback url and we get a message instead of a proof.

5. **Handling Failures**: The `onFailure` is called if verification fails, allowing you to handle errors gracefully.

## Advanced Configuration

The Reclaim SDK offers several advanced options to customize your integration:

1. **Adding Context**:
   You can add context to your proof request, which can be useful for providing additional information:

   ```javascript
   reclaimProofRequest.setContext("0x00000000000", "Example context message");

   // deprecated method: use setContext instead
   reclaimProofRequest.addContext("0x00000000000", "Example context message");
   ```

2. **Setting Parameters**:
   If your provider requires specific parameters, you can set them like this:

   ```javascript
   reclaimProofRequest.setParams({ email: "test@example.com", userName: "testUser" });
   ```

3. **Custom Redirect URL**:
   Set a custom URL to redirect users after the verification process:

   ```javascript
   reclaimProofRequest.setRedirectUrl("https://example.com/redirect");
   ```

4. **Custom Callback URL**:
   Set a custom callback URL for your app which allows you to receive proofs and status updates on your callback URL:
   Pass in `jsonProofResponse: true` to receive the proof in JSON format: By default, the proof is returned as a url encoded string.

   ```javascript
   reclaimProofRequest.setAppCallbackUrl("https://example.com/callback", true);
   ```

5. **Modal Customization for Desktop Users**:
   Customize the appearance and behavior of the QR code modal shown to desktop users:

   ```javascript
   reclaimProofRequest.setModalOptions({
     title: "Verify Your Account",
     description: "Scan the QR code with your mobile device or install our browser extension",
     darkTheme: false, // Enable dark theme (default: false)
     extensionUrl: "https://chrome.google.com/webstore/detail/reclaim", // Custom extension URL
   });
   ```

6. **Browser Extension Configuration**:
   Configure browser extension behavior and detection:

   ```javascript
   // Check if browser extension is available
   const isExtensionAvailable = await reclaimProofRequest.isBrowserExtensionAvailable();

   // Trigger the verification flow with automatic platform detection
   await reclaimProofRequest.triggerReclaimFlow();

   // Initialize with browser extension options
   const proofRequest = await ReclaimProofRequest.init(APP_ID, APP_SECRET, PROVIDER_ID, {
     useBrowserExtension: true, // Enable browser extension support (default: true)
     extensionID: "custom-extension-id", // Custom extension identifier
     useAppClip: true, // Enable mobile app clips (default: true)
     log: true, // Enable troubleshooting mode and more verbose logging for debugging
   });
   ```

7. **Custom Share Page and App Clip URLs**:
   You can customize the share page and app clip URLs for your app:

```javascript
const proofRequest = await ReclaimProofRequest.init(APP_ID, APP_SECRET, PROVIDER_ID, {
  customSharePageUrl: "https://your-custom-domain.com/verify", // Custom share page URL
  customAppClipUrl: "https://appclip.apple.com/id?p=your.custom.app.clip", // Custom iOS App Clip URL
  // ... other options
});
```

8. **Platform-Specific Flow Control**:
   The `triggerReclaimFlow()` method provides intelligent platform detection, but you can still use traditional methods for custom flows:

   ```javascript
   // Traditional approach with manual QR code handling
   const requestUrl = await reclaimProofRequest.getRequestUrl();
   // Display your own QR code implementation

   // Or use the new streamlined approach
   await reclaimProofRequest.triggerReclaimFlow();
   // Automatically handles platform detection and optimal user experience
   ```

9. **Exporting and Importing SDK Configuration**:
   You can export the entire Reclaim SDK configuration as a JSON string and use it to initialize the SDK with the same configuration on a different service or backend:

   ```javascript
   // On the client-side or initial service
   const configJson = reclaimProofRequest.toJsonString();
   console.log("Exportable config:", configJson);

   // Send this configJson to your backend or another service

   // On the backend or different service
   const importedRequest = ReclaimProofRequest.fromJsonString(configJson);
   const requestUrl = await importedRequest.getRequestUrl();
   ```

   This allows you to generate request URLs and other details from your backend or a different service while maintaining the same configuration.

10. **Utility Methods**:
    Additional utility methods for managing your proof requests:

```javascript
// Get the current session ID
const sessionId = reclaimProofRequest.getSessionId();
console.log("Current session ID:", sessionId);
```

11. **Control auto-submission of proofs**:

Whether the verification client should automatically submit necessary proofs once they are generated. If set to false, the user must manually click a button to submit.
Defaults to true.

```js
// Initialize with options
const proofRequest = await ReclaimProofRequest.init(APP_ID, APP_SECRET, PROVIDER_ID, {
  canAutoSubmit: true,
});
```

12. **Add additional metadata for verification client**:

Additional metadata to pass to the verification client. This can be used to customize the client experience, such as customizing themes or UI by passing context-specific information. 
The keys and values must be strings. For most clients, this is not required and goes unused.

```js
// Initialize with options
const proofRequest = await ReclaimProofRequest.init(APP_ID, APP_SECRET, PROVIDER_ID, {
  metadata: { theme: 'dark', verify_another_way_link: 'https://exampe.org/alternative-verification?id=1234' },
});
```

## Handling Proofs on Your Backend

For production applications, it's recommended to handle proofs on your backend:

1. Set a callback URL:
   ```javascript
   reclaimProofRequest.setCallbackUrl("https://your-backend.com/receive-proofs");
   ```

These options allow you to securely process proofs and status updates on your server.

## Proof Verification

The SDK provides a `verifyProof` function to manually verify proofs. This is useful when you need to validate proofs outside of the normal flow:

```javascript
import { verifyProof } from "@reclaimprotocol/js-sdk";

// Verify a single proof
const isValid = await verifyProof(proof);
if (isValid) {
  console.log("Proof is valid");
} else {
  console.log("Proof is invalid");
}

// Verify multiple proofs
const areValid = await verifyProof([proof1, proof2, proof3]);
if (areValid) {
  console.log("All proofs are valid");
} else {
  console.log("One or more proofs are invalid");
}
```

The `verifyProof` function:

- Accepts either a single proof or an array of proofs
- Returns a boolean indicating if the proof(s) are valid
- Verifies signatures, witness integrity, and claim data
- Handles both standalone and blockchain-based proofs

## Error Handling

The SDK provides specific error types for different failure scenarios. Here's how to handle them:

```javascript
import { ReclaimProofRequest } from "@reclaimprotocol/js-sdk";

try {
  const proofRequest = await ReclaimProofRequest.init(APP_ID, APP_SECRET, PROVIDER_ID);

  await proofRequest.startSession({
    onSuccess: (proof) => {
      console.log("Proof received:", proof);
    },
    onError: (error) => {
      // Handle different error types
      if (error.name === "ProofNotVerifiedError") {
        console.error("Proof verification failed");
      } else if (error.name === "ProviderFailedError") {
        console.error("Provider failed to generate proof");
      } else if (error.name === "SessionNotStartedError") {
        console.error("Session could not be started");
      } else {
        console.error("Unknown error:", error.message);
      }
    },
  });
} catch (error) {
  // Handle initialization errors
  if (error.name === "InitError") {
    console.error("Failed to initialize SDK:", error.message);
  } else if (error.name === "InvalidParamError") {
    console.error("Invalid parameters provided:", error.message);
  }
}
```

**Common Error Types:**

- `InitError`: SDK initialization failed
- `InvalidParamError`: Invalid parameters provided
- `SignatureNotFoundError`: Missing or invalid signature
- `ProofNotVerifiedError`: Proof verification failed
- `ProviderFailedError`: Provider failed to generate proof
- `SessionNotStartedError`: Session could not be started
- `ProofSubmissionFailedError`: Proof submission to callback failed

## Next Steps

Explore the [Reclaim Protocol documentation](https://docs.reclaimprotocol.org/) for more advanced features and best practices for integrating the SDK into your production applications.

Happy coding with Reclaim Protocol!

## Contributing to Our Project

We welcome contributions to our project! If you find any issues or have suggestions for improvements, please open an issue or submit a pull request.

## Security Note

Always keep your Application Secret secure. Never expose it in client-side code or public repositories.

## Code of Conduct

Please read and follow our [Code of Conduct](https://github.com/reclaimprotocol/.github/blob/main/Code-of-Conduct.md) to ensure a positive and inclusive environment for all contributors.

## Security

If you discover any security-related issues, please refer to our [Security Policy](https://github.com/reclaimprotocol/.github/blob/main/SECURITY.md) for information on how to responsibly disclose vulnerabilities.

## Contributor License Agreement

Before contributing to this project, please read and sign our [Contributor License Agreement (CLA)](https://github.com/reclaimprotocol/.github/blob/main/CLA.md).

## Indie Hackers

For Indie Hackers: [Check out our guidelines and potential grant opportunities](https://github.com/reclaimprotocol/.github/blob/main/Indie-Hackers.md)

## License

This project is licensed under a [custom license](https://github.com/reclaimprotocol/.github/blob/main/LICENSE). By contributing to this project, you agree that your contributions will be licensed under its terms.

Thank you for your contributions!
