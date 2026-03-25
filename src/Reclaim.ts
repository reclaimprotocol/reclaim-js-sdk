import { type Proof, type Context, RECLAIM_EXTENSION_ACTIONS, ExtensionMessage, ProviderVersionInfo } from './utils/interfaces'
import {
    ProofRequestOptions,
    StartSessionParams,
    ProofPropertiesJSON,
    TemplateData,
    InitSessionResponse,
    ClaimCreationType,
    ModalOptions,
    ReclaimFlowLaunchOptions,
    HttpFormEntry,
    HttpRedirectionMethod,
    type VerifyProofResult,
} from './utils/types'
import { SessionStatus, DeviceType } from './utils/types'
import { ethers } from 'ethers'
import canonicalize from 'canonicalize'
import {
    replaceAll,
    scheduleIntervalEndingTask
} from './utils/helper'
import { constants, setBackendBaseUrl } from './utils/constants'
import {
    SetContextError,
    GetAppCallbackUrlError,
    GetStatusUrlError,
    InitError,
    InvalidParamError,
    ProofNotVerifiedError,
    ProofSubmissionFailedError,
    ProviderFailedError,
    SessionNotStartedError,
    SetParamsError,
    SetSignatureError,
    SignatureGeneratingError,
    SignatureNotFoundError,
    ErrorDuringVerificationError,
    CallbackUrlRequiredError,
    ProofNotValidatedError
} from './utils/errors';
import { validateContext, validateFunctionParams, validateParameters, validateSignature, validateURL, validateModalOptions, validateFunctionParamsWithFn, validateRedirectionMethod, validateRedirectionBody } from './utils/validationUtils'
import { fetchStatusUrl, initSession, updateSession } from './utils/sessionUtils'
import { assertVerifiedProof, createLinkWithTemplateData, getAttestors } from './utils/proofUtils'
import { QRCodeModal } from './utils/modalUtils'
import loggerModule from './utils/logger';
import { getDeviceType, getMobileDeviceType } from './utils/device'
import { canonicalStringify } from './utils/strings'
import { assertValidateProof, VerificationConfig } from './utils/proofValidationUtils'
import { fetchProviderHashRequirementsBy, ProviderHashRequirementsConfig } from './utils/providerUtils'

const logger = loggerModule.logger

const sdkVersion = require('../package.json').version;

/**
 * Verifies one or more Reclaim proofs by validating signatures, verifying witness information,
 * and performing content validation against the expected configuration.
 *
 * See also:
 *
 * * `ReclaimProofRequest.getProviderHashRequirements()` - To get the expected proof hash requirements for a proof request.
 * * `fetchProviderHashRequirementsBy()` - To get the expected proof hash requirements for a provider version by providing providerId and exactProviderVersionString.
 * * `getProviderHashRequirementsFromSpec()` - To get the expected proof hash requirements from a provider spec.
 * * All 3 functions above are alternatives of each other and result from these functions can be directly used as `config` parameter in this function for proof validation.
 *
 * @param proofOrProofs - A single proof object or an array of proof objects to be verified.
 * @param config - Verification configuration that specifies required hashes, allowed extra hashes, or disables content validation.
 * @returns Verification result with `isVerified` and, on success, extracted `data` from each proof
 *
 * @example
 * ```typescript
 * // Fast and simple automatically fetched verification
 * const { isVerified, data } = await verifyProof(proof, request.getProviderVersion());
 * 
 * // Or, by manually providing the details:
 * 
 * const { isVerified, data } = await verifyProof(proof, { 
 *   providerId: "YOUR_PROVIDER_ID", 
 *   // The exact provider version used in the session.
 *   providerVersion: "1.0.0",
 *   // Optionally provide tags. For example, this can be `['ai']` when you want to allow patches from ai.
 *   allowedTags: ["ai"]
 * });
 * 
 * // Validate a single proof against expected hash
 * const { isVerified, data } = await verifyProof(proof, { hashes: ['0xAbC...'] });
 * if (isVerified) {
 *   console.log(data[0].context);
 *   console.log(data[0].extractedParameters);
 * }
 *
 * // Validate multiple proofs
 * const { isVerified, data } = await verifyProof([proof1, proof2], {
 *   hashes: ['0xAbC...', '0xF22..'],
 * });
 * 
 * // Validate multiple proofs and handle optional matches or repeated proofs
 * const { isVerified, data } = await verifyProof([proof1, proof2, sameAsProof2], { 
 *   hashes: [
 *     // A string hash is perfectly equivalent to { value: '...', required: true, multiple: true }
 *     '0xStrict1...', 
 *     // An array 'value' means 1 proof can have any 1 matching hash from this list.
 *     // 'multiple: true' (the default) means any proof matching this hash is allowed to appear multiple times in the list of proofs.
 *     { value: ['0xOpt1..', '0xOpt2..'], multiple: true }, 
 *     // 'required: false' means there can be 0 proofs matching this hash. Such proofs may be optionally present. (Defaults to true).
 *     { value: '0xE33..', required: false }
 *   ],
 * });
 * ```
 */
export async function verifyProof(
    proofOrProofs: Proof | Proof[],
    config: VerificationConfig
): Promise<VerifyProofResult> {
    const proofs = Array.isArray(proofOrProofs) ? proofOrProofs : [proofOrProofs];
    try {
        if (proofs.length === 0) {
            throw new ProofNotValidatedError('No proofs provided');
        }

        if (!config) {
            throw new ProofNotValidatedError('Verification configuration is required for `verifyProof(proof, config)`');
        }

        const attestors = await getAttestors()
        for (const proof of proofs) {
            await assertVerifiedProof(proof, attestors)
        }

        await assertValidateProof(proofs, config);

        return {
            isVerified: true,
            data: proofs.map(extractProofData),
        }
    } catch (error) {
        logger.error('Error in validating proof:', error);
        return {
            isVerified: false,
            data: [],
        }
    }
}

function extractProofData(proof: Proof): VerifyProofResult['data'][number] {
    try {
        const context = JSON.parse(proof.claimData.context)
        const { extractedParameters, ...rest } = context
        return {
            context: rest,
            extractedParameters: extractedParameters ?? {},
        }
    } catch {
        return {
            context: {},
            extractedParameters: {},
        }
    }
}

/**
 * Transforms a Reclaim proof into a format suitable for on-chain verification
 *
 * @param proof - The proof object to transform
 * @returns Object containing claimInfo and signedClaim formatted for blockchain contracts
 *
 * @example
 * ```typescript
 * const { claimInfo, signedClaim } = transformForOnchain(proof);
 * // Use claimInfo and signedClaim with smart contract verification
 * ```
 */
export function transformForOnchain(proof: Proof): { claimInfo: any, signedClaim: any } {
    const claimInfoBuilder = new Map([
        ['context', proof.claimData.context],
        ['parameters', proof.claimData.parameters],
        ['provider', proof.claimData.provider],
    ]);
    const claimInfo = Object.fromEntries(claimInfoBuilder);
    const claimBuilder = new Map<string, number | string>([
        ['epoch', proof.claimData.epoch],
        ['identifier', proof.claimData.identifier],
        ['owner', proof.claimData.owner],
        ['timestampS', proof.claimData.timestampS],
    ]);
    const signedClaim = {
        claim: Object.fromEntries(claimBuilder),
        signatures: proof.signatures,
    };
    return { claimInfo, signedClaim };
}

