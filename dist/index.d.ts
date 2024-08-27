interface ProviderV2 {
    id: string;
    httpProviderId: string;
    name: string;
    logoUrl: string;
    url: string;
    method?: 'GET' | 'POST';
    loginUrl: string;
    responseSelections: {
        invert: boolean;
        responseMatch: string;
        xPath?: string | undefined;
        jsonPath?: string | undefined;
    }[];
    headers?: {
        [key: string]: string;
    };
    creatorEmail: string;
    applicationId: string[];
    iconPath: {
        uri: string;
    };
    customInjection?: string;
    urlType: 'CONSTANT' | 'REGEX';
    proofCardTitle: string;
    proofCardText: string;
    bodySniff?: {
        enabled: boolean;
        regex?: string;
    };
    userAgent?: {
        ios?: string;
        android?: string;
    };
    geoLocation?: string;
    matchType?: string;
    injectionType: string;
    verificationType: string;
    disableRequestReplay: boolean;
}
interface ResponseSelection {
    JSONPath: string;
    XPath: string;
    responseMatch: string;
}
interface BodySniff {
    enabled: boolean;
    regex: string;
}
interface Proof {
    identifier: string;
    claimData: ProviderClaimData;
    signatures: string[];
    witnesses: WitnessData[];
    extractedParameterValues: any;
    publicData?: {
        [key: string]: string;
    };
}
interface WitnessData {
    id: string;
    url: string;
}
interface ProviderClaimData {
    provider: string;
    parameters: string;
    owner: string;
    timestampS: number;
    context: string;
    /**
     * identifier of the claim;
     * Hash of (provider, parameters, context)
     *
     * This is different from the claimId returned
     * from the smart contract
     */
    identifier: string;
    epoch: number;
}
interface RequestedProofs {
    id: string;
    sessionId: string;
    name: string;
    callbackUrl: string;
    statusUrl: string;
    claims: RequestedClaim[];
}
interface RequestedClaim {
    provider: string;
    context: string;
    httpProviderId: string;
    payload: Payload;
}
interface Payload {
    metadata: {
        name: string;
        logoUrl: string;
        proofCardTitle: string;
        proofCardText: string;
    };
    url: string;
    urlType: 'CONSTANT' | 'REGEX';
    method: 'GET' | 'POST';
    login: {
        url: string;
    };
    responseSelections: {
        invert: boolean;
        responseMatch: string;
        xPath?: string;
        jsonPath?: string;
    }[];
    headers?: {
        [key: string]: string;
    };
    customInjection?: string;
    bodySniff?: {
        enabled: boolean;
        regex?: string;
    };
    userAgent?: {
        ios?: string;
        android?: string;
    };
    geoLocation?: string;
    matchType?: string;
    injectionType: string;
    verificationType: string;
    disableRequestReplay: boolean;
    parameters: {
        [key: string]: string | undefined;
    };
}
interface Context {
    contextAddress: string;
    contextMessage: string;
}
interface Beacon {
    /**
     * Get the witnesses for the epoch specified
     * or the current epoch if none is specified
     */
    getState(epoch?: number): Promise<BeaconState>;
    close?(): Promise<void>;
}
type BeaconState = {
    witnesses: WitnessData[];
    epoch: number;
    witnessesRequiredForClaim: number;
    nextEpochTimestampS: number;
};

type StartSessionParams = {
    onSuccessCallback: OnSuccessCallback;
    onFailureCallback: OnFailureCallback;
};
type OnSuccessCallback = (proofs: Proof[]) => void;
type OnFailureCallback = (error: Error) => void;
type ProofRequestOptions = {
    log?: boolean;
    sessionId?: string;
};
type ApplicationId = string;
type Signature = string;
type AppCallbackUrl = string;
type SessionId = string;
type StatusUrl = string;
type NoReturn = void;

declare class Reclaim {
    static verifySignedProof(proof: Proof): Promise<boolean>;
    static transformForOnchain(proof: Proof): {
        claimInfo: {
            [k: string]: string;
        };
        signedClaim: {
            claim: {
                [k: string]: string | number;
            };
            signatures: string[];
        };
    };
    static verifyProvider(proof: Proof, providerHash: string): boolean;
    static ProofRequest: {
        new (applicationId: string, options?: ProofRequestOptions): {
            applicationId: ApplicationId;
            signature?: string | undefined;
            appCallbackUrl?: string | undefined;
            sessionId: SessionId;
            statusUrl?: string | undefined;
            context: Context;
            requestedProofs?: RequestedProofs | undefined;
            providerId?: string | undefined;
            redirectUrl?: string | undefined;
            intervals: Map<string, NodeJS.Timer>;
            linkingVersion: string;
            timeStamp: string;
            addContext(address: string, message: string): NoReturn;
            setAppCallbackUrl(url: string): NoReturn;
            setRedirectUrl(url: string): NoReturn;
            setStatusUrl(url: string): NoReturn;
            setSignature(signature: Signature): NoReturn;
            getAppCallbackUrl(): AppCallbackUrl;
            getStatusUrl(): StatusUrl;
            getRequestedProofs(): RequestedProofs;
            generateSignature(applicationSecret: string): Promise<Signature>;
            buildProofRequest(providerId: string, redirectUser?: boolean, linkingVersion?: string): Promise<RequestedProofs>;
            createVerificationRequest(): Promise<{
                statusUrl: StatusUrl;
                requestUrl: string;
            }>;
            startSession({ onSuccessCallback, onFailureCallback }: StartSessionParams): Promise<void>;
            scheduleIntervalEndingTask(onFailureCallback: OnFailureCallback): void;
            availableParams(): string[];
            setParams(params: {
                [key: string]: string;
            }): NoReturn;
        };
    };
}

export { type Beacon, type BeaconState, type BodySniff, type Context, type Payload, type Proof, type ProviderClaimData, type ProviderV2, Reclaim, type RequestedClaim, type RequestedProofs, type ResponseSelection, type WitnessData };
