import { type Proof, type Context, RECLAIM_EXTENSION_ACTIONS, ExtensionMessage } from './utils/interfaces'
import { getIdentifierFromClaimInfo } from './witness'
import {
    SignedClaim,
    ProofRequestOptions,
    StartSessionParams,
    ProofPropertiesJSON,
    TemplateData,
    InitSessionResponse,
    ClaimCreationType,
    ModalOptions,
    ReclaimFlowLaunchOptions,
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
    ErrorDuringVerificationError
} from './utils/errors'
import { validateContext, validateFunctionParams, validateParameters, validateSignature, validateURL, validateModalOptions, validateFunctionParamsWithFn } from './utils/validationUtils'
import { fetchStatusUrl, initSession, updateSession } from './utils/sessionUtils'
import { assertValidSignedClaim, createLinkWithTemplateData, getWitnessesForClaim } from './utils/proofUtils'
import { QRCodeModal } from './utils/modalUtils'
import loggerModule from './utils/logger';
import { getDeviceType, getMobileDeviceType, isMobileDevice } from './utils/device'
import { canonicalStringify } from './utils/strings'
const logger = loggerModule.logger

const sdkVersion = require('../package.json').version;

/**
 * Verifies one or more Reclaim proofs by validating signatures and witness information
 *
 * @param proofOrProofs - A single proof object or an array of proof objects to verify
 * @param allowAiWitness - Optional flag to allow AI witness verification. Defaults to false
 * @returns Promise<boolean> - Returns true if all proofs are valid, false otherwise
 * @throws {SignatureNotFoundError} When proof has no signatures
 * @throws {ProofNotVerifiedError} When identifier mismatch occurs
 *
 * @example
 * ```typescript
 * const isValid = await verifyProof(proof);
 * const areAllValid = await verifyProof([proof1, proof2, proof3]);
 * const isValidWithAI = await verifyProof(proof, true);
 * ```
 */
