import type { Context, Proof, ProviderClaimData } from './interfaces';

// Claim-related types
export type ClaimID = ProviderClaimData['identifier'];

export type ClaimInfo = Pick<ProviderClaimData, 'context' | 'provider' | 'parameters'>;

export type AnyClaimInfo = ClaimInfo | { identifier: ClaimID };

export type CompleteClaimData = Pick<ProviderClaimData, 'owner' | 'timestampS' | 'epoch'> & AnyClaimInfo;

export type SignedClaim = {
  claim: CompleteClaimData;
  signatures: Uint8Array[];
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

export type OnSuccess = (proof?: Proof | Proof[] | string) => void;
export type OnError = (error: Error) => void;

export type ProofRequestOptions = {
  /**
   * Enables troubleshooting mode and more verbose logging
   */
  log?: boolean;
  /**
   * Accepts AI providers in the verification flow
   */
  acceptAiProviders?: boolean;
  useAppClip?: boolean;
  device?: string;
  envUrl?: string;
  useBrowserExtension?: boolean;
  extensionID?: string;
  providerVersion?: string;
  customSharePageUrl?: string;
  customAppClipUrl?: string;
  launchOptions?: ReclaimFlowLaunchOptions;
  /**
   * Whether the verification client should automatically submit necessary proofs once they are generated.
   * If set to false, the user must manually click a button to submit.
   * 
   * @since 4.7.0
   * @default true
   */
  canAutoSubmit?: boolean;
  /**
   * An identifier used to select a user's language and formatting preferences.
   * 
   * Locales are expected to be canonicalized according to the "preferred value" entries in the [IANA Language Subtag Registry](https://www.iana.org/assignments/language-subtag-registry/language-subtag-registry). 
   * For example, `he`, and `iw` are equal and both have the languageCode `he`, because `iw` is a deprecated language subtag that was replaced by the subtag `he`.
   * 
   * Defaults to the browser's locale if available, otherwise English (en).
   * 
   * For more info, refer: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl#description
   * 
   * @since 4.9.0
   */
  preferredLocale?: string;
  /**
   * Additional metadata to pass to the verification client.
   * This can be used to customize the client experience, such as customizing themes or UI by passing context-specific information.
   * The keys and values must be strings. For most clients, this is not required and goes unused.
   * 
   * This has no effect on the verification process.
   * 
   * Example: `{ theme: 'dark', verify_another_way_link: 'https://exampe.org/alternative-verification?id=1234' }`
   * 
   * @since 4.7.0
   */
  metadata?: Record<string, string>;
};

export type ReclaimFlowLaunchOptions = {
  /**
   * Enables deferred deep links for the Reclaim verification flow.
   *
   * When enabled, users without the verifier app installed will receive a deferred deep link
   * that automatically launches the verification flow after they install the app, ensuring
   * a seamless continuation of the verification process.
   *
   * **Platform Support:** Currently Android only
   *
   * **Default Behavior:** Opt-in during rollout phase. Will default to `true` for all apps
   * once fully released. See: https://blog.reclaimprotocol.org/posts/moving-beyond-google-play-instant
   */
  canUseDeferredDeepLinksFlow?: boolean;
}

// Modal customization options
export type ModalOptions = {
  title?: string;
  description?: string;
  extensionUrl?: string;
  darkTheme?: boolean;
  modalPopupTimer?: number;
  showExtensionInstallButton?: boolean;
  onClose?: () => void;
};

// JSON-safe modal options (excludes non-serializable functions)
export type SerializableModalOptions = Omit<ModalOptions, 'onClose'>;

// Claim creation type enum
export enum ClaimCreationType {
  STANDALONE = 'createClaim',
  ON_ME_CHAIN = 'createClaimOnMechain'
}

// Device type enum 
export enum DeviceType {
  ANDROID = 'android',
  IOS = 'ios',
  DESKTOP = 'desktop',
  MOBILE = 'mobile'
}


// Session and response types
export type InitSessionResponse = {
  sessionId: string;
  resolvedProviderVersion: string;
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
  AI_PROOF_SUBMITTED = 'AI_PROOF_SUBMITTED',
  PROOF_SUBMISSION_FAILED = 'PROOF_SUBMISSION_FAILED',
  ERROR_SUBMITTED = 'ERROR_SUBMITTED',
  ERROR_SUBMISSION_FAILED = 'ERROR_SUBMISSION_FAILED',
  PROOF_MANUAL_VERIFICATION_SUBMITED = 'PROOF_MANUAL_VERIFICATION_SUBMITED',
};

// JSON and template-related types
export type ProofPropertiesJSON = {
  applicationId: string;
  providerId: string;
  sessionId: string;
  context: Context;
  signature: string;
  redirectUrl?: string;
  parameters: { [key: string]: string };
  /**
   * @deprecated use timestamp instead (maintained for compatibility)
   */
  timeStamp?: string;
  timestamp?: string; // new timestamp field
  appCallbackUrl?: string;
  errorCallbackUrl?: TemplateData['errorCallbackUrl'];
  errorRedirectUrl?: TemplateData['errorRedirectUrl'];
  claimCreationType?: ClaimCreationType;
  options?: ProofRequestOptions;
  sdkVersion: string;
  jsonProofResponse?: boolean;
  resolvedProviderVersion: string;
  modalOptions?: SerializableModalOptions;
};

export type TemplateData = {
  sessionId: string;
  providerId: string;
  applicationId: string;
  signature: string;
  timestamp: string;
  callbackUrl: string;
  context: string;
  parameters: { [key: string]: string };
  redirectUrl: string;
  errorCallbackUrl?: string | null;
  errorRedirectUrl?: string | null;
  acceptAiProviders: boolean;
  sdkVersion: string;
  jsonProofResponse?: boolean;
  providerVersion?: string;
  resolvedProviderVersion: string;
  log?: boolean;
  canAutoSubmit?: boolean;
  metadata?: Record<string, string>;
  preferredLocale?: ProofRequestOptions['preferredLocale'];
};

// Add the new StatusUrlResponse type
export type StatusUrlResponse = {
  message: string;
  session?: {
    id: string;
    appId: string;
    httpProviderId: string[];
    sessionId: string;
    proofs?: Proof[];
    statusV2: string;
  };
  providerId?: string;
};