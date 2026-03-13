import { HttpProviderClaimParams, InjectedRequestSpec, InterceptorRequestSpec, RequestSpec, ResponseMatch, ResponseRedaction } from "./types";
import { hashProviderParams } from "../witness";
import { ProofNotValidatedError } from "./errors";
import loggerModule from './logger';
import { Proof } from "./interfaces";
import { fetchProviderConfig } from "./sessionUtils";

const logger = loggerModule.logger;

/**
 * Verification using reclaim session id
 */
export interface VerificationOptionsWithSessionId { reclaimSessionId: string, isValidationEnabled: true }
/**
 * Verification using any proof hash
 */
export interface VerificationOptionsWithHash { allowedProofHashes: string[], isValidationEnabled: true }
/**
 * Legacy way of verification without proof validation
 */
export interface VerificationOptionsWithDisabledValidation { isValidationEnabled: false }

/**
 * Validation options
 */
export type ValidationOptions = VerificationOptionsWithSessionId | VerificationOptionsWithHash | VerificationOptionsWithDisabledValidation;


export function assertValidateProofByHash(proofs: Proof[], options: VerificationOptionsWithHash) {
    const allowedProofHashes = new Set(options.allowedProofHashes.map(it => it.toLowerCase().trim()));
    if (!allowedProofHashes.size) {
        throw new ProofNotValidatedError('An empty list was provided as allowed proof hashes')
    }
    for (const proof of proofs) {
        const claimParams = getHttpProviderClaimParamsFromProof(proof);
        const computedHashOfProof = hashProviderParams(claimParams).toLowerCase().trim();
        if (!allowedProofHashes.has(computedHashOfProof)) {
            throw new ProofNotValidatedError('Proof hash mismatch')
        }
    }
    return true;
}

export async function assertValidateProofBySessionId(proofs: Proof[], options: VerificationOptionsWithSessionId) {
    const reclaimSessionId = options.reclaimSessionId;
    const providerConfigResponse = await fetchProviderConfig(reclaimSessionId);

    const requiredInterceptedRequests = providerConfigResponse.provider?.requestData ?? [];

    const minimumProofsExpected = requiredInterceptedRequests?.length ?? 1;
    if (proofs.length < minimumProofsExpected) {
        throw new ProofNotValidatedError(`Expected ${minimumProofsExpected} proofs, but got ${proofs.length}`)
    }

    const validatedProofs: Set<Proof> = new Set<Proof>();
    const getUncheckedProofs = () => {
        return proofs.filter(proof => !validatedProofs.has(proof));
    }

    if (requiredInterceptedRequests?.length) {
        for (const config of requiredInterceptedRequests) {
            const matched = getUncheckedProofs().find(proof => {
                if (validateProofByRequestSpec(proof, config)) {
                    validatedProofs.add(proof);
                    return true;
                }
                return false;
            });
            if (!matched) {
                // atleast 1 proof should match for this interceptor request spec
                // not a single proof matched this request spec
                throw new ProofNotValidatedError('No proof matched interceptor request spec')
            }
        }
    }

    const allowedInjectedRequestData = providerConfigResponse.provider?.allowedInjectedRequestData ?? [];
    if (allowedInjectedRequestData.length) {
        const uncheckedProofs = getUncheckedProofs();
        if (uncheckedProofs.length) {
            // if we have unchecked proofs and we also have atleast 1 request in injected request spec, then we should validate
            // each unchecked proof against injected request spec
            for (const proof of uncheckedProofs) {
                const matched = allowedInjectedRequestData.find(config => validateProofByRequestSpec(proof, config))
                if (!matched) {
                    // proof should match with any injected request spec
                    // not a single injected request spec matched with this proof
                    throw new ProofNotValidatedError('No proof matched injected request spec');
                }
                validatedProofs.add(proof);
            }
        }
    }

    const uncheckedProofsCount = getUncheckedProofs().length;

    if (uncheckedProofsCount) {
        logger.warn(`${uncheckedProofsCount} proof(s) are not validated`);
    }

    return true;
}

export function validateProofByRequestSpec(proof: Proof, requestSpec: RequestSpec): boolean {
    const providerParams = getHttpProviderClaimParamsFromProof(proof);
    if (!providerParams) {
        return false;
    }
    if (!isExactOrPatternMatch(providerParams.url, requestSpec.url)) {
        return false;
    }
    if (!isExactOrPatternMatch(providerParams.method, requestSpec.method)) {
        return false;
    }
    if (requestSpec.bodySniff.enabled && !isExactOrPatternMatch(providerParams.body, requestSpec.bodySniff.template)) {
        return false;
    }

    return validateResponseSelection(providerParams, requestSpec);
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
        typeof params.method === 'string' && allowedHttpMethods.has(params.method) &&
        typeof params.body === 'string' &&
        Array.isArray(params.responseMatches) && params.responseMatches.length > 0 &&
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
    if (input === patternOrString) return true;

    return false;
}

export function isResponseMatchSpecMatch(responseMatchSpec: ResponseMatch, responseMatch: ResponseMatch): boolean {
    const type = responseMatch.type ?? 'contains';
    const typeSpec = responseMatchSpec.type ?? 'contains';
    const value = responseMatch.value ?? '';
    const valueSpec = responseMatchSpec.value ?? '';
    const invert = responseMatch.invert ?? false;
    const invertSpec = responseMatchSpec.invert ?? false;
    return type === typeSpec && value === valueSpec && invert === invertSpec;
}

export function isResponseRedactionSpecMatch(responseRedactionSpec: ResponseRedaction, responseRedaction: ResponseRedaction): boolean {
    const hash = responseRedaction.hash ?? undefined;
    const hashSpec = responseRedactionSpec.hash ?? undefined;
    const jsonPath = responseRedaction.jsonPath ?? '';
    const jsonPathSpec = responseRedactionSpec.jsonPath ?? '';
    const regex = responseRedaction.regex ?? '';
    const regexSpec = responseRedactionSpec.regex ?? '';
    const xPath = responseRedaction.xPath ?? '';
    const xPathSpec = responseRedactionSpec.xPath ?? '';
    return hash === hashSpec && jsonPath === jsonPathSpec && regex === regexSpec && xPath === xPathSpec;
}

export function validateResponseSelection(providerParams: HttpProviderClaimParams, requestSpec: RequestSpec) {
    const skippedResponseMatchIndices = new Set<number>();

    // Response match is required for validation
    if (!providerParams.responseMatches.length || !requestSpec.responseMatches.length) {
        return false;
    }

    if (requestSpec.responseMatches.length) {
        let index = -1;
        for (const responseMatchSpec of requestSpec.responseMatches) {
            index++;

            const match = providerParams.responseMatches.find(it => isResponseMatchSpecMatch(responseMatchSpec, it));

            if (!match) {
                if (responseMatchSpec.isOptional !== true) {
                    return false;
                } else {
                    skippedResponseMatchIndices.add(index);
                }
            }
        }
    }
    if (requestSpec.responseRedactions.length) {
        let index = -1;
        for (const responseRedactionSpec of requestSpec.responseRedactions) {
            index++;

            if (skippedResponseMatchIndices.has(index)) {
                continue;
            }

            const match = providerParams.responseRedactions.find(it => isResponseRedactionSpecMatch(responseRedactionSpec, it));

            if (!match) {
                return false;
            }
        }
    }
    return true;
}
