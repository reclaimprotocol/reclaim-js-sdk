/**
 * @jest-environment node
 */

import { createHash, createSign, generateKeyPairSync } from 'crypto';
import { ethers } from 'ethers';
import { verifyProof, verifyTeeAttestation, TeeVerificationError } from '../index';
import { getPublicDataFromProofs } from '../utils/helper';
import { Proof, TeeAttestation } from '../utils/interfaces';
import { ATTESTATION_NONCE_DOMAIN, generateAttestationNonce } from '../utils/attestationNonce';

const GCP_ISSUER = 'https://confidentialcomputing.googleapis.com';
const GCP_OIDC_URL = `${GCP_ISSUER}/.well-known/openid-configuration`;
const GCP_JWKS_URL = `${GCP_ISSUER}/jwks`;
const TEST_TEE_SECRET = 'test-app-secret';
const expectedApplicationId = '0xd116D518eacea61C7af9760E5d8D1b720a0CE8D5';
const workloadDigest = 'us-docker.pkg.dev/rc-popcorn/popcorn-images/browser-node@sha256:97d4656f457831cf540b80a85daac40dcfa2f618beffcf3dd5966023ad8cab14';
const verifierDigest = 'us-docker.pkg.dev/rc-popcorn/popcorn-images/attestor@sha256:acaa00688de4ce0517303172fc89efd085c6e1a9647ca50066353eba6b8cc228';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const publicJwk = publicKey.export({ format: 'jwk' }) as JsonWebKey;
const gcpJwk = {
    ...publicJwk,
    kid: 'test-gcp-kid',
    alg: 'RS256',
    use: 'sig',
};

const baseProofData: Proof = {
    identifier: '0xbb5c63656a650276728d3cb9ce3f90361223c7814fd94f6582b682dfc96e4ba8',
    claimData: {
        provider: 'http',
        parameters: '{"additionalClientOptions":{"popcornApiUrl":"https://popcorn-cluster-aws-us-east-2.popcorn.reclaimprotocol.org"},"body":"{\\"includeGroups\\":false,\\"includeLogins\\":false,\\"includeVerificationStatus\\":true}","geoLocation":"{{DYNAMIC_GEO}}","headers":{"Accept":"application/json","Accept-Language":"en-US,en;q=0.9","Sec-Ch-Ua":"\\"Not-A.Brand\\";v=\\"24\\", \\"Chromium\\";v=\\"146\\"","Sec-Ch-Ua-Mobile":"?0","Sec-Fetch-Mode":"same-origin","Sec-Fetch-Site":"same-origin","User-Agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"},"method":"POST","paramValues":{"DYNAMIC_GEO":"IN","username":"srivatsanqb"},"proxySessionId":"1ab031c2ef","responseMatches":[{"type":"contains","value":"\\"userName\\":\\"{{username}}\\""}],"responseRedactions":[{"jsonPath":"$.userName","regex":"\\"userName\\":\\"(.*)\\"","xPath":""}],"url":"https://www.kaggle.com/api/i/users.UsersService/GetCurrentUser"}',
        owner: '0x9c3dcb81fe10f6e494bfaa0220ea0ba7bcf3ad94',
        timestampS: 1774346626,
        context: '{"attestationNonce":"0xdf1cd84efbeded8c07d0fcdccc4883e74ecf5ed65eaf023d2aa1aafd75611f6c04eb1f633396ecbcc4f6fe9fc11c25586a4dac3a99deb40c44ae5cf49cebae6d1b","attestationNonceData":{"applicationId":"0xd116D518eacea61C7af9760E5d8D1b720a0CE8D5","sessionId":"1ab031c2ef","timestamp":"1774346557104"},"contextAddress":"0x0","contextMessage":"sample context","extractedParameters":{"DYNAMIC_GEO":"IN","username":"srivatsanqb"},"providerHash":"0x4c20776ae89ab7eead49e4e393f4e07348a4d85e21869201aa6eea6e2bc07f5b","reclaimSessionId":"1ab031c2ef"}',
        identifier: '0xbb5c63656a650276728d3cb9ce3f90361223c7814fd94f6582b682dfc96e4ba8',
        epoch: 1,
    },
    witnesses: [
        {
            id: '0x244897572368eadf65bfbc5aec98d8e5443a9072',
            url: 'wss://attestor.reclaimprotocol.org:444/ws',
        },
    ],
    signatures: [
        '0x379b164165e005d75be4ec7854d745d68ad56d738a08da3a4c30eb071948bf5d0c7262bb8c46189e0cadb583dbb00917b73fbdbf74b5914eb69774ce97196a911c',
    ],
    extractedParameterValues: undefined,
};

