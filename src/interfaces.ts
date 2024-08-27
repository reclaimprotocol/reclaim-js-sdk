export interface ProviderV2 {
  id: string
  httpProviderId: string
  name: string
  logoUrl: string
  url: string
  method?: 'GET' | 'POST'
  loginUrl: string
  responseSelections: {
    invert: boolean
    responseMatch: string
    xPath?: string | undefined
    jsonPath?: string | undefined
  }[]
  headers?: { [key: string]: string }
  creatorEmail: string
  applicationId: string[]
  iconPath: { uri: string }
  customInjection?: string
  urlType: 'CONSTANT' | 'REGEX'
  proofCardTitle: string
  proofCardText: string
  bodySniff?: {
    enabled: boolean
    regex?: string
  }
  userAgent?: {
    ios?: string
    android?: string
  }
  geoLocation?: string
  matchType?: string
  injectionType: string
  verificationType: string
  disableRequestReplay: boolean
}

export interface ResponseSelection {
  JSONPath: string;
  XPath: string;
  responseMatch: string;
}

export interface BodySniff {
  enabled: boolean;
  regex: string;
}

export interface Proof {
  identifier: string;
  claimData: ProviderClaimData;
  signatures: string[];
  witnesses: WitnessData[];
  extractedParameterValues: any;
  publicData?: { [key: string]: string };
}

export interface WitnessData {
  id: string;
  url: string;
}

export interface ProviderClaimData {
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

export interface RequestedProofs {
  id: string;
  sessionId: string;
  name: string;
  callbackUrl: string;
  statusUrl: string;
  claims: RequestedClaim[];
}
export interface RequestedClaim {
  provider: string;
  context: string;
  httpProviderId: string;
  payload: Payload;
}
export interface Payload {
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
    invert: boolean
    responseMatch: string;
    xPath?: string;
    jsonPath?: string;
  }[];
  headers?: { [key: string]: string };
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
  injectionType: string
  verificationType: string
  disableRequestReplay: boolean
  parameters: { [key: string]: string | undefined }
}

export interface Context {
  contextAddress: string;
  contextMessage: string;
}

export interface Beacon {
  /**
   * Get the witnesses for the epoch specified
   * or the current epoch if none is specified
   */
  getState(epoch?: number): Promise<BeaconState>;

  close?(): Promise<void>;
}

export type BeaconState = {
  witnesses: WitnessData[];
  epoch: number;
  witnessesRequiredForClaim: number;
  nextEpochTimestampS: number;
};
