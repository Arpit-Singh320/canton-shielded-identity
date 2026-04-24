# Canton Shielded Identity

[![CI](https://github.com/digital-asset/canton-shielded-identity/actions/workflows/ci.yml/badge.svg)](https://github.com/digital-asset/canton-shielded-identity/actions/workflows/ci.yml)

A reusable, zero-knowledge KYC (Know Your Customer) credential for the Canton Network. Canton Shielded Identity allows a user to be verified once by a trusted institution and then use that verification across any dApp on the network, without ever revealing their personal data or the identity of the verifying institution.

## The Problem: Repetitive, Insecure KYC

In today's digital asset ecosystem, users are forced to complete a full KYC process for nearly every application they use. This is:

*   **Inefficient:** Users repeatedly submit the same sensitive documents (passports, driver's licenses, utility bills) and wait for verification, creating significant friction.
*   **Insecure:** Each dApp and service provider stores a copy of the user's Personal Identifiable Information (PII), dramatically increasing the attack surface for data breaches.
*   **Not Private:** Users' personal data is shared widely, often without a clear understanding of who has it or how it's being protected.

## The Solution: Verify Once, Use Everywhere

Canton Shielded Identity flips the model. A regulated financial institution (an **Issuer**) verifies a user's identity off-chain and then issues a non-transferable `KycCredential` contract to that user on the Canton ledger.

This on-chain credential acts as a cryptographic proof that the holder has successfully passed a KYC check from a trusted source. When a dApp (a **Verifier**) needs to confirm a user's KYC status, the user simply presents this credential.

The system is designed with zero-knowledge principles:

*   **The Verifier learns only one fact:** "This user has passed a valid KYC check."
*   **The Verifier never learns:** The user's name, address, date of birth, or any other PII.
*   **The Verifier never learns:** Which specific bank or institution issued the credential.

This breaks the link between a user's on-chain activity and their real-world identity, providing robust privacy while still meeting regulatory requirements.

---

### How It Works

The lifecycle involves three key actors: the **User**, the **Issuer**, and the **Verifier**.

1.  **Request:** A User (e.g., `Alice`) submits a request for a KYC credential to a trusted Issuer (e.g., `FirstBank`).
2.  **Verification (Off-Chain):** `FirstBank` performs its standard, off-chain KYC/AML due diligence on Alice.
3.  **Issuance (On-Chain):** Once Alice is approved, `FirstBank` creates a `KycCredential` contract on the Canton ledger. `Alice` is the owner of this contract. The issuer's identity is obfuscated on the contract to maintain privacy.
4.  **Presentation:** Alice wants to use a decentralized exchange (the **Verifier**). The exchange requires all traders to be KYC'd.
5.  **Verification:** The exchange's smart contract logic requests proof of KYC. Alice presents her `KycCredential` contract. The exchange's contract can verify the credential's validity without ever seeing Alice's PII or knowing that `FirstBank` was the original issuer.
6.  **Access Granted:** With verification complete, the exchange grants Alice access to its services. Alice can repeat this process with any other dApp that accepts the Canton Shielded Identity standard.

---

## Project Structure

This repository contains the full implementation of the Canton Shielded Identity protocol.

```
.
├── daml/                      # Daml smart contracts
│   └── Daml/Identity/Kyc.daml # Core KycCredential template and workflow
├── frontend/                  # Example React UI for users, issuers, and verifiers
│   ├── src/
│   │   ├── App.tsx            # Main application component and routing
│   │   └── CredentialStatus.tsx # Component to display credential state
│   └── package.json
├── docs/                      # Detailed guides for participants
│   ├── ISSUER_GUIDE.md        # Instructions for institutions acting as Issuers
│   └── VERIFIER_GUIDE.md      # Instructions for dApps acting as Verifiers
├── .gitignore
├── daml.yaml                  # Daml project configuration
└── README.md                  # This file
```

## Getting Started

Follow these steps to build the Daml contracts and run the example application locally.

### Prerequisites

*   [DPM (Digital Asset Package Manager)](https://docs.digitalasset.com/dpm/index.html) version 3.4.0 or later.
*   [Node.js](https://nodejs.org/) (LTS version recommended).

### 1. Build the Daml Model

Compile the Daml code to produce a distributable DAR (Daml Archive).

```sh
dpm build
```

This will create a file at `.daml/dist/canton-shielded-identity-0.1.0.dar`.

### 2. Run the Local Canton Ledger

Start a local Canton sandbox environment. This command also automatically uploads the project's DAR file to the ledger.

```sh
dpm sandbox
```

The sandbox exposes two key endpoints:
*   **gRPC API:** `localhost:6866`
*   **JSON API:** `localhost:7575`

### 3. Run the Frontend Application

Navigate to the `frontend` directory, install dependencies, and start the development server.

```sh
cd frontend
npm install
npm start
```

The application will be available at `http://localhost:3000`. You can use the UI to log in as different parties (User, Issuer, Verifier) and step through the credential issuance and verification flows.

## Further Reading

For role-specific integration details, please see our detailed guides:

*   **[Issuer Guide](./docs/ISSUER_GUIDE.md):** For financial institutions that want to issue KYC credentials.
*   **[Verifier Guide](./docs/VERIFIER_GUIDE.md):** For dApp developers who want to consume KYC credentials to onboard users.

## License

This project is licensed under the [Apache 2.0 License](LICENSE).