function cloneProof(): Proof {
    return JSON.parse(JSON.stringify(baseProofData)) as Proof;
}

function createFetchResponse(body: any, status = 200) {
    return {
        ok: status >= 200 && status < 300,
        status,
        statusText: status === 200 ? 'OK' : 'ERROR',
        json: async () => body,
    };
}

function base64UrlEncode(input: Buffer | string): string {
    const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
    return buffer.toString('base64url');
}

function signJwt(payload: Record<string, any>): string {
    const header = { alg: 'RS256', kid: gcpJwk.kid, typ: 'JWT' };
    const signingInput = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}`;
    const signer = createSign('RSA-SHA256');
    signer.update(signingInput);
    signer.end();
    const signature = signer.sign(privateKey).toString('base64url');
    return `${signingInput}.${signature}`;
}

function createDigestBinding(workloadImageDigest: string, verifierImageDigest: string): string {
    return createHash('sha256')
        .update(`${workloadImageDigest}\n${verifierImageDigest}`)
        .digest('hex');
}

function createGcpTeeAttestation(
    nonce: string,
    overrides: Partial<TeeAttestation> = {},
    claimsOverrides: Record<string, any> = {}
): TeeAttestation {
    const now = Math.floor(Date.now() / 1000);
    const nextWorkloadDigest = overrides.workload?.image_digest ?? workloadDigest;
    const nextVerifierDigest = overrides.verifier?.image_digest ?? verifierDigest;

    const token = signJwt({
        aud: 'https://unit-test.popcorn.reclaimprotocol.org',
        exp: now + 3600,
        iat: now - 10,
        iss: GCP_ISSUER,
        nbf: now - 10,
        sub: 'https://www.googleapis.com/compute/v1/projects/rc-popcorn/zones/asia-south1-c/instances/test-instance',
        eat_nonce: [nonce, createDigestBinding(nextWorkloadDigest, nextVerifierDigest)],
        hwmodel: 'GCP_AMD_SEV',
        secboot: true,
        submods: {
            gce: {
                project_id: 'rc-popcorn',
                zone: 'asia-south1-c',
                instance_name: 'test-instance',
            },
        },
        ...claimsOverrides,
    });

    return {
        proof_version: 'v2',
        tee_provider: 'gcp',
        tee_technology: 'amd-sev',
        nonce,
        timestamp: new Date().toISOString(),
        workload: {
            container_name: 'neko',
            image_digest: nextWorkloadDigest,
        },
        verifier: {
            container_name: 'attestor',
            image_digest: nextVerifierDigest,
        },
        attestation: { token },
        ...overrides,
    };
}

function attachLegacyNonceTeeAttestation(proof: Proof): TeeAttestation {
    const context = JSON.parse(proof.claimData.context);
    const teeAttestation = createGcpTeeAttestation(context.attestationNonce);
    proof.teeAttestation = teeAttestation;
    return teeAttestation;
}

function attachHashNonceTeeAttestation(proof: Proof, secret = TEST_TEE_SECRET): TeeAttestation {
    const context = JSON.parse(proof.claimData.context);
    const { applicationId, sessionId, timestamp } = context.attestationNonceData;
    const attestationNonce = generateAttestationNonce(secret, applicationId, sessionId, timestamp);

    context.attestationNonce = attestationNonce;
    proof.claimData.context = JSON.stringify(context);

    const teeAttestation = createGcpTeeAttestation(attestationNonce);
    proof.teeAttestation = teeAttestation;
    return teeAttestation;
}

describe('generateAttestationNonce', () => {
    it('returns a 64-character hex nonce without leaking the app secret', () => {
        const appSecret = 'test-app-secret';
        const nonce = generateAttestationNonce(
            appSecret,
            'app-id',
            'session-id',
            '1712759999000'
        );

        expect(nonce).toMatch(/^[a-f0-9]{64}$/);
        expect(nonce).not.toContain(appSecret);
    });

    it('uses domain separation in the nonce payload', () => {
        const appSecret = 'test-app-secret';
        const applicationId = 'app-id';
        const sessionId = 'session-id';
        const timestamp = '1712759999000';
        const nonce = generateAttestationNonce(appSecret, applicationId, sessionId, timestamp);
        const undomainedNonce = ethers.keccak256(
            ethers.toUtf8Bytes(`${applicationId}:${sessionId}:${timestamp}:${appSecret}`)
        ).replace(/^0x/i, '');

        expect(nonce).not.toBe(undomainedNonce);
        expect(nonce).toBe(
            ethers.keccak256(
                ethers.toUtf8Bytes(
                    `${ATTESTATION_NONCE_DOMAIN}:${applicationId}:${sessionId}:${timestamp}:${appSecret}`
                )
            ).replace(/^0x/i, '')
        );
    });
});

describe('verifyProof', () => {
    const originalFetch = global.fetch;

    beforeAll(() => {
        global.fetch = jest.fn(async (input: any, init?: any) => {
            const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input?.url;

            if (url === GCP_OIDC_URL) {
                return createFetchResponse({ jwks_uri: GCP_JWKS_URL }) as any;
            }
            if (url === GCP_JWKS_URL) {
                return createFetchResponse({ keys: [gcpJwk] }) as any;
            }
            return originalFetch(input, init);
        }) as typeof fetch;
    });

    afterAll(() => {
        global.fetch = originalFetch;
    });

    it('verifies proof signature and returns extracted data', async () => {
        const proof = cloneProof();
        const result = await verifyProof(proof, { dangerouslyDisableContentValidation: true });
        expect(result.isVerified).toBe(true);
        expect(result.error).toBeUndefined();
        expect(result.data).toHaveLength(1);
        expect(result.data[0].extractedParameters).toEqual({ DYNAMIC_GEO: 'IN', username: 'srivatsanqb' });
    });

    it('returns error object when signature verification fails', async () => {
        const proof = cloneProof();
        proof.signatures = ['0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000ff'];
        const result = await verifyProof(proof, { dangerouslyDisableContentValidation: true });
        expect(result.isVerified).toBe(false);
        expect(result.error).toBeInstanceOf(Error);
        expect(result.data).toEqual([]);
    });

    it('returns error when proof data is tampered (signature mismatch)', async () => {
        const proof = cloneProof();
        proof.claimData.timestampS = proof.claimData.timestampS + 60 * 60;
        const result = await verifyProof(proof, { dangerouslyDisableContentValidation: true });
        expect(result.isVerified).toBe(false);
        expect(result.error).toBeInstanceOf(Error);
        expect(result.data).toEqual([]);
    });

    it('returns TeeVerificationError when TEE digests are tampered', async () => {
        const proof = cloneProof();
        const attestation = attachLegacyNonceTeeAttestation(proof);
        attestation.workload.image_digest = `us-docker.pkg.dev/rc-popcorn/popcorn-images/browser-node@sha256:${'1'.repeat(64)}`;

        const result = await verifyProof(proof, { dangerouslyDisableContentValidation: true, verifyTEE: true });
        expect(result.isVerified).toBe(false);
        expect(result.isTeeVerified).toBe(false);
        expect(result.error).toBeInstanceOf(TeeVerificationError);
    });

    it('returns TeeVerificationError when teeAttestation is missing from proof', async () => {
        const proof = cloneProof();
        delete (proof as any).teeAttestation;

        const result = await verifyProof(proof, { dangerouslyDisableContentValidation: true, verifyTEE: true });
        expect(result.isVerified).toBe(false);
        expect(result.isTeeVerified).toBe(false);
        expect(result.error).toBeInstanceOf(TeeVerificationError);
    });

    it('standalone verifyTeeAttestation detects tampered digests', async () => {
        const proof = cloneProof();
        const attestation = attachLegacyNonceTeeAttestation(proof);
        attestation.workload.image_digest = `us-docker.pkg.dev/rc-popcorn/popcorn-images/browser-node@sha256:${'2'.repeat(64)}`;

        await expect(verifyTeeAttestation(proof, expectedApplicationId)).resolves.toBe(false);
    });

    it('verifies a valid GCP TEE attestation when the hash-based nonce secret is provided', async () => {
        const proof = cloneProof();
        attachHashNonceTeeAttestation(proof);

        await expect(
            verifyTeeAttestation(proof, expectedApplicationId, TEST_TEE_SECRET)
        ).resolves.toBe(true);
    });

    it('fails hash-based nonce verification when the verifier does not provide the app secret', async () => {
        const proof = cloneProof();
        attachHashNonceTeeAttestation(proof);

        await expect(verifyTeeAttestation(proof, expectedApplicationId)).resolves.toBe(false);
    });

    it('fails hash-based nonce verification when the verifier provides the wrong app secret', async () => {
        const proof = cloneProof();
        attachHashNonceTeeAttestation(proof);

        await expect(verifyTeeAttestation(proof, expectedApplicationId, 'wrong-secret')).resolves.toBe(false);
    });

    it('fails when the nonce is valid but generated for a different session', async () => {
        const proof = cloneProof();
        const context = JSON.parse(proof.claimData.context);
        const { applicationId, timestamp } = context.attestationNonceData;
        const differentSessionId = '058b771dbc';
        const differentSessionNonce = generateAttestationNonce(
            TEST_TEE_SECRET,
            applicationId,
            differentSessionId,
            timestamp
        );

        // Keep the proof session binding unchanged, but swap in a nonce that is
        // cryptographically valid for another session ID.
        context.attestationNonce = differentSessionNonce;
        proof.claimData.context = JSON.stringify(context);
        proof.teeAttestation = createGcpTeeAttestation(differentSessionNonce);

        await expect(
            verifyTeeAttestation(proof, expectedApplicationId, TEST_TEE_SECRET)
        ).resolves.toBe(false);
    });

    it('throws immediately when TEE verification is invoked in a browser-like environment', async () => {
        const proof = cloneProof();
        attachHashNonceTeeAttestation(proof);

        const originalWindow = (globalThis as any).window;
        const originalDocument = (globalThis as any).document;

        try {
            (globalThis as any).window = {};
            (globalThis as any).document = {};

            await expect(
                verifyTeeAttestation(proof, expectedApplicationId, TEST_TEE_SECRET)
            ).rejects.toThrow(
                'TEE attestation verification is only supported in non-browser environments'
            );
        } finally {
            if (typeof originalWindow === 'undefined') {
                delete (globalThis as any).window;
            } else {
                (globalThis as any).window = originalWindow;
            }

            if (typeof originalDocument === 'undefined') {
                delete (globalThis as any).document;
            } else {
                (globalThis as any).document = originalDocument;
            }
        }
    });
});

describe('getPublicDataFromProofs', () => {
    it('returns empty array if no publicData is present', () => {
        const proof1 = cloneProof();
        const proof2 = cloneProof();
        proof1.publicData = undefined;
        proof2.publicData = undefined;

        const result = getPublicDataFromProofs([proof1, proof2]);
        expect(result).toEqual([]);
    });

    it('extracts publicData correctly', () => {
        const proof = cloneProof();
        proof.publicData = { user: 'test1' };

        const result = getPublicDataFromProofs([proof]);
        expect(result).toEqual([{ user: 'test1' }]);
    });

    it('deduplicates identical publicData', () => {
        const proof1 = cloneProof();
        const proof2 = cloneProof();
        proof1.publicData = { user: 'test', score: '100' };
        proof2.publicData = { score: '100', user: 'test' };

        const result = getPublicDataFromProofs([proof1, proof2]);
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({ user: 'test', score: '100' });
    });

    it('returns multiple distinct publicData objects', () => {
        const proof1 = cloneProof();
        const proof2 = cloneProof();
        proof1.publicData = { user: 'test1' };
        proof2.publicData = { user: 'test2' };

        const result = getPublicDataFromProofs([proof1, proof2]);
        expect(result).toHaveLength(2);
        expect(result).toEqual([{ user: 'test1' }, { user: 'test2' }]);
    });
});
