import { hashProofClaimParams } from "../witness";
import { InvalidRequestSpecError, ProviderConfigFetchError } from "./errors";
import { fetchProviderConfigs } from "./sessionUtils";
import loggerModule from './logger';
import { Proof } from "./interfaces";

const logger = loggerModule.logger;

/**
 * Fetches the provider configuration by the providerId and its version; and constructs the robust hash requirements needed for proof validation.
 * It resolves both explicitly required HTTP requests and allowed injected requests based on the provider version.
 * 
 * See also:
 * 
 * * `ReclaimProofRequest.getProviderHashRequirements()` - An alternative of this function to get the expected hashes for a proof request. The result can be provided in verifyProof function's `config` parameter for proof validation.
 * * `getProviderHashRequirementsFromSpec()` - An alternative of this function to get the expected hashes from a provider spec. The result can be provided in verifyProof function's `config` parameter for proof validation.
 * 
 * @param providerId - The unique identifier of the selected provider.
 * @param exactProviderVersionString - The specific version string of the provider configuration to ensure deterministic validation.
 * @returns A promise that resolves to `ProviderHashRequirementsConfig` representing the expected hashes for proof validation.
 */
export async function fetchProviderHashRequirementsBy(providerId: string, exactProviderVersionString: string | null | undefined, allowedTags: string[] | null | undefined, proofs?: Proof[]): Promise<ProviderHashRequirementsConfig[]> {
    const providerResponse = await fetchProviderConfigs(providerId, exactProviderVersionString, allowedTags);

    try {
        const providerConfigs = providerResponse.providers;
        if (!providerConfigs || !providerConfigs.length) {
            throw new ProviderConfigFetchError(`No provider configs found for providerId: ${providerId}, exactProviderVersionString: ${exactProviderVersionString}`);
        }

        const hashRequirements: ProviderHashRequirementsConfig[] = [];

        for (const providerConfig of providerConfigs) {
            hashRequirements.push(getProviderHashRequirementsFromSpec({
                requests: [...(providerConfig?.requestData ?? []), ...generateSpecsFromRequestSpecTemplate(providerConfig?.allowedInjectedRequestData ?? [], takeTemplateParametersFromProofs(proofs))],
            }));
        }

        return hashRequirements;
    } catch (e) {
        const errorMessage = `Failed to fetch provider hash requirements for providerId: ${providerId}, exactProviderVersionString: ${exactProviderVersionString}`;
        logger.info(errorMessage, e);
        throw new ProviderConfigFetchError(`Error fetching provider hash requirements for providerId: ${providerId}, exactProviderVersionString: ${exactProviderVersionString}`);
    }
}

/**
 * Generates an array of `RequestSpec` objects by replacing template parameters with their corresponding values.
 * 
 * If the input template includes `templateParams` (e.g., `['param1', 'param2']`), this function will 
 * cartesian-map (or pairwise-map) the provided `templateParameters` record (e.g., `{ param1: ['v1', 'v2'], param2: ['a1', 'a2'] }`) 
 * to generate multiple unique `RequestSpec` configurations.
 * 
 * The function ensures that:
 * 1. Parameters strictly specified in `template.templateParams` are found.
 * 2. All specified template parameters arrays have the exact same length (pairwise mapping).
 * 3. String replacements are fully applied (all occurrences) to `responseMatches` (value) and `responseRedactions` (jsonPath, xPath, regex).
 * 
 * @param requestSpecTemplates - The base template `RequestSpec` containing parameter placeholders.
 * @param templateParameters - A record mapping parameter names to arrays of strings representing the extracted values.
 * @returns An array of fully constructed `RequestSpec` objects with templates replaced.
 * @throws {InvalidRequestSpecError} If required parameters are missing or parameter value arrays have mismatched lengths.
 */
export function generateSpecsFromRequestSpecTemplate(requestSpecTemplates: RequestSpec[], templateParameters: Record<string, string[]>): RequestSpec[] {
    if (!requestSpecTemplates) return [];

    const generatedRequestTemplate: RequestSpec[] = [];

    for (const template of requestSpecTemplates) {
        const templateVariables = template.templateParams ?? [];
        if (!templateVariables.length) {
            generatedRequestTemplate.push(template);
            continue;
        }

        const templateParamsPairMatch = Object.entries(templateParameters).filter(([key, value]) => templateVariables.includes(key) && value.length)
        const hasAllTemplateVariableMatch = templateParamsPairMatch.length === templateVariables.length;
        if (!hasAllTemplateVariableMatch) {
            throw new InvalidRequestSpecError(`Not all template variables are present for template`);
        }

        // check all template variables have same length
        const templateParamsPairMatchLength = templateParamsPairMatch[0][1].length;
        const allTemplateVariablesHaveSameLength = templateParamsPairMatch.every(([key, value]) => value.length === templateParamsPairMatchLength);
        if (!allTemplateVariablesHaveSameLength) {
            throw new InvalidRequestSpecError(`Not all template variables have same length for template`);
        }

        const getRequestSpecVariableTemplate = (key: string) => {
            return `\${${key}}`;
        }

        for (let i = 0; i < templateParamsPairMatchLength; i++) {
            const currentTemplateParams: Record<string, string> = {};
            for (const [key, values] of templateParamsPairMatch) {
                currentTemplateParams[key] = values[i];
            }

            const spec: RequestSpec = {
                ...template,
                responseMatches: template.responseMatches ? template.responseMatches.map(m => ({ ...m })) : [],
                responseRedactions: template.responseRedactions ? template.responseRedactions.map(r => ({ ...r })) : [],
            }

            for (const match of spec.responseMatches) {
                for (const [key, value] of Object.entries(currentTemplateParams)) {
                    match.value = match.value.split(getRequestSpecVariableTemplate(key)).join(value);
                }
            }

            for (const redaction of spec.responseRedactions) {
                for (const [key, value] of Object.entries(currentTemplateParams)) {
                    redaction.jsonPath = redaction.jsonPath.split(getRequestSpecVariableTemplate(key)).join(value);
                    redaction.xPath = redaction.xPath.split(getRequestSpecVariableTemplate(key)).join(value);
                    redaction.regex = redaction.regex.split(getRequestSpecVariableTemplate(key)).join(value);
                }
            }

            generatedRequestTemplate.push(spec);
        }
    }

    return generatedRequestTemplate
}

export function takeTemplateParametersFromProofs(proofs?: Proof[]): Record<string, string[]> {
    return takePairsWhereValueIsArray(proofs?.map(it => JSON.parse(it.claimData.context).extractedParameters as Record<string, string>).reduce((acc, it) => ({ ...acc, ...it }), {}));
}

export function takePairsWhereValueIsArray(o: Record<string, string> | undefined): Record<string, string[]> {
    if (!o) return {};
    const pairs: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(o)) {
        if (Array.isArray(value) && value.length) {
            pairs[key] = value;
        } else {
            try {
                const parsedValue = JSON.parse(value);
                if (Array.isArray(parsedValue) && parsedValue.length) {
                    pairs[key] = parsedValue;
                }
            } catch (_) {
                // ignore parsing errors
            }
        }
    }
    return pairs;
}

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
     * The hash value(s) to match. An array represents multiple valid hashes for optional configurations.
     */
    value: string | string[];
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
     * Defaults to true.
     */
    multiple?: boolean;
    /**
     * Template parameter variables for the request spec that should be replaced with real values
     * during dynamic request spec construction.
     */
    templateParams?: string[]
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