// create a empty template data object to assign to templateData
const emptyTemplateData: TemplateData = {
    sessionId: '',
    providerId: '',
    applicationId: '',
    signature: '',
    timestamp: '',
    callbackUrl: '',
    context: '',
    parameters: {},
    redirectUrl: '',
    redirectUrlOptions: { method: 'GET' },
    cancelCallbackUrl: '',
    cancelRedirectUrl: '',
    cancelRedirectUrlOptions: { method: 'GET' },
    acceptAiProviders: false,
    sdkVersion: '',
    providerVersion: '',
    resolvedProviderVersion: '',
    jsonProofResponse: false,
    log: false
}
export class ReclaimProofRequest {
    private applicationId: string;
    private signature?: string;
    private appCallbackUrl?: string;
    private sessionId: string;
    private options?: ProofRequestOptions;
    private context: Context = { contextAddress: '0x0', contextMessage: 'sample context', reclaimSessionId: '' };
    private attestationNonce?: string;
    private attestationNonceData?: Context['attestationNonceData'];
    private claimCreationType?: ClaimCreationType = ClaimCreationType.STANDALONE;
    private providerId: string;
    private resolvedProviderVersion?: string;
    private parameters: { [key: string]: string };
    private redirectUrl?: string;
    private redirectUrlOptions?: TemplateData['redirectUrlOptions'];
    private cancelCallbackUrl?: TemplateData['cancelCallbackUrl'];
    private cancelRedirectUrl?: TemplateData['cancelRedirectUrl'];
    private cancelRedirectUrlOptions?: TemplateData['cancelRedirectUrlOptions'];
    private intervals: Map<string, NodeJS.Timer> = new Map();
    private timeStamp: string;
    private sdkVersion: string;
    private jsonProofResponse: boolean = false;
    private lastFailureTime?: number;
    private templateData: TemplateData;
    private extensionID: string = "reclaim-extension";
    private customSharePageUrl?: string;
    private customAppClipUrl?: string;
    private modalOptions?: ModalOptions;
    private modal?: QRCodeModal;
    private readonly FAILURE_TIMEOUT = 30 * 1000; // 30 seconds timeout, can be adjusted

    private constructor(applicationId: string, providerId: string, options?: ProofRequestOptions) {
        this.providerId = providerId;
        this.timeStamp = Date.now().toString();
        this.applicationId = applicationId;
        this.sessionId = "";
        // keep template data as empty object
        this.templateData = emptyTemplateData;
        this.parameters = {};

        if (!options) {
            options = {};
        }

        options.useBrowserExtension = options.useBrowserExtension ?? true;

        if (options?.log) {
            loggerModule.setLogLevel('info');
        } else {
            loggerModule.setLogLevel('silent');
        }

        if (options.useAppClip === undefined) {
            options.useAppClip = false;
        }

        // portalUrl is an alias for customSharePageUrl (portalUrl takes precedence)
        this.customSharePageUrl = options.portalUrl ?? options.customSharePageUrl ?? 'https://portal.reclaimprotocol.org';
        options.customSharePageUrl = this.customSharePageUrl;

        if (options?.envUrl) {
            setBackendBaseUrl(options.envUrl);
        } else if (this.customSharePageUrl) {
            try {
                if (new URL(this.customSharePageUrl).hostname === 'eu.portal.reclaimprotocol.org') {
                    setBackendBaseUrl('https://eu.api.reclaimprotocol.org');
                }
            } catch { /* invalid URL handled by validateURL in init */ }
        }

        if (options.extensionID) {
            this.extensionID = options.extensionID;
        }

        if (options?.customAppClipUrl) {
            this.customAppClipUrl = options.customAppClipUrl;
        }

        this.options = options;
        // Fetch sdk version from package.json
        this.sdkVersion = 'js-' + sdkVersion;
        logger.info(`Initializing client with applicationId: ${this.applicationId}`);
    }

    /**
     * Initializes a new Reclaim proof request instance with automatic signature generation and session creation.
     *
     * @param applicationId - Your Reclaim application ID
     * @param appSecret - Your application secret key for signing requests
     * @param providerId - The ID of the provider to use for proof generation
     * @param options - Optional configuration options for the proof request
     * @returns A fully initialized proof request instance
     * @throws {InitError} When initialization fails due to invalid parameters or session creation errors
     *
     * @example
     * ```typescript
     * const proofRequest = await ReclaimProofRequest.init(
     *   'your-app-id',
     *   'your-app-secret',
     *   'provider-id',
     *   { portalUrl: 'https://portal.reclaimprotocol.org', log: true }
     * );
     * ```
     */
    static async init(applicationId: string, appSecret: string, providerId: string, options?: ProofRequestOptions): Promise<ReclaimProofRequest> {
        try {
            validateFunctionParams([
                { paramName: 'applicationId', input: applicationId, isString: true },
                { paramName: 'providerId', input: providerId, isString: true },
                { paramName: 'appSecret', input: appSecret, isString: true }
            ], 'the constructor')

            // check if options is provided and validate each property of options
            if (options) {
                if (options.acceptAiProviders) {
                    validateFunctionParams([
                        { paramName: 'acceptAiProviders', input: options.acceptAiProviders }
                    ], 'the constructor')
                }
                if (options.providerVersion) {
                    validateFunctionParams([
                        { paramName: 'providerVersion', input: options.providerVersion, isString: true }
                    ], 'the constructor')
                }
                if (options.log) {
                    validateFunctionParams([
                        { paramName: 'log', input: options.log }
                    ], 'the constructor')
                }
                if (options.useAppClip) {
                    validateFunctionParams([
                        { paramName: 'useAppClip', input: options.useAppClip }
                    ], 'the constructor')
                }
                if (options.device) {
                    validateFunctionParams([
                        { paramName: 'device', input: options.device, isString: true }
                    ], 'the constructor')
                }
                if (options.useBrowserExtension) {
                    validateFunctionParams([
                        { paramName: 'useBrowserExtension', input: options.useBrowserExtension }
                    ], 'the constructor')
                }
                if (options.extensionID) {
                    validateFunctionParams([
                        { paramName: 'extensionID', input: options.extensionID, isString: true }
                    ], 'the constructor')
                }
                if (options.envUrl) {
                    validateFunctionParams([
                        { paramName: 'envUrl', input: options.envUrl, isString: true }
                    ], 'the constructor')
                }
                if (options.portalUrl) {
                    validateFunctionParams([
                        { paramName: 'portalUrl', input: options.portalUrl, isString: true }
                    ], 'the constructor')
                }
                if (options.customSharePageUrl) {
                    validateFunctionParams([
                        { paramName: 'customSharePageUrl', input: options.customSharePageUrl, isString: true }
                    ], 'the constructor')
                }
                if (options.customAppClipUrl) {
                    validateFunctionParams([
                        { paramName: 'customAppClipUrl', input: options.customAppClipUrl, isString: true }
                    ], 'the constructor')
                }
                if (options.preferredLocale) {
                    validateFunctionParams([
                        { paramName: 'preferredLocale', input: options.preferredLocale, isString: true }
                    ], 'the constructor');
                    validateFunctionParamsWithFn({
                        paramName: 'preferredLocale', input: options.preferredLocale, isValid: () => {
                            try {
                                Intl.getCanonicalLocales(options.preferredLocale);
                                return true;
                            } catch (error) {
                                logger.info('Failed to canonicalize locale', error);
                                return false;
                            }
                        }
                    }, 'the constructor');
                }
            }

            const proofRequestInstance = new ReclaimProofRequest(applicationId, providerId, options)

            const signature = await proofRequestInstance.generateSignature(appSecret)
            proofRequestInstance.setSignature(signature)

            const data: InitSessionResponse = await initSession(providerId, applicationId, proofRequestInstance.timeStamp, signature, options?.providerVersion);
            proofRequestInstance.sessionId = data.sessionId
            proofRequestInstance.resolvedProviderVersion = data.resolvedProviderVersion
            proofRequestInstance.context.reclaimSessionId = data.sessionId

            if (options?.acceptTeeAttestation) {
                const wallet = new ethers.Wallet(appSecret)
                const nonceData = `${applicationId}:${data.sessionId}:${proofRequestInstance.timeStamp}`
                const nonceMsg = ethers.getBytes(ethers.keccak256(new TextEncoder().encode(nonceData)))
                const nonceSignature = await wallet.signMessage(nonceMsg)

                proofRequestInstance.setAttestationContext(nonceSignature, {
                    applicationId,
                    sessionId: data.sessionId,
                    timestamp: proofRequestInstance.timeStamp
                })
            }

            return proofRequestInstance
        } catch (error) {
            console.error(error);
            logger.info('Failed to initialize ReclaimProofRequest', error as Error);
            throw new InitError('Failed to initialize ReclaimProofRequest', error as Error)
        }
    }

