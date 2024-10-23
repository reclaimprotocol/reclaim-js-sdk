import type { Proof, RequestedProof, Context, ProviderData } from './utils/interfaces'
import { getIdentifierFromClaimInfo } from './witness'
import type {
    SignedClaim,
    ProofRequestOptions,
    StartSessionParams,
    ProofPropertiesJSON,
    TemplateData
} from './utils/types'
import { SessionStatus } from './utils/types'
import { ethers } from 'ethers'
import canonicalize from 'canonicalize'
import {
    replaceAll,
    scheduleIntervalEndingTask
} from './utils/helper'
import { constants } from './utils/constants'
import {
    AddContextError,
    AvailableParamsError,
    BuildProofRequestError,
    GetAppCallbackUrlError,
    GetStatusUrlError,
    InitError,
    InvalidParamError,
    NoProviderParamsError,
    ProofNotVerifiedError,
    ProofSubmissionFailedError,
    ProviderFailedError,
    SessionNotStartedError,
    SetParamsError,
    SetSignatureError,
    SignatureGeneratingError,
    SignatureNotFoundError
} from './utils/errors'
import { validateContext, validateFunctionParams, validateRequestedProof, validateSignature, validateURL } from './utils/validationUtils'
import { fetchStatusUrl, initSession, updateSession } from './utils/sessionUtils'
import { assertValidSignedClaim, createLinkWithTemplateData, generateRequestedProof, getFilledParameters, getWitnessesForClaim } from './utils/proofUtils'
import loggerModule from './utils/logger';
const logger = loggerModule.logger

const sdkVersion = require('../package.json').version;


