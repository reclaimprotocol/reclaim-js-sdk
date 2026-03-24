import { HttpProviderClaimParams } from "./types";
import { hashProofClaimParams } from "../witness";
import { ProofNotValidatedError, UnknownProofsNotValidatedError } from "./errors";
import loggerModule from './logger';
import { Proof, ProviderVersionInfo } from "./interfaces";
import { fetchProviderHashRequirementsBy, HashRequirement, ProviderHashRequirementsConfig } from "./providerUtils";

const logger = loggerModule.logger;


/**
 * Content validation configuration specifying essential required hashes and optional extra proofs.
 * Used to explicitly validate that a generated proof matches the exact request structure expected.
 */
export type ValidationConfigWithHash = {
    /**
     * Array of computed hashes that must be satisfied by the proofs.
     * 
     * An element can be a `HashRequirement` object or a string that is equivalent to
     * a `{ value: '<hash>', required: true, multiple: false }` as `HashRequirement`.
     */
    hashes: (string | HashRequirement)[]
};

/**
 * Content validation configuration specifying the provider id and version.
 * Used to explicitly validate that a generated proof matches the exact request structure expected.
 * 
 * See also:
 * 
 * * `ReclaimProofRequest.getProviderVersion()` - With a ReclaimProofRequest object, you can get the provider id & exact version of provider used in verification session.
 */
export type ValidationConfigWithProviderInformation = ProviderVersionInfo;

/**
 * Legacy configuration to completely bypass content validation during verification.
 * Warning: Using this poses a risk as it avoids strictly matching proof parameters to expected hashes.
 */
export interface ValidationConfigWithDisabledValidation { dangerouslyDisableContentValidation: true }

/**
 * Represents the configuration options applied when validating proof contents, allowing
 * strict hash checking or intentionally skipping validation if flagged.
 */
export type ValidationConfig = ValidationConfigWithHash | ValidationConfigWithProviderInformation | ValidationConfigWithDisabledValidation;

/**
 * Describes the comprehensive configuration required to initialize the proof verification process.
 * Aligns with `ValidationConfig` options for verifying signatures alongside proof contents.
 */
export type VerificationConfig = ValidationConfig;


const HASH_REQUIRED_DEFAULT = true;
const HASH_MATCH_MULTIPLE_DEFAULT = true;

export function assertValidProofsByHash(proofs: Proof[], config: ProviderHashRequirementsConfig) {
    if (!config.hashes) {
        throw new ProofNotValidatedError('No proof hash was provided for validation');
    }

    const unvalidatedProofHashByIndex = new Map<number, string[]>();

    for (let i = 0; i < proofs.length; i++) {
        const proof = proofs[i];
        const claimParams = getHttpProviderClaimParamsFromProof(proof);
        const computedHashesOfProof = hashProofClaimParams(claimParams);
        const proofHashes = Array.isArray(computedHashesOfProof) 
            ? computedHashesOfProof.map(h => h.toLowerCase().trim()) 
            : [computedHashesOfProof.toLowerCase().trim()];
        unvalidatedProofHashByIndex.set(i, proofHashes);
    }

    for (const hashRequirement of config.hashes) {
        let found = false;
        
        // The expectedHashes array incorporates multiple valid permutations when optional rule sets are defined in config.
        const expectedHashes = Array.isArray(hashRequirement.value) 
            ? hashRequirement.value.map(h => h.toLowerCase().trim()) 
            : [hashRequirement.value.toLowerCase().trim()];
        
        const isRequired = typeof hashRequirement !== 'string' ? (hashRequirement.required ?? true) : true;
        let canMatchMultiple = typeof hashRequirement !== 'string' ? (hashRequirement.multiple ?? false) : false;

        // Iterate through unvalidated proofs to assert that the generated deterministic hash 
        // derived from the User's actual matched elements structurally matches ANY of the permissible configurations.
        for (const [i, proofHashes] of unvalidatedProofHashByIndex.entries()) {
            const intersection = expectedHashes.filter(eh => proofHashes.includes(eh));
            
            // If the Proof's claim exactly replicates one of the Valid Config permutations:
            if (intersection.length > 0) {
                // Remove the proof so it can't validate subsequent independent requirements
                unvalidatedProofHashByIndex.delete(i);
                if (!found) {
                    found = true;
                } else if (!canMatchMultiple) {
                    // Preclude an attack surface where User passes duplicated valid proofs 
                    // matching permutations of the SAME underlying strict configuration.
                    const expectedHashStr = expectedHashes.length === 1 ? expectedHashes[0] : `[${expectedHashes.join(', ')}]`;
                    throw new ProofNotValidatedError(`Proof by hash '${expectedHashStr}' is not allowed to appear more than once`);
                }
            }
        }
        
        if (!found && isRequired) {
            const expectedHashStr = expectedHashes.length === 1 ? expectedHashes[0] : `[${expectedHashes.join(', ')}]`;
            throw new ProofNotValidatedError(`Proof by required hash '${expectedHashStr}' was not found`);
        }
    }

    if (unvalidatedProofHashByIndex.size > 0) {
        // if allowedExtraProofHashes was provided (not empty) and there are still unvalidated proofs, it means they are not allowed
        const contactSupport = 'Please contact Reclaim Protocol Support team or mail us at support@reclaimprotocol.org.';
        const unvalidatedHashesStrArr = [...unvalidatedProofHashByIndex.values()]
            .map(h => h.length === 1 ? h[0] : `[${h.join(', ')}]`);
        throw new UnknownProofsNotValidatedError(`Extra ${unvalidatedProofHashByIndex.size} proof(s) by hashes ${unvalidatedHashesStrArr.join(', ')} was found but could not be validated and indicates a security risk. ${contactSupport}`);
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

/**
 * Asserts that the proof is validated by checking the content of proof with with expectations from provider config or hash based on [options]
 * @param proofs - The proofs to validate
 * @param config - The validation config
 * @throws {ProofNotValidatedError} When the proof is not validated
 */
export async function assertValidateProof(proofs: Proof[], config: VerificationConfig) {
    if ('dangerouslyDisableContentValidation' in config && config.dangerouslyDisableContentValidation) {
        logger.warn('Validation skipped because it was disabled during proof verification')
        return
    }

    if ('providerId' in config) {
        if (!config.providerId || !config.providerVersion || typeof config.providerId !== 'string' || typeof config.providerVersion !== 'string') {
            throw new ProofNotValidatedError('Provider id and version are required for proof validation');
        }
        const hashRequirementsFromProvider = await fetchProviderHashRequirementsBy(config.providerId, config.providerVersion, proofs);
        return assertValidateProof(proofs, hashRequirementsFromProvider);
    }

    const effectiveHashRequirement = ('hashes' in config && Array.isArray(config?.hashes) ? config.hashes : []).map(it => {
        if (typeof it == 'string') {
            return {
                value: it,
            }
        } else {
            return it
        }
    });

    return assertValidProofsByHash(proofs, {
        hashes: effectiveHashRequirement,
    })
}
