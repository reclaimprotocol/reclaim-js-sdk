# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
