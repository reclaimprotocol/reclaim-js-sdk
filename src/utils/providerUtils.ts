import { hashProofClaimParams } from "../witness";

export function getProviderHashRequirementsFromSpec(spec: ProviderHashRequirementSpec): ProviderHashRequirementsConfig {
    return {
        requiredHashes: spec?.requiredRequests?.map(hashRequestSpec) || [],
        allowedHashes: spec?.allowedRequests?.map(hashRequestSpec) || []
    };
}

export function hashRequestSpec(request: RequestSpec) {
    return hashProofClaimParams({
        ...request,
        // body is not expected when bodySniff is not enabled.
        body: request.bodySniff.enabled ? request.bodySniff.template : '',
    });
}

export interface ProviderHashRequirementSpec {
    requiredRequests: RequestSpec[] | undefined;
    allowedRequests: RequestSpec[] | undefined;
}

export type ProviderHashRequirementsConfig = { requiredHashes: string[]; allowedHashes: string[] }

export interface InterceptorRequestSpec extends RequestSpec { }

export interface InjectedRequestSpec extends RequestSpec { }

export interface RequestSpec {
    url: string;
    urlType: string;
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    bodySniff: BodySniff;
    responseMatches: ResponseMatchSpec[];
    responseRedactions: ResponseRedactionSpec[];
}

export interface BodySniff {
    enabled: boolean;
    template: string;
}

export interface ResponseMatchSpec {
    invert: boolean | undefined;
    isOptional: boolean | undefined;
    type: "regex" | "contains";
    value: string;
}

export interface ResponseRedactionSpec {
    hash?: "oprf" | undefined;
    jsonPath: string;
    regex: string;
    xPath: string;
}