    /**
     * Creates a ReclaimProofRequest instance from a JSON string representation
     *
     * This method deserializes a previously exported proof request (via toJsonString) and reconstructs
     * the instance with all its properties. Useful for recreating requests on the frontend or across different contexts.
     *
     * @param jsonString - JSON string containing the serialized proof request data
     * @returns {Promise<ReclaimProofRequest>} - Reconstructed proof request instance
     * @throws {InvalidParamError} When JSON string is invalid or contains invalid parameters
     *
     * @example
     * ```typescript
     * const jsonString = proofRequest.toJsonString();
     * const reconstructed = await ReclaimProofRequest.fromJsonString(jsonString);
     * // Can also be used with InApp SDK's startVerificationFromJson method
     * ```
     */
    static async fromJsonString(jsonString: string): Promise<ReclaimProofRequest> {
        try {
            const {
                applicationId,
                providerId,
                sessionId,
                context,
                parameters,
                signature,
                redirectUrl,
                redirectUrlOptions,
                cancelCallbackUrl,
                cancelRedirectUrl,
                cancelRedirectUrlOptions,
                timeStamp,
                timestamp,
                appCallbackUrl,
                claimCreationType,
                options,
                sdkVersion,
                jsonProofResponse,
                resolvedProviderVersion,
                modalOptions
            }: ProofPropertiesJSON = JSON.parse(jsonString)

            // Prefer 'timestamp' over 'timeStamp' for backward compatibility (remove in future versions)
            const resolvedTimestamp = timestamp || timeStamp;

            validateFunctionParams([
                { input: applicationId, paramName: 'applicationId', isString: true },
                { input: providerId, paramName: 'providerId', isString: true },
                { input: signature, paramName: 'signature', isString: true },
                { input: sessionId, paramName: 'sessionId', isString: true },
                { input: resolvedTimestamp, paramName: 'timestamp', isString: true },
                { input: sdkVersion, paramName: 'sdkVersion', isString: true },
            ], 'fromJsonString');

            if (modalOptions) {
                validateModalOptions(modalOptions, 'fromJsonString', 'modalOptions.');
            }

            if (redirectUrl) {
                validateURL(redirectUrl, 'fromJsonString');
            }

            if (redirectUrlOptions) {
                validateRedirectionMethod(redirectUrlOptions.method, 'fromJsonString');
                validateRedirectionBody(redirectUrlOptions.body, 'fromJsonString');
            }

            if (appCallbackUrl) {
                validateURL(appCallbackUrl, 'fromJsonString');
            }

            if (cancelRedirectUrl) {
                validateURL(cancelRedirectUrl, 'fromJsonString');
            }

            if (cancelRedirectUrlOptions) {
                validateRedirectionMethod(cancelRedirectUrlOptions.method, 'fromJsonString');
                validateRedirectionBody(cancelRedirectUrlOptions.body, 'fromJsonString');
            }

            if (cancelCallbackUrl) {
                validateURL(cancelCallbackUrl, 'fromJsonString');
            }

            if (context) {
                validateContext(context);
            }

            if (parameters) {
                validateParameters(parameters);
            }

            if (claimCreationType) {
                validateFunctionParams([
                    { input: claimCreationType, paramName: 'claimCreationType' }
                ], 'fromJsonString');
            }

            if (jsonProofResponse !== undefined) {
                validateFunctionParams([
                    { input: jsonProofResponse, paramName: 'jsonProofResponse' }
                ], 'fromJsonString');
            }


            if (options?.providerVersion) {
                validateFunctionParams([
                    { input: options.providerVersion, paramName: 'options.providerVersion', isString: true }
                ], 'fromJsonString');
            }

            if (resolvedProviderVersion) {
                validateFunctionParams([
                    { input: resolvedProviderVersion, paramName: 'resolvedProviderVersion', isString: true }
                ], 'fromJsonString');
            }

            if (options?.preferredLocale) {
                validateFunctionParams([
                    { paramName: 'options.preferredLocale', input: options.preferredLocale, isString: true }
                ], 'fromJsonString');
                validateFunctionParamsWithFn({
                    paramName: 'options.preferredLocale', input: options.preferredLocale, isValid: () => {
                        try {
                            Intl.getCanonicalLocales(options.preferredLocale);
                            return true;
                        } catch (error) {
                            logger.info('Failed to canonicalize locale', error);
                            return false;
                        }
                    }
                }, 'fromJsonString');
            }

            const proofRequestInstance = new ReclaimProofRequest(applicationId, providerId, options);
            proofRequestInstance.sessionId = sessionId;
            proofRequestInstance.context = context;
            proofRequestInstance.setAttestationContext(context?.attestationNonce, context?.attestationNonceData);
            proofRequestInstance.parameters = parameters;
            proofRequestInstance.appCallbackUrl = appCallbackUrl;
            proofRequestInstance.redirectUrl = redirectUrl;
            proofRequestInstance.redirectUrlOptions = redirectUrlOptions;
            proofRequestInstance.timeStamp = resolvedTimestamp!
            proofRequestInstance.signature = signature
            proofRequestInstance.sdkVersion = sdkVersion;
            proofRequestInstance.resolvedProviderVersion = resolvedProviderVersion;
            proofRequestInstance.modalOptions = modalOptions;
            proofRequestInstance.jsonProofResponse = jsonProofResponse ?? false;
            proofRequestInstance.cancelCallbackUrl = cancelCallbackUrl;
            proofRequestInstance.cancelRedirectUrl = cancelRedirectUrl;
            proofRequestInstance.cancelRedirectUrlOptions = cancelRedirectUrlOptions;
            return proofRequestInstance
        } catch (error) {
            logger.info('Failed to parse JSON string in fromJsonString:', error);
            throw new InvalidParamError('Invalid JSON string provided to fromJsonString');
        }
    }

    /**
     * Sets a custom callback URL where proofs will be submitted via HTTP `POST`
     *
     * By default, proofs are sent as HTTP POST with `Content-Type` as `application/x-www-form-urlencoded`.
     * Pass function argument `jsonProofResponse` as `true` to send proofs with `Content-Type` as `application/json`.
     *
     * When a custom callback URL is set, proofs are sent to the custom URL *instead* of the Reclaim backend.
     * Consequently, the startSession `onSuccess` callback will be invoked with an empty array (`[]`)
     * instead of the proof data, as the proof is not available to the SDK in this flow.
     *
     * This verification session's id will be present in `X-Reclaim-Session-Id` header of the request.
     * The request URL will contain query param `allowAiWitness` with value `true` when AI Witness should be allowed by handler of the request.
     *
     * Note: InApp SDKs are unaffected by this property as they do not handle proof submission.
     *
     * @param url - The URL where proofs should be submitted via HTTP `POST`
     * @param jsonProofResponse - Optional. Set to true to submit proofs as `application/json`. Defaults to false
     * @throws {InvalidParamError} When URL is invalid
     *
     * @example
     * ```typescript
     * proofRequest.setAppCallbackUrl('https://your-backend.com/callback');
     * // Or with JSON format
     * proofRequest.setAppCallbackUrl('https://your-backend.com/callback', true);
     * ```
     */
    setAppCallbackUrl(url: string, jsonProofResponse?: boolean): void {
        validateURL(url, 'setAppCallbackUrl')
        this.appCallbackUrl = url
        this.jsonProofResponse = jsonProofResponse ?? false
    }

