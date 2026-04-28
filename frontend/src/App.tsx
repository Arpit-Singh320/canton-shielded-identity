import React, { useState, useEffect, useMemo } from 'react';
import { DamlLedger, useParty, useLedger, useStreamQueries, ContractId } from '@c7/react';
import { CredentialStatus } from './CredentialStatus';
import './App.css'; // Assuming some basic CSS for styling

const HTTP_URL = "http://localhost:7575";
const LEDGER_ID = "sandbox"; // Default for dpm sandbox

// --- Mock Parties for Demo ---
const ISSUER_PARTY_NAME = "GlobalTrustBank";
const VERIFIER_PARTY_NAME = "TradeShiftDApp";
const USER_PARTY_NAME = "Alice";

// --- Daml Type Definitions (Manually created for frontend) ---
// These should correspond to your Daml models.

type KycRequest = {
  holder: string;
  issuer: string;
};

type KycCredential = {
  holder: string;
  issuer: string;
  issuedAt: string; // ISO 8601 Timestamp
};

type VerificationRequest = {
  verifier: string;
  holder: string;
  purpose: string;
};

type VerificationProof = {
  verifier: string;
  holder: string;
  verifiedAt: string; // ISO 8601 Timestamp
};

// --- Main App Component ---

const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(localStorage.getItem("daml-token"));

  useEffect(() => {
    if (token) {
      localStorage.setItem("daml-token", token);
    } else {
      localStorage.removeItem("daml-token");
    }
  }, [token]);

  const logout = () => {
    setToken(null);
  };

  return (
    <div style={styles.appContainer}>
      <header style={styles.header}>
        <h1 style={styles.headerTitle}>Canton Shielded Identity Portal</h1>
        {token && <button onClick={logout} style={styles.logoutButton}>Logout</button>}
      </header>
      <main style={styles.mainContent}>
        {!token ? (
          <LoginScreen onLogin={setToken} />
        ) : (
          <DamlLedger token={token} party={token} httpUrl={HTTP_URL} ledgerId={LEDGER_ID}>
            <MainScreen />
          </DamlLedger>
        )}
      </main>
    </div>
  );
};

// --- Login Screen ---

const LoginScreen: React.FC<{ onLogin: (token: string) => void }> = ({ onLogin }) => {
  const handleLogin = (partyName: string) => {
    // In a real application, this would involve a call to an authentication
    // server that returns a JWT. For this demo, we use the party name
    // directly as the token, which works with an unauthenticated dpm sandbox.
    onLogin(partyName);
  };

  return (
    <div style={styles.loginContainer}>
      <h2 style={styles.loginTitle}>Select Your Role</h2>
      <div style={styles.loginButtons}>
        <button style={styles.button} onClick={() => handleLogin(USER_PARTY_NAME)}>
          Login as {USER_PARTY_NAME} (User)
        </button>
        <button style={styles.button} onClick={() => handleLogin(ISSUER_PARTY_NAME)}>
          Login as {ISSUER_PARTY_NAME} (Issuer)
        </button>
        <button style={styles.button} onClick={() => handleLogin(VERIFIER_PARTY_NAME)}>
          Login as {VERIFIER_PARTY_NAME} (dApp Verifier)
        </button>
      </div>
    </div>
  );
};

// --- Main Screen (Post-Login) ---

const MainScreen: React.FC = () => {
  const party = useParty();

  const renderView = () => {
    if (party.includes(ISSUER_PARTY_NAME)) {
      return <IssuerView />;
    }
    if (party.includes(VERIFIER_PARTY_NAME)) {
      return <VerifierView />;
    }
    return <UserView />;
  };

  return (
    <div>
      <p style={styles.loggedInInfo}>Logged in as: <strong>{party}</strong></p>
      {renderView()}
    </div>
  );
};


// --- User Role View ---

