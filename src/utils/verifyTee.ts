import { Proof, TeeAttestation } from './interfaces';
import { ethers } from 'ethers';
import { generateAttestationNonce } from './attestationNonce';
import loggerModule from './logger';

const logger = loggerModule.logger;

const EXPECTED_ISSUER = 'https://confidentialcomputing.googleapis.com';
const EXPECTED_HW_MODEL = 'GCP_AMD_SEV';
const EXPECTED_TEE_PROVIDER = 'gcp';
const EXPECTED_TEE_TECHNOLOGY = 'amd-sev';
const TOKEN_CLOCK_SKEW_S = 60;
const NONCE_TIMESTAMP_MAX_SKEW_MS = 10 * 60 * 1000;

type JsonWebKeyLike = JsonWebKey & {
    kid?: string;
    alg?: string;
    use?: string;
};

type DecodedJwt = {
    header: Record<string, any>;
    payload: Record<string, any>;
    signingInput: string;
    signature: Uint8Array;
};

type NonceContextData = {
    applicationId: string;
    sessionId: string;
    timestamp: string;
};

export type TeeVerificationResult = {
    isVerified: boolean;
    error?: string;
};

const BROWSER_ENVIRONMENT_ERROR =
    'TEE attestation verification is only supported in non-browser environments. Run verifyTeeAttestation on your server or API route.';

function assert(condition: unknown, message: string): asserts condition {
    if (!condition) {
        throw new Error(message);
    }
}

function isBrowserEnvironment(): boolean {
    if (typeof window !== 'undefined' || typeof document !== 'undefined') {
        return true;
    }

    if (typeof navigator !== 'undefined' && typeof process === 'undefined') {
        return true;
    }

    const workerGlobalScope = (globalThis as any).WorkerGlobalScope;
    if (
        typeof workerGlobalScope !== 'undefined' &&
        typeof self !== 'undefined' &&
        self instanceof workerGlobalScope
    ) {
        return true;
    }

    return false;
}

function assertNonBrowserEnvironment() {
    if (isBrowserEnvironment()) {
        throw new Error(BROWSER_ENVIRONMENT_ERROR);
    }
}

function normalizeHex(value: string | undefined | null): string {
    return (value || '').trim().replace(/^0x/i, '').toLowerCase();
}

function isHex(value: string): boolean {
    return /^[0-9a-f]+$/i.test(value);
}

function decodeBase64Url(input: string): Uint8Array {
    const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);

    if (typeof Buffer !== 'undefined') {
        return new Uint8Array(Buffer.from(padded, 'base64'));
    }
    if (typeof atob === 'function') {
        const binary = atob(padded);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }

    throw new Error('Base64 decoding is not supported in this environment');
}

function decodeUtf8(bytes: Uint8Array): string {
    return new TextDecoder().decode(bytes);
}

function decodeJwt(token: string): DecodedJwt {
    const parts = token.split('.');
    assert(parts.length === 3, 'attestation token is not a JWT');

    return {
        header: JSON.parse(decodeUtf8(decodeBase64Url(parts[0]))),
        payload: JSON.parse(decodeUtf8(decodeBase64Url(parts[1]))),
        signingInput: `${parts[0]}.${parts[1]}`,
        signature: decodeBase64Url(parts[2]),
    };
}

function getFetch(): typeof fetch {
    const fetchFn = globalThis.fetch;
    assert(fetchFn, 'fetch is not available in this environment');
    return fetchFn.bind(globalThis);
}

function getSubtleCrypto(): SubtleCrypto {
    if (globalThis.crypto?.subtle) {
        return globalThis.crypto.subtle;
    }

    const nodeCrypto = typeof process !== 'undefined' && process.versions?.node
        ? require('crypto')
        : undefined;
    if (nodeCrypto?.webcrypto?.subtle) {
        return nodeCrypto.webcrypto.subtle as SubtleCrypto;
    }

    throw new Error('WebCrypto subtle is not available in this environment');
}