    /**
     * Sets a redirect URL where users will be redirected after successfully acquiring and submitting proof
     *
     * @param url - The URL where users should be redirected after successful proof generation
     * @param method - The redirection method that should be used for redirection. Allowed options: `GET`, and `POST`.
     * `POST` form redirection is only supported in In-Browser SDK.
     * @param body - List of name-value pairs to be sent as the body of the form request.
     * `When `method` is set to `POST`, `body` will be sent with 'application/x-www-form-urlencoded' content type.
     * When `method` is set to `GET`, if `body` is set then `body` will be sent as query parameters.
     * Sending `body` on redirection is only supported in In-Browser SDK.
     *
     * @throws {InvalidParamError} When URL is invalid
     *
     * @example
     * ```typescript
     * proofRequest.setRedirectUrl('https://your-app.com/success');
     * ```
     */
    setRedirectUrl(url: string, method: HttpRedirectionMethod = 'GET', body?: HttpFormEntry[] | undefined): void {
        validateURL(url, 'setRedirectUrl');
        validateRedirectionMethod(method, 'setRedirectUrl');
        validateRedirectionBody(body, 'setRedirectUrl');

        this.redirectUrl = url;
        this.redirectUrlOptions = { method: method || 'GET', body: body }
    }

    /**
     * Sets a custom callback URL where errors that abort the verification process will be submitted via HTTP POST
     *
     * Errors will be HTTP POSTed with `header 'Content-Type': 'application/json'`.
     * When a custom error callback URL is set, Reclaim will no longer receive errors upon submission,
     * and listeners on the startSession method will not be triggered. Your application must
     * coordinate with your backend to receive errors.
     *
     * This verification session's id will be present in `X-Reclaim-Session-Id` header of the request.
     *
     * Following is the data format which is sent as an HTTP POST request to the url with `Content-Type: application/json`:

     * ```json
     * {
     *  "type": "string", // Name of the exception
     *  "message": "string",
     *  "sessionId": "string",
     *   // context as canonicalized json string
     *   "context": "string",
     *   // Other fields with more details about error may be present
     *   // [key: any]: any
     * }
     * ```
     *
     * For more details about response format, check out [official documentation of Error Callback URL](https://docs.reclaimprotocol.org/js-sdk/preparing-request#cancel-callback).
     *
     * @param url - The URL where errors should be submitted via HTTP POST
     * @throws {InvalidParamError} When URL is invalid
     *
     * @example
     * ```typescript
     * proofRequest.setCancelCallbackUrl('https://your-backend.com/error-callback');
     * ```
     *
     * @since 4.8.1
     *
     */
    setCancelCallbackUrl(url: string): void {
        validateURL(url, 'setCancelCallbackUrl')
        this.cancelCallbackUrl = url
    }

    /**
     * Sets an error redirect URL where users will be redirected after an error which aborts the verification process
     *
     * @param url - The URL where users should be redirected after an error which aborts the verification process
     * @param method - The redirection method that should be used for redirection. Allowed options: `GET`, and `POST`.
     * `POST` form redirection is only supported in In-Browser SDK.
     * @param body - List of name-value pairs to be sent as the body of the form request.
     * When `method` is set to `POST`, `body` will be sent with 'application/x-www-form-urlencoded' content type.
     * When `method` is set to `GET`, if `body` is set then `body` will be sent as query parameters.
     * Sending `body` on redirection is only supported in In-Browser SDK.
     * @throws {InvalidParamError} When URL is invalid
     *
     * @example
     * ```typescript
     * proofRequest.setCancelRedirectUrl('https://your-app.com/error');
     * ```
     *
     * @since 4.10.0
     *
     */
    setCancelRedirectUrl(url: string, method: HttpRedirectionMethod = 'GET', body?: HttpFormEntry[] | undefined): void {
        validateURL(url, 'setCancelRedirectUrl');
        validateRedirectionMethod(method, 'setCancelRedirectUrl');
        validateRedirectionBody(body, 'setCancelRedirectUrl');

        this.cancelRedirectUrl = url;
        this.cancelRedirectUrlOptions = { method: method || 'GET', body: body }
    }

    /**
     * Sets the claim creation type for the proof request
     *
     * @param claimCreationType - The type of claim creation (e.g., STANDALONE)
     *
     * @example
     * ```typescript
     * proofRequest.setClaimCreationType(ClaimCreationType.STANDALONE);
     * ```
     */
    setClaimCreationType(claimCreationType: ClaimCreationType): void {
        this.claimCreationType = claimCreationType;
    }

    /**
     * Sets custom options for the QR code modal display
     *
     * @param options - Modal configuration options including title, description, theme, etc.
     * @throws {SetParamsError} When modal options are invalid
     *
     * @example
     * ```typescript
     * proofRequest.setModalOptions({
     *   title: 'Scan QR Code',
     *   description: 'Scan with your mobile device',
     *   darkTheme: true
     * });
     * ```
     */
    setModalOptions(options: ModalOptions): void {
        try {
            // Validate modal options
            validateModalOptions(options, 'setModalOptions');

            this.modalOptions = { ...this.modalOptions, ...options };
            logger.info('Modal options set successfully');
        } catch (error) {
            logger.info('Error setting modal options:', error);
            throw new SetParamsError('Error setting modal options', error as Error);
        }
    }

    /**
     * Sets additional context data to be stored with the claim
     *
     * This allows you to associate custom JSON serializable data with the proof claim.
     * The context can be retrieved and validated when verifying the proof.
     *
     * Also see [setContext] which is an alternate way to set context that has an address & message.
     *
     * [setContext] and [setJsonContext] overwrite each other. Each call replaces the existing context.
     *
     * @param context - Any additional data you want to store with the claim. Should be serializable to a JSON string.
     * @throws {SetContextError} When context parameters are invalid
     *
     * @example
     * ```typescript
     * proofRequest.setJsonContext({foo: 'bar'});
     * ```
     */
    setJsonContext(context: Record<string, any>) {
        try {
            validateFunctionParams([
                { input: context, paramName: 'context', isString: false }
            ], 'setJsonContext');
            // ensure context is canonically json serializable
            this.context = JSON.parse(canonicalStringify({ ...context, reclaimSessionId: this.sessionId }));
            this.applyAttestationContext();
        } catch (error) {
            logger.info("Error setting context", error)
            throw new SetContextError("Error setting context", error as Error)
        }
    }

    /**
     * Sets additional context data to be stored with the claim
     *
     * This allows you to associate custom data (address and message) with the proof claim.
     * The context can be retrieved and validated when verifying the proof.
     *
     * Also see [setJsonContext] which is an alternate way to set context that allows for custom JSON serializable data.
     *
     * [setContext] and [setJsonContext] overwrite each other. Each call replaces the existing context.
     *
     * @param address - Context address identifier
     * @param message - Additional data to associate with the address
     * @throws {SetContextError} When context parameters are invalid
     *
     * @example
     * ```typescript
     * proofRequest.setContext('0x1234...', 'User verification for premium access');
     * ```
     */
    setContext(address: string, message: string): void {
        try {
            validateFunctionParams([
                { input: address, paramName: 'address', isString: true },
                { input: message, paramName: 'message', isString: true }
            ], 'setContext');
            this.context = { contextAddress: address, contextMessage: message, reclaimSessionId: this.sessionId };
            this.applyAttestationContext();
        } catch (error) {
            logger.info("Error setting context", error)
            throw new SetContextError("Error setting context", error as Error)
        }
    }

    /**
     * @deprecated use setContext instead
     *
     * @param address
     * @param message additional data you want associated with the [address]
     */
    addContext(address: string, message: string): void {
        this.setContext(address, message);
    }