const UserView: React.FC = () => {
  const ledger = useLedger();
  const party = useParty();

  const { contracts: credentials, loading: loadingCredentials } = useStreamQueries(KycCredential, [{ holder: party }]);
  const { contracts: requests, loading: loadingRequests } = useStreamQueries(KycRequest, [{ holder: party }]);
  const { contracts: verificationRequests, loading: loadingVerificationRequests } = useStreamQueries(VerificationRequest, [{ holder: party }]);

  const hasCredential = credentials.length > 0;
  const hasPendingRequest = requests.length > 0;

  const handleRequestCredential = async () => {
    if (hasCredential || hasPendingRequest) return;
    const payload: KycRequest = {
      holder: party,
      issuer: ISSUER_PARTY_NAME,
    };
    await ledger.create("ShieldedIdentity.Credential:KycRequest", payload);
  };

  const handlePresentProof = async (cid: ContractId<VerificationRequest>) => {
    await ledger.exercise(VerificationRequest, cid, "PresentProof", {});
  };

  const handleDeclineVerification = async (cid: ContractId<VerificationRequest>) => {
    await ledger.exercise(VerificationRequest, cid, "Decline", {});
  };

  return (
    <div className="view-container">
      <h2 style={styles.viewTitle}>My Identity</h2>
      <CredentialStatus
        credential={credentials[0]?.payload}
        hasPendingRequest={hasPendingRequest}
        loading={loadingCredentials || loadingRequests}
      />
      {!hasCredential && !hasPendingRequest && (
        <button style={styles.button} onClick={handleRequestCredential}>
          Request KYC Credential from {ISSUER_PARTY_NAME}
        </button>
      )}

      <hr style={styles.hr} />

      <h2 style={styles.viewTitle}>Verification Requests</h2>
      {loadingVerificationRequests ? <p>Loading requests...</p> : (
        verificationRequests.length === 0 ? <p>No pending verification requests.</p> : (
          <ul style={styles.list}>
            {verificationRequests.map(req => (
              <li key={req.contractId} style={styles.listItem}>
                <div>
                  <p><strong>From:</strong> {req.payload.verifier}</p>
                  <p><strong>Purpose:</strong> {req.payload.purpose}</p>
                </div>
                <div style={styles.buttonGroup}>
                  <button style={{...styles.button, ...styles.buttonSuccess}} onClick={() => handlePresentProof(req.contractId)}>
                    Accept & Present Proof
                  </button>
                  <button style={{...styles.button, ...styles.buttonDanger}} onClick={() => handleDeclineVerification(req.contractId)}>
                    Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
};


// --- Issuer Role View ---

const IssuerView: React.FC = () => {
  const ledger = useLedger();
  const party = useParty();
  const { contracts: requests, loading } = useStreamQueries(KycRequest, [{ issuer: party }]);

  const handleApprove = async (cid: ContractId<KycRequest>) => {
    await ledger.exercise(KycRequest, cid, "Approve", {});
  };

  const handleReject = async (cid: ContractId<KycRequest>) => {
    await ledger.exercise(KycRequest, cid, "Reject", {});
  };

  return (
    <div className="view-container">
      <h2 style={styles.viewTitle}>Pending KYC Requests</h2>
      {loading ? <p>Loading requests...</p> : (
        requests.length === 0 ? <p>No pending requests.</p> : (
          <ul style={styles.list}>
            {requests.map(req => (
              <li key={req.contractId} style={styles.listItem}>
                <p><strong>Applicant:</strong> {req.payload.holder}</p>
                <div style={styles.buttonGroup}>
                  <button style={{...styles.button, ...styles.buttonSuccess}} onClick={() => handleApprove(req.contractId)}>Approve</button>
                  <button style={{...styles.button, ...styles.buttonDanger}} onClick={() => handleReject(req.contractId)}>Reject</button>
                </div>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
};

// --- Verifier Role View ---

const VerifierView: React.FC = () => {
  const ledger = useLedger();
  const party = useParty();
  const [targetUser, setTargetUser] = useState(USER_PARTY_NAME);
  const [purpose, setPurpose] = useState("Onboarding to TradeShift platform");

  const { contracts: proofs, loading } = useStreamQueries(VerificationProof, [{ verifier: party }]);

  const sortedProofs = useMemo(() => {
    return proofs.sort((a, b) => new Date(b.payload.verifiedAt).getTime() - new Date(a.payload.verifiedAt).getTime());
  }, [proofs]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUser || !purpose) {
      alert("Please enter a user party and purpose.");
      return;
    }
    const payload: VerificationRequest = {
      verifier: party,
      holder: targetUser,
      purpose,
    };
    await ledger.create("ShieldedIdentity.Verification:VerificationRequest", payload);
    alert(`Verification request sent to ${targetUser}`);
  };

  return (
    <div className="view-container">
      <h2 style={styles.viewTitle}>Request Identity Verification</h2>
      <form onSubmit={handleVerify} style={styles.form}>
        <div style={styles.formGroup}>
          <label style={styles.label}>User Party ID</label>
          <input
            style={styles.input}
            type="text"
            value={targetUser}
            onChange={e => setTargetUser(e.target.value)}
          />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Purpose of Verification</label>
          <input
            style={styles.input}
            type="text"
            value={purpose}
            onChange={e => setPurpose(e.target.value)}
          />
        </div>
        <button type="submit" style={styles.button}>Send Verification Request</button>
      </form>

      <hr style={styles.hr} />

      <h2 style={styles.viewTitle}>Successful Verifications</h2>
      {loading ? <p>Loading proofs...</p> : (
        sortedProofs.length === 0 ? <p>No successful verifications recorded yet.</p> : (
          <ul style={styles.list}>
            {sortedProofs.map(proof => (
              <li key={proof.contractId} style={styles.listItem}>
                <p><strong>User:</strong> {proof.payload.holder}</p>
                <p><strong>Verified At:</strong> {new Date(proof.payload.verifiedAt).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
};


// --- Inline Styles ---

const styles: { [key: string]: React.CSSProperties } = {
  appContainer: {
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    maxWidth: '900px',
    margin: '0 auto',
    padding: '20px',
    color: '#333',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '20px',
    borderBottom: '1px solid #eee',
  },
  headerTitle: {
    margin: 0,
    color: '#003b5c',
  },
  logoutButton: {
    padding: '8px 16px',
    backgroundColor: '#f44336',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  mainContent: {
    paddingTop: '20px',
  },
  loginContainer: {
    textAlign: 'center',
    padding: '40px 0',
  },
  loginTitle: {
    marginBottom: '30px',
  },
  loginButtons: {
    display: 'flex',
    justifyContent: 'center',
    gap: '20px',
  },
  loggedInInfo: {
    marginBottom: '20px',
    padding: '10px',
    backgroundColor: '#e7f3fe',
    borderLeft: '4px solid #2196F3',
  },
  viewTitle: {
    color: '#003b5c',
    borderBottom: '2px solid #003b5c',
    paddingBottom: '5px',
    marginBottom: '20px',
  },
  list: {
    listStyleType: 'none',
    padding: 0,
  },
  listItem: {
    padding: '15px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    marginBottom: '10px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  button: {
    padding: '10px 20px',
    fontSize: '16px',
    cursor: 'pointer',
    border: 'none',
    borderRadius: '5px',
    backgroundColor: '#2196F3',
    color: 'white',
    transition: 'background-color 0.2s',
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
  },
  buttonSuccess: {
    backgroundColor: '#4CAF50',
  },
  buttonDanger: {
    backgroundColor: '#f44336',
  },
  hr: {
    margin: '30px 0',
    border: 'none',
    borderTop: '1px solid #eee',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    marginBottom: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    marginBottom: '5px',
    fontWeight: 'bold',
  },
  input: {
    padding: '10px',
    fontSize: '16px',
    border: '1px solid #ccc',
    borderRadius: '4px',
  },
};

export default App;