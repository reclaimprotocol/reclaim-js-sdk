// export const BACKEND_BASE_URL = "http://localhost:3003"
export const BACKEND_BASE_URL = "https://api.reclaimprotocol.org"
export const constants = {
    GET_PROVIDERS_BY_ID_API:
        BACKEND_BASE_URL + '/api/applications',
    DEFAULT_RECLAIM_CALLBACK_URL:
        BACKEND_BASE_URL + '/api/sdk/callback?callbackId=',
    DEFAULT_RECLAIM_STATUS_URL:
        BACKEND_BASE_URL + '/api/sdk/session/',
    RECLAIM_SHARE_URL: 'https://share.reclaimprotocol.org/instant/?template=',
    RECLAIM_GET_BRANCH_URL: 
        BACKEND_BASE_URL + '/api/sdk/get-branch-url' 
};
