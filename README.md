# Canton Shielded Identity

A reusable, privacy-preserving KYC credential for the Canton Network. Verify your identity once with a trusted institution and use it across all Canton dApps without ever revealing your personal data.

---

## The Problem: Repetitive and Risky KYC

In today's digital asset landscape, every application, protocol, and service requires its own Know-Your-Customer (KYC) check. This leads to a frustrating and broken experience for users and a significant burden for developers:

*   **For Users:**
    *   **Endless Repetition:** Uploading your passport, driver's license, and personal details for every new dApp is tedious and time-consuming.
    *   **Privacy Invasion:** Your sensitive personal identifiable information (PII) is scattered across dozens of databases, dramatically increasing your exposure to data breaches.
    *   **Lack of Control:** You have no say in how your data is stored, used, or shared after you provide it.

*   **For dApp Developers:**
    *   **High Friction:** Complex onboarding processes cause users to drop off, hurting growth.
    *   **Compliance Burden:** Securely storing and managing PII is a massive operational, legal, and financial liability.
    *   **Walled Gardens:** Lack of a common identity standard hinders interoperability and composability across the ecosystem.

## The Solution: Verify Once, Use Everywhere

Canton Shielded Identity introduces a new paradigm for digital identity. It leverages the inherent privacy capabilities of the Canton Network and Daml smart contracts to create a single, reusable KYC credential that is both secure and private.

The core principle is simple: **decouple identity verification from service access.**

### How It Works

1.  **One-Time Verification:** A user completes a standard KYC process *once* with a trusted, regulated institution (e.g., their bank), referred to as a **KYC Provider**.
2.  **Credential Issuance:** Upon successful verification, the KYC Provider uses a Daml smart contract to issue a `KycCredential` to the user's party on the Canton ledger. This credential acts as a cryptographic proof of verification but contains **zero PII**.
3.  **Zero-Knowledge Presentation:** When a dApp needs to verify a user's KYC status, the user presents their `KycCredential`. The dApp's smart contracts can cryptographically verify that the credential is valid and was issued by a recognized KYC Provider.
4.  **Privacy-Preserving Confirmation:** The dApp learns only one thing: **"This user has passed KYC."** It never learns the user's name, nationality, date of birth, or even which institution performed the original verification. The user's identity remains shielded.



### Key Features & Benefits

*   **Zero-Knowledge Privacy:** Protects user PII from dApps, preserving confidentiality and reducing the risk of data leaks.
*   **User Sovereignty:** Puts users back in control of their identity. They explicitly consent to every request to prove their KYC status.
*   **Drastically Reduced Friction:** Enables instant, one-click onboarding for any dApp in the ecosystem, leading to higher user conversion and satisfaction.
*   **Ecosystem-Wide Interoperability:** Creates a composable identity layer that any Canton application can integrate, fostering a more connected and seamless network.
*   **Reduced Compliance Burden:** Frees dApp developers from the liability and operational overhead of storing and protecting sensitive user data.
*   **New Business Models:** Allows trusted institutions to act as identity anchors in the Web3 economy, offering "Identity-as-a-Service".

## Project Structure

This repository contains the core Daml smart contracts that power the Canton Shielded Identity protocol.

*   `/daml`: The Daml source code for the smart contracts.
    *   `Daml/KYC/Provider.daml`: Defines the `KycProviderRole` and the workflow for onboarding trusted identity verifiers.
    *   `Daml/KYC/Credential.daml`: Defines the `KycCredential` template, the on-ledger representation of a user's verified status.
    *   `Daml/KYC/Request.daml`: Defines the `KycVerificationRequest` template used by dApps to request proof of KYC from a user.

## Getting Started

This project is built using the Daml Packaged Manager (DPM).

1.  **Install DPM:**
    ```sh
    curl https://get.digitalasset.com/install/install.sh | sh
    ```

2.  **Build the Project:**
    ```sh
    dpm build
    ```

3.  **Run Tests:**
    ```sh
    dpm test
    ```

4.  **Start a Local Canton Sandbox:**
    ```sh
    dpm sandbox
    ```

## License

This project is licensed under the [Apache License 2.0](LICENSE).