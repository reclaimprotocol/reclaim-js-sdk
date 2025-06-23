// Base URL for the backend API
export let BACKEND_BASE_URL = "https://api.reclaimprotocol.org";

export function setBackendBaseUrl(url: string) {
    BACKEND_BASE_URL = url;
}

// Constant values used throughout the application
export const constants = {
    // Default callback URL for Reclaim protocol
    get DEFAULT_RECLAIM_CALLBACK_URL() {
        return `${BACKEND_BASE_URL}/api/sdk/callback?callbackId=`;
    },

    // Default status URL for Reclaim sessions
    get DEFAULT_RECLAIM_STATUS_URL() {
        return `${BACKEND_BASE_URL}/api/sdk/session/`;
    },

    // URL for sharing Reclaim templates
    RECLAIM_SHARE_URL: 'https://share.reclaimprotocol.org/verifier/?template=',

    // Chrome extension URL for Reclaim Protocol
    CHROME_EXTENSION_URL: 'https://chromewebstore.google.com/detail/reclaim-extension/oafieibbbcepkmenknelhmgaoahamdeh',

    // QR Code API base URL
    QR_CODE_API_URL: 'https://api.qrserver.com/v1/create-qr-code/'
};
