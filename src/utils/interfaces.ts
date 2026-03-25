export interface TeeAttestation {
  workload_digest: string;
  verifier_digest: string;
  nonce: string;
  snp_report: string;
  vlek_cert: string;
  timestamp: string;
}

// Proof-related interfaces
export interface Proof {
  identifier: string;
  claimData: ProviderClaimData;
  signatures: string[];
  witnesses: WitnessData[];
  extractedParameterValues: any;
  publicData?: { [key: string]: string };
  taskId?: number;
  teeAttestation?: TeeAttestation;
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
  reclaimSessionId: string;
  extractedParameters?: Record<string, string>;
  providerHash?: string;
  attestationNonce?: string;
  attestationNonceData?: {
    applicationId: string;
    sessionId: string;
    timestamp: string;
  };
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

/**
 * Information of the exact provider and its version used in the verification session.
 * 
 * See also:
 * 
 * * `ReclaimProofRequest.getProviderVersion()` - With a ReclaimProofRequest object, you can get the provider id & exact version of provider used in verification session.
 */
export interface ProviderVersionInfo {
  /**
   * The identifier of provider used in verifications that resulted in a proof
   * 
   * See also:
   * 
   * * `ReclaimProofRequest.getProviderVersion()` - With a ReclaimProofRequest object, you can get the provider id & exact version of provider used in verification session.
   */
  providerId: string;
  /**
   * The exact version of provider used in verifications that resulted in a proof.
   * 
   * This cannot be a version constaint or version expression.
   * 
   * See also:
   * 
   * * `ReclaimProofRequest.getProviderVersion()` - With a ReclaimProofRequest object, you can get the provider id & exact version of provider used in verification session.
   */
  providerVersion: string;
  /**
   * List of allowed pre-release tags.
   * For example, if you are using AI, provide `['ai']` to allow AI patch versions of the provider.
   */
  allowedTags: string[];
}