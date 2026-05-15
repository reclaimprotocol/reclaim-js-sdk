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

// GCP Confidential Space Root CA — pinned. Rotates infrequently
// (current cert valid 2024-2034). Used to verify attestor TEE attestation JWTs.
export const GCP_CONFIDENTIAL_SPACE_ROOT_CA = `-----BEGIN CERTIFICATE-----
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
uyT5CnJulxSC5CT1
-----END CERTIFICATE-----`;

// Matches an `attestor_public_key:0x<40-hex>` entry in a GCP Confidential
// Space attestation JWT's `eat_nonce` claim.
export const ATTESTOR_NONCE_PATTERN = /^attestor_public_key:0x([0-9a-fA-F]{40})$/;

// Expected `iss` claim on GCP Confidential Space attestation JWTs.
export const GCP_CONFIDENTIAL_SPACE_ISSUER = 'https://confidentialcomputing.googleapis.com';
