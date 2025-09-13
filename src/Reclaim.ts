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
    AddContextError,
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
    SignatureNotFoundError
} from './utils/errors'
import { validateContext, validateFunctionParams, validateParameters, validateSignature, validateURL, validateModalOptions } from './utils/validationUtils'
import { fetchStatusUrl, initSession, updateSession } from './utils/sessionUtils'
import { assertValidSignedClaim, createLinkWithTemplateData, getWitnessesForClaim } from './utils/proofUtils'
import { QRCodeModal } from './utils/modalUtils'
import loggerModule from './utils/logger';
import { getDeviceType, getMobileDeviceType, isMobileDevice } from './utils/device'
const logger = loggerModule.logger

const sdkVersion = require('../package.json').version;

// Implementation
export async function verifyProof(proofOrProofs: Proof | Proof[],allowAiWitness?: boolean): Promise<boolean> {
    // If input is an array of proofs
    if (Array.isArray(proofOrProofs)) {
        for (const proof of proofOrProofs) {
            const isVerified = await verifyProof(proof,allowAiWitness);
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
    acceptAiProviders: false,
    sdkVersion: '',
    providerVersion: '',
    resolvedProviderVersion: '',
    jsonProofResponse: false
}
export class ReclaimProofRequest {
    // Private class properties
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
    private readonly FAILURE_TIMEOUT = 30000; // 30 seconds timeout, can be adjusted

    // Private constructor
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

        if(options?.customAppClipUrl){
            this.customAppClipUrl = options.customAppClipUrl;
        }

        this.options = options;
        // Fetch sdk version from package.json
        this.sdkVersion = 'js-' + sdkVersion;
        logger.info(`Initializing client with applicationId: ${this.applicationId}`);
    }

    // Static initialization methods
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
            }

            const proofRequestInstance = new ReclaimProofRequest(applicationId, providerId, options)

            const signature = await proofRequestInstance.generateSignature(appSecret)
            proofRequestInstance.setSignature(signature)

            const data: InitSessionResponse = await initSession(providerId, applicationId, proofRequestInstance.timeStamp, signature, options?.providerVersion);
            proofRequestInstance.sessionId = data.sessionId
            proofRequestInstance.resolvedProviderVersion = data.resolvedProviderVersion

            return proofRequestInstance
        } catch (error) {
            logger.info('Failed to initialize ReclaimProofRequest', error as Error);
            throw new InitError('Failed to initialize ReclaimProofRequest', error as Error)
        }
    }

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
                timeStamp,
                appCallbackUrl,
                claimCreationType,
                options,
                sdkVersion,
                jsonProofResponse,
                resolvedProviderVersion,
                modalOptions
            }: ProofPropertiesJSON = JSON.parse(jsonString)

            validateFunctionParams([
                { input: applicationId, paramName: 'applicationId', isString: true },
                { input: providerId, paramName: 'providerId', isString: true },
                { input: signature, paramName: 'signature', isString: true },
                { input: sessionId, paramName: 'sessionId', isString: true },
                { input: timeStamp, paramName: 'timeStamp', isString: true },
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
                    { input: options.providerVersion, paramName: 'providerVersion', isString: true }
                ], 'fromJsonString');
            }

            if (resolvedProviderVersion) {
                validateFunctionParams([
                    { input: resolvedProviderVersion, paramName: 'resolvedProviderVersion', isString: true }
                ], 'fromJsonString');
            }

            const proofRequestInstance = new ReclaimProofRequest(applicationId, providerId, options);
            proofRequestInstance.sessionId = sessionId;
            proofRequestInstance.context = context;
            proofRequestInstance.parameters = parameters;
            proofRequestInstance.appCallbackUrl = appCallbackUrl
            proofRequestInstance.redirectUrl = redirectUrl
            proofRequestInstance.timeStamp = timeStamp
            proofRequestInstance.signature = signature
            proofRequestInstance.sdkVersion = sdkVersion;
            proofRequestInstance.resolvedProviderVersion = resolvedProviderVersion;
            proofRequestInstance.modalOptions = modalOptions;
            return proofRequestInstance
        } catch (error) {
            logger.info('Failed to parse JSON string in fromJsonString:', error);
            throw new InvalidParamError('Invalid JSON string provided to fromJsonString');
        }
    }

    // Setter methods
    setAppCallbackUrl(url: string, jsonProofResponse?: boolean): void {
        validateURL(url, 'setAppCallbackUrl')
        this.appCallbackUrl = url
        this.jsonProofResponse = jsonProofResponse ?? false
    }

    setRedirectUrl(url: string): void {
        validateURL(url, 'setRedirectUrl');
        this.redirectUrl = url;
    }

    setClaimCreationType(claimCreationType: ClaimCreationType): void {
        this.claimCreationType = claimCreationType;
    }

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

    addContext(address: string, message: string): void {
        try {
            validateFunctionParams([
                { input: address, paramName: 'address', isString: true },
                { input: message, paramName: 'message', isString: true }
            ], 'addContext');
            this.context = { contextAddress: address, contextMessage: message };
        } catch (error) {
            logger.info("Error adding context", error)
            throw new AddContextError("Error adding context", error as Error)
        }
    }

    setParams(params: { [key: string]: string }): void {
        try {
            validateParameters(params);
            this.parameters = { ...this.parameters, ...params }
        } catch (error) {
            logger.info('Error Setting Params:', error);
            throw new SetParamsError("Error setting params", error as Error)
        }
    }

    // Getter methods
    getAppCallbackUrl(): string {
        try {
            validateFunctionParams([{ input: this.sessionId, paramName: 'sessionId', isString: true }], 'getAppCallbackUrl');
            return this.appCallbackUrl || `${constants.DEFAULT_RECLAIM_CALLBACK_URL}${this.sessionId}`
        } catch (error) {
            logger.info("Error getting app callback url", error)
            throw new GetAppCallbackUrlError("Error getting app callback url", error as Error)
        }
    }

    getStatusUrl(): string {
        try {
            validateFunctionParams([{ input: this.sessionId, paramName: 'sessionId', isString: true }], 'getStatusUrl');
            return `${constants.DEFAULT_RECLAIM_STATUS_URL}${this.sessionId}`
        } catch (error) {
            logger.info("Error fetching Status Url", error)
            throw new GetStatusUrlError("Error fetching status url", error as Error)
        }
    }

    // getter for SessionId
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

    // Public methods
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
            timeStamp: this.timeStamp,
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

    async getRequestUrl(): Promise<string> {
        logger.info('Creating Request Url')
        if (!this.signature) {
            throw new SignatureNotFoundError('Signature is not set.')
        }

        try {
            validateSignature(this.providerId, this.signature, this.applicationId, this.timeStamp)

            const templateData: TemplateData = {
                sessionId: this.sessionId,
                providerId: this.providerId,
                providerVersion: this.options?.providerVersion ?? '',
                resolvedProviderVersion: this.resolvedProviderVersion ?? '',
                applicationId: this.applicationId,
                signature: this.signature,
                timestamp: this.timeStamp,
                callbackUrl: this.getAppCallbackUrl(),
                context: JSON.stringify(this.context),
                parameters: this.parameters,
                redirectUrl: this.redirectUrl ?? '',
                acceptAiProviders: this.options?.acceptAiProviders ?? false,
                sdkVersion: this.sdkVersion,
                jsonProofResponse: this.jsonProofResponse

            }
            await updateSession(this.sessionId, SessionStatus.SESSION_STARTED)
            const deviceType = getDeviceType();
            if (this.options?.useAppClip && deviceType === DeviceType.MOBILE) {
                let template = encodeURIComponent(JSON.stringify(templateData));
                template = replaceAll(template, '(', '%28');
                template = replaceAll(template, ')', '%29');

                // check if the app is running on iOS or Android
                const isIos = getMobileDeviceType() === DeviceType.IOS;
                if (!isIos) {
                    const instantAppUrl = this.buildSharePageUrl(template);
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

    async triggerReclaimFlow(): Promise<void> {
        if (!this.signature) {
            throw new SignatureNotFoundError('Signature is not set.')
        }

        try {
            validateSignature(this.providerId, this.signature, this.applicationId, this.timeStamp)
            const templateData: TemplateData = {
                sessionId: this.sessionId,
                providerId: this.providerId,
                applicationId: this.applicationId,
                signature: this.signature,
                timestamp: this.timeStamp,
                callbackUrl: this.getAppCallbackUrl(),
                context: JSON.stringify(this.context),
                providerVersion: this.options?.providerVersion ?? '',
                resolvedProviderVersion: this.resolvedProviderVersion ?? '',
                parameters: this.parameters,
                redirectUrl: this.redirectUrl ?? '',
                acceptAiProviders: this.options?.acceptAiProviders ?? false,
                sdkVersion: this.sdkVersion,
                jsonProofResponse: this.jsonProofResponse
            }

            this.templateData = templateData;

            logger.info('Triggering Reclaim flow');

            // Get device type
            const deviceType = getDeviceType();
            await updateSession(this.sessionId, SessionStatus.SESSION_STARTED)

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
                    await this.redirectToInstantApp();
                } else if (mobileDeviceType === DeviceType.IOS) {
                    // Redirect to app clip URL
                    logger.info('Redirecting to iOS app clip');
                    await this.redirectToAppClip();
                }
            }
        } catch (error) {
            logger.info('Error triggering Reclaim flow:', error);
            throw error;
        }
    }


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

    private async redirectToInstantApp(): Promise<void> {
        try {
            let template = encodeURIComponent(JSON.stringify(this.templateData));
            template = replaceAll(template, '(', '%28');
            template = replaceAll(template, ')', '%29');

            const instantAppUrl = this.buildSharePageUrl(template);
            logger.info('Redirecting to Android instant app: ' + instantAppUrl);

            // Redirect to instant app
            window.location.href = instantAppUrl;
        } catch (error) {
            logger.info('Error redirecting to instant app:', error);
            throw error;
        }
    }

    private async redirectToAppClip(): Promise<void> {
        try {
            let template = encodeURIComponent(JSON.stringify(this.templateData));
            template = replaceAll(template, '(', '%28');
            template = replaceAll(template, ')', '%29');

            const appClipUrl =  this.customAppClipUrl ? `${this.customAppClipUrl}&template=${template}` : `https://appclip.apple.com/id?p=org.reclaimprotocol.app.clip&template=${template}`;
            logger.info('Redirecting to iOS app clip: ' + appClipUrl);

            // Redirect to app clip
            window.location.href = appClipUrl;
        } catch (error) {
            logger.info('Error redirecting to app clip:', error);
            throw error;
        }
    }

    async startSession({ onSuccess, onError }: StartSessionParams): Promise<void> {
        if (!this.sessionId) {
            const message = "Session can't be started due to undefined value of sessionId";
            logger.info(message);
            throw new SessionNotStartedError(message);
        }

        logger.info('Starting session');
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

                const isDefaultCallbackUrl = this.getAppCallbackUrl() === `${constants.DEFAULT_RECLAIM_CALLBACK_URL}${this.sessionId}`;

                if (isDefaultCallbackUrl) {
                    if (statusUrlResponse.session.proofs && statusUrlResponse.session.proofs.length > 0) {
                        const proofs = statusUrlResponse.session.proofs;
                        if (this.claimCreationType === ClaimCreationType.STANDALONE) {
                            const verified = await verifyProof(proofs);
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
                            onSuccess('Proof submitted successfully to the custom callback url');
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
        }, 3000);

        this.intervals.set(this.sessionId, interval);
        scheduleIntervalEndingTask(this.sessionId, this.intervals, onError);
    }

    closeModal(): void {
        if (this.modal) {
            this.modal.close();
            logger.info('Modal closed by user');
        }
    }
}

