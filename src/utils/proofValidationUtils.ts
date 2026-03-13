import { HttpProviderClaimParams } from "./types";
import { hashProofClaimParams } from "../witness";
import { ProofNotValidatedError } from "./errors";
import loggerModule from './logger';
import { Proof } from "./interfaces";
import { ProviderHashRequirementsConfig } from "./providerUtils";

const logger = loggerModule.logger;

/**
 * Content validation using any proof hash that matches with content's proof hash
 */
export type ValidationConfigWithHash =
    | { requiredHashes: string[]; allowedHashes?: string[] }
    | { allowedHashes: string[] };
/**
 * Legacy way of verification without proof validation
 */
export interface ValidationConfigWithDisabledValidation { dangerouslyDisableContentValidation: true }
/**
 * Validation options
 */
export type ValidationConfig = ValidationConfigWithHash | ValidationConfigWithDisabledValidation;

export function assertValidProofsByHash(proofs: Proof[], config: ProviderHashRequirementsConfig) {
    const requiredProofHashes = config.requiredHashes.map(it => it.toLowerCase().trim());
    const allowedHashesForExtraProofs = new Set(config.allowedHashes.map(it => it.toLowerCase().trim()));

    if (!requiredProofHashes.length && !allowedHashesForExtraProofs.size) {
        throw new ProofNotValidatedError('No proof hash was provided for validation');
    }

    const unvalidatedProofHashByIndex = new Map<number, string>();

    for (let i = 0; i < proofs.length; i++) {
        const proof = proofs[i];
        const claimParams = getHttpProviderClaimParamsFromProof(proof);
        const computedHashOfProof = hashProofClaimParams(claimParams).toLowerCase().trim();
        unvalidatedProofHashByIndex.set(i, computedHashOfProof);
    }

    for (const requiredProofHash of requiredProofHashes) {
        let found = false;
        for (const [i, proofHash] of unvalidatedProofHashByIndex.entries()) {
            if (proofHash === requiredProofHash) {
                unvalidatedProofHashByIndex.delete(i);
                found = true;
                break;
            }
        }
        if (!found) {
            throw new ProofNotValidatedError(`Proof by hash ${requiredProofHash} was not found`);
        }
    }

    if (allowedHashesForExtraProofs.size > 0) {
        for (const [i, proofHash] of unvalidatedProofHashByIndex.entries()) {
            if (!allowedHashesForExtraProofs.has(proofHash)) {
                throw new ProofNotValidatedError(`Proof by hash ${proofHash} is not allowed`);
            }
            unvalidatedProofHashByIndex.delete(i);
        }
        if (unvalidatedProofHashByIndex.size > 0) {
            // if allowedHashesForExtraProofs was provided (not empty) and there are still unvalidated proofs, it means they are not allowed
            throw new ProofNotValidatedError(`${unvalidatedProofHashByIndex.size} proof(s) by hashes ${[...unvalidatedProofHashByIndex.values()].join(', ')} aren't allowed`);
        }
    }

    if (unvalidatedProofHashByIndex.size > 0) {
        logger.warn(`${unvalidatedProofHashByIndex.size} proof(s) by hashes ${[...unvalidatedProofHashByIndex.values()].join(', ')} were not validated`);
    }
}

const allowedHttpMethods = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);

export function isHttpProviderClaimParams(claimParams: unknown): claimParams is HttpProviderClaimParams {
    // Fail fast on non-objects
    if (!claimParams || typeof claimParams !== 'object' || Array.isArray(claimParams)) {
        return false;
    }

    // Cast to a Record so we can check properties directly without 'in'
    const params = claimParams as Record<string, unknown>;

    return (
        typeof params.url === 'string' &&
        typeof params.method === 'string' &&
        allowedHttpMethods.has(params.method) &&
        typeof params.body === 'string' &&
        Array.isArray(params.responseMatches) &&
        params.responseMatches.length > 0 &&
        Array.isArray(params.responseRedactions)
    );
}

export function getHttpProviderClaimParamsFromProof(proof: Proof): HttpProviderClaimParams {
    try {
        const claimParams = JSON.parse(proof.claimData.parameters);
        if (isHttpProviderClaimParams(claimParams)) {
            return claimParams;
        }
    } catch (_) { }
    throw new ProofNotValidatedError('Proof has no HTTP provider params to hash');
}
