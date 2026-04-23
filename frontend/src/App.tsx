import React, { useState, useEffect } from 'react';
import { DamlLedger, useParty, useLedger, useQuery } from '@c7/react';
import { CredentialStatus } from './CredentialStatus';
import { Credential, IssuanceProposal } from '@canton-shielded-identity/daml-codegen/lib/Main';
import { ContractId } from '@c7/dabl';

import './App.css';

// --- Constants & Mock Data --------------------------------------------------
// In a real application, these would be managed securely and dynamically.
const LEDGER_URL = 'http://localhost:7575';

// Mock party identifiers. Replace with actual parties from your ledger.
const ISSUER_BANK_PARTY = { name: "GlobalTrust Bank", id: "GlobalTrustBank::1220c1a2f2671b563a6f112e457f5115d78a2d12f2070e65c26b5413110298a05e22" };
const VERIFIER_DAPP_PARTY = { name: "DeFiLend dApp", id: "DeFiLend::1220a3b3f3782c564a7f232e568f6225e89b3e13f3171f76d37c65242213a9b16f33" };
const HOLDER_ALICE_PARTY = { name: "Alice", id: "Alice::1220e4b4f4893e565a8f442e679f7335f9ac4f24f4272e86e48d76352324b9c27f44" };
const HOLDER_BOB_PARTY = { name: "Bob", id: "Bob::1220d5c5e5904f676b9f563e780a7446g0bd5g35g5373f97h59e87463435c0d38g55" };

const ALL_PARTIES = [ISSUER_BANK_PARTY, VERIFIER_DAPP_PARTY, HOLDER_ALICE_PARTY, HOLDER_BOB_PARTY];
const POTENTIAL_CREDENTIAL_HOLDERS = [HOLDER_ALICE_PARTY, HOLDER_BOB_PARTY];

