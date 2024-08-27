import type { Proof, ProviderClaimData } from './interfaces';
import type { ParsedQs } from 'qs';

export type ClaimID = ProviderClaimData['identifier'];

export type ClaimInfo = Pick<
  ProviderClaimData,
  'context' | 'provider' | 'parameters'
>;

export type AnyClaimInfo =
  | ClaimInfo
  | {
    identifier: ClaimID;
  };

export type CompleteClaimData = Pick<
  ProviderClaimData,
  'owner' | 'timestampS' | 'epoch'
> &
  AnyClaimInfo;

export type SignedClaim = {
  claim: CompleteClaimData;
  signatures: Uint8Array[];
};

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

export type CreateVerificationRequest = {
  providerIds: string[];
  applicationSecret?: string;
}

export type StartSessionParams = {
  onSuccessCallback: OnSuccessCallback;
  onFailureCallback: OnFailureCallback;
}

export type OnSuccessCallback = (proofs: Proof[]) => void;
export type OnFailureCallback = (error: Error) => void;

export type ProofRequestOptions = {
  log?: boolean;
  sessionId?: string;
}
export enum SessionStatus {
  PENDING = 'PENDING',
  SDK_STARTED = 'SDK_STARTED',
  MOBILE_RECEIVED = 'MOBILE_RECEIVED',
  MOBILE_SUBMITTED = 'MOBILE_SUBMITTED',
  SDK_RECEIVED = 'SDK_RECEIVED',
  FAILED = 'FAILED',
}

export type ApplicationId = string;
export type Signature = string;
export type AppCallbackUrl = string;
export type SessionId = string;
export type StatusUrl = string;
export type RequestUrl = string;
export type NoReturn = void;