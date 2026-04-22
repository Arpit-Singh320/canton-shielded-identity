// Copyright (c) 2024 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { ContractId, Party } from '@c7/base';
import { Ledger } from '@c7/ledger';
import { CredentialProof } from './gen/Identity/CredentialProof';
import { IssuerRegistry } from './gen/Identity/IssuerRegistry';
import { VerificationRequest, VerifiedIdentity } from './gen/Identity/VerificationRequest';
import { RevocationNotification } from './gen/Identity/Revocation';

// Re-exporting generated types for convenience of the SDK user
export { CredentialProof } from './gen/Identity/CredentialProof';
export { IssuerRegistry } from './gen/Identity/IssuerRegistry';
export { VerificationRequest, VerifiedIdentity } from './gen/Identity/VerificationRequest';
export { RevocationNotification } from './gen/Identity/Revocation';

// Type aliases for contract IDs to improve readability
export type CredentialProofId = ContractId<CredentialProof>;
export type VerificationRequestId = ContractId<VerificationRequest>;
export type IssuerRegistryId = ContractId<IssuerRegistry>;
export type VerifiedIdentityId = ContractId<VerifiedIdentity>;

/**
 * Configuration for the CredentialClient.
 */
export interface CredentialClientConfig {
  /** The ledger instance to connect to, e.g., from `@c7/ledger-json-api`. */
  readonly ledger: Ledger;
  /** The party ID of the user acting. All commands will be submitted as this party. */
  readonly party: Party;
}

/**
 * A TypeScript SDK client for interacting with the Canton Shielded Identity contracts.
 * This client provides a high-level API for issuers, verifiers (dApps), and users
 * to manage and use zero-knowledge KYC credentials on a Canton network.
 */
export class CredentialClient {
  private readonly ledger: Ledger;
  private readonly party: Party;

  /**
   * Constructs a new CredentialClient.
   * @param config Configuration for the client, including the ledger connection and acting party.
   */
  constructor(config: CredentialClientConfig) {
    this.ledger = config.ledger;
    this.party = config.party;
  }

  // =================================================================================
  // Issuer Registry Methods (typically for registry operators)
  // =================================================================================

  /**
   * Finds the singleton `IssuerRegistry` contract on the ledger.
   * This registry is the central source of truth for trusted identity issuers.
   * @returns The active `IssuerRegistry` contract event, or `null` if it's not found or not visible to the acting party.
   */
  public async findRegistry(): Promise<IssuerRegistry.CreateEvent | null> {
    const contracts = await this.ledger.query(IssuerRegistry.template);
    return contracts.length > 0 ? contracts[0] : null;
  }

  /**
   * Registers a new identity issuer with the central registry.
   * This action must be performed by the party designated as the `operator` of the `IssuerRegistry`.
   * @param registryId The contract ID of the `IssuerRegistry`.
   * @param newIssuer The party ID of the new issuer to add.
   * @returns The result of the exercise command.
   */
  public async registerIssuer(registryId: IssuerRegistryId, newIssuer: Party): Promise<unknown> {
    return this.ledger.exercise(IssuerRegistry.RegisterIssuer, registryId, { newIssuer });
  }

  // =================================================================================
  // Issuer Methods (for banks, financial institutions, etc.)
  // =================================================================================

  /**
   * Issues a new KYC credential to a user.
   * This action must be performed by a party that is registered as an issuer in the `IssuerRegistry`.
   * @param owner The party ID of the user receiving the credential.
   * @param verifiers A list of parties (dApps) who are explicitly allowed to view and verify this credential.
   * @param credentialId A unique, off-ledger identifier for this credential (e.g., a UUID). Used for revocation checking.
   * @param proofData The cryptographic zero-knowledge proof data, represented as a string.
   * @param validUntil An ISO 8601 timestamp string indicating when the credential expires.
   * @returns The created `CredentialProof` contract event.
   */
  public async issueCredential(
    owner: Party,
    verifiers: Party[],
    credentialId: string,
    proofData: string,
    validUntil: string
  ): Promise<CredentialProof.CreateEvent> {
    const payload: CredentialProof.Create = {
      issuer: this.party,
      owner,
      verifiers,
      credentialId,
      proofData,
      validUntil,
    };
    return this.ledger.create(CredentialProof.template, payload);
  }