    /**
     * Sets provider-specific parameters for the proof request
     *
     * These parameters are passed to the provider and may include configuration options,
     * filters, or other provider-specific settings required for proof generation.
     *
     * @param params - Key-value pairs of parameters to set
     * @throws {SetParamsError} When parameters are invalid
     *
     * @example
     * ```typescript
     * proofRequest.setParams({
     *   minFollowers: '1000',
     *   platform: 'twitter'
     * });
     * ```
     */
    setParams(params: { [key: string]: string }): void {
        try {
            validateParameters(params);
            this.parameters = { ...this.parameters, ...params }
        } catch (error) {
            logger.info('Error Setting Params:', error);
            throw new SetParamsError("Error setting params", error as Error)
        }
    }

    /**
     * Returns the currently configured app callback URL
     *
     * If no custom callback URL was set via setAppCallbackUrl(), this returns the default
     * Reclaim service callback URL with the current session ID.
     *
     * @returns The callback URL where proofs will be submitted
     * @throws {GetAppCallbackUrlError} When unable to retrieve the callback URL
     *
     * @example
     * ```typescript
     * const callbackUrl = proofRequest.getAppCallbackUrl();
     * console.log('Proofs will be sent to:', callbackUrl);
     * ```
     */
    getAppCallbackUrl(): string {
        try {
            validateFunctionParams([{ input: this.sessionId, paramName: 'sessionId', isString: true }], 'getAppCallbackUrl');
            return this.appCallbackUrl || `${constants.DEFAULT_RECLAIM_CALLBACK_URL}${this.sessionId}`
        } catch (error) {
            logger.info("Error getting app callback url", error)
            throw new GetAppCallbackUrlError("Error getting app callback url", error as Error)
        }
    }

    /**
     * Returns the currently configured cancel callback URL
     *
     * If no custom cancel callback URL was set via setCancelCallbackUrl(), this returns the default
     * Reclaim service cancel callback URL with the current session ID.
     *
     * @returns The cancel callback URL where proofs will be submitted
     * @throws {GetAppCallbackUrlError} When unable to retrieve the cancel callback URL
     *
     * @example
     * ```typescript
     * const callbackUrl = proofRequest.getCancelCallbackUrl();
     * console.log('Errors will be sent to:', callbackUrl);
     * ```
     */
    getCancelCallbackUrl(): string {
        try {
            validateFunctionParams([{ input: this.sessionId, paramName: 'sessionId', isString: true }], 'getCancelCallbackUrl');
            return this.cancelCallbackUrl || `${constants.DEFAULT_RECLAIM_CANCEL_CALLBACK_URL}${this.sessionId}`
        } catch (error) {
            logger.info("Error getting cancel callback url", error)
            throw new GetAppCallbackUrlError("Error getting cancel callback url", error as Error)
        }
    }

    /**
     * Returns the status URL for monitoring the current session
     *
     * This URL can be used to check the status of the proof request session.
     *
     * @returns The status monitoring URL for the current session
     * @throws {GetStatusUrlError} When unable to retrieve the status URL
     *
     * @example
     * ```typescript
     * const statusUrl = proofRequest.getStatusUrl();
     * // Use this URL to poll for session status updates
     * ```
     */
    getStatusUrl(): string {
        try {
            validateFunctionParams([{ input: this.sessionId, paramName: 'sessionId', isString: true }], 'getStatusUrl');
            return `${constants.DEFAULT_RECLAIM_STATUS_URL}${this.sessionId}`
        } catch (error) {
            logger.info("Error fetching Status Url", error)
            throw new GetStatusUrlError("Error fetching status url", error as Error)
        }
    }

    /**
     * Returns the session ID associated with this proof request
     *
     * The session ID is automatically generated during initialization and uniquely
     * identifies this proof request session.
     *
     * @returns The session ID string
     * @throws {SessionNotStartedError} When session ID is not set
     *
     * @example
     * ```typescript
     * const sessionId = proofRequest.getSessionId();
     * console.log('Session ID:', sessionId);
     * ```
     */
    getSessionId(): string {
        if (!this.sessionId) {
            throw new SessionNotStartedError("SessionId is not set");
        }
        return this.sessionId;
    }

    // Private helper methods
    private setSignature(signature: string): void {
        try {
            validateFunctionParams([{ input: signature, paramName: 'signature', isString: true }], 'setSignature');
            this.signature = signature;
            logger.info(`Signature set successfully for applicationId: ${this.applicationId}`);
        } catch (error) {
            logger.info("Error setting signature", error)
            throw new SetSignatureError("Error setting signature", error as Error)
        }
    }

    private async generateSignature(applicationSecret: string): Promise<string> {
        try {
            const wallet = new ethers.Wallet(applicationSecret)
            const canonicalData = canonicalize({ providerId: this.providerId, timestamp: this.timeStamp });


            if (!canonicalData) {
                throw new SignatureGeneratingError('Failed to canonicalize data for signing.');
            }

            const messageHash = ethers.keccak256(new TextEncoder().encode(canonicalData));

            return await wallet.signMessage(ethers.getBytes(messageHash));
        } catch (err) {
            logger.info(`Error generating proof request for applicationId: ${this.applicationId}, providerId: ${this.providerId}, timeStamp: ${this.timeStamp}`);
            throw new SignatureGeneratingError(`Error generating signature for applicationId: ${this.applicationId}`)
        }
    }

    private clearInterval(): void {
        if (this.sessionId && this.intervals.has(this.sessionId)) {
            clearInterval(this.intervals.get(this.sessionId) as NodeJS.Timeout)
            this.intervals.delete(this.sessionId)
        }
    }

    private setAttestationContext(nonce?: string, data?: Context['attestationNonceData']): void {
        if (!nonce || !data) {
            return;
        }
        this.attestationNonce = nonce;
        this.attestationNonceData = data;
        this.applyAttestationContext();
    }

    private applyAttestationContext(): void {
        if (!this.attestationNonce || !this.attestationNonceData) {
            return;
        }
        this.context = {
            ...this.context,
            attestationNonce: this.attestationNonce,
            attestationNonceData: this.attestationNonceData
        };
    }

    private buildSharePageUrl(template: string): string {
        return `https://share.reclaimprotocol.org/verify/?template=${template}`;
    }

    private buildPortalUrl(template: string): string {
        const portalUrl = this.customSharePageUrl ?? 'https://portal.reclaimprotocol.org';
        return `${portalUrl}/?template=${template}`;
    }

    /**
     * Exports the Reclaim proof verification request as a JSON string
     *
     * This serialized format can be sent to the frontend to recreate this request using
     * ReclaimProofRequest.fromJsonString() or any InApp SDK's startVerificationFromJson()
     * method to initiate the verification journey.
     *
     * @returns JSON string representation of the proof request. Note: The JSON includes both `timestamp` and `timeStamp` (deprecated) for backward compatibility.
     *
     * @example
     * ```typescript
     * const jsonString = proofRequest.toJsonString();
     * // Send to frontend or store for later use
     * // Can be reconstructed with: ReclaimProofRequest.fromJsonString(jsonString)
     * ```
     */
    toJsonString(): string {
        return JSON.stringify({
            applicationId: this.applicationId,
            providerId: this.providerId,
            sessionId: this.sessionId,
            context: this.context,
            appCallbackUrl: this.appCallbackUrl,
            claimCreationType: this.claimCreationType,
            parameters: this.parameters,
            signature: this.signature,
            redirectUrl: this.redirectUrl,
            redirectUrlOptions: this.redirectUrlOptions,
            cancelCallbackUrl: this.cancelCallbackUrl,
            cancelRedirectUrl: this.cancelRedirectUrl,
            cancelRedirectUrlOptions: this.cancelRedirectUrlOptions,
            timestamp: this.timeStamp, // New field with correct spelling
            timeStamp: this.timeStamp, // @deprecated: Remove in future versions
            options: this.options,
            sdkVersion: this.sdkVersion,
            jsonProofResponse: this.jsonProofResponse,
            resolvedProviderVersion: this.resolvedProviderVersion ?? '',
            modalOptions: this.modalOptions ? {
                title: this.modalOptions.title,
                description: this.modalOptions.description,
                extensionUrl: this.modalOptions.extensionUrl,
                darkTheme: this.modalOptions.darkTheme,
                modalPopupTimer: this.modalOptions.modalPopupTimer,
                showExtensionInstallButton: this.modalOptions.showExtensionInstallButton
                // onClose is intentionally excluded as functions cannot be serialized
            } : undefined
        })
    }

