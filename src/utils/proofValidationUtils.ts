import { HttpProviderClaimParams } from "./types";
import { hashProofClaimParams } from "../witness";
import { ProofNotValidatedError } from "./errors";
import loggerModule from './logger';
import { Proof } from "./interfaces";
import { ProviderHashRequirementsConfig } from "./providerUtils";

const logger = loggerModule.logger;

/**
 * Content validation configuration specifying essential required hashes and optional extra proofs.
 * Used to explicitly validate that a generated proof matches the exact request structure expected.
 */
export type ValidationConfigWithHash =
    | { requiredHashes: string[]; allowedExtraHashes?: string[]; allowArbitraryExtras?: boolean }
    | { allowedExtraHashes: string[]; allowArbitraryExtras?: boolean };

/**
 * Legacy configuration to completely bypass content validation during verification.
 * Warning: Using this poses a risk as it avoids strictly matching proof parameters to expected hashes.
 */
export interface ValidationConfigWithDisabledValidation { dangerouslyDisableContentValidation: true }

/**
 * Represents the configuration options applied when validating proof contents, allowing
 * strict hash checking or intentionally skipping validation if flagged.
 */
export type ValidationConfig = ValidationConfigWithHash | ValidationConfigWithDisabledValidation;

/**
 * Describes the comprehensive configuration required to initialize the proof verification process.
 * Aligns with `ValidationConfig` options for verifying signatures alongside proof contents.
 */
export type VerificationConfig = ValidationConfig;

export function assertValidProofsByHash(proofs: Proof[], config: ProviderHashRequirementsConfig) {
    const requiredProofHashes = config.requiredHashes.map(it => it.toLowerCase().trim());
    const allowedExtraProofHashes = new Set(config.allowedExtraHashes.map(it => it.toLowerCase().trim()));

    if (!requiredProofHashes.length && !allowedExtraProofHashes.size) {
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

    if (allowedExtraProofHashes.size > 0) {
        for (const [i, proofHash] of unvalidatedProofHashByIndex.entries()) {
            if (!allowedExtraProofHashes.has(proofHash)) {
                throw new ProofNotValidatedError(`Proof by hash ${proofHash} is not allowed`);
            }
            unvalidatedProofHashByIndex.delete(i);
        }
        if (unvalidatedProofHashByIndex.size > 0) {
            // if allowedExtraProofHashes was provided (not empty) and there are still unvalidated proofs, it means they are not allowed
            throw new ProofNotValidatedError(`Extra ${unvalidatedProofHashByIndex.size} proof(s) by hashes ${[...unvalidatedProofHashByIndex.values()].join(', ')} aren't allowed`);
        }
    }

    if (unvalidatedProofHashByIndex.size > 0) {
        if (config.allowArbitraryExtras) {
            logger.warn(`${unvalidatedProofHashByIndex.size} proof(s) by hashes ${[...unvalidatedProofHashByIndex.values()].join(', ')} were not validated`);
        } else {
            throw new ProofNotValidatedError(`Extra ${unvalidatedProofHashByIndex.size} proof(s) by hashes ${[...unvalidatedProofHashByIndex.values()].join(', ')} are not allowed`);
        }
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

export const CAN_ALLOW_ARBITRARY_EXTRAS_BY_DEFAULT = true;

/**
 * Asserts that the proof is validated by checking the content of proof with with expectations from provider config or hash based on [options]
 * @param proofs - The proofs to validate
 * @param config - The validation config
 * @throws {ProofNotValidatedError} When the proof is not validated
 */
export function assertValidateProof(proofs: Proof[], config: VerificationConfig) {
    if ('dangerouslyDisableContentValidation' in config && config.dangerouslyDisableContentValidation) {
        logger.warn('Validation skipped because it was disabled during proof verification')
        return
    }

    return assertValidProofsByHash(proofs, {
        requiredHashes: 'requiredHashes' in config && Array.isArray(config?.requiredHashes) ? config.requiredHashes : [],
        allowedExtraHashes: 'allowedExtraHashes' in config && Array.isArray(config?.allowedExtraHashes) ? config.allowedExtraHashes : [],
        allowArbitraryExtras: ('allowArbitraryExtras' in config ? config.allowArbitraryExtras : null) ?? CAN_ALLOW_ARBITRARY_EXTRAS_BY_DEFAULT,
    })
}
