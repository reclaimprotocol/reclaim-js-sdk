# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [5.1.0]

### Changed

- Refactor `VerifyProofResult` type into a discriminated union (`VerifyProofResultSuccess` and `VerifyProofResultFailure`).

### Added

- Include `publicData` in successful `VerifyProofResult` (type `VerifyProofResultSuccess`) responses.
- Add `verificationConfig` parameter to `startSession` method.

## [5.0.1]

### Added

- Update type of `hash` field to include `oprf-raw` as a hashing method in `ResponseRedactionSpec` interface.
