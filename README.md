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

## Step 3: Set up your React component

Replace the contents of `src/App.js` with the following code:

```javascript
import React, { useState, useEffect } from 'react'
import { ReclaimProofRequest } from '@reclaimprotocol/js-sdk'
import QRCode from 'react-qr-code'

function App() {
  const [reclaimProofRequest, setReclaimProofRequest] = useState(null)
  const [requestUrl, setRequestUrl] = useState('')
  const [statusUrl, setStatusUrl] = useState('')
  const [proofs, setProofs] = useState(null)

  useEffect(() => {
    async function initializeReclaim() {
      const APP_ID = 'YOUR_APPLICATION_ID_HERE'
      const APP_SECRET = 'YOUR_APPLICATION_SECRET_HERE'
      const PROVIDER_ID = 'YOUR_PROVIDER_ID_HERE'

      const proofRequest = await ReclaimProofRequest.init(
        APP_ID,
        APP_SECRET,
        PROVIDER_ID
      )
      setReclaimProofRequest(proofRequest)
    }

    initializeReclaim()
  }, [])

  async function handleCreateClaim() {
    if (!reclaimProofRequest) {
      console.error('Reclaim Proof Request not initialized')
      return
    }

    const url = await reclaimProofRequest.getRequestUrl()
    setRequestUrl(url)

    const status = reclaimProofRequest.getStatusUrl()
    setStatusUrl(status)
    console.log('Status URL:', status)

    await reclaimProofRequest.startSession({
      onSuccess: (proofs) => {
        if (proofs && typeof proofs  === 'string') {
            // When using a custom callback url, the proof is returned to the callback url and we get a message instead of a proof
            console.log('SDK Message:', proofs)
            setProofs(proofs)
          } else if (proofs && typeof proofs !== 'string') {
            // When using the default callback url, we get a proof
            if (Array.isArray(proofs)) {
              // when using the cascading providers, providers having more than one proof will return an array of proofs
              console.log(JSON.stringify(proofs.map(p => p.claimData.context)))
            } else {
              console.log('Proof received:', proofs?.claimData.context)
            }
            setProofs(proofs)
          }
      },
      onFailure: (error) => {
        console.error('Verification failed', error)
      }
    })
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
  )
}

export default App
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

## Step 5: Run your application

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
   reclaimProofRequest.addContext('0x00000000000', 'Example context message')
   ```

2. **Setting Parameters**:
   If your provider requires specific parameters, you can set them like this:
   ```javascript
   reclaimProofRequest.setParams({ email: "test@example.com", userName: "testUser" })
   ```

3. **Custom Redirect URL**:
   Set a custom URL to redirect users after the verification process:
   ```javascript
   reclaimProofRequest.setRedirectUrl('https://example.com/redirect')
   ```

4. **Custom Callback URL**:
   Set a custom callback URL for your app which allows you to receive proofs and status updates on your callback URL:
   Pass in `jsonProofResponse: true` to receive the proof in JSON format: By default, the proof is returned as a url encoded string.
   ```javascript
   reclaimProofRequest.setAppCallbackUrl('https://example.com/callback', true)
   ```

5. **Exporting and Importing SDK Configuration**:
   You can export the entire Reclaim SDK configuration as a JSON string and use it to initialize the SDK with the same configuration on a different service or backend:
   ```javascript
   // On the client-side or initial service
   const configJson = reclaimProofRequest.toJsonString()
   console.log('Exportable config:', configJson)
   
   // Send this configJson to your backend or another service
   
   // On the backend or different service
   const importedRequest = ReclaimProofRequest.fromJsonString(configJson)
   const requestUrl = await importedRequest.getRequestUrl()
   ```
   This allows you to generate request URLs and other details from your backend or a different service while maintaining the same configuration.

## Handling Proofs on Your Backend

For production applications, it's recommended to handle proofs on your backend:

1. Set a callback URL:
   ```javascript
   reclaimProofRequest.setCallbackUrl('https://your-backend.com/receive-proofs')
   ```


These options allow you to securely process proofs and status updates on your server.

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