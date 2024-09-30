// Base URL for the backend API
export const BACKEND_BASE_URL = "https://api.reclaimprotocol.org";

// Constant values used throughout the application
export const constants = {

    // Default callback URL for Reclaim protocol
    DEFAULT_RECLAIM_CALLBACK_URL: `${BACKEND_BASE_URL}/api/sdk/callback?callbackId=`,

    // Default status URL for Reclaim sessions
    DEFAULT_RECLAIM_STATUS_URL: `${BACKEND_BASE_URL}/api/sdk/session/`,

    // URL for sharing Reclaim templates
    RECLAIM_SHARE_URL: 'https://share.reclaimprotocol.org/verifier/?template='
};
