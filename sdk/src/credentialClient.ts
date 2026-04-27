/**
 * @file Canton Shielded Identity SDK Client
 * @copyright 2024 Digital Asset (Canton) LLC
 * @license Apache-2.0
 */

// Basic types for interacting with a Daml Ledger's JSON API.
export type Party = string;
export type ContractId<T = any> = string;

/**
 * Represents a generic active contract fetched from the JSON API.
 */
export interface ActiveContract<T = any> {
  contractId: ContractId<T>;
  templateId: string;
  payload: T;
  // Other fields like agreementText, signatories, observers are omitted for brevity.
}

/**
 * Represents an error response from the JSON API.
 */
export interface LedgerError {
  status: number;
  errors: string[];
}

/**
 * Configuration for the CredentialClient.
 */
export interface CredentialClientConfig {
  /** The base URL of the Daml Ledger JSON API (e.g., http://localhost:7575). */
  ledgerUrl: string;
  /** A JWT token used to authorize requests, scoped to a specific party. */
  partyToken: string;
  /** The acting party for the requests made by this client instance. */
  party: Party;
  /** The package ID of the deployed shielded-identity Daml models. */
  templatePackageId: string;
}

/**
 * A TypeScript client for interacting with the Canton Shielded Identity contracts
 * over the Daml Ledger JSON API. This SDK simplifies creating, issuing, verifying,
 * and revoking KYC credentials.
 *
 * Each instance of the client is authenticated for a single party.
 */
export class CredentialClient {
  private readonly config: CredentialClientConfig;
  private readonly authHeaders: { Authorization: string; "Content-Type": string; };
  private readonly modulePrefix: string;

  /**
   * Constructs a new CredentialClient.
   * @param config - The configuration object for the client.
   */
  constructor(config: CredentialClientConfig) {
    if (!config.ledgerUrl || !config.partyToken || !config.party || !config.templatePackageId) {
      throw new Error("CredentialClient requires ledgerUrl, partyToken, party, and templatePackageId in its configuration.");
    }
    this.config = config;
    this.authHeaders = {
      "Authorization": `Bearer ${this.config.partyToken}`,
      "Content-Type": "application/json",
    };
    this.modulePrefix = `${this.config.templatePackageId}:Canton.Shielded.Identity.`;
  }

  // ---------------------------------------------------------------------------------
  // Private Ledger Interaction Helpers
  // ---------------------------------------------------------------------------------

