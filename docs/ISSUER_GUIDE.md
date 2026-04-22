# Canton Shielded Identity: Issuer Guide

## 1. Introduction

Welcome to the Canton Shielded Identity network. By becoming an approved issuer, your institution can provide a valuable service to the Canton ecosystem: issuing reusable, privacy-preserving Know Your Customer (KYC) credentials.

This system allows a user to verify their identity with you *once*. You then issue an on-ledger `VerifiedCredential` that can be presented to any dApp on the network. The dApp learns only that the user has passed KYC, not the underlying personal data, nor which institution performed the verification.

**Benefits for Issuers:**

*   **Interoperability:** Your KYC verification becomes a passport for the entire Canton dApp ecosystem.
*   **New Revenue Streams:** You can charge a fee for each verification, creating a new line of business.
*   **Enhanced Reputation:** Position your institution as a foundational identity provider in the Web3 space.

This guide outlines the process for becoming an approved issuer and integrating your systems with the Shielded Identity smart contracts.

## 2. Prerequisites

Before beginning the application process, your institution must meet the following criteria:

### Legal & Compliance

*   You must be a regulated financial institution (e.g., bank, trust company) or another entity legally authorized and qualified to perform KYC/AML checks in your jurisdiction.
*   You must have robust internal policies and procedures for identity verification that meet or exceed industry standards.

### Technical

*   **Canton Participant Node:** You must operate a participant node connected to the target Canton network (e.g., DevNet, MainNet).
*   **Allocated Party:** You must have a unique `Party` identity on the network that will be used for all issuance activities. This party ID will need to be shared with the network governance body during onboarding.

## 3. The Onboarding Process

Becoming an issuer is a governed process to ensure the integrity of the network.

### Step 1: Application

Contact the Canton Shielded Identity Governance Council (contact details to be provided by the specific network operator, e.g., `governance@canton-network.io`). Your application should include:

*   The legal name and jurisdiction of your institution.
*   Proof of your regulatory status.
*   A high-level overview of your KYC/AML policies.
*   The Canton `Party` ID you intend to use for issuance.

### Step 2: Due Diligence

The Governance Council will review your application and perform a due diligence process. This may involve requests for further documentation to validate your legal standing and compliance frameworks.

### Step 3: On-Ledger Approval

Once your application is approved, the Governance Council will create an `Identity.IssuerPermission.IssuerPermission` contract on the ledger.

*   **Signatory:** The Governance Council's party.
*   **Observer:** Your institution's party.

This contract is your official, on-ledger license to issue credentials. It serves as the anchor for all your issuance and revocation activities. You can query for this contract to confirm your status has been activated.

## 4. Technical Integration: Issuance Workflow

The core workflow involves listening for user requests, performing off-ledger verification, and creating an on-ledger credential.

### Step 1: Listen for Verification Requests

Users will initiate the process by creating an `Identity.VerificationRequest.VerificationRequest` contract, designating your party as the `issuer`. You need to monitor the ledger for these contracts.

You can do this using:

*   **Canton Ledger API:** Periodically query the `/v2/state/active-contracts` endpoint for contracts of template `Identity.VerificationRequest:VerificationRequest` where your party is a stakeholder.
*   **Participant Query Store (PQS):** If you have PQS configured, you can run a SQL query against your participant's database:
    ```sql
    SELECT contract_id, payload
    FROM active('Identity.VerificationRequest:VerificationRequest', '${yourPartyId}');
    ```

### Step 2: Off-Ledger Data Verification

The `VerificationRequest` contains a `userDataHash` field. This is a `SHA256` hash of the user's Personally Identifiable Information (PII), which they will have submitted to you through a secure, off-ledger channel (e.g., your existing customer onboarding portal).

Your process should be:

1.  Securely receive the user's raw PII (name, DOB, address, etc.) through your off-ledger system.
2.  Hash the received PII using `SHA256`.
3.  **Crucially, verify that your calculated hash matches the `userDataHash` from the on-ledger `VerificationRequest` contract.** This confirms that the PII you are about to check corresponds to the on-ledger request.
4.  Perform your standard, internal KYC/AML verification on the raw PII.

### Step 3: Issue or Reject the Credential

Based on the outcome of your KYC check, you will exercise one of the choices on the `VerificationRequest` contract.

#### On Successful Verification (KYC Pass)

Exercise the `Issue` choice on the `VerificationRequest` contract ID.

*   **Choice:** `Issue`
*   **Controller:** Your `issuer` party.
*   **Arguments:**
    *   `permissionCid`: The `ContractId` of your `Identity.IssuerPermission.IssuerPermission` contract.
    *   `validUntil`: A `Date` specifying when the credential expires. This should align with your internal compliance policies for re-verification.

This action atomically:
1.  Consumes the `VerificationRequest`.
2.  Creates a new `Identity.VerifiedCredential.VerifiedCredential` contract, which is the user's portable, privacy-preserving identity token.

#### On Failed Verification (KYC Fail)

Exercise the `Reject` choice on the `VerificationRequest` contract ID.

*   **Choice:** `Reject`
*   **Controller:** Your `issuer` party.
*   **Arguments:**
    *   `reason`: A string explaining the reason for rejection (e.g., "Documentation mismatch", "Sanctions list match"). Be mindful of data privacy regulations when populating this field.

This action archives the `VerificationRequest` and concludes the workflow.

## 5. Credential Revocation

You have a legal and operational responsibility to revoke credentials if a user's status changes (e.g., they are added to a sanctions list).

The revocation process is initiated from your `IssuerPermission` contract.

1.  Identify the `ContractId` of the `VerifiedCredential` that needs to be revoked. You should maintain an off-ledger mapping of user identity to their `credentialCid`.
2.  Exercise the `RevokeCredential` choice on your `IssuerPermission` contract.
    *   **Choice:** `RevokeCredential`
    *   **Controller:** Your `issuer` party.
    *   **Arguments:**
        *   `credentialCid`: The `ContractId` of the credential to revoke.
        *   `reason`: A string explaining the reason for revocation.

This action creates a public `Identity.Revocation.RevocationNotice` on the ledger. dApps are responsible for checking for the existence of a `RevocationNotice` corresponding to a credential before accepting it.

## 6. Security & Best Practices

*   **Party Key Management:** Your issuer party's private keys are critical security assets. They authorize all issuance and revocation actions. Use a secure key management solution and follow Canton's recommended practices for key rotation and storage.
*   **API Security:** The connection between your internal systems and your Canton participant node must be secured. Use network firewalls, mTLS, and other standard security measures.
*   **Data Privacy:** All user PII should be handled exclusively in your secure, off-ledger environment. Never record raw PII on the ledger. The use of `userDataHash` is designed specifically for this purpose.
*   **Atomicity:** The Daml model ensures that issuance is atomic. You never risk a state where a request is archived but no credential is created. Trust the ledger's transactional guarantees.

## 7. Support

For questions about the onboarding process or technical integration, please contact the Canton Shielded Identity Governance Council. For issues related to your Canton node or the underlying network, please contact your participant node provider or the network operator.