async function fetchJson(url: string): Promise<any> {
    const response = await getFetch()(url);
    if (!response.ok) {
        throw new Error(`GET ${url} returned ${response.status} ${response.statusText}`);
    }
    return response.json();
}

async function sha256Hex(input: string): Promise<string> {
    const digest = await getSubtleCrypto().digest('SHA-256', new TextEncoder().encode(input));
    return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('');
}

async function verifyJwtSignature(token: string, issuer: string): Promise<Record<string, any>> {
    const { header, payload, signingInput, signature } = decodeJwt(token);
    assert(header.alg === 'RS256', `unexpected attestation signing algorithm: ${header.alg}`);
    assert(typeof header.kid === 'string' && header.kid.length > 0, 'attestation token kid is missing');

    const oidc = await fetchJson(`${issuer}/.well-known/openid-configuration`);
    assert(typeof oidc?.jwks_uri === 'string' && oidc.jwks_uri.length > 0, 'issuer JWKS URI is missing');

    const jwks = await fetchJson(oidc.jwks_uri);
    const jwk = (jwks?.keys || []).find((key: JsonWebKeyLike) => key.kid === header.kid) as JsonWebKeyLike | undefined;
    assert(jwk, `no JWKS key found for kid ${header.kid}`);

    const cryptoKey = await getSubtleCrypto().importKey(
        'jwk',
        jwk,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['verify']
    );

    const isValid = await getSubtleCrypto().verify(
        'RSASSA-PKCS1-v1_5',
        cryptoKey,
        signature as unknown as BufferSource,
        new TextEncoder().encode(signingInput) as unknown as BufferSource
    );
    assert(isValid, 'JWT signature verification failed');

    return payload;
}

function parseProofContext(proof: Proof): { parsedContext: any; nonceDataObj: NonceContextData; expectedNonce: string } {
    let parsedContext: any;
    try {
        parsedContext = JSON.parse(proof.claimData.context);
    } catch {
        throw new Error('Failed to parse proof context to extract attestationNonce');
    }

    const expectedNonce = parsedContext?.attestationNonce;
    const nonceDataObj = parsedContext?.attestationNonceData as NonceContextData | undefined;
    assert(expectedNonce, 'Proof context is missing attestationNonce or attestationNonceData');
    assert(nonceDataObj, 'Proof context is missing attestationNonce or attestationNonceData');
    assert(typeof nonceDataObj.applicationId === 'string' && nonceDataObj.applicationId.length > 0, 'Proof context attestationNonceData.applicationId is missing');
    assert(typeof nonceDataObj.sessionId === 'string' && nonceDataObj.sessionId.length > 0, 'Proof context attestationNonceData.sessionId is missing');
    assert(typeof nonceDataObj.timestamp === 'string' && nonceDataObj.timestamp.length > 0, 'Proof context attestationNonceData.timestamp is missing');

    return { parsedContext, nonceDataObj, expectedNonce };
}

function verifyApplicationAndSessionBinding(
    proof: Proof,
    parsedContext: any,
    nonceDataObj: NonceContextData,
    expectedApplicationId?: string
) {
    const { applicationId, sessionId, timestamp } = nonceDataObj;

    if (expectedApplicationId) {
        assert(
            applicationId.toLowerCase() === expectedApplicationId.toLowerCase(),
            `Application ID Mismatch! Expected ${expectedApplicationId}, but proof context contains ${applicationId}`
        );
    }

    let parsedParameters: any = {};
    try {
        parsedParameters = proof.claimData.parameters ? JSON.parse(proof.claimData.parameters) : {};
    } catch {
        parsedParameters = {};
    }

    const contextSessionId = parsedContext?.reclaimSessionId;
    const parameterSessionId = parsedParameters?.proxySessionId ?? parsedParameters?.sessionId;

    if (contextSessionId && contextSessionId.toString() !== sessionId.toString()) {
        throw new Error(`Session ID Mismatch! Expected ${sessionId}, but proof context contains reclaimSessionId=${contextSessionId}`);
    }
    if (parameterSessionId && parameterSessionId.toString() !== sessionId.toString()) {
        throw new Error(`Session ID Mismatch! Expected ${sessionId}, but proof parameters contain ${parameterSessionId}`);
    }
    if (!contextSessionId && !parameterSessionId) {
        throw new Error('Proof is missing reclaimSessionId and proxySessionId/sessionId for attestation nonce verification');
    }

    const claimTimestampMs = proof.claimData.timestampS * 1000;
    const nonceTimestampMs = parseInt(timestamp, 10);
    const diffMs = Math.abs(claimTimestampMs - nonceTimestampMs);
    if (diffMs > NONCE_TIMESTAMP_MAX_SKEW_MS) {
        throw new Error(`Timestamp Skew Too Large! claimData.timestampS and attestationNonce timestamp differ by ${Math.round(diffMs / 1000)}s (limit: 600s)`);
    }
}

