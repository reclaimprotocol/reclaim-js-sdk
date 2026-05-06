import { ethers } from 'ethers';
import canonicalize from 'canonicalize';
import { SignatureGeneratingError } from './errors';
import { validateFunctionParams } from './validationUtils';

/**
 * Computes the signature required by `initSession` over `{providerId, timestamp}`.
 *
 * Use this on a trusted server (where `appSecret` lives) to produce a signature
 * that can then be passed to `ReclaimProofRequest.initWithSignature(...)` from a
 * client that never sees the secret.
 *
 * @param appSecret - The application secret (private key). Must remain server-side.
 * @param providerId - The provider id the session will be initialized against.
 * @param timestamp - The timestamp (ms epoch as string) that will be sent with init.
 *                    The same value MUST be passed to `initWithSignature`.
 */
export async function generateInitSignature(
    appSecret: string,
    providerId: string,
    timestamp: string
): Promise<string> {
    validateFunctionParams([
        { input: appSecret, paramName: 'appSecret', isString: true },
        { input: providerId, paramName: 'providerId', isString: true },
        { input: timestamp, paramName: 'timestamp', isString: true }
    ], 'generateInitSignature');

    try {
        const wallet = new ethers.Wallet(appSecret);
        const canonicalData = canonicalize({ providerId, timestamp });
        if (!canonicalData) {
            throw new SignatureGeneratingError('Failed to canonicalize data for signing.');
        }
        const messageHash = ethers.keccak256(new TextEncoder().encode(canonicalData));
        return await wallet.signMessage(ethers.getBytes(messageHash));
    } catch (err) {
        throw new SignatureGeneratingError(
            `Error generating init signature for providerId: ${providerId}`,
            err
        );
    }
}
