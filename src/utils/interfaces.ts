// Proof-related interfaces
export interface Proof {
  identifier: string;
  claimData: ProviderClaimData;
  signatures: string[];
  witnesses: WitnessData[];
  extractedParameterValues: any;
  publicData?: { [key: string]: string };
  taskId?: number;
}

// Extension Interactions
export const RECLAIM_EXTENSION_ACTIONS = {
  CHECK_EXTENSION: 'RECLAIM_EXTENSION_CHECK',
  EXTENSION_RESPONSE: 'RECLAIM_EXTENSION_RESPONSE',
  START_VERIFICATION: 'RECLAIM_START_VERIFICATION',
  STATUS_UPDATE: 'RECLAIM_STATUS_UPDATE',
};

export interface ExtensionMessage {
  action: string;
  messageId: string;
  data?: any;
  extensionID?: string;
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


