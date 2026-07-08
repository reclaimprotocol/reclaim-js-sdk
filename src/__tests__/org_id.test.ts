import { updateSession } from '../utils/sessionUtils';
import { http } from '../utils/fetch';
import { SessionStatus } from '../utils/types';

jest.mock('../utils/fetch', () => ({
  http: { client: jest.fn() },
}));

const mockClient = http.client as jest.Mock;

const okResponse = () => ({
  ok: true,
  json: async () => ({ message: 'ok' }),
});

describe('updateSession orgId', () => {
  beforeEach(() => {
    mockClient.mockReset();
    mockClient.mockResolvedValue(okResponse());
  });

  it('includes orgId in the request body when provided', async () => {
    await updateSession('session-1', SessionStatus.SESSION_STARTED, 'org-123');

    expect(mockClient).toHaveBeenCalledTimes(1);
    const body = JSON.parse(mockClient.mock.calls[0][1].body);
    expect(body).toEqual({
      sessionId: 'session-1',
      status: SessionStatus.SESSION_STARTED,
      orgId: 'org-123',
    });
  });

  it('omits the orgId key entirely when not provided', async () => {
    await updateSession('session-1', SessionStatus.SESSION_STARTED);

    const body = JSON.parse(mockClient.mock.calls[0][1].body);
    expect(body).toEqual({
      sessionId: 'session-1',
      status: SessionStatus.SESSION_STARTED,
    });
    expect('orgId' in body).toBe(false);
  });

  it('omits the orgId key when empty string', async () => {
    await updateSession('session-1', SessionStatus.SESSION_STARTED, '');

    const body = JSON.parse(mockClient.mock.calls[0][1].body);
    expect('orgId' in body).toBe(false);
  });
});

describe('orgId json round-trip', () => {
  const baseJson = {
    applicationId: '0xapp',
    providerId: 'provider-1',
    sessionId: 'session-1',
    signature: '0xsig',
    timestamp: '1700000000000',
    sdkVersion: 'js-0.0.0-test',
    parameters: {},
    context: { contextAddress: '0x0', contextMessage: 'test' },
  };

  it('preserves options.orgId through fromJsonString -> toJsonString', async () => {
    // Late import so the http mock above is in place before module init.
    const { ReclaimProofRequest } = await import('../Reclaim');
    const request = await ReclaimProofRequest.fromJsonString(
      JSON.stringify({ ...baseJson, options: { orgId: 'org-123' } }),
    );
    const roundTripped = JSON.parse(request.toJsonString());
    expect(roundTripped.options.orgId).toBe('org-123');
  });

  it('rejects a non-string options.orgId', async () => {
    const { ReclaimProofRequest } = await import('../Reclaim');
    await expect(
      ReclaimProofRequest.fromJsonString(
        JSON.stringify({ ...baseJson, options: { orgId: 42 } }),
      ),
    ).rejects.toThrow();
  });
});