    /**
     * Validates signature and returns template data
     * @returns
     */
    private getTemplateData = (): TemplateData => {
        if (!this.signature) {
            throw new SignatureNotFoundError('Signature is not set.')
        }

        // When using a non-default regional portal, a custom callback URL is required
        const defaultHosts = ['share.reclaimprotocol.org', 'portal.reclaimprotocol.org'];
        if (this.customSharePageUrl) {
            try {
                const sharePageHost = new URL(this.customSharePageUrl).hostname;
                if (!defaultHosts.includes(sharePageHost) && !this.appCallbackUrl) {
                    throw new CallbackUrlRequiredError(
                        'A custom callback URL is required when using a customSharePage url'
                    );
                }
            } catch (e) {
                if (e instanceof CallbackUrlRequiredError) throw e;
                // If URL parsing fails, skip this check — URL validation elsewhere will catch it
            }
        }

        validateSignature(this.providerId, this.signature, this.applicationId, this.timeStamp)
        const templateData: TemplateData = {
            sessionId: this.sessionId,
            providerId: this.providerId,
            applicationId: this.applicationId,
            signature: this.signature,
            timestamp: this.timeStamp,
            callbackUrl: this.getAppCallbackUrl(),
            context: canonicalStringify(this.context),
            providerVersion: this.options?.providerVersion ?? '',
            resolvedProviderVersion: this.resolvedProviderVersion ?? '',
            parameters: this.parameters,
            redirectUrl: this.redirectUrl ?? '',
            redirectUrlOptions: this.redirectUrlOptions,
            cancelCallbackUrl: this.getCancelCallbackUrl(),
            cancelRedirectUrl: this.cancelRedirectUrl,
            cancelRedirectUrlOptions: this.cancelRedirectUrlOptions,
            acceptAiProviders: this.options?.acceptAiProviders ?? false,
            sdkVersion: this.sdkVersion,
            jsonProofResponse: this.jsonProofResponse,
            log: this.options?.log ?? false,
            canAutoSubmit: this.options?.canAutoSubmit ?? true,
            metadata: this.options?.metadata,
            preferredLocale: this.options?.preferredLocale,
        }

        return templateData;
    }

    /**
     * Generates and returns the request URL for proof verification.
     *
     * Defaults to portal mode. Pass `{ verificationMode: 'app' }` for native app flow URLs.
     *
     * - Portal mode (default): returns portal URL on all platforms
     * - App mode: returns share page URL on all platforms
     * - App mode + `useAppClip: true` on iOS: returns App Clip URL instead
     *
     * Falls back to `launchOptions` set at init time if not passed at call time.
     *
     * @param launchOptions - Optional launch configuration to override default behavior
     * @returns Promise<string> - The generated request URL
     * @throws {SignatureNotFoundError} When signature is not set
     *
     * @example
     * ```typescript
     * // Portal URL (default)
     * const url = await proofRequest.getRequestUrl();
     *
     * // Native app flow URL
     * const url = await proofRequest.getRequestUrl({ verificationMode: 'app' });
     * ```
     */
    async getRequestUrl(launchOptions?: ReclaimFlowLaunchOptions): Promise<string> {
        const options = launchOptions || this.options?.launchOptions || {};
        const mode = options.verificationMode ?? 'portal';

        logger.info('Creating Request Url')
        if (!this.signature) {
            throw new SignatureNotFoundError('Signature is not set.')
        }

        try {
            const templateData = this.getTemplateData()
            await updateSession(this.sessionId, SessionStatus.SESSION_STARTED)

            if (mode === 'app') {
                let template = encodeURIComponent(JSON.stringify(templateData));
                template = replaceAll(template, '(', '%28');
                template = replaceAll(template, ')', '%29');

                // App Clip only if useAppClip is true and iOS
                if (this.options?.useAppClip && getDeviceType() === DeviceType.MOBILE && getMobileDeviceType() === DeviceType.IOS) {
                    const appClipUrl = this.customAppClipUrl ? `${this.customAppClipUrl}&template=${template}` : `https://appclip.apple.com/id?p=org.reclaimprotocol.app.clip&template=${template}`;
                    logger.info('App Clip Url created successfully: ' + appClipUrl);
                    return appClipUrl;
                }

                // Share page for all other cases in app mode
                const sharePageUrl = await createLinkWithTemplateData(templateData, 'https://share.reclaimprotocol.org/verify');
                logger.info('Share page Url created successfully: ' + sharePageUrl);
                return sharePageUrl;
            }

            // Portal mode (default)
            const link = await createLinkWithTemplateData(templateData, this.customSharePageUrl)
            logger.info('Request Url created successfully: ' + link);
            return link;
        } catch (error) {
            logger.info('Error creating Request Url:', error)
            throw error
        }
    }

    /**
     * Triggers the appropriate Reclaim verification flow based on device type and configuration.
     *
     * Defaults to portal mode (remote browser verification). Pass `{ verificationMode: 'app' }`
     * for native app flow via the share page.
     *
     * - Desktop: browser extension takes priority in both modes
     * - Desktop portal mode (no extension): opens portal in new tab
     * - Desktop app mode (no extension): shows QR code modal with share page URL
     * - Mobile portal mode: opens portal in new tab
     * - Mobile app mode: opens share page (or App Clip on iOS if `useAppClip` is `true`)
     *
     * @param launchOptions - Optional launch configuration to override default behavior
     * @returns Promise<void>
     * @throws {SignatureNotFoundError} When signature is not set
     *
     * @example
     * ```typescript
     * // Portal flow (default)
     * await proofRequest.triggerReclaimFlow();
     *
     * // Native app flow
     * await proofRequest.triggerReclaimFlow({ verificationMode: 'app' });
     *
     * // App Clip on iOS (requires useAppClip: true at init)
     * const request = await ReclaimProofRequest.init(APP_ID, SECRET, PROVIDER, { useAppClip: true });
     * await request.triggerReclaimFlow({ verificationMode: 'app' });
     *
     * // Can also set verificationMode at init time via launchOptions
     * const request = await ReclaimProofRequest.init(APP_ID, SECRET, PROVIDER, {
     *   launchOptions: { verificationMode: 'app' }
     * });
     * await request.triggerReclaimFlow(); // uses 'app' mode from init
     * ```
     */
    async triggerReclaimFlow(launchOptions?: ReclaimFlowLaunchOptions): Promise<void> {
        const options = launchOptions || this.options?.launchOptions || {};
        const mode = options.verificationMode ?? 'portal';

        if (!this.signature) {
            throw new SignatureNotFoundError('Signature is not set.')
        }

        try {
            const templateData = this.getTemplateData()

            this.templateData = templateData;

            logger.info(`Triggering Reclaim flow (mode: ${mode})`);

            const deviceType = getDeviceType();
            updateSession(this.sessionId, SessionStatus.SESSION_STARTED)

            if (deviceType === DeviceType.DESKTOP) {
                // Extension has priority on desktop regardless of mode
                const extensionAvailable = await this.isBrowserExtensionAvailable();
                if (this.options?.useBrowserExtension && extensionAvailable) {
                    logger.info('Triggering browser extension flow');
                    this.triggerBrowserExtensionFlow();
                    return;
                }

                if (mode === 'portal') {
                    // Portal mode: open in new tab
                    const portalUrl = this.customSharePageUrl ?? 'https://portal.reclaimprotocol.org';
                    const link = await createLinkWithTemplateData(templateData, portalUrl);
                    logger.info('Opening portal in new tab: ' + link);
                    window.open(link, '_blank');
                } else {
                    // App mode: QR code modal with share page URL
                    logger.info('Showing QR code modal with share page URL');
                    await this.showQRCodeModal('app');
                }
            } else if (deviceType === DeviceType.MOBILE) {
                if (mode === 'app') {
                    // App Clip only if useAppClip is true and iOS
                    if (this.options?.useAppClip && getMobileDeviceType() === DeviceType.IOS) {
                        logger.info('Redirecting to iOS app clip');
                        this.redirectToAppClip();
                    } else {
                        // Share page for Android and iOS without useAppClip
                        logger.info('Redirecting to share page');
                        await this.redirectToInstantApp(options);
                    }
                } else {
                    // Portal mode on mobile: open portal URL in new tab
                    const portalUrl = this.customSharePageUrl ?? 'https://portal.reclaimprotocol.org';
                    const link = await createLinkWithTemplateData(templateData, portalUrl);
                    logger.info('Opening portal in new tab: ' + link);
                    window.open(link, '_blank');
                }
            }
        } catch (error) {
            logger.info('Error triggering Reclaim flow:', error);
            throw error;
        }
    }