export async function verifyProof(proofOrProofs: Proof | Proof[], allowAiWitness?: boolean): Promise<boolean> {
    // If input is an array of proofs
    if (Array.isArray(proofOrProofs)) {
        for (const proof of proofOrProofs) {
            const isVerified = await verifyProof(proof, allowAiWitness);
            if (!isVerified) {
                return false;
            }
        }
        return true;
    }

    // Single proof verification logic
    const proof = proofOrProofs;
    if (!proof.signatures.length) {
        throw new SignatureNotFoundError('No signatures')
    }

    try {
        // check if witness array exist and first element is ai-witness
        let witnesses = []
        if (proof.witnesses.length && proof.witnesses[0]?.url === 'ai-witness' && allowAiWitness === true) {
            witnesses.push(proof.witnesses[0].id)
        } else {
            witnesses = await getWitnessesForClaim(
                proof.claimData.epoch,
                proof.identifier,
                proof.claimData.timestampS
            )
        }
        // then hash the claim info with the encoded ctx to get the identifier
        const calculatedIdentifier = getIdentifierFromClaimInfo({
            parameters: JSON.parse(
                canonicalize(proof.claimData.parameters) as string
            ),
            provider: proof.claimData.provider,
            context: proof.claimData.context
        })
        proof.identifier = replaceAll(proof.identifier, '"', '')
        // check if the identifier matches the one in the proof
        if (calculatedIdentifier !== proof.identifier) {
            throw new ProofNotVerifiedError('Identifier Mismatch')
        }

        const signedClaim: SignedClaim = {
            claim: {
                ...proof.claimData
            },
            signatures: proof.signatures.map(signature => {
                return ethers.getBytes(signature)
            })
        }

        assertValidSignedClaim(signedClaim, witnesses)
    } catch (e: Error | unknown) {
        logger.info(`Error verifying proof: ${e instanceof Error ? e.message : String(e)}`)
        return false
    }

    return true
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
    cancelCallbackUrl: '',
    cancelRedirectUrl: '',
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
    private context: Context = { contextAddress: '0x0', contextMessage: 'sample context' };
    private claimCreationType?: ClaimCreationType = ClaimCreationType.STANDALONE;
    private providerId: string;
    private resolvedProviderVersion?: string;
    private parameters: { [key: string]: string };
    private redirectUrl?: string;
    private cancelCallbackUrl?: TemplateData['cancelCallbackUrl'];
    private cancelRedirectUrl?: TemplateData['cancelRedirectUrl'];
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
            options.useAppClip = true;
        }

        if (options?.envUrl) {
            setBackendBaseUrl(options.envUrl);
        }

        if (options.extensionID) {
            this.extensionID = options.extensionID;
        }

        if (options?.customSharePageUrl) {
            this.customSharePageUrl = options.customSharePageUrl;
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
     * Initializes a new Reclaim proof request instance with automatic signature generation and session creation
     *
     * @param applicationId - Your Reclaim application ID
     * @param appSecret - Your application secret key for signing requests
     * @param providerId - The ID of the provider to use for proof generation
     * @param options - Optional configuration options for the proof request
     * @returns Promise<ReclaimProofRequest> - A fully initialized proof request instance
     * @throws {InitError} When initialization fails due to invalid parameters or session creation errors
     *
     * @example
     * ```typescript
     * const proofRequest = await ReclaimProofRequest.init(
     *   'your-app-id',
     *   'your-app-secret',
     *   'provider-id',
     *   { log: true, acceptAiProviders: true }
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
                cancelCallbackUrl,
                cancelRedirectUrl,
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

            if (appCallbackUrl) {
                validateURL(appCallbackUrl, 'fromJsonString');
            }

            if (cancelRedirectUrl) {
                validateURL(cancelRedirectUrl, 'fromJsonString');
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
            proofRequestInstance.parameters = parameters;
            proofRequestInstance.appCallbackUrl = appCallbackUrl
            proofRequestInstance.redirectUrl = redirectUrl
            proofRequestInstance.timeStamp = resolvedTimestamp!
            proofRequestInstance.signature = signature
            proofRequestInstance.sdkVersion = sdkVersion;
            proofRequestInstance.resolvedProviderVersion = resolvedProviderVersion;
            proofRequestInstance.modalOptions = modalOptions;
            proofRequestInstance.jsonProofResponse = jsonProofResponse ?? false;
            proofRequestInstance.cancelCallbackUrl = cancelCallbackUrl;
            proofRequestInstance.cancelRedirectUrl = cancelRedirectUrl;
            return proofRequestInstance
        } catch (error) {
            logger.info('Failed to parse JSON string in fromJsonString:', error);
            throw new InvalidParamError('Invalid JSON string provided to fromJsonString');
        }
    }

    /**
     * Sets a custom callback URL where proofs will be submitted via HTTP POST
     *
     * By default, proofs are posted as `application/x-www-form-urlencoded`.
     * When a custom callback URL is set, Reclaim will no longer receive proofs upon submission,
     * and listeners on the startSession method will not be triggered. Your application must
     * coordinate with your backend to receive and verify proofs using verifyProof().
     *
     * Note: InApp SDKs are unaffected by this property as they do not handle proof submission.
     *
     * @param url - The URL where proofs should be submitted via HTTP POST
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
     * @throws {InvalidParamError} When URL is invalid
     *
     * @example
     * ```typescript
     * proofRequest.setRedirectUrl('https://your-app.com/success');
     * ```
     */
    setRedirectUrl(url: string): void {
        validateURL(url, 'setRedirectUrl');
        this.redirectUrl = url;
    }

    /**
     * Sets a custom callback URL where errors that abort the verification process will be submitted via HTTP POST
     *
     * Errors will be HTTP POSTed with `header 'Content-Type': 'application/json'`.
     * When a custom error callback URL is set, Reclaim will no longer receive errors upon submission,
     * and listeners on the startSession method will not be triggered. Your application must
     * coordinate with your backend to receive errors.
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
    setCancelRedirectUrl(url: string): void {
        validateURL(url, 'setCancelRedirectUrl');
        this.cancelRedirectUrl = url;
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
     * This allows you to associate custom data (address and message) with the proof claim.
     * The context can be retrieved and validated when verifying the proof. 
     * 
     * Also see [setContext] which is an alternate way to set context that has an address & message.
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
            this.context = JSON.parse(canonicalStringify(context));
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
            this.context = { contextAddress: address, contextMessage: message };
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
            logger.info(`Error generating proof request for applicationId: ${this.applicationId}, providerId: ${this.providerId}, signature: ${this.signature}, timeStamp: ${this.timeStamp}`, err);
            throw new SignatureGeneratingError(`Error generating signature for applicationSecret: ${applicationSecret}`)
        }
    }

    private clearInterval(): void {
        if (this.sessionId && this.intervals.has(this.sessionId)) {
            clearInterval(this.intervals.get(this.sessionId) as NodeJS.Timeout)
            this.intervals.delete(this.sessionId)
        }
    }

    private buildSharePageUrl(template: string): string {
        const baseUrl = 'https://share.reclaimprotocol.org/verify';

        if (this.customSharePageUrl) {
            return `${this.customSharePageUrl}/?template=${template}`;
        }

        return `${baseUrl}/?template=${template}`;
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
            cancelCallbackUrl: this.cancelCallbackUrl,
            cancelRedirectUrl: this.cancelRedirectUrl,
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
            cancelCallbackUrl: this.getCancelCallbackUrl(),
            cancelRedirectUrl: this.cancelRedirectUrl,
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
     * Generates and returns the request URL for proof verification
     *
     * This URL can be shared with users to initiate the proof generation process.
     * The URL format varies based on device type:
     * - Mobile iOS: Returns App Clip URL (if useAppClip is enabled)
     * - Mobile Android: Returns Instant App URL (if useAppClip is enabled)
     * - Desktop/Other: Returns standard verification URL
     *
     * @param launchOptions - Optional launch configuration to override default behavior
     * @returns Promise<string> - The generated request URL
     * @throws {SignatureNotFoundError} When signature is not set
     *
     * @example
     * ```typescript
     * const requestUrl = await proofRequest.getRequestUrl();
     * // Share this URL with users or display as QR code
     * ```
     */
    async getRequestUrl(launchOptions?: ReclaimFlowLaunchOptions): Promise<string> {
        const options = launchOptions || this.options?.launchOptions || {};

        logger.info('Creating Request Url')
        if (!this.signature) {
            throw new SignatureNotFoundError('Signature is not set.')
        }

        try {
            const templateData = this.getTemplateData()
            await updateSession(this.sessionId, SessionStatus.SESSION_STARTED)
            const deviceType = getDeviceType();
            if (this.options?.useAppClip && deviceType === DeviceType.MOBILE) {
                let template = encodeURIComponent(JSON.stringify(templateData));
                template = replaceAll(template, '(', '%28');
                template = replaceAll(template, ')', '%29');

                // check if the app is running on iOS or Android
                const isIos = getMobileDeviceType() === DeviceType.IOS;
                if (!isIos) {
                    let instantAppUrl = this.buildSharePageUrl(template);
                    const isDeferredDeeplinksFlowEnabled = options.canUseDeferredDeepLinksFlow ?? false;

                    if (isDeferredDeeplinksFlowEnabled) {
                        instantAppUrl = instantAppUrl.replace("/verifier", "/link");
                    }
                    logger.info('Instant App Url created successfully: ' + instantAppUrl);
                    return instantAppUrl;
                } else {
                    const appClipUrl = this.customAppClipUrl ? `${this.customAppClipUrl}&template=${template}` : `https://appclip.apple.com/id?p=org.reclaimprotocol.app.clip&template=${template}`;
                    logger.info('App Clip Url created successfully: ' + appClipUrl);
                    return appClipUrl;
                }
            } else {
                const link = await createLinkWithTemplateData(templateData, this.customSharePageUrl)
                logger.info('Request Url created successfully: ' + link);
                return link;
            }
        } catch (error) {
            logger.info('Error creating Request Url:', error)
            throw error
        }
    }

    /**
     * Triggers the appropriate Reclaim verification flow based on device type and configuration
     *
     * This method automatically detects the device type and initiates the optimal verification flow:
     * - Desktop with browser extension: Triggers extension flow
     * - Desktop without extension: Shows QR code modal
     * - Mobile Android: Redirects to Instant App
     * - Mobile iOS: Redirects to App Clip
     *
     * @param launchOptions - Optional launch configuration to override default behavior
     * @returns Promise<void>
     * @throws {SignatureNotFoundError} When signature is not set
     *
     * @example
     * ```typescript
     * await proofRequest.triggerReclaimFlow();
     * // The appropriate verification method will be triggered automatically
     * ```
     */
    async triggerReclaimFlow(launchOptions?: ReclaimFlowLaunchOptions): Promise<void> {
        const options = launchOptions || this.options?.launchOptions || {};

        if (!this.signature) {
            throw new SignatureNotFoundError('Signature is not set.')
        }

        try {
            const templateData = this.getTemplateData()

            this.templateData = templateData;

            logger.info('Triggering Reclaim flow');

            // Get device type
            const deviceType = getDeviceType();
            updateSession(this.sessionId, SessionStatus.SESSION_STARTED)

            if (deviceType === DeviceType.DESKTOP) {
                const extensionAvailable = await this.isBrowserExtensionAvailable();
                // Desktop flow
                if (this.options?.useBrowserExtension && extensionAvailable) {
                    logger.info('Triggering browser extension flow');
                    this.triggerBrowserExtensionFlow();
                    return;
                } else {
                    // Show QR code popup modal
                    logger.info('Browser extension not available, showing QR code modal');
                    await this.showQRCodeModal();
                }
            } else if (deviceType === DeviceType.MOBILE) {
                // Mobile flow
                const mobileDeviceType = getMobileDeviceType();

                if (mobileDeviceType === DeviceType.ANDROID) {
                    // Redirect to instant app URL
                    logger.info('Redirecting to Android instant app');
                    await this.redirectToInstantApp(options);
                } else if (mobileDeviceType === DeviceType.IOS) {
                    // Redirect to app clip URL
                    logger.info('Redirecting to iOS app clip');
                    this.redirectToAppClip();
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

    private async showQRCodeModal(): Promise<void> {
        try {
            const requestUrl = await createLinkWithTemplateData(this.templateData, this.customSharePageUrl);
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
     * Starts the proof request session and monitors for proof submission
     *
     * This method begins polling the session status to detect when
     * a proof has been generated and submitted. It handles both default Reclaim callbacks
     * and custom callback URLs.
     *
     * For default callbacks: Verifies proofs automatically and passes them to onSuccess
     * For custom callbacks: Monitors submission status and notifies via onSuccess when complete
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
    async startSession({ onSuccess, onError }: StartSessionParams): Promise<void> {
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
                        throw new ProviderFailedError('Proof generation failed - timeout reached');
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
                            const verified = await verifyProof(proofs, this.options?.acceptAiProviders);
                            if (!verified) {
                                logger.info(`Proofs not verified: ${JSON.stringify(proofs)}`);
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
                        throw new ProofSubmissionFailedError();
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

