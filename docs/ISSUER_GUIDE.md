# Canton Shielded Identity: Issuer Guide

This document provides a comprehensive guide for regulated financial institutions and other qualified entities on how to become an approved credential Issuer within the Canton Shielded Identity network.

## 1. Overview

The Canton Shielded Identity protocol enables a "verify-once, use-everywhere" model for Know Your Customer (KYC) compliance across dApps on the Canton Network. It leverages Daml smart contracts and zero-knowledge proofs to allow users to prove their verified status without revealing their personal data or the identity of the verifying institution.

**The Role of an Issuer**

An Issuer is a trusted and regulated entity (e.g., a bank, a licensed money services business) that is authorized by the network's governing body to perform KYC/AML checks on users and issue on-ledger credentials attesting to their verified status.

The integrity and trustworthiness of the entire Shielded Identity ecosystem depend on the diligence and rigor of its approved Issuers. As an Issuer, you are a cornerstone of this trust.

Your core responsibilities are:
1.  **Onboarding:** Applying and getting approved by the network operator.
2.  **Verification:** Performing robust, compliant KYC/AML checks on individuals.
3.  **Issuance:** Creating the on-ledger `KycCredential` smart contract for verified users.
4.  **Revocation:** Promptly revoking credentials if a user's KYC status changes.

## 2. Becoming an Approved Issuer

Authorization to issue credentials is a governed process to ensure that all Issuers meet the high standards required by the network.

### Prerequisites

Before applying, your organization must:
*   Be a regulated financial institution or an entity legally authorized to perform KYC/AML checks in your jurisdiction.
*   Have a registered Party ID on the target Canton Network.
*   Maintain robust, well-documented internal policies and procedures for KYC, AML, and Counter-Financing of Terrorism (CFT) that comply with local and international standards (e.g., FATF recommendations).

### The Application Process

1.  **Initial Contact:** Begin by contacting the Canton Shielded Identity Network Operator. You will be asked to provide initial information about your organization, its regulatory status, and its operational jurisdiction.

2.  **Off-Ledger Due Diligence:** The Network Operator will conduct a thorough due diligence process. This typically involves submitting documentation such as:
    *   Proof of regulatory licenses and good standing.
    *   Detailed descriptions of your KYC/AML policies.
    *   Information on your data security and privacy practices.
    *   Technical contact information for your operations team.

3.  **On-Ledger Authorization:** Once your organization is approved, the Network Operator will create an `IssuerAuthority` contract on the Canton ledger.
    *   **Contract:** `Canton.ShieldedIdentity.Authority.IssuerAuthority`
    *   **Signatory:** Your organization's Canton Party ID.
    *   This contract is the on-ledger, cryptographic proof of your status as an approved Issuer. You must hold this contract to be able to exercise the choice to issue new credentials.

## 3. The Credential Issuance Workflow

The issuance process is designed to separate sensitive, off-ledger identity verification from the privacy-preserving on-ledger attestation.

**Step 1: User Request & KYC (Off-Ledger)**
A user (who is a Canton party) initiates a request for a KYC credential through your existing, secure customer-facing channels (e.g., your online banking portal, a dedicated application). As part of this process, the user provides their Canton Party ID.

**Step 2: Identity Verification (Off-Ledger)**
Your organization performs its standard, compliant KYC/AML verification process on the user. This is the same process you use for your other regulated activities. **No Personally Identifiable Information (PII) is ever sent to the Canton ledger.**

**Step 3: On-Ledger Credential Creation**
Upon successful verification, you create the on-ledger credential:
*   You use your `IssuerAuthority` contract ID to exercise the `IssueKycCredential` choice.
*   This choice takes the user's `Party` ID and a unique `credentialId` (e.g., a UUID) as arguments.
*   This action atomically creates a `KycCredential` contract on the ledger.
    *   **Template:** `Canton.ShieldedIdentity.Credential.KycCredential`
    *   **Signatories:** You (the Issuer) and the user (the owner).
    *   This contract acts as the on-ledger "anchor" of trust. It contains no PII, only the party IDs, the credential ID, and metadata like the issue date. The user will later use this contract in combination with their off-ledger data to generate zero-knowledge proofs for dApps.

## 4. Credential Revocation

As an Issuer, you have an ongoing obligation to monitor the KYC status of users you have verified. If a user's status changes (e.g., they are added to a sanctions list, or their risk profile changes significantly), you must revoke their credential promptly.

**The Revocation Process:**

1.  **Identify the Trigger:** An internal or external event flags a user for re-evaluation, and your compliance team determines their credential must be revoked.

2.  **Locate the Contract:** Using your view of the ledger, query for the active `KycCredential` contract corresponding to the user's Party ID that you issued.

3.  **Exercise the `Revoke` Choice:** Exercise the `Revoke` choice on the `KycCredential` contract. This choice requires a `reason` for the revocation, which is stored on the resulting contract.

4.  **Confirm Revocation:** This action atomically archives the `KycCredential` and creates a new `RevokedKycCredential` contract in its place. This new contract is a permanent, visible record of the revocation. Verifier dApps are designed to check for the existence of this revocation record before accepting a user's ZK-proof.

## 5. Issuer Responsibilities and Best Practices

*   **Security:** Safeguard the private keys associated with your Canton Party ID with the utmost care. A compromise of your keys would allow an attacker to falsely issue or revoke credentials, undermining network trust. Use institutional-grade custody solutions.
*   **Data Privacy:** All user PII collected during the KYC process must remain secured within your off-ledger systems. Adhere strictly to data privacy regulations such as GDPR and CCPA.
*   **Compliance:** Continuously monitor and update your KYC/AML procedures to adapt to changing regulations. The network's trust is a direct reflection of your compliance standards.
*   **Availability:** Ensure your Canton participant node and associated infrastructure are highly available to issue and revoke credentials in a timely manner.