    /**
     * Checks if the Reclaim browser extension is installed and available
     *
     * This method attempts to communicate with the browser extension to verify its availability.
     * It uses a timeout mechanism to quickly determine if the extension responds.
     *
     * @param timeout - Timeout in milliseconds to wait for extension response. Defaults to 200ms
     * @returns Promise<boolean> - True if extension is available, false otherwise
     *
     * @example
     * ```typescript
     * const hasExtension = await proofRequest.isBrowserExtensionAvailable();
     * if (hasExtension) {
     *   console.log('Browser extension is installed');
     * }
     * ```
     */
    async isBrowserExtensionAvailable(timeout = 200): Promise<boolean> {
        try {
            return new Promise<boolean>((resolve) => {
                const messageId = `reclaim-check-${Date.now()}`;

                const timeoutId = setTimeout(() => {
                    window.removeEventListener('message', messageListener);
                    resolve(false);
                }, timeout);

                const messageListener = (event: MessageEvent) => {
                    if (event.data?.action === RECLAIM_EXTENSION_ACTIONS.EXTENSION_RESPONSE &&
                        event.data?.messageId === messageId) {
                        clearTimeout(timeoutId);
                        window.removeEventListener('message', messageListener);
                        resolve(!!event.data.installed);
                    }
                };

                window.addEventListener('message', messageListener);
                const message: ExtensionMessage = {
                    action: RECLAIM_EXTENSION_ACTIONS.CHECK_EXTENSION,
                    extensionID: this.extensionID,
                    messageId: messageId
                }
                window.postMessage(message, '*');
            });
        } catch (error) {
            logger.info('Error checking Reclaim extension installed:', error);
            return false;
        }
    }

    private triggerBrowserExtensionFlow(): void {
        const message: ExtensionMessage = {
            action: RECLAIM_EXTENSION_ACTIONS.START_VERIFICATION,
            messageId: this.sessionId,
            data: this.templateData,
            extensionID: this.extensionID
        }
        window.postMessage(message, '*');
        logger.info('Browser extension flow triggered');
    }

    private async showQRCodeModal(mode: 'portal' | 'app' = 'portal'): Promise<void> {
        try {
            const url = mode === 'app' ? 'https://share.reclaimprotocol.org/verify' : this.customSharePageUrl;
            const requestUrl = await createLinkWithTemplateData(this.templateData, url);
            this.modal = new QRCodeModal(this.modalOptions);
            await this.modal.show(requestUrl);
        } catch (error) {
            logger.info('Error showing QR code modal:', error);
            throw error;
        }
    }

    private async redirectToInstantApp(options: ReclaimFlowLaunchOptions): Promise<void> {
        try {
            let template = encodeURIComponent(JSON.stringify(this.templateData));
            template = replaceAll(template, '(', '%28');
            template = replaceAll(template, ')', '%29');

            let instantAppUrl = this.buildSharePageUrl(template);
            logger.info('Redirecting to Android instant app: ' + instantAppUrl);

            const isDeferredDeeplinksFlowEnabled = options.canUseDeferredDeepLinksFlow ?? false;

            if (isDeferredDeeplinksFlowEnabled) {
                instantAppUrl = instantAppUrl.replace("/verifier", "/link");

                // Construct Android intent deep link
                const deepLink = `intent://details?id=org.reclaimprotocol.app&url=${encodeURIComponent(
                    instantAppUrl
                )}&template=${template}#Intent;scheme=market;action=android.intent.action.VIEW;package=com.android.vending;end;`;

                try {
                    const requestUrl = instantAppUrl;

                    let appInstalled = false;
                    let timeoutId: string | number | NodeJS.Timeout | undefined;

                    // Create hidden iframe to test deep link
                    const iframe = document.createElement("iframe");
                    iframe.style.display = "none";
                    iframe.style.width = "1px";
                    iframe.style.height = "1px";
                    document.body.appendChild(iframe);

                    // Function to clean up
                    const cleanup = () => {
                        if (iframe.parentNode) {
                            document.body.removeChild(iframe);
                        }
                        if (timeoutId) {
                            clearTimeout(timeoutId);
                        }
                    };

                    // If page becomes hidden, app opened successfully
                    const onVisibilityChange = () => {
                        if (document.hidden) {
                            appInstalled = true;
                            cleanup();
                            // Open in main window since app is installed
                            window.location.href = deepLink;
                        }
                    };

                    // Listen for visibility change
                    document.addEventListener("visibilitychange", onVisibilityChange, { once: true });

                    // Test reclaimverifier deep link in iframe
                    iframe.src = deepLink.replace('intent:', 'reclaimverifier:');

                    // After timeout, assume app not installed
                    timeoutId = setTimeout(() => {
                        document.removeEventListener("visibilitychange", onVisibilityChange);
                        cleanup();

                        if (!appInstalled) {
                            // App not installed - redirect to the store page to install the app
                            window.navigator.clipboard.writeText(requestUrl).catch(() => {
                                console.error("We can't access the clipboard. Please copy this link and open Reclaim Verifier app.");
                            });
                            window.location.href = deepLink;
                        }
                    }, 1500);
                } catch (e) {
                    // Final fallback → verifier
                    window.location.href = instantAppUrl;
                }
                return;
            }

            // Redirect to instant app
            window.location.href = instantAppUrl;
        } catch (error) {
            logger.info('Error redirecting to instant app:', error);
            throw error;
        }
    }

    private redirectToAppClip(): void {
        try {
            let template = encodeURIComponent(JSON.stringify(this.templateData));
            template = replaceAll(template, '(', '%28');
            template = replaceAll(template, ')', '%29');

            const appClipUrl = this.customAppClipUrl ? `${this.customAppClipUrl}&template=${template}` : `https://appclip.apple.com/id?p=org.reclaimprotocol.app.clip&template=${template}`;
            logger.info('Redirecting to iOS app clip: ' + appClipUrl);
            const verifierUrl = `https://share.reclaimprotocol.org/verifier/?template=${template}`;

            // Redirect to app clip
            window.location.href = appClipUrl;

            setTimeout(() => {
                window.location.href = verifierUrl;
                // 5 second delay to allow app clip to launch
            }, 5 * 1000);
        } catch (error) {
            logger.info('Error redirecting to app clip:', error);
            throw error;
        }
    }

    /**
     * Returns the provider id and exact version of the provider that was used in the verification session of this request. 
     * 
     * This can be provided as a config parameter to the `verifyProof` function to verify the proof.
     * 
     * See also:
     * * `verifyProof()` - Verifies a proof against the expected provider configuration.
     * * `getProviderHashRequirements()` - An alternative of this function to get the expected hashes for a provider version by providing providerId and exactProviderVersionString. The result can be provided in verifyProof function's `config` parameter for proof validation.
     * * `getProviderHashRequirementsFromSpec()` - An alternative of this function to get the expected hashes from a provider spec. The result can be provided in verifyProof function's `config` parameter for proof validation.
     */
    public getProviderVersion(): ProviderVersionInfo {
        // This should be exact version and not a version constraint/expression. This cannot be blank.
        const exactProviderVersionString = this.resolvedProviderVersion ?? '';
        return {
            providerId: this.providerId,
            providerVersion: exactProviderVersionString,
            allowedTags: this.options?.acceptAiProviders ? ['ai'] : [],
        }
    }

