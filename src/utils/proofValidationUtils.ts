import { HttpProviderClaimParams, RequestSpec, ResponseMatch, ResponseRedaction } from "./types";
import { hashProofClaimParams } from "../witness";
import { ProofNotValidatedError } from "./errors";
import loggerModule from './logger';
import { Proof } from "./interfaces";
import { fetchProviderConfig } from "./sessionUtils";

const logger = loggerModule.logger;

/**
 * Verification using reclaim session id
 */
export interface ValidationConfigWithSessionId { reclaimSessionId: string }
/**
 * Content validation using any proof hash that matches with content's proof hash
 */
export interface ValidationConfigWithHash { allowedProofHashes: string[] }
/**
 * Legacy way of verification without proof validation
 */
export interface ValidationConfigWithDisabledValidation { dangerouslyDisableContentValidation: true }

/**
 * Validation options
 */
export type ValidationConfig = ValidationConfigWithSessionId | ValidationConfigWithHash | ValidationConfigWithDisabledValidation;

export function assertValidateProofByHash(proofs: Proof[], config: ValidationConfigWithHash) {
    const allowedProofHashes = new Set(config.allowedProofHashes.map(it => it.toLowerCase().trim()));
    if (!allowedProofHashes.size) {
        throw new ProofNotValidatedError('An empty list was provided as allowed proof hashes');
    }

    for (const proof of proofs) {
        const claimParams = getHttpProviderClaimParamsFromProof(proof);
        const computedHashOfProof = hashProofClaimParams(claimParams).toLowerCase().trim();
        if (!allowedProofHashes.has(computedHashOfProof)) {
            throw new ProofNotValidatedError('Proof hash mismatch');
        }
    }
    return true;
}

export async function assertValidateProofBySessionId(proofs: Proof[], config: ValidationConfigWithSessionId) {
    const providerConfigResponse = await fetchProviderConfig(config.reclaimSessionId);
    const requiredInterceptedRequests = providerConfigResponse.provider?.requestData ?? [];

    const minimumProofsExpected = requiredInterceptedRequests.length || 1;
    if (proofs.length < minimumProofsExpected) {
        throw new ProofNotValidatedError(`Expected ${minimumProofsExpected} proofs, but got ${proofs.length}`);
    }

    const validatedProofs = new Set<Proof>();

    // Validate against interceptor requests
    for (const config of requiredInterceptedRequests) {
        const matchedProof = proofs.find(
            proof => !validatedProofs.has(proof) && validateProofByRequestSpec(proof, config)
        );

        if (!matchedProof) {
            // atleast 1 proof should match for this interceptor request spec
            // not a single proof matched this request spec
            throw new ProofNotValidatedError('No proof matched interceptor request spec');
        }
        validatedProofs.add(matchedProof);
    }

    // Validate remaining against injected requests
    const allowedInjectedRequestData = providerConfigResponse.provider?.allowedInjectedRequestData ?? [];
    if (allowedInjectedRequestData.length > 0) {
        const uncheckedProofs = proofs.filter(proof => !validatedProofs.has(proof));
        // if we have unchecked proofs and we also have atleast 1 request in injected request spec, then we should validate
        // each unchecked proof against injected request spec
        for (const proof of uncheckedProofs) {
            const isMatch = allowedInjectedRequestData.some(config => validateProofByRequestSpec(proof, config));
            if (!isMatch) {
                // proof should match with any injected request spec
                // not a single injected request spec matched with this proof
                throw new ProofNotValidatedError('No proof matched injected request spec');
            }
            validatedProofs.add(proof);
        }
    }

    const uncheckedProofsCount = proofs.length - validatedProofs.size;
    if (uncheckedProofsCount > 0) {
        logger.warn(`${uncheckedProofsCount} proof(s) are not validated`);
    }

    return true;
}

export function validateProofByRequestSpec(proof: Proof, requestSpec: RequestSpec): boolean {
    const providerParams = getHttpProviderClaimParamsFromProof(proof);

    return !!providerParams &&
        isExactOrPatternMatch(providerParams.url, requestSpec.url) &&
        isExactOrPatternMatch(providerParams.method, requestSpec.method) &&
        (!requestSpec.bodySniff.enabled || isExactOrPatternMatch(providerParams.body, requestSpec.bodySniff.template)) &&
        validateResponseSelection(providerParams, requestSpec);
}

const allowedHttpMethods = new Set(["GET", "POST", "PUT", "PATCH"]);

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

export function getHttpProviderClaimParamsFromProof(proof: Proof): HttpProviderClaimParams | null {
    try {
        const claimParams = JSON.parse(proof.claimData.parameters);
        if (isHttpProviderClaimParams(claimParams)) {
            return claimParams;
        }
    } catch (_) {
        // some json parse error which can be ignored
    }
    return null;
}

function isExactOrPatternMatch(input: string, patternOrString: string): boolean {
    return input === patternOrString;
}

export function isResponseMatchSpecMatch(spec: ResponseMatch, match: ResponseMatch): boolean {
    return (spec.type ?? 'contains') === (match.type ?? 'contains') &&
        (spec.value ?? '') === (match.value ?? '') &&
        (spec.invert ?? false) === (match.invert ?? false);
}

export function isResponseRedactionSpecMatch(spec: ResponseRedaction, match: ResponseRedaction): boolean {
    return (spec.hash || undefined) === (match.hash || undefined) &&
        (spec.jsonPath ?? '') === (match.jsonPath ?? '') &&
        (spec.regex ?? '') === (match.regex ?? '') &&
        (spec.xPath ?? '') === (match.xPath ?? '');
}

export function validateResponseSelection(providerParams: HttpProviderClaimParams, requestSpec: RequestSpec): boolean {
    if (!providerParams.responseMatches.length || !requestSpec.responseMatches.length) {
        return false;
    }

    const skippedResponseMatchIndices = new Set<number>();

    for (let i = 0; i < requestSpec.responseMatches.length; i++) {
        const spec = requestSpec.responseMatches[i];
        const match = providerParams.responseMatches.some(it => isResponseMatchSpecMatch(spec, it));

        if (!match) {
            if (spec.isOptional) {
                skippedResponseMatchIndices.add(i);
            } else {
                return false;
            }
        }
    }

    for (let i = 0; i < requestSpec.responseRedactions.length; i++) {
        if (skippedResponseMatchIndices.has(i)) continue;

        const spec = requestSpec.responseRedactions[i];
        const match = providerParams.responseRedactions.some(it => isResponseRedactionSpecMatch(spec, it));

        if (!match) {
            return false;
        }
    }

    return true;
}
