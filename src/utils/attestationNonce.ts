import { ethers } from 'ethers';

export const ATTESTATION_NONCE_DOMAIN = 'RECLAIM_TEE_NONCE_V1';

export function generateAttestationNonce(
    appSecret: string,
    applicationId: string,
    sessionId: string,
    timestamp: string
): string {
    const noncePayload = [
        ATTESTATION_NONCE_DOMAIN,
        applicationId,
        sessionId,
        timestamp,
        appSecret
    ].join(':');

    return ethers.keccak256(ethers.toUtf8Bytes(noncePayload)).replace(/^0x/i, '');
}
