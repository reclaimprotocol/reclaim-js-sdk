import type { Context, Proof, ProviderClaimData, TeeAttestation } from './interfaces';
import { InjectedRequestSpec, InterceptorRequestSpec, ProviderHashRequirementsConfig, RequestSpec, ResponseMatchSpec, ResponseRedactionSpec } from './providerUtils';

// Claim-related types
export type ClaimID = ProviderClaimData['identifier'];

export type ClaimInfo = Pick<ProviderClaimData, 'context' | 'provider' | 'parameters'>;

export type CompleteClaimData = Pick<ProviderClaimData, 'owner' | 'timestampS' | 'epoch'>
  & ClaimInfo;

export interface HttpProviderClaimParams {
  body?: string | null;
  method: RequestSpec['method'];
  responseMatches: ResponseMatchSpec[]
  responseRedactions: ResponseRedactionSpec[]
  url: string;
}

export interface HashableHttpProviderClaimParams {
  body: string;
  method: RequestSpec['method'];
  responseMatches: (Omit<ResponseMatchSpec, 'isOptional'>)[]
  responseRedactions: ResponseRedactionSpec[]
  url: string;
}

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

export type OnSuccess = (proof?: Proof | Proof[]) => void;
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
  /**
   * @deprecated Use `portalUrl` instead.
   */
  customSharePageUrl?: string;
  /**
   * URL of the portal/share page for the verification flow.
   *
   * @default 'https://portal.reclaimprotocol.org'
   */
  portalUrl?: string;
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
   * Additional metadata to pass to the verification client frontend.
   * This can be used to customize the client UI experience, such as customizing themes or UI by passing context-specific information.
   * The keys and values must be strings. For most clients, this is not required and goes unused.
   *
   * This has no effect on the verification process.
   *
   * Example: `{ theme: 'dark', verify_another_way_link: 'https://exampe.org/alternative-verification?id=1234' }`
   *
   * @since 4.7.0
   */
  metadata?: Record<string, string>;
  /**
   * If true, generates a TEE attestation nonce during session initialization and expects a TEE attestation in the proof.
   */
  acceptTeeAttestation?: boolean;
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
  /**
   * Verification mode for the flow.
   *
   * - `'portal'`: Opens the portal URL in the browser (remote browser verification).
   * - `'app'`: Verifier app flow via the share page. If `useAppClip` is `true`, uses App Clip on iOS.
   *
   * Can be set at call time via `triggerReclaimFlow({ verificationMode })` or `getRequestUrl({ verificationMode })`,
   * or at init time via `launchOptions: { verificationMode }`.
   *
   * @default 'portal'
   */
  verificationMode?: 'app' | 'portal';
  /**
   * Target DOM element to embed the verification flow in an iframe.
   * When provided, the portal opens inside the element instead of a new tab.
   * Use `closeEmbeddedFlow()` to remove the iframe programmatically.
   *
   * Only applies to portal mode.
   */
  target?: HTMLElement;
}

/**
 * Handle returned by `triggerReclaimFlow` to control the launched flow.
 */
export type FlowHandle = {
  /** Closes the flow (removes iframe, closes tab, stops polling) */
  close: () => void;
  /** The iframe element when using embedded mode, `undefined` otherwise */
  iframe?: HTMLIFrameElement;
  /** The tab/window reference when using new tab mode, `undefined` otherwise */
  tab?: Window | null;
}

/** Alias for `FlowHandle` */
export type EmbeddedFlowHandle = FlowHandle;

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
  redirectUrlOptions?: TemplateData['redirectUrlOptions'];
  parameters: { [key: string]: string };
  /**
   * @deprecated use timestamp instead (maintained for compatibility)
   */
  timeStamp?: string;
  timestamp?: string; // new timestamp field
  appCallbackUrl?: string;
  cancelCallbackUrl?: TemplateData['cancelCallbackUrl'];
  cancelRedirectUrl?: TemplateData['cancelRedirectUrl'];
  cancelRedirectUrlOptions?: TemplateData['cancelRedirectUrlOptions'];
  claimCreationType?: ClaimCreationType;
  options?: ProofRequestOptions;
  sdkVersion: string;
  jsonProofResponse?: boolean;
  resolvedProviderVersion: string;
  modalOptions?: SerializableModalOptions;
  teeAttestation?: TeeAttestation | string;
};

export type HttpFormEntry = {
  name: string;
  value: string;
}

export type HttpRedirectionMethod = 'GET' | 'POST';

/**
 * Options for HTTP redirection.
 *
 * Only supported by Portal flow.
 * On other SDKs, this will be ignored and a GET redirection will be performed with the URL.
 *
 * @since 4.11.0
 * @default "{ method: 'GET' }"
 */
export type HttpRedirectionOptions = {
  /**
   * List of name-value pairs to be sent as the body of the form request.
   * When `method` is set to `POST`, `body` will be sent with 'application/x-www-form-urlencoded' content type.
   * When `method` is set to `GET`, `body` will be sent as query parameters.
   *
   * @default undefined
   */
  body?: HttpFormEntry[] | null | undefined;
  /**
   * HTTP method to use for the redirection.
   *
   * POST will result in `body` being sent with 'application/x-www-form-urlencoded' content type.
   * GET will result in `body`, if present, being sent as query parameters.
   *
   * With `method` set to `GET` and no `body`, this will result in a simple GET redirection using `window.location.href`.
   *
   * @default 'GET'
   */
  method?: HttpRedirectionMethod;
}

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
  redirectUrlOptions?: HttpRedirectionOptions;
  cancelCallbackUrl?: string | null;
  cancelRedirectUrl?: string | null;
  cancelRedirectUrlOptions?: HttpRedirectionOptions;
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

export type TrustedData = {
  context: Record<string, unknown>;
  extractedParameters: Record<string, string>;
};

// Verify proof result type
export type VerifyProofResult = {
  isVerified: boolean;
  isTeeVerified?: boolean;
  data: TrustedData[];
  error?: Error;
}

export type ProviderVersionConfig = {
  major?: number;
  minor?: number;
  patch?: number;
  prereleaseTag?: string;
  prereleaseNumber?: number;
}

// Add the new StatusUrlResponse type
export type StatusUrlResponse = {
  message: string;
  session?: {
    id: string;
    appId: string;
    httpProviderId: string[];
    providerId: string;
    providerVersionString: string;
    sessionId: string;
    proofs?: Proof[];
    statusV2: string;
    error?: { type: string; message: string };
  };
  providerId?: string;
};

export type ProviderConfigResponse = {
  message: string;
  providers?: ReclaimProviderConfig[];
  providerId?: string;
  providerVersionString?: string;
};

export interface ReclaimProviderConfig {
  loginUrl: string;
  customInjection: string;
  geoLocation: string;
  injectionType: string;
  disableRequestReplay: boolean;
  verificationType: string;
  requestData: InterceptorRequestSpec[];
  allowedInjectedRequestData: InjectedRequestSpec[];
}


export type ProviderHashRequirementsResponse = {
  message?: string;
  hashRequirements?: ProviderHashRequirementsConfig;
  providerId?: string;
  providerVersionString?: string;
};
