import React from 'react';
import { useStreamQueries } from '@c7/react';
// This import path is an example. Replace with your actual dpm codegen output path.
import { Credential } from '@canton-shielded-identity/daml-codegen-output/lib/Shielded/Credential/V1';

// --- Helper Functions & Components ---

/**
 * A simple SVG icon to indicate a verified or valid status.
 */
const VerifiedIcon: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-8 w-8 text-green-500"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

/**
 * A simple SVG icon to indicate a non-verified, expired, or revoked status.
 */
const NotVerifiedIcon: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-8 w-8 text-gray-400"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

/**
 * Formats a Daml Date string (YYYY-MM-DD) into a more readable format.
 * @param dateString - The date string from the Daml contract.
 */
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  // Adjust for timezone to avoid off-by-one day errors
  const userTimezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() + userTimezoneOffset).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

type CredentialStatusInfo = {
  text: 'Valid' | 'Expired' | 'Revoked';
  color: string;
  bgColor: string;
  Icon: React.FC;
};

/**
 * Determines the current status of a credential contract.
 * @param credential - The credential contract from the ledger.
 */
const getCredentialStatus = (credential: Credential): CredentialStatusInfo => {
  // Daml Date "YYYY-MM-DD" is parsed as UTC midnight.
  const expiryDate = new Date(`${credential.payload.validUntil}T00:00:00Z`);

  // Get today's date at UTC midnight for a clean comparison.
  const now = new Date();
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  if (credential.payload.revokedAt) {
    return {
      text: 'Revoked',
      color: 'text-red-700',
      bgColor: 'bg-red-100',
      Icon: NotVerifiedIcon,
    };
  }

  if (expiryDate < todayUtc) {
    return {
      text: 'Expired',
      color: 'text-yellow-700',
      bgColor: 'bg-yellow-100',
      Icon: NotVerifiedIcon,
    };
  }

  return {
    text: 'Valid',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    Icon: VerifiedIcon,
  };
};

// --- Main Component ---

/**
 * CredentialStatus is a card component that displays the state of the user's
 * Shielded Identity Credential. It queries the ledger for the credential and
 * shows its validity, issuer, and expiry date.
 */
export const CredentialStatus: React.FC = () => {
  const { contracts, loading } = useStreamQueries(Credential);

  if (loading) {
    return (
      <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  if (contracts.length === 0) {
    return (
      <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200">
        <div className="flex items-center space-x-4">
          <NotVerifiedIcon />
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Identity Not Verified</h2>
            <p className="text-gray-500 mt-1">
              No KYC credential found. Please contact a registered issuer to get verified.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // A user should typically only have one active credential contract.
  const credential = contracts[0];
  const { text, color, bgColor, Icon } = getCredentialStatus(credential);

  return (
    <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Identity Credential</h2>
        <span className={`px-3 py-1 text-sm font-medium rounded-full ${bgColor} ${color}`}>
          {text}
        </span>
      </div>
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0 mt-1">
          <Icon />
        </div>
        <div className="flex-grow">
          <p className="text-gray-700 font-medium">Your identity has been successfully verified.</p>
          <p className="text-sm text-gray-500 mt-1">
            This shielded credential allows you to interact with Canton dApps without re-verifying your identity.
          </p>
          <div className="mt-4 border-t border-gray-200 pt-4">
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Issuer</dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono bg-gray-50 px-2 py-1 rounded truncate">
                  {/* The owner can see their issuer, but verifiers cannot. */}
                  {credential.payload.issuer}
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Expires On</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatDate(credential.payload.validUntil)}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
};