// --- Authentication Helper -------------------------------------------------
// In production, use a proper authentication provider (e.g., OAuth2/OIDC).
// This function creates a placeholder JWT for a given party.
const generateToken = (partyId: string) => {
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    "https://daml.com/ledger-api": {
      ledgerId: "canton-shielded-identity-sandbox",
      applicationId: "canton-shielded-identity-app",
      actAs: [partyId],
    },
  };
  const encode = (data: object) => btoa(JSON.stringify(data)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${encode(header)}.${encode(payload)}.signature`;
};

// --- Sub-components for different user roles -------------------------------

const LoginScreen: React.FC<{ onLogin: (partyId: string, token: string, name: string) => void }> = ({ onLogin }) => (
  <div className="login-container">
    <h1>Canton Shielded Identity Portal</h1>
    <p>Select your role to log in to the portal.</p>
    <div className="party-selection">
      {ALL_PARTIES.map(party => (
        <button key={party.id} onClick={() => onLogin(party.id, generateToken(party.id), party.name)}>
          Log in as {party.name}
        </button>
      ))}
    </div>
  </div>
);

const IssuerView: React.FC = () => {
  const ledger = useLedger();
  const issuerParty = useParty();
  const { contracts: proposals, loading: proposalsLoading } = useQuery(IssuanceProposal.Template);
  const { contracts: credentials, loading: credentialsLoading } = useQuery(Credential.Template);

  const issuedToParties = new Set(credentials.map(c => c.payload.holder));

  const handleIssueCredential = async (holderPartyId: string) => {
    try {
      await ledger.create(IssuanceProposal.Template, {
        issuer: issuerParty,
        holder: holderPartyId,
      });
      alert(`Credential proposal sent to ${holderPartyId}`);
    } catch (error) {
      console.error("Failed to issue credential:", error);
      alert("Failed to issue credential.");
    }
  };

  const handleRevokeCredential = async (cid: ContractId<Credential.Template>) => {
    if (window.confirm("Are you sure you want to revoke this credential? This action is irreversible.")) {
      try {
        await ledger.exercise(Credential.Revoke, cid, {});
        alert("Credential revoked successfully.");
      } catch (error) {
        console.error("Failed to revoke credential:", error);
        alert("Failed to revoke credential.");
      }
    }
  };

  return (
    <div className="view-container issuer-view">
      <h2>Issuer Dashboard (GlobalTrust Bank)</h2>

      <div className="section">
        <h3>Issue New Credential</h3>
        <p>Select a user to issue a new KYC credential to. This creates a proposal that the user must accept.</p>
        {(proposalsLoading || credentialsLoading) ? <p>Loading users...</p> : (
          <ul className="user-list">
            {POTENTIAL_CREDENTIAL_HOLDERS.map(holder => {
              const isIssued = issuedToParties.has(holder.id);
              const hasPendingProposal = proposals.some(p => p.payload.holder === holder.id);
              return (
                <li key={holder.id}>
                  <span>{holder.name} ({holder.id.substring(0, 10)}...)</span>
                  <button
                    onClick={() => handleIssueCredential(holder.id)}
                    disabled={isIssued || hasPendingProposal}
                  >
                    {isIssued ? "Issued" : hasPendingProposal ? "Proposal Sent" : "Issue Credential"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="section">
        <h3>Active Credentials</h3>
        {credentialsLoading ? <p>Loading credentials...</p> : (
          credentials.length > 0 ? (
            <ul className="credential-list">
              {credentials.map(cred => (
                <li key={cred.contractId}>
                  <p><strong>Holder:</strong> {cred.payload.holder}</p>
                  <p><strong>Status:</strong> {cred.payload.isRevoked ? "Revoked" : "Active"}</p>
                  <p><strong>Issued At:</strong> {new Date(cred.payload.issuedAt).toLocaleString()}</p>
                  {!cred.payload.isRevoked && (
                    <button className="danger" onClick={() => handleRevokeCredential(cred.contractId)}>Revoke</button>
                  )}
                </li>
              ))}
            </ul>
          ) : <p>No credentials issued yet.</p>
        )}
      </div>
    </div>
  );
};

const HolderView: React.FC = () => {
  const ledger = useLedger();
  const party = useParty();
  const { contracts: proposals, loading: proposalsLoading } = useQuery(IssuanceProposal.Template);
  const { contracts: credentials, loading: credentialsLoading } = useQuery(Credential.Template);

  const myProposal = proposals.find(p => p.payload.holder === party);
  const myCredential = credentials.find(c => c.payload.holder === party);

  const handleAcceptProposal = async (cid: ContractId<IssuanceProposal.Template>) => {
    try {
      await ledger.exercise(IssuanceProposal.Accept, cid, {});
      alert("Credential accepted successfully!");
    } catch (error) {
      console.error("Failed to accept proposal:", error);
      alert("Failed to accept proposal.");
    }
  };

  return (
    <div className="view-container holder-view">
      <h2>Credential Holder Dashboard</h2>
      {myProposal && (
        <div className="section proposal-card">
          <h3>New Credential Proposal</h3>
          <p><strong>From:</strong> {myProposal.payload.issuer}</p>
          <p>You have received a proposal to issue a shielded KYC credential. Accept to activate your credential.</p>
          <button onClick={() => handleAcceptProposal(myProposal.contractId)}>Accept</button>
        </div>
      )}
      {(proposalsLoading || credentialsLoading)
        ? <p>Loading credential status...</p>
        : <CredentialStatus credential={myCredential} />
      }
    </div>
  );
};

const VerifierView: React.FC = () => {
  const ledger = useLedger();
  const [verificationTarget, setVerificationTarget] = useState('');
  const [verificationResult, setVerificationResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setVerificationResult(null);

    // --- ZK PROOF SIMULATION ---
    // In a real ZK system, this flow would be different:
    // 1. The Holder (Alice) would generate a ZK proof off-chain.
    // 2. Alice would send this proof to the Verifier (dApp).
    // 3. The Verifier would check the proof's validity off-chain.
    // 4. The proof would contain a "nullifier hash", which is a unique, un-linkable value
    //    that is revealed when a credential is used.
    // 5. The Verifier would exercise a `Verify` choice on a public contract, submitting the nullifier hash.
    //    The ledger would ensure this hash hasn't been used before (preventing double-spending)
    //    and that the credential it corresponds to has not been revoked.
    //
    // For this demo, we simplify by allowing the Verifier to directly check a credential ID.
    // This breaks the privacy model but demonstrates the on-ledger verification step.
    try {
      // In our simulation, verificationTarget is the ContractId of the credential.
      const result = await ledger.exercise(Credential.Verify, verificationTarget, {});
      if (result) {
        setVerificationResult(`✅ Verification successful. The credential is active and valid.`);
      }
    } catch (error) {
      console.error("Verification failed:", error);
      setVerificationResult(`❌ Verification failed. The credential may be invalid, revoked, or the ID is incorrect.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="view-container verifier-view">
      <h2>Verifier Dashboard (DeFiLend dApp)</h2>
      <div className="section">
        <h3>Verify a Credential</h3>
        <p>
          Enter the proof data (simulated as a Credential Contract ID) to verify a user's KYC status.
        </p>
        <form onSubmit={handleVerify}>
          <input
            type="text"
            value={verificationTarget}
            onChange={(e) => setVerificationTarget(e.target.value)}
            placeholder="Enter Credential Contract ID for verification"
            required
          />
          <button type="submit" disabled={isLoading}>
            {isLoading ? "Verifying..." : "Verify"}
          </button>
        </form>
        {verificationResult && (
          <div className={`verification-result ${verificationResult.includes('successful') ? 'success' : 'error'}`}>
            <p>{verificationResult}</p>
          </div>
        )}
      </div>
    </div>
  );
};


