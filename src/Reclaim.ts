import type { Proof, RequestedProofs, Context } from './interfaces'
import { getIdentifierFromClaimInfo } from './witness'
import type {
    AppCallbackUrl,
    ApplicationId,
    NoReturn,
    OnFailureCallback,
    SessionId,
    Signature,
    SignedClaim,
    StatusUrl,
    ProofRequestOptions,
    StartSessionParams
} from './types'
import { SessionStatus } from './types'
import { v4 } from 'uuid'
import { ethers } from 'ethers'
import canonicalize from 'canonicalize'
import {
    getWitnessesForClaim,
    assertValidSignedClaim,
    getShortenedUrl,
    fetchProvidersByAppId,
    generateRequestedProofs,
    validateProviderIdsAndReturnProviders,
    validateSignature,
    replaceAll,
    validateURL,
    updateSession,
    createSession,
    validateNotNullOrUndefined,
    validateNonEmptyString,
    getBranchLink
} from './utils'
import { constants } from './constants'
import P from 'pino'
import {
    BuildProofRequestError,
    InvalidParamError,
    ProofNotVerifiedError,
    ProviderFailedError,
    SessionNotStartedError,
    SignatureNotFoundError,
    TimeoutError
} from './errors'

const logger = P()

export class Reclaim {
    static async verifySignedProof(proof: Proof) {
        if (!proof.signatures.length) {
            throw new Error('No signatures')
        }

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

        try {
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

            // verify the witness signature
            assertValidSignedClaim(signedClaim, witnesses)
        } catch (e: Error | unknown) {
            logger.error(e)
            return false
        }

        return true
    }
    static transformForOnchain(proof: Proof) {
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
    static verifyProvider(proof: Proof, providerHash: string): boolean {
        try {
            validateNotNullOrUndefined(providerHash, 'applicationId', 'verifyProvider function')
            validateNotNullOrUndefined(proof, 'proof', 'verifyProvider function')

            validateNonEmptyString(providerHash, 'applicationId', 'verifyProvider function')
            validateNonEmptyString(proof.claimData.context, 'context', 'verifyProvider function')

            const jsonContext = JSON.parse(proof.claimData.context)
            if (!jsonContext.providerHash) {
                logger.info(`ProviderHash is not included in proof's context`)
                return false
            }
            if (providerHash !== jsonContext.providerHash) {
                logger.info(`ProviderHash in context: ${jsonContext.providerHash} does not match the stored providerHash: ${providerHash}`)
                return false
            }
            return true
        } catch (e: Error | unknown) {
            logger.error(e)
            return false
        }
    }
    static ProofRequest = class {
        applicationId: ApplicationId
        signature?: Signature
        appCallbackUrl?: AppCallbackUrl
        sessionId: SessionId
        statusUrl?: StatusUrl
        context: Context = { contextAddress: '0x0', contextMessage: '' }
        requestedProofs?: RequestedProofs
        providerId?: string
        redirectUrl?: string
        intervals: Map<string, NodeJS.Timer> = new Map()
        linkingVersion: string
        timeStamp: string

        constructor(applicationId: string, options?: ProofRequestOptions) {
            validateNotNullOrUndefined(applicationId, 'applicationId', 'the constructor')
            validateNonEmptyString(applicationId, 'applicationId', 'the constructor')
            if (options?.sessionId) {
                validateNonEmptyString(options?.sessionId, 'sessionId', 'the constructor')
            }
            this.linkingVersion = 'V1'

            this.applicationId = applicationId
            this.sessionId = options?.sessionId || v4().toString()
            logger.level = options?.log ? 'info' : 'silent'
            logger.info(
                `Initializing client with applicationId: ${this.applicationId} and sessionId: ${this.sessionId}`
            )
            this.timeStamp = Date.now().toString();
        }

        addContext(address: string, message: string): NoReturn {
            validateNotNullOrUndefined(address, 'address', 'addContext')
            validateNotNullOrUndefined(message, 'message', 'addContext')
            this.context = { contextAddress: address, contextMessage: message }
        }

        setAppCallbackUrl(url: string): NoReturn {
            validateURL(url, 'setAppCallbackUrl')
            const urlObj = new URL(url)
            urlObj.searchParams.append('callbackId', this.sessionId)
            this.appCallbackUrl = urlObj.toString()
        }

        setRedirectUrl(url: string): NoReturn {
            validateURL(url, 'setRedirectUrl')
            const urlObj = new URL(url)
            this.redirectUrl = urlObj.toString()
        }

        setStatusUrl(url: string): NoReturn {
            validateURL(url, 'setStatusUrl')
            this.statusUrl = url
        }

        setSignature(signature: Signature): NoReturn {
            validateNotNullOrUndefined(signature, 'signature', 'setSignature')
            validateNonEmptyString(signature, 'signature', 'setSignature')
            this.signature = signature
        }

        getAppCallbackUrl(): AppCallbackUrl {
            return (
                this.appCallbackUrl ||
                `${constants.DEFAULT_RECLAIM_CALLBACK_URL}${this.sessionId}`
            )
        }

        getStatusUrl(): StatusUrl {
            return (
                this.statusUrl ||
                `${constants.DEFAULT_RECLAIM_STATUS_URL}${this.sessionId}`
            )
        }

        getRequestedProofs(): RequestedProofs {
            try {
                if (!this.requestedProofs) {
                    throw new BuildProofRequestError(
                        'Call buildProofRequest(providerId: string) first!'
                    )
                }
                return this.requestedProofs!
            } catch (err) {
                throw err
            }
        }

        async generateSignature(applicationSecret: string): Promise<Signature> {
            try {
                const wallet = new ethers.Wallet(applicationSecret)
                const requestedProofs = this.getRequestedProofs();
                if (requestedProofs.claims.length && (this.linkingVersion === 'V2Linking' || requestedProofs.claims[0]?.payload?.verificationType === 'MANUAL')) {
                    const signature: Signature = (await wallet.signMessage(
                        ethers.getBytes(
                            ethers.keccak256(
                                new TextEncoder().encode(
                                    canonicalize({
                                        providerId: requestedProofs.claims[0].httpProviderId,
                                        timestamp: this.timeStamp,

                                    })!
                                )
                            )
                        )
                    )) as unknown as Signature

                    return signature
                }
                const signature: Signature = (await wallet.signMessage(
                    ethers.getBytes(
                        ethers.keccak256(
                            new TextEncoder().encode(
                                canonicalize(requestedProofs)!
                            )
                        )
                    )
                )) as unknown as Signature

                return signature
            } catch (err) {
                logger.error(err)
                throw new BuildProofRequestError(
                    'Error generating signature for applicationSecret: ' +
                    applicationSecret
                )
            }
        }

        async buildProofRequest(providerId: string, redirectUser: boolean = false, linkingVersion?: string): Promise<RequestedProofs> {
            let providers = await fetchProvidersByAppId(this.applicationId, providerId)
            const provider = validateProviderIdsAndReturnProviders(
                providerId,
                providers
            )
            try {
                this.providerId = providerId
                this.requestedProofs = generateRequestedProofs(
                    provider,
                    this.context,
                    this.getAppCallbackUrl(),
                    this.getStatusUrl(),
                    this.sessionId,
                    redirectUser,
                )
                if (linkingVersion) {
                    if (linkingVersion === 'V2Linking') {
                        this.linkingVersion = linkingVersion
                    }
                    else {
                        throw new BuildProofRequestError(
                            'Invalid linking version. Supported linking versions are V2Linking'
                        )
                    }
                }

                return this.requestedProofs
            } catch (err: Error | unknown) {
                logger.error(err)
                throw new BuildProofRequestError(
                    'Something went wrong while generating proof request'
                )
            }
        }

        async createVerificationRequest(): Promise<{
            statusUrl: StatusUrl
            requestUrl: string
        }> {
            try {
                const requestedProofs = await this.getRequestedProofs()

                if (!requestedProofs) {
                    throw new BuildProofRequestError(
                        'Requested proofs are not built yet. Call buildProofRequest(providerId: string) first!'
                    )
                }

                if (!this.signature) {
                    throw new SignatureNotFoundError(
                        'Signature is not set. Use reclaim.setSignature(signature) to set the signature'
                    )
                }

                validateSignature(requestedProofs, this.signature, this.applicationId, this.linkingVersion, this.timeStamp)
                let templateData = {}
                if (requestedProofs.claims.length && (this.linkingVersion === 'V2Linking' || requestedProofs.claims[0]?.payload?.verificationType === 'MANUAL')) {
                    templateData = {
                        sessionId: this.sessionId,
                        providerId: this.providerId,
                        applicationId: this.applicationId,
                        signature: this.signature,
                        timestamp: this.timeStamp,
                        callbackUrl: this.getAppCallbackUrl(),
                        context: JSON.stringify(this.context),
                        verificationType: requestedProofs.claims[0].payload.verificationType,
                        parameters: requestedProofs.claims[0].payload.parameters,
                        redirectUrl: this.redirectUrl ?? ''
                    }
                } else {
                    templateData = {
                        ...requestedProofs,
                        signature: this.signature
                    }
                }

                let template = encodeURIComponent(
                    JSON.stringify(templateData)
                )

                template = replaceAll(template, '(', '%28')
                template = replaceAll(template, ')', '%29')

                let link = ''
                if (requestedProofs.claims.length && (this.linkingVersion === 'V2Linking' || requestedProofs.claims[0]?.payload?.verificationType === 'MANUAL')) {
                    link = `https://share.reclaimprotocol.org/verifier?template=` + template
                    link = await getShortenedUrl(link)
                } else {
                    link = await getBranchLink(template)
                }
                await createSession(this.sessionId, this.applicationId, this.providerId!)
                return { requestUrl: link, statusUrl: this.getStatusUrl() }
            } catch (error) {
                logger.error('Error creating verification request:', error)
                throw error
            }
        }

        async startSession({
            onSuccessCallback,
            onFailureCallback
        }: StartSessionParams) {
            const statusUrl = this.getStatusUrl()
            if (statusUrl && this.sessionId) {
                logger.info('Starting session')
                try {
                    await updateSession(this.sessionId, SessionStatus.SDK_STARTED)
                } catch (e) {
                    logger.error(e)
                }
                const interval = setInterval(async () => {
                    try {
                        const res = await fetch(statusUrl)
                        const data = await res.json()

                        if (!data.session) return
                        if (data.session.status === SessionStatus.FAILED) throw new ProviderFailedError()
                        if (data.session.proofs.length === 0) return

                        const proof = data.session.proofs[0]
                        const verified = await Reclaim.verifySignedProof(proof)
                        if (!verified) {
                            throw new ProofNotVerifiedError()
                        }
                        if (onSuccessCallback) {
                            try {
                                await updateSession(this.sessionId, SessionStatus.SDK_RECEIVED)
                            } catch (e) {
                                logger.error(e)
                            }
                            onSuccessCallback(data.session.proofs)
                        }
                        clearInterval(this.intervals.get(this.sessionId!))
                        this.intervals.delete(this.sessionId!)
                    } catch (e) {
                        if (!(e instanceof ProviderFailedError)) {
                            try {
                                await updateSession(this.sessionId, SessionStatus.FAILED)
                            } catch (e) {
                                logger.error(e)
                            }
                        }
                        if (onFailureCallback) {
                            onFailureCallback(e as Error)
                        }
                        clearInterval(this.intervals.get(this.sessionId!))
                        this.intervals.delete(this.sessionId!)
                    }
                }, 3000)

                this.intervals.set(this.sessionId, interval)
                this.scheduleIntervalEndingTask(onFailureCallback)
            } else {
                const message =
                    "Session can't be started due to undefined value of statusUrl and sessionId"
                logger.error(message)
                throw new SessionNotStartedError(message)
            }
        }

        scheduleIntervalEndingTask(onFailureCallback: OnFailureCallback) {
            setTimeout(async () => {
                if (this.intervals.has(this.sessionId)) {
                    const message = 'Interval ended without receiveing proofs'
                    await updateSession(this.sessionId, SessionStatus.FAILED)
                    onFailureCallback(new TimeoutError(message))
                    logger.warn(message)
                    clearInterval(this.intervals.get(this.sessionId!))
                }
            }, 1000 * 60 * 10)
        }

        availableParams(): string[] {
            const requestedProofs = this.getRequestedProofs();

            if (!requestedProofs || !this.requestedProofs) {
                throw new BuildProofRequestError(
                    'Requested proofs are not built yet. Call buildProofRequest(providerId: string) first!'
                );
            }
            let availableParamsStore = Object.keys(requestedProofs.claims[0].payload.parameters)
            availableParamsStore = availableParamsStore.concat(requestedProofs.claims[0].payload.url
                .split(/{{(.*?)}}/)
                .filter((_: string, i: number) => i % 2))
            availableParamsStore = availableParamsStore.concat(requestedProofs.claims[0].payload.login.url
                .split(/{{(.*?)}}/)
                .filter((_: string, i: number) => i % 2))

            return [...new Set(availableParamsStore)];
        }

        setParams(params: { [key: string]: string }): NoReturn {
            try {
                const requestedProofs = this.getRequestedProofs();

                if (!requestedProofs || !this.requestedProofs) {
                    throw new BuildProofRequestError(
                        'Requested proofs are not built yet. Call buildProofRequest(providerId: string) first!'
                    );
                }
                const availableParams = this.availableParams()
                const paramsToSet = Object.keys(params)
                for (let i = 0; i < paramsToSet.length; i++) {
                    if (requestedProofs.claims[0].payload.verificationType === 'WITNESS' && !availableParams.includes(paramsToSet[i])) {
                        throw new InvalidParamError(
                            `Cannot Set parameter ${paramsToSet[i]} for provider ${this.providerId} available Prameters inculde : ${availableParams}`
                        );
                    }
                }
                this.requestedProofs.claims[0].payload.parameters = { ...requestedProofs.claims[0].payload.parameters, ...params }

            } catch (error) {
                logger.error('Error Setting Params:', error);
                throw error;
            }
        }
    }
}
