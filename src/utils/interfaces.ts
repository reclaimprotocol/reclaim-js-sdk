// Provider-related interfaces
export interface ProviderData {
  httpProviderId: string;
  name: string;
  url: string;
  loginUrl: string;
  responseSelections: ResponseSelection[];
  bodySniff?: BodySniff;
}

export interface ResponseSelection {
  invert: boolean;
  responseMatch: string;
  xPath?: string;
  jsonPath?: string;
}

export interface BodySniff {
  enabled: boolean;
  regex?: string;
  template?: string;
}

// Proof-related interfaces
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
  identifier: string;
  epoch: number;
}

// Request-related interfaces
export interface RequestedProof {
  url: string;
  parameters: { [key: string]: string };
}

// Context and Beacon interfaces
export interface Context {
  contextAddress: string;
  contextMessage: string;
}

export interface Beacon {
  getState(epoch?: number): Promise<BeaconState>;
  close?(): Promise<void>;
}

export type BeaconState = {
  witnesses: WitnessData[];
  epoch: number;
  witnessesRequiredForClaim: number;
  nextEpochTimestampS: number;
};


