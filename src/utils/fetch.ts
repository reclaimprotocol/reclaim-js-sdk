import fetchRetry from "fetch-retry";

const MAX_RETRIES = 3;

const _defaultRetryableStatuses = [
    408, // Request Timeout
    429, // Too Many Requests
    500, // Internal Server Error
    502, // Bad Gateway
    503, // Service Unavailable
    504, // Gateway Timeout

    // From IIS
    440, // Login Timeout

    // From Ngnix
    499, // Client Closed Request

    // From AWS Elastic Load Balancer
    460, // Client Closed Request

    // Not in RFC:
    598, // Network Read Timeout Error
    599, // Network Connect Timeout Error

    // Cloudflare Statuses
    520, // Web Server Returned Unknown Error
    521, // Web Server Is Down
    522, // Connection Timed Out
    523, // Origin Is Unreachable
    524, // Timeout Occurred
    525, // SSL Handshake Failed
    527, // Railgun Error,
];

const isHttpResponseStatusRetryable = (statusCode: number) => _defaultRetryableStatuses.includes(statusCode);

export const http = {
    get client() {
        return fetchRetry(globalThis.fetch, {
            retries: MAX_RETRIES,
            retryDelay: function (attempt, error, response) {
                if (response) {
                    const retryAfter = response.headers.get('Retry-After');
                    if (retryAfter) {
                        const trimmed = retryAfter.trim();
                        let delay = 0;
                        if (/^\d+$/.test(trimmed)) {
                            delay = parseInt(trimmed, 10) * 1000;
                        } else {
                            const date = new Date(trimmed);
                            if (!isNaN(date.getTime())) {
                                delay = Math.max(0, date.getTime() - Date.now());
                            }
                        }

                        // Cap the delay to 60 seconds to avoid indefinite hangs
                        const MAX_RETRY_DELAY_MS = 60 * 1000;
                        if (delay > 0) {
                            return Math.min(delay, MAX_RETRY_DELAY_MS);
                        }
                    }
                }
                // attempt starts at 0. 
                // Returns: 1000ms, 2000ms, 4000ms
                return Math.pow(2, attempt) * 1000;
            },
            retryOn: (attempt, error, response) => {
                if (attempt >= MAX_RETRIES) {
                    return false;
                }
                if (error) {
                    return true;
                }

                if (response) {
                    return isHttpResponseStatusRetryable(response.status);
                }

                return false;
            },
        })
    },
}