function verifyNonceMaterial(
    expectedNonce: string,
    nonceDataObj: NonceContextData,
    expectedAppSecret?: string
) {
    const cleanExpectedNonce = normalizeHex(expectedNonce);
    const { applicationId, sessionId, timestamp } = nonceDataObj;

    assert(cleanExpectedNonce.length > 0, 'Proof context attestationNonce is empty');
    assert(isHex(cleanExpectedNonce), 'Proof context attestationNonce is not valid hex');

    if (expectedAppSecret) {
        const recomputedNonce = generateAttestationNonce(expectedAppSecret, applicationId, sessionId, timestamp);
        assert(
            recomputedNonce === cleanExpectedNonce,
            'Attestation nonce verification failed: app secret, application ID, session ID, or timestamp do not match'
        );
        return;
    }

    if (cleanExpectedNonce.length > 74) {
        const legacyNonceData = `${applicationId}:${sessionId}:${timestamp}`;
        const nonceMsg = ethers.getBytes(ethers.keccak256(new TextEncoder().encode(legacyNonceData)));
        const recoveredAddress = ethers.verifyMessage(
            nonceMsg,
            expectedNonce.startsWith('0x') ? expectedNonce : `0x${expectedNonce}`
        );

        assert(
            recoveredAddress.toLowerCase() === applicationId.toLowerCase(),
            `Nonce signature verification failed: recovered ${recoveredAddress}, expected ${applicationId}`
        );
        return;
    }

    throw new Error('App secret is required to verify hash-based attestation nonces');
}

function assertTokenFresh(claims: Record<string, any>) {
    const now = Math.floor(Date.now() / 1000);

    if (typeof claims.nbf === 'number' && now + TOKEN_CLOCK_SKEW_S < claims.nbf) {
        throw new Error(`Attestation token is not valid before ${claims.nbf}`);
    }
    if (typeof claims.exp === 'number' && now - TOKEN_CLOCK_SKEW_S > claims.exp) {
        throw new Error(`Attestation token expired at ${claims.exp}`);
    }
    if (typeof claims.iat === 'number' && claims.iat > now + TOKEN_CLOCK_SKEW_S) {
        throw new Error(`Attestation token issued-at ${claims.iat} is in the future`);
    }
}

function assertAudienceClaim(aud: unknown) {
    if (typeof aud === 'string') {
        assert(aud.length > 0, 'attestation token audience is empty');
        return;
    }
    if (Array.isArray(aud)) {
        assert(aud.length > 0, 'attestation token audience is empty');
        assert(aud.every((entry) => typeof entry === 'string' && entry.length > 0), 'attestation token audience contains invalid entries');
        return;
    }
    throw new Error('attestation token audience is missing');
}

