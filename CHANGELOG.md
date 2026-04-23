# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Support for credential revocation by the issuer.
- Daml Triggers to automate credential renewal notifications.

### Changed
- Migrated frontend components to use the `@c7/ledger` and `@c7/react` libraries.
- Upgraded project to Canton SDK 3.4.0.

---

## [0.1.0] - 2024-05-21

### Added
- **Initial Release:** First version of the Canton Shielded Identity protocol.
- **Daml Models:**
  - `Credential.Role.IssuerRole`: Contract granting a party (e.g., a bank) the authority to issue KYC credentials.
  - `Credential.Request.CredentialRequest`: A user's request to an issuer for a new KYC credential.
  - `Credential.V1.Credential`: The core, non-transferable KYC credential contract held by the end-user.
  - `Verification.V1.VerificationRequest`: A request from a dApp (Verifier) to a user to present their KYC credential for verification.
  - `Verification.V1.VerificationReceipt`: A confirmation that a user has successfully passed a verification check, observable by the Verifier.
- **Daml Script Tests:**
  - `Main.daml`: Comprehensive script tests covering the full lifecycle:
    - Issuer onboarding and role creation.
    - User requests and issuer acceptance/issuance of a credential.
    - Verifier requests and user acceptance of a verification check.
- **Frontend Application:**
  - A basic React application to demonstrate the user's perspective.
  - `App.tsx`: Main application container.
  - `CredentialStatus.tsx`: Component to display the status of a user's active KYC credential.
- **CI/CD:**
  - GitHub Actions workflow (`.github/workflows/ci.yml`) to build and test the Daml contracts on every push and pull request.
- **Documentation:**
  - `docs/ISSUER_GUIDE.md`: Guide for financial institutions or other entities on how to become a credential issuer on the network.
  - `docs/VERIFIER_GUIDE.md`: Guide for dApp developers on how to integrate the shielded identity protocol to verify users.
- **Project Configuration:**
  - `daml.yaml` defining the project structure and dependencies.
  - `.gitignore` for a standard Canton/Daml project.