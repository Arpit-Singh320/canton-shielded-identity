import React from 'react';
import { useStreamQueries } from '@c7/react';
import { KycCredential } from '@canton-shielded-identity/model/lib/Shielded/Identity/Credential'; // NOTE: Adjust this import path to your generated types

interface CredentialStatusProps {
  /** The party ID of the user whose credential status is being displayed. */
  partyId: string | null;
}

/**
 * A UI component that displays the status of a user's KYC credential.
 * It queries the ledger for an active `KycCredential` contract for the given party
 * and displays its validity and expiry date.
 */
const CredentialStatus: React.FC<CredentialStatusProps> = ({ partyId }) => {
  const { contracts, loading } = useStreamQueries(
    KycCredential,
    // Only query if a partyId is provided, otherwise return an empty result set.
    partyId ? () => [{ owner: partyId }] : () => [],
    [partyId]
  );

  const cardBaseStyle = "bg-white shadow-lg rounded-lg p-6 max-w-sm w-full mx-auto";
  const titleStyle = "text-xl font-semibold text-gray-800 mb-4";
  const statusContainerStyle = "flex items-center justify-between";
  const statusLabelStyle = "text-sm font-medium text-gray-500";
  const statusValueBaseStyle = "text-base font-bold px-4 py-1 rounded-full text-white";
  const detailRowStyle = "flex justify-between text-sm text-gray-600 mt-2";

  // Render a loading state while fetching data from the ledger.
  if (loading) {
    return (
      <div className={`${cardBaseStyle} animate-pulse`}>
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="flex justify-between items-center">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-8 bg-gray-200 rounded-full w-24"></div>
        </div>
        <div className="mt-4 border-t pt-4 space-y-3">
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  // Handle the case where no party is logged in.
  if (!partyId) {
    return (
      <div className={cardBaseStyle}>
        <h2 className={titleStyle}>Identity Credential</h2>
        <p className="text-sm text-gray-600">Please log in to view your credential status.</p>
      </div>
    );
  }

  const credential = contracts[0]?.payload;

  // Render the status card based on whether a credential exists.
  if (credential) {
    const expiryDate = new Date(credential.expiryDate);
    const isExpired = expiryDate < new Date();
    const statusText = isExpired ? "Expired" : "Verified";
    const statusColor = isExpired ? "bg-red-500" : "bg-green-500";
    const formattedExpiryDate = expiryDate.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return (
      <div className={cardBaseStyle}>
        <h2 className={titleStyle}>Identity Credential Status</h2>
        <div className={statusContainerStyle}>
          <span className={statusLabelStyle}>Status</span>
          <span className={`${statusValueBaseStyle} ${statusColor}`}>{statusText}</span>
        </div>
        <div className="mt-4 border-t pt-4">
          <div className={detailRowStyle}>
            <span>Issuer:</span>
            <span className="font-mono text-xs truncate" title={credential.issuer}>
              {credential.issuer}
            </span>
          </div>
          <div className={detailRowStyle}>
            <span>Owner:</span>
            <span className="font-mono text-xs truncate" title={credential.owner}>
              {credential.owner}
            </span>
          </div>
          <div className={detailRowStyle}>
            <span>Expires On:</span>
            <span className="font-medium">{formattedExpiryDate}</span>
          </div>
        </div>
        {isExpired && (
          <p className="mt-4 text-sm text-red-700">
            Your credential has expired. Please contact an issuer to renew it.
          </p>
        )}
      </div>
    );
  }

  // Render the state for a user with no credential.
  return (
    <div className={cardBaseStyle}>
      <h2 className={titleStyle}>Identity Credential Status</h2>
      <div className={statusContainerStyle}>
        <span className={statusLabelStyle}>Status</span>
        <span className={`${statusValueBaseStyle} bg-gray-400`}>Not Verified</span>
      </div>
      <div className="mt-4 border-t pt-4">
        <p className="text-sm text-gray-600">
          No KYC credential found for your party. Please contact an issuing institution to get verified.
        </p>
      </div>
    </div>
  );
};

export default CredentialStatus;