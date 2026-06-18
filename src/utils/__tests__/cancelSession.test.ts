import { ReclaimProofRequest } from "../../Reclaim";
import { SessionStatus } from "../types";
import { mockFetch } from "./mock-fetch";

const testAppId = '0x9323eFec99973623932Db45438DCE4dEa9D9aE4c';
const testAppSecret = '37e1d9da2f551ce0dac7e0eeda8a9e00daf62a3a3c548ed98cc80fc1a3983ad6';

describe('cancelSession', () => {
    it('marks the session SESSION_CANCELLED on the backend', async () => {
        globalThis.fetch = mockFetch({
            sessionId: '123',
            resolvedProviderVersion: '1.0.0'
        });

        const request = await ReclaimProofRequest.init(
            testAppId,
            testAppSecret,
            'example',
            { log: false, acceptAiProviders: false }
        );

        // Swap in a recording fetch so only the cancel call is captured.
        const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: () => ({}) });
        globalThis.fetch = fetchMock;

        await request.cancelSession();

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, options] = fetchMock.mock.calls[0];
        expect(url).toContain('/api/sdk/update/session');
        expect(options.method).toBe('POST');
        const body = JSON.parse(options.body);
        expect(body).toEqual({ sessionId: '123', status: SessionStatus.SESSION_CANCELLED });
    });

    it('is a no-op when there is no active session', async () => {
        globalThis.fetch = mockFetch({
            sessionId: '123',
            resolvedProviderVersion: '1.0.0'
        });

        const request = await ReclaimProofRequest.init(
            testAppId,
            testAppSecret,
            'example',
            { log: false, acceptAiProviders: false }
        );

        // Simulate a request with no active session.
        (request as any).sessionId = undefined;

        const fetchMock = jest.fn();
        globalThis.fetch = fetchMock;

        await request.cancelSession();

        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('swallows backend errors during cancellation', async () => {
        globalThis.fetch = mockFetch({
            sessionId: '123',
            resolvedProviderVersion: '1.0.0'
        });

        const request = await ReclaimProofRequest.init(
            testAppId,
            testAppSecret,
            'example',
            { log: false, acceptAiProviders: false }
        );

        // Backend rejects the update (e.g. session already in a final state).
        globalThis.fetch = jest.fn().mockResolvedValue({ ok: false, status: 400, json: () => ({ message: 'final state' }) });

        await expect(request.cancelSession()).resolves.toBeUndefined();
    });
});
