# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [5.7.0]

### Added

- New `ProofRequestOptions.orgId` option for partner organization attribution (e.g. the SheerID orgId). When set, the SDK includes it in the body of its own session status updates (`SESSION_STARTED`, `SESSION_CANCELLED`) and embeds it top-level in the request template so the verification client forwards it on every status update it posts. Round-trips through `toJsonString`/`fromJsonString`. Optional and omitted entirely when unset; it has no effect on the verification process.

## [5.6.2]

### Fix

- Inclusion of parameters from `JSON.parse($.claimData.parameters).paramValues` along with `JSON.parse($.claimData.context).extractedParameters`.

## [5.6.1]

### Added

- `RequestSpec.templateParamsMode` (`'separate' | 'merge'`, defaults to `'separate'`) controls how `generateSpecsFromRequestSpecTemplate` expands a template with multiple `templateParams` values. `'separate'` is the existing/default behavior — one independent spec (and expected hash) per value, matching N separate proofs. `'merge'` is new: it folds every value into a single spec whose `responseMatches`/`responseRedactions` gain one entry per value, matching one proof that bundles many values into a single claim (e.g. a `customInjection` provider that proves 30+ playlist names in one claim instead of 30 separate ones). See the README's "Provider Authors: Validating Dynamically Injected Claims" section for examples.

## [5.6.0]

- Enable deferred deep links for android by default.
- Add opt-in for deferred deep links for iOS. Defaults to app clip.

## [5.5.0]

### Added

- New `ReclaimProofRequest.cancelSession()` method to deliberately cancel an in-progress verification (e.g. the user navigates away before a proof is produced). It tears down all local session machinery — the status polling interval, the 10-minute interval-ending timeout, and any portal UI (modal / tab / embedded iframe) — and marks the session `SESSION_CANCELLED` on the backend. `onSuccess` / `onError` are intentionally not invoked; cancellation is a silent, deliberate teardown rather than a verification outcome. Safe to call multiple times; a no-op when no session is active.
- New `SessionStatus.SESSION_CANCELLED` enum value. Marking a session cancelled lets the portal treat it as a clean terminal state, so an abandoned session is not later reported as a connection failure to the (typically shared) cancel/error callback URL — preventing a stale session from contaminating the next one in multi-session flows.

## [5.4.1]

### Fixed

- `startSession` now validates submitted proofs against the version the backend actually used for the session (read from `session.providerVersionString` on the status response) instead of the version resolved at init. Previously, if a provider's AI patch (e.g. `1.0.0-ai.6`) was created mid-session and the proof was generated against that patch, the default-callback validation path threw `UnknownProofsNotValidatedError` because it kept asking for hashes against the init-time base version. Callers that pass an explicit `verificationConfig` to `startSession` are unaffected.

## [5.4.0]

### Added

- New `ReclaimProofRequest.initWithSignature(applicationId, providerId, sessionAuth, options)` static method that initializes a proof request from a pre-computed signature, so `appSecret` never has to be shipped to the client.
- New `generateInitSignature(appSecret, providerId, timestamp)` helper, intended for server-side use, that produces the signature `initWithSignature` expects (over canonicalized `{providerId, timestamp}`).
- Export `generateAttestationNonce` so backends can compute the TEE attestation nonce after `sessionId` is known and return it via the `getAttestationNonce` callback on `initWithSignature`. When `acceptTeeAttestation` is enabled, `initWithSignature` requires this callback and throws otherwise.

## [5.3.0]

### Added

- Request TEE attestations by default when initializing proof requests.
- Include the SDK-controlled TEE attestation version in request templates and attestation nonce context so attestors can keep older SDK clients on compatible proof formats.
- Add example support for server-side TEE attestation verification and displaying returned TEE proof details.

### Fixed

- Support v3 TEE digest binding verification while keeping v2 verification compatible.

## [5.2.0]

### Changed

- **Breaking:** `verifyTeeAttestation` now takes `(proof, appSecret)` instead of `(proof)`. It performs full GCP attestation verification and returns `{ isVerified, error? }` instead of a boolean. The application ID is derived from `appSecret` automatically.
- **Breaking:** `verifyProof` config option renamed from `verifyTEE: boolean` to `teeAttestation: { appSecret }`. The app secret is now required so the SDK can verify application binding and recompute the attestation nonce.
- **Breaking:** Renamed `isTeeVerified` to `isTeeAttestationVerified` on `VerifyProofResult`. Now returns `true` when TEE verification passes and `undefined` when not requested (previously `false`).

### Added

- GCP TEE attestation verification: OIDC token signature validation, platform claims, nonce/digest binding, application and session binding.
- New `runTeeVerification(proofs, config)` export for batch TEE verification that throws `TeeVerificationError` on failure.
- `TeeVerificationError` exported for catching TEE-specific failures.

## [5.1.0]

### Changed

- Refactor `VerifyProofResult` type into a discriminated union (`VerifyProofResultSuccess` and `VerifyProofResultFailure`).

### Added

- Include `publicData` in successful `VerifyProofResult` (type `VerifyProofResultSuccess`) responses.
- Add `verificationConfig` parameter to `startSession` method.

## [5.0.1]

### Added

- Update type of `hash` field to include `oprf-raw` as a hashing method in `ResponseRedactionSpec` interface.