function assertProofShape(teeAttestation: TeeAttestation) {
    if (teeAttestation.error) {
        throw new Error(`${teeAttestation.error.code}: ${teeAttestation.error.message}`);
    }

    assert(teeAttestation.proof_version === 'v2', `unexpected proof version: ${teeAttestation.proof_version}`);
    assert(teeAttestation.tee_provider === EXPECTED_TEE_PROVIDER, `unexpected tee provider: ${teeAttestation.tee_provider}`);
    assert(teeAttestation.tee_technology === EXPECTED_TEE_TECHNOLOGY, `unexpected tee technology: ${teeAttestation.tee_technology}`);
    assert(typeof teeAttestation.nonce === 'string' && teeAttestation.nonce.length > 0, 'tee attestation nonce missing');
    assert(typeof teeAttestation.timestamp === 'string' && teeAttestation.timestamp.length > 0, 'tee attestation timestamp missing');
    assert(!Number.isNaN(Date.parse(teeAttestation.timestamp)), 'tee attestation timestamp is invalid');
    assert(typeof teeAttestation.workload?.image_digest === 'string' && teeAttestation.workload.image_digest.length > 0, 'workload image digest missing');
    assert(typeof teeAttestation.verifier?.image_digest === 'string' && teeAttestation.verifier.image_digest.length > 0, 'verifier image digest missing');
    assert(typeof teeAttestation.attestation?.token === 'string' && teeAttestation.attestation.token.length > 0, 'attestation token missing');
}

async function verifyGcpClaims(teeAttestation: TeeAttestation, expectedNonce: string) {
    const claims = await verifyJwtSignature(teeAttestation.attestation.token, EXPECTED_ISSUER);

    assert(claims.iss === EXPECTED_ISSUER, `unexpected issuer: ${claims.iss}`);
    assertAudienceClaim(claims.aud);
    assert(Array.isArray(claims.eat_nonce), 'eat_nonce claim missing');

    const digestBinding = await sha256Hex(
        `${teeAttestation.workload.image_digest}\n${teeAttestation.verifier.image_digest}`
    );

    assert(claims.eat_nonce.includes(expectedNonce), 'request nonce is not present in attestation token');
    assert(claims.eat_nonce.includes(digestBinding), 'digest-binding nonce is not present in attestation token');
    assert(claims.hwmodel === EXPECTED_HW_MODEL, `unexpected hwmodel: ${claims.hwmodel}`);
    assert(claims.secboot === true, 'secure boot claim is not true');
    assert(claims.submods?.gce, 'gce submod claim missing');

    assertTokenFresh(claims);
}

/**
 * Validates the hardware TEE attestation included in the proof.
 * Throws an error if the attestation is invalid or compromised.
 */
export async function verifyTeeAttestationDetailed(
    proof: Proof,
    expectedApplicationId?: string,
    expectedAppSecret?: string
): Promise<TeeVerificationResult> {
    assertNonBrowserEnvironment();

    try {
        let teeAttestation = proof.teeAttestation;
        if (!teeAttestation) {
            throw new Error('Missing teeAttestation in proof');
        }

        if (typeof teeAttestation === 'string') {
            teeAttestation = JSON.parse(teeAttestation) as TeeAttestation;
        }

        assertProofShape(teeAttestation);

        const { parsedContext, nonceDataObj, expectedNonce } = parseProofContext(proof);
        verifyApplicationAndSessionBinding(proof, parsedContext, nonceDataObj, expectedApplicationId);
        verifyNonceMaterial(expectedNonce, nonceDataObj, expectedAppSecret);

        const cleanExpectedNonce = normalizeHex(expectedNonce);
        const cleanTeeNonce = normalizeHex(teeAttestation.nonce);
        assert(cleanTeeNonce.length > 0, 'TEE attestation nonce is empty');
        assert(isHex(cleanTeeNonce), 'TEE attestation nonce is not valid hex');
        assert(cleanTeeNonce === cleanExpectedNonce, `Nonce Mismatch! Expected ${cleanExpectedNonce}, got ${cleanTeeNonce}`);

        await verifyGcpClaims(teeAttestation, cleanExpectedNonce);

        return { isVerified: true };
    } catch (error) {
        logger.error('TEE attestation verification failed:', error);
        return {
            isVerified: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

export async function verifyTeeAttestation(
    proof: Proof,
    expectedApplicationId?: string,
    expectedAppSecret?: string
): Promise<boolean> {
    assertNonBrowserEnvironment();
    const result = await verifyTeeAttestationDetailed(proof, expectedApplicationId, expectedAppSecret);
    return result.isVerified;
}
