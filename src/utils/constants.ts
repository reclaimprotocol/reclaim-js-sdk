// Base URL for the backend API
export let BACKEND_BASE_URL = "https://api.reclaimprotocol.org";

export function setBackendBaseUrl(url: string) {
    BACKEND_BASE_URL = url;
}

// Constant values used throughout the application
export const constants = {

    // Default callback URL for Reclaim protocol
    DEFAULT_RECLAIM_CALLBACK_URL: `${BACKEND_BASE_URL}/api/sdk/callback?callbackId=`,

    // Default status URL for Reclaim sessions
    DEFAULT_RECLAIM_STATUS_URL: `${BACKEND_BASE_URL}/api/sdk/session/`,

    // URL for sharing Reclaim templates
    RECLAIM_SHARE_URL: 'https://share.reclaimprotocol.org/verifier/?template='
};