  /**
   * Revokes a user's credential by creating a `RevocationNotification` on the ledger.
   * The presence of this notification contract signals that the original credential is no longer valid.
   * The `PresentProof` choice logic will check for this notification using a contract key lookup.
   * @param owner The party ID of the user whose credential is being revoked. They are made an observer on the notification.
   * @param credentialId The unique off-ledger ID of the credential to revoke.
   * @returns The created `RevocationNotification` contract event.
   */
  public async revokeCredential(
    owner: Party,
    credentialId: string
  ): Promise<RevocationNotification.CreateEvent> {
    const payload: RevocationNotification.Create = {
      issuer: this.party,
      owner,
      credentialId,
    };
    return this.ledger.create(RevocationNotification.template, payload);
  }

  /**
   * Checks if a credential has been revoked by looking up its corresponding `RevocationNotification`.
   * @param issuer The party who issued the credential.
   * @param credentialId The unique off-ledger ID of the credential.
   * @returns `true` if a revocation notification exists, `false` otherwise.
   */
  public async isRevoked(issuer: Party, credentialId: string): Promise<boolean> {
    const key: RevocationNotification.Key = { _1: issuer, _2: credentialId };
    const notification = await this.ledger.lookupByKey(RevocationNotification.template, key);
    return notification !== null;
  }

  // =================================================================================
  // dApp/Verifier Methods
  // =================================================================================

  /**
   * Requests a KYC verification from a user, creating a `VerificationRequest` contract.
   * The user's wallet will detect this contract and prompt the user to respond.
   * @param user The party ID of the user to verify.
   * @param nonce A unique string (e.g., a session ID or cryptographically secure random value) to prevent replay attacks.
   * @param registryId The contract ID of the `IssuerRegistry` to be used for validating the credential's issuer.
   * @returns The created `VerificationRequest` contract event.
   */
  public async requestVerification(
    user: Party,
    nonce: string,
    registryId: IssuerRegistryId
  ): Promise<VerificationRequest.CreateEvent> {
    const payload: VerificationRequest.Create = {
      verifier: this.party,
      user,
      nonce,
      registryId,
    };
    return this.ledger.create(VerificationRequest.template, payload);
  }

  // =================================================================================
  // User/Holder Methods (typically called from a user's wallet)
  // =================================================================================

  /**
   * Presents a credential proof in response to a `VerificationRequest`.
   * This action is performed by the user who owns the credential. It consumes the request
   * and, if successful, creates a `VerifiedIdentity` contract as evidence of successful verification.
   * @param verificationRequestId The contract ID of the `VerificationRequest` to respond to.
   * @param credentialId The contract ID of the `CredentialProof` to present.
   * @returns The contract ID of the resulting `VerifiedIdentity` contract.
   */
  public async presentProof(
    verificationRequestId: VerificationRequestId,
    credentialId: CredentialProofId
  ): Promise<VerifiedIdentityId> {
    const choiceArgs = { credentialId };
    return this.ledger.exercise(
      VerificationRequest.PresentProof,
      verificationRequestId,
      choiceArgs
    );
  }

  // =================================================================================
  // Query Methods (for all roles)
  // =================================================================================

  /**
   * Fetches a specific `CredentialProof` contract by its contract ID.
   * @param credentialId The contract ID to fetch.
   * @returns The contract data, or `null` if not found or not visible to the acting party.
   */
  public async getCredential(credentialId: CredentialProofId): Promise<CredentialProof.CreateEvent | null> {
    return this.ledger.fetch(CredentialProof.template, credentialId);
  }

  /**
   * Lists all active credentials for which the acting party is the owner.
   * @returns An array of active `CredentialProof` contract events.
   */
  public async listMyCredentials(): Promise<CredentialProof.CreateEvent[]> {
    return this.ledger.query(CredentialProof.template, { owner: this.party });
  }

  /**
   * Lists all pending verification requests where the acting party is the user.
   * @returns An array of active `VerificationRequest` contract events.
   */
  public async listMyVerificationRequests(): Promise<VerificationRequest.CreateEvent[]> {
    return this.ledger.query(VerificationRequest.template, { user: this.party });
  }

  /**
   * Lists all successful verifications for which the acting party is the verifier.
   * @returns An array of active `VerifiedIdentity` contract events.
   */
  public async listMyVerifications(): Promise<VerifiedIdentity.CreateEvent[]> {
    return this.ledger.query(VerifiedIdentity.template, { verifier: this.party });
  }
}