  private async post<T>(endpoint: string, body: object): Promise<T> {
    const url = `${this.config.ledgerUrl}${endpoint}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.authHeaders,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorPayload: LedgerError = await response.json();
        const errorMsg = `Ledger API request failed with status ${response.status}: ${errorPayload.errors.join(", ")}`;
        console.error(errorMsg, { url, body, errorPayload });
        throw new Error(errorMsg);
      }

      const result = await response.json();
      return result.result as T;
    } catch (error) {
      console.error(`Network or other error during fetch to ${url}:`, error);
      throw error;
    }
  }

  private create<T>(templateName: string, payload: T): Promise<{ contractId: ContractId }> {
    return this.post<{ contractId: ContractId }>('/v1/create', {
      templateId: `${this.modulePrefix}${templateName}`,
      payload,
    });
  }

  private exercise<T>(templateName: string, contractId: ContractId, choiceName: string, argument: T): Promise<any> {
    return this.post('/v1/exercise', {
      templateId: `${this.modulePrefix}${templateName}`,
      contractId,
      choice: choiceName,
      argument,
    });
  }

  private query<T>(templateName: string, query?: object): Promise<ActiveContract<T>[]> {
    return this.post<ActiveContract<T>[]>('/v1/query', {
      templateIds: [`${this.modulePrefix}${templateName}`],
      query,
    });
  }

  // ---------------------------------------------------------------------------------
  // Public SDK Methods - Credential Issuance Workflow
  // ---------------------------------------------------------------------------------

  /**
   * A user requests a KYC credential from a trusted issuer.
   * This creates a `CredentialRequest` contract on the ledger.
   * @param issuer - The `Party` ID of the issuer (e.g., a bank).
   * @param personalDataHash - A SHA-256 hash of the user's personal identifying information,
   *                           provided off-ledger to the issuer for verification.
   * @returns The contract ID of the newly created `CredentialRequest`.
   */
  public async requestCredential(issuer: Party, personalDataHash: string): Promise<ContractId> {
    const payload = {
      user: this.config.party,
      issuer,
      personalDataHash,
    };
    const result = await this.create('Main:CredentialRequest', payload);
    return result.contractId;
  }

  /**
   * An issuer fetches all pending credential requests addressed to them.
   * @returns An array of active `CredentialRequest` contracts.
   */
  public async getPendingCredentialRequests(): Promise<ActiveContract[]> {
    return this.query('Main:CredentialRequest', { issuer: this.config.party });
  }

  /**
   * An issuer approves a credential request after off-ledger verification,
   * creating a `KycCredential` contract for the user.
   * @param requestCid - The contract ID of the `CredentialRequest` to approve.
   * @param subject - The Party ID of the user receiving the credential.
   * @param expiryDate - The credential's expiration date in ISO 8601 format (e.g., "2025-12-31").
   * @returns The result of the exercise command, including the created `KycCredential` contract ID.
   */
  public async issueCredential(requestCid: ContractId, subject: Party, expiryDate: string): Promise<any> {
    const argument = {
      subject,
      expiryDate,
    };
    return this.exercise('Main:CredentialRequest', requestCid, 'Issue', argument);
  }

  /**
   * A user fetches their own active KYC credential.
   * @returns The active `KycCredential` contract, or null if none exists.
   */
  public async getMyCredential(): Promise<ActiveContract | null> {
    const credentials = await this.query('Main:KycCredential', { owner: this.config.party });
    return credentials.length > 0 ? credentials[0] : null;
  }

  /**
   * An issuer revokes a previously issued credential.
   * @param credentialCid - The contract ID of the `KycCredential` to revoke.
   * @param reason - A textual reason for the revocation.
   * @returns The result of the exercise command.
   */
  public async revokeCredential(credentialCid: ContractId, reason: string): Promise<any> {
    return this.exercise('Main:KycCredential', credentialCid, 'Revoke', { reason });
  }

  // ---------------------------------------------------------------------------------
  // Public SDK Methods - Verification Workflow
  // ---------------------------------------------------------------------------------

  /**
   * A verifier (e.g., a dApp) initiates a KYC check for a specific user.
   * This creates a `VerificationRequest` contract on the ledger.
   * @param subject - The party whose identity needs to be verified.
   * @returns The contract ID of the newly created `VerificationRequest`.
   */
  public async initiateVerification(subject: Party): Promise<ContractId> {
    const payload = {
      verifier: this.config.party,
      subject,
    };
    const result = await this.create('Verification:VerificationRequest', payload);
    return result.contractId;
  }

  /**
   * A user fetches all pending verification requests that require their action.
   * @returns An array of active `VerificationRequest` contracts where this user is the subject.
   */
  public async getMyPendingVerifications(): Promise<ActiveContract[]> {
    return this.query('Verification:VerificationRequest', { subject: this.config.party });
  }

  /**
   * A user responds to a verification request by presenting their credential.
   * This choice atomically consumes the request and the credential, creating a
   * `VerificationReceipt` for the verifier and a fresh `KycCredential` for the user.
   * The verifier learns only that the verification succeeded, not who the issuer was.
   * @param verificationRequestCid - The contract ID of the `VerificationRequest`.
   * @param credentialCid - The contract ID of the user's `KycCredential`.
   * @returns The result of the exercise command, including the receipt and new credential IDs.
   */
  public async presentCredential(verificationRequestCid: ContractId, credentialCid: ContractId): Promise<any> {
    return this.exercise('Verification:VerificationRequest', verificationRequestCid, 'Present', { credentialCid });
  }

  /**
   * A verifier or user fetches the verification receipts they are privy to.
   * @returns An array of `VerificationReceipt` contracts.
   */
  public async getVerificationReceipts(): Promise<ActiveContract[]> {
    // A verifier or subject can query for receipts they are involved in.
    // The query is implicitly scoped to the party making the call.
    return this.query('Verification:VerificationReceipt');
  }
}