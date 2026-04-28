# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Support for credential revocation by the issuer.
- `Revoked` status on the frontend to reflect a credential's state accurately.

### Changed
- Refined Daml Script tests to cover edge cases like duplicate verification requests.

## [0.1.0] - 2024-10-26

### Added
- **Daml Models**: Initial smart contracts for the shielded identity lifecycle.
  - `Kyc.IssuerRole`: Contract establishing an entity (e.g., a bank) as a trusted credential issuer.
  - `Kyc.CredentialRequest`: A user can request a KYC credential from a registered `Issuer`.
  - `Kyc.Credential`: The issued ZK-enabled credential, held by the user and known only to the user and issuer.
  - `Kyc.VerificationRequest`: A verifier (e.g., a dApp) can request proof of a valid credential from a user.
  - `Kyc.VerifiedReceipt`: A receipt confirming successful verification for a specific dApp, without revealing the issuer or user's PII.
- **Daml Scripts**: Test suite covering the happy path:
  - Issuer setup.
  - User requests a credential.
  - Issuer approves and issues the credential.
  - Verifier requests verification.
  - User approves the verification request, generating a `VerifiedReceipt`.
- **Frontend**: A basic React application (`@c7/react`) for users to:
  - View their active KYC credential.
  - See and approve incoming verification requests.
  - See a list of `VerifiedReceipt` contracts.
- **Documentation**:
  - `docs/ISSUER_GUIDE.md`: Guide for institutions on becoming credential issuers.
  - `docs/VERIFIER_GUIDE.md`: Guide for dApps on integrating the shielded KYC check.
- **CI/CD**: GitHub Actions workflow to build and test the Daml code on every push.
- Initial `daml.yaml` project configuration and `.gitignore`.