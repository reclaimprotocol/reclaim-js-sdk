import crypto, { X509Certificate } from 'crypto';
import { ethers } from 'ethers';
import { createSignDataForClaim } from '../witness';
import {
    ATTESTOR_NONCE_PATTERN,
    GCP_CONFIDENTIAL_SPACE_ISSUER,
    GCP_CONFIDENTIAL_SPACE_ROOT_CA,
} from './constants';
import { AttestorTeeVerificationError } from './errors';
import type { AttestorClaimAttestation, Proof } from './interfaces';
import loggerModule from './logger';

const logger = loggerModule.logger;

const BROWSER_ENVIRONMENT_ERROR =
    'Attestor TEE attestation verification is only supported in non-browser environments. Run verifyAttestorTeeAttestation on your server or API route.';

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

/**
 * Result of verifying an attestor TEE attestation.
 */
export type AttestorTeeVerificationResult = {
    isVerified: boolean;
    error?: string;
    /** sha256 image digest of the attestor container, on success. */
    imageDigest?: string;
};

const TOKEN_CLOCK_SKEW_S = 60;

function decodeBase64Url(input: string): Buffer {
    const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    return Buffer.from(padded, 'base64');
}

function normalizeAddress(address: string): string {
    return address.trim().toLowerCase().replace(/^0x/, '');
}

/**
 * Walks the x5c certificate chain (leaf first) and verifies each link
 * up to the pinned GCP Confidential Space Root CA. Returns the leaf
 * certificate's public key on success.
 */
function verifyX5cChain(x5cChain: string[]): crypto.KeyObject {
    if (!x5cChain || x5cChain.length === 0) {
        throw new Error('Empty x5c certificate chain');
    }

    const certs = x5cChain.map(
        (b64) => new X509Certificate(`-----BEGIN CERTIFICATE-----\n${b64}\n-----END CERTIFICATE-----`)
    );
    const root = new X509Certificate(GCP_CONFIDENTIAL_SPACE_ROOT_CA);

    for (let i = 0; i < certs.length - 1; i++) {
        if (!certs[i].verify(certs[i + 1].publicKey)) {
            throw new Error(`Certificate chain verification failed at level ${i}`);
        }
    }

    const top = certs[certs.length - 1];
    if (!top.verify(root.publicKey)) {
        throw new Error('Certificate chain does not root to GCP Confidential Space Root CA');
    }

    return certs[0].publicKey;
}

/**
 * Validates a GCP Confidential Space attestation JWT produced by an
 * attestor running in a Confidential Space VM, and asserts that the
 * attestation binds to the given attestor address.
 *
 * The attestor (running inside the TEE) calls the Confidential Space
 * launcher's attestation endpoint with two nonces:
 *   - `attestor_public_key:<eth-address>` - binds to the signing key.
 *   - `attestor_cert_hash:<sha256-hex>`   - binds to the live TLS cert.
 *
 * This function only verifies the public-key nonce. The TLS cert hash
 * binding is informational and not checked here. Callers that need to
 * pin to a specific attestor image should compare the returned
 * `imageDigest` against a known-good value.
 *
 * The JWT signature is verified by walking the x5c certificate chain
 * to a pinned GCP Confidential Space Root CA. No outbound network
 * calls are made.
 *
 * Node-only (uses node:crypto). Mirrors the environment restriction in
 * the existing `verifyTeeAttestation` helper.
 *
 * @param report - the raw JWT string (header.payload.signature).
 * @param expectedAttestorAddress - hex ETH address (0x-prefixed or
 *   unprefixed) that the attestation should be bound to.
 */