    /**
     * Fetches the provider config that was used for this session and returns the hash requirements
     * 
     * See also:
     * * `verifyProof()` - Verifies a proof against the expected provider configuration.
     * * `fetchProviderHashRequirementsBy()` - An alternative of this function to get the expected hashes for a provider version by providing providerId and exactProviderVersionString. The result can be provided in verifyProof function's `config` parameter for proof validation.
     * * `getProviderHashRequirementsFromSpec()` - An alternative of this function to get the expected hashes from a provider spec. The result can be provided in verifyProof function's `config` parameter for proof validation.
     *
     * @returns A promise that resolves to a `ProviderHashRequirementsConfig` or `ProviderHashRequirementsConfig[]`
     */
    getProviderHashRequirements(proofs: Proof[], allowedTags: string[] | null | undefined): Promise<ProviderHashRequirementsConfig[]> {
        return fetchProviderHashRequirementsBy(this.providerId, this.resolvedProviderVersion ?? '', allowedTags, proofs);
    }

    /**
     * Starts the proof request session and monitors for proof submission
     *
     * This method begins polling the session status to detect when
     * a proof has been generated and submitted. It handles both default Reclaim callbacks
     * and custom callback URLs.
     *
     * For default callbacks: Verifies proofs automatically and passes them to onSuccess
     * For custom callbacks: Monitors submission status and notifies via onSuccess when complete.
     * In the custom-callback flow (where the SDK submits a proof to a provided callback URL),
     * onSuccess may be invoked with an empty array (onSuccess([])) when no proof is available
     * (this happens when a callback is set using setAppCallbackUrl where proof is sent to callback instead of reclaim backend).
     *
     * Please refer to the OnSuccess type signature ((proof?: Proof | Proof[]) => void)
     * and the startSession function source for more details.
     *
     * > [!TIP]
     * > **Best Practice:** When using `setAppCallbackUrl` and/or `setCancelCallbackUrl`, your backend receives the proof or cancellation details directly. We recommend your backend notifies the frontend (e.g. via WebSockets, SSE, or polling) to stop the verification process and handle the appropriate success/failure action. Do not rely completely on `startSession` callbacks on the frontend when using these backend callbacks.
     *
     * @param onSuccess - Callback function invoked when proof is successfully submitted
     * @param onError - Callback function invoked when an error occurs during the session
     * @returns Promise<void>
     * @throws {SessionNotStartedError} When session ID is not defined
     * @throws {ProofNotVerifiedError} When proof verification fails (default callback only)
     * @throws {ProofSubmissionFailedError} When proof submission fails (custom callback only)
     * @throws {ProviderFailedError} When proof generation fails with timeout
     *
     * @example
     * ```typescript
     * await proofRequest.startSession({
     *   onSuccess: (proof) => {
     *     console.log('Proof received:', proof);
     *   },
     *   onError: (error) => {
     *     console.error('Error:', error);
     *   }
     * });
     * ```
     */
    async startSession({ onSuccess, onError, verificationConfig }: StartSessionParams): Promise<void> {
        if (!this.sessionId) {
            const message = "Session can't be started due to undefined value of sessionId";
            logger.info(message);
            throw new SessionNotStartedError(message);
        }

        logger.info('Starting session');

        const sessionUpdatePollingInterval = 3 * 1000;
        const interval = setInterval(async () => {
            try {
                const statusUrlResponse = await fetchStatusUrl(this.sessionId);

                if (!statusUrlResponse.session) return;

                // Reset failure time if status is not PROOF_GENERATION_FAILED
                if (statusUrlResponse.session.statusV2 !== SessionStatus.PROOF_GENERATION_FAILED) {
                    this.lastFailureTime = undefined;
                }

                // Check for failure timeout
                if (statusUrlResponse.session.statusV2 === SessionStatus.PROOF_GENERATION_FAILED) {
                    const currentTime = Date.now();
                    if (!this.lastFailureTime) {
                        this.lastFailureTime = currentTime;
                    } else if (currentTime - this.lastFailureTime >= this.FAILURE_TIMEOUT) {
                        const errorMessage = statusUrlResponse.session.error?.message || 'Proof generation failed - timeout reached';
                        throw new ProviderFailedError(errorMessage);
                    }
                    return; // Continue monitoring if under timeout
                }

                if (statusUrlResponse.session.statusV2 === SessionStatus.ERROR_SUBMISSION_FAILED || statusUrlResponse.session.statusV2 === SessionStatus.ERROR_SUBMITTED) {
                    throw new ErrorDuringVerificationError();
                }

                const isDefaultCallbackUrl = this.getAppCallbackUrl() === `${constants.DEFAULT_RECLAIM_CALLBACK_URL}${this.sessionId}`;

                if (isDefaultCallbackUrl) {
                    if (statusUrlResponse.session.proofs && statusUrlResponse.session.proofs.length > 0) {
                        const proofs = statusUrlResponse.session.proofs;
                        if (this.claimCreationType === ClaimCreationType.STANDALONE) {
                            const { isVerified: verified } = await verifyProof(proofs, this.getProviderVersion());
                            if (!verified) {
                                logger.info(`Proofs not verified: count=${proofs?.length}`);
                                throw new ProofNotVerifiedError();
                            }
                        }
                        // check if the proofs array has only one proof then send the proofs in onSuccess
                        if (proofs.length === 1) {

                            onSuccess(proofs[0]);
                        } else {
                            onSuccess(proofs);
                        }
                        this.clearInterval();
                        this.modal?.close();
                    }
                } else {
                    if (statusUrlResponse.session.statusV2 === SessionStatus.PROOF_SUBMISSION_FAILED) {
                        const errorMessage = statusUrlResponse.session.error?.message || 'Proof submission failed';
                        throw new ProofSubmissionFailedError(errorMessage);
                    }
                    if (statusUrlResponse.session.statusV2 === SessionStatus.PROOF_SUBMITTED ||
                        statusUrlResponse.session.statusV2 === SessionStatus.AI_PROOF_SUBMITTED) {
                        if (onSuccess) {
                            // Proof submitted successfully to the custom callback url
                            // We don't have proof, so we just return empty array
                            // Before 4.10.1, this was a string message.
                            onSuccess([]);
                        }
                        this.clearInterval();
                        this.modal?.close();
                    }
                }
            } catch (e) {
                if (onError) {
                    onError(e as Error);
                }
                this.clearInterval();
                this.modal?.close();
            }
        }, sessionUpdatePollingInterval);

        this.intervals.set(this.sessionId, interval);
        scheduleIntervalEndingTask(this.sessionId, this.intervals, onError);
    }

    /**
     * Closes the QR code modal if it is currently open
     *
     * This method can be called to programmatically close the modal, for example,
     * when implementing custom UI behavior or cleanup logic.
     *
     * @example
     * ```typescript
     * // Close modal after some condition
     * proofRequest.closeModal();
     * ```
     */
    closeModal(): void {
        if (this.modal) {
            this.modal.close();
            logger.info('Modal closed by user');
        }
    }

    /**
     * Returns whether proofs will be submitted as JSON format
     *
     * @returns boolean - True if proofs are sent as application/json, false for application/x-www-form-urlencoded
     *
     * @example
     * ```typescript
     * const isJson = proofRequest.getJsonProofResponse();
     * console.log('JSON format:', isJson);
     * ```
     */
    getJsonProofResponse(): boolean {
        return this.jsonProofResponse;
    }
}
