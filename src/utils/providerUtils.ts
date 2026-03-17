import { hashProofClaimParams } from "../witness";

/**
 * Transforms a raw provider hash requirement specification into a structured configuration for proof validation.
 * It computes the proof hashes for both required and allowed extra requests to correctly match uploaded proofs.
 * 
 * See also:
 * 
 * * `fetchProviderHashRequirementsBy()` - An alternative of this function to get the expected hashes for a provider version by providing providerId and exactProviderVersionString. The result can be provided in verifyProof function's `config` parameter for proof validation.
 * * `ReclaimProofRequest.getProviderHashRequirements()` - An alternative of this function to get the expected hashes for a proof request. The result can be provided in verifyProof function's `config` parameter for proof validation.
 *
 * @param spec - The raw provider specifications including required and allowed requests.
 * @returns A structured configuration containing computed required and allowed hashes for validation.
 */
export function getProviderHashRequirementsFromSpec(spec: ProviderHashRequirementSpec): ProviderHashRequirementsConfig {
    return {
        hashes: spec?.requests?.map(hashRequestSpec) || [],
    };
}

/**
 * Computes the claim hash for a specific request specification based on its properties.
 *
 * @param request - The HTTP request specification (e.g., URL, method, sniffs).
 * @returns A string representing the hashed proof claim parameters.
 */
export function hashRequestSpec(request: RequestSpec): HashRequirement {
    const hash = hashProofClaimParams({
        ...request,
        // Body is strictly empty unless body sniff is explicitly enabled
        body: request.bodySniff.enabled ? request.bodySniff.template : '',
    });

    return {
        value: hash,
        required: request.required,
        multiple: request.multiple,
    }
}

/**
 * Represents the raw specification of hash requirements provided by a provider's configuration.
 */
export interface ProviderHashRequirementSpec {
    /** List of request specs that can match with HTTP requests to create a proof using Reclaim Protocol */
    requests: RequestSpec[] | undefined;
}

/**
 * The structured hash requirements configuration used during proof verification and content validation.
 */
export type ProviderHashRequirementsConfig = {
    /** 
     * Array of computed hash requirements that must be satisfied by the proofs.
     */
    hashes: HashRequirement[];
}

/**
 * Describes a hash requirement for a proof.
 */
export type HashRequirement = {
    /**
     * The hash value to match
     */
    value: string;
    /**
     * Whether the hash is required to be present in the proof.
     * Defaults to true
     */
    required?: boolean;
    /**
     * Whether the hash can appear multiple times in the proof.
     * Defaults to false
     */
    multiple?: boolean;
}

/**
 * Specific marker interface for intercepted request specifications.
 */
export interface InterceptorRequestSpec extends RequestSpec { }

/**
 * Specific marker interface for injected request specifications.
 */
export interface InjectedRequestSpec extends RequestSpec { }

/**
 * Represents the properties and validation steps for an HTTP request involved in a Reclaim proof.
 */
export interface RequestSpec {
    /** The URL or generic path of the HTTP request */
    url: string;
    /** Type or representation of the URL */
    urlType: string;
    /** The HTTP method used for the request */
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    /** Identifies and captures the request body if enabled */
    bodySniff: BodySniff;
    /** Required matching configurations for the HTTP response */
    responseMatches: ResponseMatchSpec[];
    /** Redaction rules applied to the HTTP response before passing to attestors */
    responseRedactions: ResponseRedactionSpec[];
    /**
     * Whether request matching this spec is required and always expected in list of proofs
     * Defaults to true.
     */
    required?: boolean;
    /**
     * Whether request matching this spec is allowed to appear multiple times in list of proofs.
     * Defaults to false.
     */
    multiple?: boolean;
}

/**
 * Defines the configuration for identifying/sniffing the request body.
 */
export interface BodySniff {
    /** Indicates whether body sniffing is enabled */
    enabled: boolean;
    /** The template string used to match or capture the body */
    template: string;
}

/**
 * Specifies a rule to match against a string in response to validate proof content.
 */
export interface ResponseMatchSpec {
    /** If true, the match condition is reversed */
    invert: boolean | undefined;
    /** If true, the match condition is optional and won't fail if absent */
    isOptional: boolean | undefined;
    /** The matching mechanism, typically regex or simple string containment */
    type: "regex" | "contains";
    /** The pattern or value to look for in the response */
    value: string;
}

/**
 * Specifies redaction rules for obscuring sensitive parts of the response.
 */
export interface ResponseRedactionSpec {
    /** Optional hashing method applied to the redacted content (e.g., 'oprf') */
    hash?: "oprf" | undefined;
    /** JSON path for locating the value to redact */
    jsonPath: string;
    /** RegEx applied to correctly parse and extract/redact value */
    regex: string;
    /** XPath for XML/HTML matching configuration */
    xPath: string;
}