// --- Main Application Component ---------------------------------------------

const MainPortal: React.FC = () => {
  const party = useParty();
  const partyInfo = ALL_PARTIES.find(p => p.id === party);

  const renderView = () => {
    switch (party) {
      case ISSUER_BANK_PARTY.id:
        return <IssuerView />;
      case VERIFIER_DAPP_PARTY.id:
        return <VerifierView />;
      case HOLDER_ALICE_PARTY.id:
      case HOLDER_BOB_PARTY.id:
        return <HolderView />;
      default:
        return <p>Unknown party. Please log out and select a valid role.</p>;
    }
  };

  return (
    <div className="main-portal">
      <header>
        <h1>Canton Shielded Identity</h1>
        <div className="user-info">
          Logged in as: <strong>{partyInfo?.name || 'Unknown'}</strong>
          <button className="logout" onClick={() => {
            sessionStorage.removeItem('daml_party');
            sessionStorage.removeItem('daml_token');
            sessionStorage.removeItem('daml_name');
            window.location.reload();
          }}>
            Log Out
          </button>
        </div>
      </header>
      <main>
        {renderView()}
      </main>
    </div>
  );
};

const App: React.FC = () => {
  const [party, setParty] = useState<string | null>(sessionStorage.getItem('daml_party'));
  const [token, setToken] = useState<string | null>(sessionStorage.getItem('daml_token'));
  const [, setName] = useState<string | null>(sessionStorage.getItem('daml_name'));

  useEffect(() => {
    setParty(sessionStorage.getItem('daml_party'));
    setToken(sessionStorage.getItem('daml_token'));
    setName(sessionStorage.getItem('daml_name'));
  }, []);

  const handleLogin = (partyId: string, userToken: string, userName: string) => {
    sessionStorage.setItem('daml_party', partyId);
    sessionStorage.setItem('daml_token', userToken);
    sessionStorage.setItem('daml_name', userName);
    setParty(partyId);
    setToken(userToken);
    setName(userName);
  };

  if (!token || !party) {
    return (
      <div className="App">
        <LoginScreen onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <div className="App">
      <DamlLedger token={token} party={party} httpBaseUrl={LEDGER_URL}>
        <MainPortal />
      </DamlLedger>
    </div>
  );
};

export default App;