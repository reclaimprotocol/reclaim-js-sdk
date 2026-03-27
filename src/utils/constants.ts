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

    // Default error callback URL for Reclaim protocol
    get DEFAULT_RECLAIM_CANCEL_CALLBACK_URL() {
        return `${BACKEND_BASE_URL}/api/sdk/error-callback?callbackId=`;
    },

    // Default status URL for Reclaim sessions
    get DEFAULT_RECLAIM_STATUS_URL() {
        return `${BACKEND_BASE_URL}/api/sdk/session/`;
    },

    // Default attestors URL for Reclaim sessions
    get DEFAULT_ATTESTORS_URL() {
        return `${BACKEND_BASE_URL}/api/attestors`
    },

    DEFAULT_PROVIDER_CONFIGS_URL(providerId: string, exactProviderVersionString: string | null | undefined, allowedTags: string[] | null | undefined) {
        return `${BACKEND_BASE_URL}/api/providers/${providerId}/configs?versionNumber=${exactProviderVersionString || ''}&allowedTags=${allowedTags?.join(',') || ''}`
    },

    // Default portal URL
    DEFAULT_PORTAL_URL: 'https://portal.reclaimprotocol.org',

    // Default sharepage URL
    DEFAULT_APP_SHARE_PAGE_URL: 'https://share.reclaimprotocol.org/verifier',

    // URL for sharing Reclaim templates
    RECLAIM_SHARE_URL: 'https://share.reclaimprotocol.org/verifier/?template=',

    // Chrome extension URL for Reclaim Protocol
    CHROME_EXTENSION_URL: 'https://chromewebstore.google.com/detail/reclaim-extension/oafieibbbcepkmenknelhmgaoahamdeh'
};