export async function verifyAttestorTeeAttestation(
    report: string,
    expectedAttestorAddress: string
): Promise<AttestorTeeVerificationResult> {
    try {
        assertNonBrowserEnvironment();

        if (!report || typeof report !== 'string') {
            throw new Error('attestation report is empty or not a string');
        }
        if (!expectedAttestorAddress || typeof expectedAttestorAddress !== 'string') {
            throw new Error('expectedAttestorAddress is required');
        }

        const parts = report.split('.');
        if (parts.length !== 3) {
            throw new Error('attestation report is not a JWT (expected 3 parts)');
        }
        const [headerB64, payloadB64, signatureB64] = parts;

        const header = JSON.parse(decodeBase64Url(headerB64).toString('utf8'));
        const payload = JSON.parse(decodeBase64Url(payloadB64).toString('utf8'));

        if (header.alg !== 'RS256') {
            throw new Error(`unexpected signing algorithm: ${header.alg}`);
        }
        if (!Array.isArray(header.x5c) || header.x5c.length === 0) {
            throw new Error('attestation report is missing x5c certificate chain');
        }

        if (payload.iss !== GCP_CONFIDENTIAL_SPACE_ISSUER) {
            throw new Error(`unexpected issuer: ${payload.iss}`);
        }

        const now = Math.floor(Date.now() / 1000);
        if (typeof payload.nbf === 'number' && now + TOKEN_CLOCK_SKEW_S < payload.nbf) {
            throw new Error(`attestation not yet valid (nbf=${payload.nbf})`);
        }
        if (typeof payload.exp === 'number' && now - TOKEN_CLOCK_SKEW_S > payload.exp) {
            throw new Error(`attestation expired (exp=${payload.exp})`);
        }
        if (typeof payload.iat === 'number' && payload.iat > now + TOKEN_CLOCK_SKEW_S) {
            throw new Error(`attestation issued in future (iat=${payload.iat})`);
        }

        const publicKey = verifyX5cChain(header.x5c);

        const verifier = crypto.createVerify('RSA-SHA256');
        verifier.update(`${headerB64}.${payloadB64}`);
        if (!verifier.verify(publicKey, new Uint8Array(decodeBase64Url(signatureB64)))) {
            throw new Error('attestation signature verification failed');
        }

        if (!payload.eat_nonce) {
            throw new Error('eat_nonce claim is missing');
        }
        const nonces: string[] = Array.isArray(payload.eat_nonce)
            ? payload.eat_nonce
            : [payload.eat_nonce];

        let attestedAddress: string | undefined;
        for (const n of nonces) {
            const m = typeof n === 'string' ? n.match(ATTESTOR_NONCE_PATTERN) : null;
            if (m) {
                attestedAddress = m[1];
                break;
            }
        }
        if (!attestedAddress) {
            throw new Error(
                `attestor_public_key nonce not found in eat_nonce: ${JSON.stringify(payload.eat_nonce)}`
            );
        }

        if (normalizeAddress(attestedAddress) !== normalizeAddress(expectedAttestorAddress)) {
            throw new Error(
                `attestor address mismatch: attestation binds to 0x${attestedAddress.toLowerCase()}, ` +
                `expected ${expectedAttestorAddress}`
            );
        }

        const imageDigest: string | undefined =
            payload.submods?.container?.image_digest
            ?? payload.google?.compute_engine?.image_digest;

        return { isVerified: true, imageDigest };
    } catch (error) {
        return {
            isVerified: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Configuration for verifying the attestor's TEE attestation on each
 * witness of the proof.
 */
export type AttestorTeeAttestationConfig = {
    /**
     * Optional allowlist of expected attestor container image digests
     * (e.g. `"sha256:4906340f..."`). When provided, the attestation's
     * `submods.container.image_digest` must be in this list.
     *
     * Leave undefined to skip image pinning and rely solely on the JWT
     * chain rooting to the GCP Confidential Space Root CA + nonce
     * binding to the attestor address.
     */
    expectedImageDigests?: string[];
};

function normalizeAttestorAddress(address: string): string {
    return address.trim().toLowerCase();
}

function normalizeSignature(sig: string): string {
    return sig.trim().toLowerCase();
}

async function verifyAttestorTeeForProof(
    proof: Proof,
    config: AttestorTeeAttestationConfig
): Promise<void> {
    if (!proof.witnesses || proof.witnesses.length === 0) {
        throw new AttestorTeeVerificationError('Proof has no witnesses');
    }

    const expectedDigests = config.expectedImageDigests?.map(d => d.trim());

    const proofSignatures = new Set((proof.signatures || []).map(normalizeSignature));
    const claimSignData = createSignDataForClaim(proof.claimData);

    for (const witness of proof.witnesses) {
        const att: AttestorClaimAttestation | undefined = witness.claimAttestation;
        if (!att) {
            throw new AttestorTeeVerificationError(
                `Witness ${witness.id} is missing claimAttestation`
            );
        }

        if (normalizeAttestorAddress(att.attestor_address) !== normalizeAttestorAddress(witness.id)) {
            throw new AttestorTeeVerificationError(
                `claimAttestation.attestor_address ${att.attestor_address} does not match witness id ${witness.id}`
            );
        }

        if (!proofSignatures.has(normalizeSignature(att.claim_signature))) {
            throw new AttestorTeeVerificationError(
                `claimAttestation.claim_signature for witness ${witness.id} is not present in proof.signatures`
            );
        }

        let recoveredSigner: string;
        try {
            recoveredSigner = ethers.verifyMessage(claimSignData, att.claim_signature);
        } catch (error) {
            throw new AttestorTeeVerificationError(
                `Failed to recover signer from claimAttestation.claim_signature for witness ${witness.id}`,
                error
            );
        }
        if (normalizeAttestorAddress(recoveredSigner) !== normalizeAttestorAddress(witness.id)) {
            throw new AttestorTeeVerificationError(
                `claim_signature recovers to ${recoveredSigner}, expected attestor ${witness.id}`
            );
        }

        const result = await verifyAttestorTeeAttestation(att.attestation_report, witness.id);
        if (!result.isVerified) {
            throw new AttestorTeeVerificationError(
                `Attestor TEE attestation verification failed for witness ${witness.id}: ${result.error}`
            );
        }

        if (expectedDigests && expectedDigests.length > 0) {
            if (!result.imageDigest) {
                throw new AttestorTeeVerificationError(
                    `Attestor TEE attestation for witness ${witness.id} did not expose an image digest to check against expectedImageDigests`
                );
            }
            if (!expectedDigests.includes(result.imageDigest)) {
                throw new AttestorTeeVerificationError(
                    `Attestor image digest ${result.imageDigest} for witness ${witness.id} is not in expectedImageDigests`
                );
            }
        }
    }
}

/**
 * Verifies the attestor's TEE attestation for every witness of every
 * provided proof. Throws `AttestorTeeVerificationError` on the first
 * failure.
 *
 * Each witness must carry a `claimAttestation`. For each one, this:
 *   1. Asserts `attestor_address` matches `witness.id`.
 *   2. Asserts `claim_signature` is present in `proof.signatures`.
 *   3. Recovers the signer of `claim_signature` from the claim data and
 *      asserts it equals `witness.id` (binds the signature to the
 *      attestor that the TEE attestation will cover).
 *   4. Calls `verifyAttestorTeeAttestation` to validate the JWT against
 *      the pinned GCP Confidential Space Root CA and the attestor-key
 *      nonce.
 *   5. If `expectedImageDigests` is provided, asserts the attestation's
 *      container image digest is in the allowlist.
 *
 * Node-only (uses node:crypto), like `verifyTeeAttestation`.
 *
 * @param proofs - The proofs to verify.
 * @param config - Optional config; see {@link AttestorTeeAttestationConfig}.
 */
export async function runAttestorTeeVerification(
    proofs: Proof[],
    config: AttestorTeeAttestationConfig = {}
): Promise<void> {
    if (!proofs || proofs.length === 0) {
        throw new AttestorTeeVerificationError('No proofs provided for attestor TEE verification');
    }

    try {
        for (const proof of proofs) {
            await verifyAttestorTeeForProof(proof, config);
        }
    } catch (error) {
        logger.error('Attestor TEE attestation verification failed:', error);
        if (error instanceof AttestorTeeVerificationError) {
            throw error;
        }
        throw new AttestorTeeVerificationError(
            'Attestor TEE attestation verification failed',
            error
        );
    }
}
