import fetchRetry from "fetch-retry";

const MAX_RETRIES = 3;

const isHttpResponseStatusRetryable = (statusCode: number) => {
    return statusCode === 408 || statusCode === 429 || statusCode >= 500;
};

export const http = {
    get client() {
        return fetchRetry(globalThis.fetch, {
            retries: MAX_RETRIES,
            retryDelay: function (attempt, _, response) {
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
                        if (delay >= 0) {
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

                if (response && Number.isInteger(response.status)) {
                    return isHttpResponseStatusRetryable(response.status);
                }

                return !!error && error.name !== 'AbortError';
            },
        })
    },
}
