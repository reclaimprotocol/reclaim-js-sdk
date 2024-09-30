import type { Context, Proof, ProviderClaimData, ProviderData, RequestedProof } from './interfaces';
import type { ParsedQs } from 'qs';

// Claim-related types
export type ClaimID = ProviderClaimData['identifier'];

export type ClaimInfo = Pick<ProviderClaimData, 'context' | 'provider' | 'parameters'>;

export type AnyClaimInfo = ClaimInfo | { identifier: ClaimID };

export type CompleteClaimData = Pick<ProviderClaimData, 'owner' | 'timestampS' | 'epoch'> & AnyClaimInfo;

export type SignedClaim = {
  claim: CompleteClaimData;
  signatures: Uint8Array[];
};

// URL and query-related types
export type QueryParams = ParsedQs;

// @needsAudit @docsMissing
export type ParsedURL = {
  scheme: string | null;
  hostname: string | null;
  /**
   * The path into the app specified by the URL.
   */
  path: string | null;
  /**
   * The set of query parameters specified by the query string of the url used to open the app.
   */
  queryParams: QueryParams | null;
};

// Request and session-related types
export type CreateVerificationRequest = {
  providerIds: string[];
  applicationSecret?: string;
};

export type StartSessionParams = {
  onSuccess: OnSuccess;
  onError: OnError;
};

export type OnSuccess = (proof: Proof) => void;
export type OnError = (error: Error) => void;

export type ProofRequestOptions = {
  log?: boolean;
  acceptAiProviders?: boolean;
};

// Session and response types
export type InitSessionResponse = {
  sessionId: string;
  provider: ProviderData;
};

export interface UpdateSessionResponse {
  success: boolean;
  message?: string;
};

export enum SessionStatus {
  SESSION_INIT = 'SESSION_INIT',
  SESSION_STARTED = 'SESSION_STARTED',
  USER_INIT_VERIFICATION = 'USER_INIT_VERIFICATION',
  USER_STARTED_VERIFICATION = 'USER_STARTED_VERIFICATION',
  PROOF_GENERATION_STARTED = 'PROOF_GENERATION_STARTED',
  PROOF_GENERATION_SUCCESS = 'PROOF_GENERATION_SUCCESS',
  PROOF_GENERATION_FAILED = 'PROOF_GENERATION_FAILED',
  PROOF_SUBMITTED = 'PROOF_SUBMITTED',
  PROOF_MANUAL_VERIFICATION_SUBMITED = 'PROOF_MANUAL_VERIFICATION_SUBMITED',
};

// JSON and template-related types
export type ProofPropertiesJSON = {
  applicationId: string;
  providerId: string;
  sessionId: string;
  context: Context;
  requestedProof: RequestedProof;
  signature: string;
  redirectUrl?: string;
  timeStamp: string;
  appCallbackUrl?: string;
  options?: ProofRequestOptions;
};

export type TemplateData = {
  sessionId: string;
  providerId: string;
  applicationId: string;
  signature: string;
  timestamp: string;
  callbackUrl: string;
  context: string;
  parameters: { [key: string]: string | string };
  redirectUrl: string;
  acceptAiProviders: boolean;
};