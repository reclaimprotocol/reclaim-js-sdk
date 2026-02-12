import fetchRetry from "fetch-retry";

const MAX_RETRIES = 3;
const MAX_RETRY_DELAY_MS = 60 * 1000;

const isHttpResponseStatusRetryable = (statusCode: number) => {
    return statusCode === 408 || statusCode === 429 || statusCode >= 500;
};

const getRetryDelay = (response: Response | null | undefined): number | undefined => {
    const retryAfter = response?.headers.get('Retry-After');
    if (!retryAfter) {
        return undefined;
    }

    const trimmed = retryAfter.trim();

    if (/^\d+$/.test(trimmed)) {
        return Math.min(parseInt(trimmed, 10) * 1000, MAX_RETRY_DELAY_MS);
    }

    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
        return Math.min(Math.max(0, date.getTime() - Date.now()), MAX_RETRY_DELAY_MS);
    }

    return undefined;
};

export const http = {
    get client() {
        return fetchRetry(globalThis.fetch, {
            retries: MAX_RETRIES,
            retryDelay: function (attempt, _, response) {
                const delay = getRetryDelay(response);
                if (delay !== undefined) {
                    return delay;
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