export async function verifyProof(proof: Proof): Promise<boolean> {
    if (!proof.signatures.length) {
        throw new SignatureNotFoundError('No signatures')
    }

    try {
        // check if witness array exist and first element is manual-verify
        let witnesses = []
        if (proof.witnesses.length && proof.witnesses[0]?.url === 'manual-verify') {
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

export class ReclaimProofRequest {
    // Private class properties
    private applicationId: string;
    private signature?: string;
    private appCallbackUrl?: string;
    private sessionId: string;
    private options?: ProofRequestOptions;
    private context: Context = { contextAddress: '0x0', contextMessage: 'sample context' };
    private requestedProof?: RequestedProof;
    private providerId: string;
    private redirectUrl?: string;
    private intervals: Map<string, NodeJS.Timer> = new Map();
    private timeStamp: string;
    private sdkVersion: string;

    // Private constructor
    private constructor(applicationId: string, providerId: string, options?: ProofRequestOptions) {
        this.providerId = providerId;
        this.timeStamp = Date.now().toString();
        this.applicationId = applicationId;
        this.sessionId = "";
        if (options?.log) {
            loggerModule.setLogLevel('info');
        } else {
            loggerModule.setLogLevel('silent');
        }
        this.options = options;
        // Fetch sdk version from package.json
        this.sdkVersion = sdkVersion;
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
                if (options.log) {
                    validateFunctionParams([
                        { paramName: 'log', input: options.log }
                    ], 'the constructor')
                }

            }

            const proofRequestInstance = new ReclaimProofRequest(applicationId, providerId, options)

            const signature = await proofRequestInstance.generateSignature(appSecret)
            proofRequestInstance.setSignature(signature)

            const data = await initSession(providerId, applicationId, proofRequestInstance.timeStamp, signature);
            proofRequestInstance.sessionId = data.sessionId

            await proofRequestInstance.buildProofRequest(data.provider)

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
                requestedProof,
                signature,
                redirectUrl,
                timeStamp,
                appCallbackUrl,
                options,
                sdkVersion
            }: ProofPropertiesJSON = JSON.parse(jsonString)

            validateFunctionParams([
                { input: applicationId, paramName: 'applicationId', isString: true },
                { input: providerId, paramName: 'providerId', isString: true },
                { input: signature, paramName: 'signature', isString: true },
                { input: sessionId, paramName: 'sessionId', isString: true },
                { input: timeStamp, paramName: 'timeStamp', isString: true },
                { input: sdkVersion, paramName: 'sdkVersion', isString: true },
            ], 'fromJsonString');

            validateRequestedProof(requestedProof);

            if (redirectUrl) {
                validateURL(redirectUrl, 'fromJsonString');
            }

            if (appCallbackUrl) {
                validateURL(appCallbackUrl, 'fromJsonString');
            }

            if (context) {
                validateContext(context);
            }

            const proofRequestInstance = new ReclaimProofRequest(applicationId, providerId, options);
            proofRequestInstance.sessionId = sessionId;
            proofRequestInstance.context = context;
            proofRequestInstance.requestedProof = requestedProof
            proofRequestInstance.appCallbackUrl = appCallbackUrl
            proofRequestInstance.redirectUrl = redirectUrl
            proofRequestInstance.timeStamp = timeStamp
            proofRequestInstance.signature = signature
            proofRequestInstance.sdkVersion = sdkVersion;
            return proofRequestInstance
        } catch (error) {
            logger.info('Failed to parse JSON string in fromJsonString:', error);
            throw new InvalidParamError('Invalid JSON string provided to fromJsonString');
        }
    }

    // Setter methods
    setAppCallbackUrl(url: string): void {
        validateURL(url, 'setAppCallbackUrl')
        this.appCallbackUrl = url
    }

    setRedirectUrl(url: string): void {
        validateURL(url, 'setRedirectUrl');
        this.redirectUrl = url;
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
            const requestedProof = this.getRequestedProof();
            if (!requestedProof || !this.requestedProof) {
                throw new BuildProofRequestError('Requested proof is not present.');
            }

            const currentParams = this.availableParams()
            if (!currentParams) {
                throw new NoProviderParamsError('No params present in the provider config.');
            }

            const paramsToSet = Object.keys(params)
            for (const param of paramsToSet) {
                if (!currentParams.includes(param)) {
                    throw new InvalidParamError(
                        `Cannot set parameter ${param} for provider ${this.providerId}. Available parameters: ${currentParams}`
                    );
                }
            }
            this.requestedProof.parameters = { ...requestedProof.parameters, ...params }
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

    private async buildProofRequest(provider: ProviderData): Promise<RequestedProof> {
        try {
            this.requestedProof = generateRequestedProof(provider);
            return this.requestedProof;
        } catch (err: Error | unknown) {
            logger.info(err instanceof Error ? err.message : String(err));
            throw new BuildProofRequestError('Something went wrong while generating proof request', err as Error);
        }
    }

    private getRequestedProof(): RequestedProof {
        if (!this.requestedProof) {
            throw new BuildProofRequestError('RequestedProof is not present in the instance.')
        }
        return this.requestedProof
    }

    private availableParams(): string[] {
        try {
            const requestedProofs = this.getRequestedProof();
            let availableParamsStore = Object.keys(requestedProofs.parameters)
            availableParamsStore = availableParamsStore.concat(requestedProofs.url
                .split(/{{(.*?)}}/)
                .filter((_: string, i: number) => i % 2))

            return [...new Set(availableParamsStore)];

        } catch (error) {
            logger.info("Error fetching available params", error)
            throw new AvailableParamsError("Error fetching available params", error as Error)
        }
    }

    private clearInterval(): void {
        if (this.sessionId && this.intervals.has(this.sessionId)) {
            clearInterval(this.intervals.get(this.sessionId) as NodeJS.Timeout)
            this.intervals.delete(this.sessionId)
        }
    }

    // Public methods
    toJsonString(options?: ProofRequestOptions): string {
        return JSON.stringify({
            applicationId: this.applicationId,
            providerId: this.providerId,
            sessionId: this.sessionId,
            context: this.context,
            requestedProof: this.requestedProof,
            appCallbackUrl: this.appCallbackUrl,
            signature: this.signature,
            redirectUrl: this.redirectUrl,
            timeStamp: this.timeStamp,
            options: this.options,
            sdkVersion: this.sdkVersion
        })
    }

    async getRequestUrl(): Promise<string> {
        logger.info('Creating Request Url')
        if (!this.signature) {
            throw new SignatureNotFoundError('Signature is not set.')
        }

        try {
            const requestedProof = this.getRequestedProof()
            validateSignature(this.providerId, this.signature, this.applicationId, this.timeStamp)

            const templateData: TemplateData = {
                sessionId: this.sessionId,
                providerId: this.providerId,
                applicationId: this.applicationId,
                signature: this.signature,
                timestamp: this.timeStamp,
                callbackUrl: this.getAppCallbackUrl(),
                context: JSON.stringify(this.context),
                parameters: getFilledParameters(requestedProof),
                redirectUrl: this.redirectUrl ?? '',
                acceptAiProviders: this.options?.acceptAiProviders ?? false,
                sdkVersion: this.sdkVersion
            }

            const link = await createLinkWithTemplateData(templateData)
            logger.info('Request Url created successfully: ' + link)
            await updateSession(this.sessionId, SessionStatus.SESSION_STARTED)
            return link
        } catch (error) {
            logger.info('Error creating Request Url:', error)
            throw error
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
                if (statusUrlResponse.session.statusV2 === SessionStatus.PROOF_GENERATION_FAILED) {
                    throw new ProviderFailedError();
                }

                const isDefaultCallbackUrl = this.getAppCallbackUrl() === `${constants.DEFAULT_RECLAIM_CALLBACK_URL}${this.sessionId}`;

                if (isDefaultCallbackUrl) {
                    if (statusUrlResponse.session.proofs && statusUrlResponse.session.proofs.length > 0) {
                        const proof = statusUrlResponse.session.proofs[0];
                        const verified = await verifyProof(proof);
                        if (!verified) {
                            logger.info(`Proof not verified: ${JSON.stringify(proof)}`);
                            throw new ProofNotVerifiedError();
                        }
                        if (onSuccess) {
                            onSuccess(proof);
                        }
                        this.clearInterval();
                    }
                } else {
                    if (statusUrlResponse.session.statusV2 === SessionStatus.PROOF_SUBMISSION_FAILED) {
                        throw new ProofSubmissionFailedError();
                    }
                    if (statusUrlResponse.session.statusV2 === SessionStatus.PROOF_SUBMITTED) {
                        if (onSuccess) {
                            onSuccess('Proof submitted successfully to the custom callback url');
                        }
                        this.clearInterval();
                    }
                }
            } catch (e) {
                if (onError) {
                    onError(e as Error);
                }
                this.clearInterval();
            }
        }, 3000);

        this.intervals.set(this.sessionId, interval);
        scheduleIntervalEndingTask(this.sessionId, this.intervals, onError);
    }
}

