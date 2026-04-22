# Canton Shielded Identity: Verifier's Guide

This guide is for dApp developers who want to integrate the Canton Shielded Identity protocol. By following these steps, your dApp can verify a user's KYC status without accessing their personal data, streamlining user onboarding and enhancing privacy.

## Table of Contents

- [Introduction](#introduction)
- [How It Works](#how-it-works)
- [Prerequisites](#prerequisites)
- [Integration Steps](#integration-steps)
  - [Step 1: Install the SDK](#step-1-install-the-sdk)
  - [Step 2: Request a Verification Proof (Frontend)](#step-2-request-a-verification-proof-frontend)
  - [Step 3: Submit Proof for On-Chain Verification (Backend)](#step-3-submit-proof-for-on-chain-verification-backend)
- [Daml Integration Example](#daml-integration-example)
- [Security Considerations](#security-considerations)
- [Frequently Asked Questions](#frequently-asked-questions)

---

## Introduction

Canton Shielded Identity is a reusable, zero-knowledge KYC credential standard. It allows users to get verified once by a trusted issuer (like a bank) and then prove their verified status to any dApp on the Canton Network without revealing their identity, the issuer, or any personal identifying information (PII).

**Benefits for dApps (Verifiers):**

-   **Frictionless Onboarding:** Eliminate the need for users to upload documents or complete lengthy KYC forms for your dApp.
-   **Access to a Verified User Base:** Instantly tap into the growing pool of KYC'd users on Canton.
-   **Enhanced Privacy & Compliance:** Drastically reduce your compliance burden and data security risks. You never store or handle sensitive PII.
-   **Composable Identity:** Build sophisticated workflows that require verified users without compromising on decentralization or privacy.

## How It Works

The verification flow is designed for simplicity and security:

1.  **Request:** Your dApp's frontend requests a proof from the user's wallet, specifying what needs to be verified (e.g., "KYC status is 'Approved'").
2.  **Generate:** The user's wallet, holding their encrypted credential, generates a zero-knowledge proof locally. This proof attests to the KYC status without revealing any other data.
3.  **Submit:** The generated proof is sent to your dApp's backend.
4.  **Verify:** Your backend submits the proof to the Shielded Identity smart contracts on the Canton ledger. The contracts perform two crucial checks:
    a. The ZK proof is mathematically valid.
    b. The credential used to generate the proof has not been revoked by the issuer.
5.  **Confirm:** If both checks pass, the transaction succeeds, and your dApp can confidently treat the user as verified. Your dApp receives a simple `true`/`false` result.

![Verifier Flow Diagram](https://example.com/verifier_flow.png) <!-- Fictional diagram link for illustration -->

## Prerequisites

-   An existing Canton dApp with a frontend and a backend capable of submitting Daml commands.
-   A basic understanding of the Daml ledger model.
-   Your dApp's Daml models must depend on the `canton-shielded-identity` DAR.

In your `daml.yaml`:

```yaml
sdk-version: 3.4.0
name: my-dapp
version: 0.1.0
source: daml
dependencies:
  - daml-prim
  - daml-stdlib
  - daml-script
  # Add the Shielded Identity dependency
  - .daml/dist/canton-shielded-identity-0.1.0.dar
```

## Integration Steps

### Step 1: Install the SDK

Our TypeScript SDK provides a convenient client for interacting with user wallets and the on-chain verification contracts.

```bash
npm install @canton-id/shielded-identity-client
```

### Step 2: Request a Verification Proof (Frontend)

In your frontend application, when a user needs to prove their KYC status, use the SDK to generate a `VerificationRequest`. The user's wallet will detect this request and prompt them for approval.

```typescript
// src/components/KycButton.tsx
import React from 'react';
import { useLedger, useParty } from '@c7/react';
import { CredentialClient } from '@canton-id/shielded-identity-client';

export const KycButton = () => {
  const ledger = useLedger();
  const party = useParty();
  const credentialClient = new CredentialClient(ledger, party);

  const handleVerifyClick = async () => {
    try {
      // 1. Create a public request on the ledger for the user to respond to.
      // The `dappParty` is your dApp's operator party.
      // The `nonce` ensures this request is unique and prevents replay attacks.
      const nonce = crypto.randomUUID();
      const verificationRequestCid = await credentialClient.createVerificationRequest({
        dappParty: 'dapp-operator::your-party-id',
        userParty: party,
        nonce: nonce,
      });

      // 2. The user's wallet will automatically detect this contract
      // and prompt the user to generate and submit a proof.
      // You should listen for the successful verification event.
      console.log('Verification request created:', verificationRequestCid);
      alert('Please check your wallet to approve the KYC verification request.');

      // In a real application, you would subscribe to a stream of
      // `YourDapp.VerifiedUser` contracts to confirm success.

    } catch (error) {
      console.error("Failed to initiate KYC verification:", error);
      alert("Error: Could not start KYC process.");
    }
  };

  return (
    <button onClick={handleVerifyClick}>
      Verify Identity
    </button>
  );
};
```

### Step 3: Submit Proof for On-Chain Verification (Backend)

The user's wallet handles the proof generation and submission transparently. The wallet will exercise a choice that consumes the `VerificationRequest` and calls the core `Verifier` contract. Your dApp doesn't need to handle the raw ZK proof itself.

Instead, your Daml model should define what happens *after* a successful verification. The standard pattern is to create a dApp-specific `VerifiedUser` contract that grants the user permissions within your application.

## Daml Integration Example

Here is an example of a Daml model for a DeFi application that requires users to be KYC'd before they can trade.

```daml
-- file: daml/MyDapp/Roles.daml
module MyDapp.Roles where

import Daml.Script
import Canton.Identity.Verification (VerificationRequest)

-- | A role contract created for a user once their identity has been
-- | successfully verified via the Shielded Identity protocol.
-- | The existence of this contract grants them access to the dApp's features.
template VerifiedUserRole
  with
    dappOperator : Party
    user         : Party
  where
    signatory dappOperator, user

    key (dappOperator, user) : (Party, Party)
    maintainer key._1

-- | This is the controller contract for your dApp's verification logic.
-- | It observes VerificationRequests and, upon successful proof submission
-- | by the user, creates the `VerifiedUserRole`.
template DappVerificationController
  with
    dappOperator: Party
  where
    signatory dappOperator

    -- When a user's wallet successfully verifies their credential against a request,
    -- this choice is called by the Shielded Identity workflow.
    nonconsuming choice OnVerificationSuccess : ContractId VerifiedUserRole
      with
        request : VerificationRequest
      controller (signatory request.user) -- This choice is exercised by the user's wallet
      do
        -- Ensure the request was intended for this dApp instance.
        request.dappOperator === dappOperator

        -- The core ZK proof verification logic is handled by the contracts called
        // by the user's wallet *before* this choice is exercised.
        // If we have reached this point, verification was successful.

        -- Create the dApp-specific role for the user.
        create VerifiedUserRole with
          dappOperator = dappOperator
          user = request.user
```

In this model:
1.  Your dApp's operator party creates a `DappVerificationController`.
2.  Your frontend creates a `Canton.Identity.Verification.VerificationRequest` pointing to your `dappOperator`.
3.  The user's wallet detects the request, generates the proof, and calls a choice that ultimately calls `OnVerificationSuccess` on your `DappVerificationController`.
4.  If the proof is valid and the credential is not revoked, the transaction succeeds, and a `VerifiedUserRole` contract is created on the ledger, observable by both your dApp and the user.

## Security Considerations

-   **Replay Attacks:** The protocol is designed to be replay-resistant. Each `VerificationRequest` contains a unique `nonce` and is consumed upon use, ensuring a proof can only be used once for a specific request.
-   **Proof Privacy:** The ZK proofs are non-interactive and reveal nothing about the user's PII or their issuing institution. The ledger only records the fact of a successful verification event.
-   **Revocation:** The on-chain verification logic atomically checks the issuer's current revocation list as part of every verification. If a user's credential has been revoked, proof verification will fail.

## Frequently Asked Questions

**Q: Which identity issuers can I trust?**
A: The Canton Network maintains a registry of trusted issuing institutions. Your dApp can configure its policy to accept credentials from all registered issuers or a specific subset.

**Q: What happens if a user's KYC status is revoked after they have been verified in my dApp?**
A: The `VerifiedUserRole` contract in your dApp is a point-in-time confirmation. It does not automatically update if the user's underlying credential is revoked. For long-running sessions or high-value transactions, you may require users to re-verify periodically.

**Q: Can I request verification of specific attributes, like "over 18" or "country of residence"?**
A: Yes. The protocol is extensible. The `VerificationRequest` can specify the exact claim you need the user to prove (e.g., `Attribute("age", ">=18")`). The user's wallet will generate a proof for that specific claim if their credential contains it.

**Q: What underlying ZK-SNARK technology is used?**
A: The protocol currently uses Groth16 proofs over the BN254 curve for maximum efficiency and security, but is designed to be crypto-agile to support future proofing systems.