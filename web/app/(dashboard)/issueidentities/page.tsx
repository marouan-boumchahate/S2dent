'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader';
import SignAndIssueModal, { SignAndIssueData } from '@/components/SignAndIssueModal';
import SearchFilter, { useSearchFilter } from '@/components/SearchFilter';
import {
  fetchWaitingIdentities,
  fetchProfessorIdentitySchema,
  fetchStudentIdentitySchema,
  issueProfessorIdentity,
  issueStudentIdentity,
  IdentitySchema,
} from '@/lib/api';
import { useAlert } from '@/components/AlertContext';
import { getFriendlyErrorMessage } from '@/lib/utils';

// Types
type IdentityStatus = 'waiting' | 'pending';

interface PendingIdentity {
  id: string;
  name: string;
  role: 'Student' | 'Professor';
  email: string;
  walletAddress: string;
  status: IdentityStatus;
}

type IdentityRow = PendingIdentity & { [key: string]: unknown };

// Subcomponents

function RoleBadge({ role }: { role: PendingIdentity['role'] }) {
  const cls =
    role === 'Student'
      ? 'bg-mint/10 text-mint border-mint/30'
      : 'bg-purple-400/10 text-purple-400 border-purple-400/30';
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      {role}
    </span>
  );
}

function StatusBadge({ status }: { status: IdentityStatus }) {
  if (status === 'pending') {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-yellow-400/10 text-yellow-400 border-yellow-400/30">
        Pending
      </span>
    );
  }
  return (
    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-blue-400/10 text-blue-400 border-blue-400/30">
      Waiting
    </span>
  );
}

function StatCard({ label, value, sub, subColor }: {
  label: string; value: string | number; sub: string; subColor?: string;
}) {
  return (
    <div className="bg-card border border-borderLine rounded-2xl p-5">
      <p className="text-textMuted text-sm mb-1">{label}</p>
      <p className="text-textLight text-3xl font-bold">{value}</p>
      <p className={`text-xs mt-1 font-medium ${subColor ?? 'text-textMuted'}`}>{sub}</p>
    </div>
  );
}

// Page

export default function IssueIdentitiesPage() {
  const { showAlert } = useAlert();
  const [identities, setIdentities] = useState<PendingIdentity[]>([]);
  const [stats, setStats] = useState({ waiting: 0, noWallet: 0, issued: 0, revoked: 0 });
  const [signTarget, setSignTarget] = useState<PendingIdentity | null>(null);
  const [signData, setSignData] = useState<SignAndIssueData | null>(null);
  const [schema, setSchema] = useState<IdentitySchema | null>(null);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [signingLoading, setSigningLoading] = useState(false);

  useEffect(() => {
    fetchWaitingIdentities()
      .then((list) => {
        const pendingList: PendingIdentity[] = list.map((u) => ({
          id: u.wallet_address,
          name: u.full_name,
          role: u.role === 'professor' ? 'Professor' : 'Student',
          email: u.email,
          walletAddress: u.wallet_address,
          status: 'waiting' as IdentityStatus,
        }));

        setStats((prev) => ({ ...prev, waiting: pendingList.length }));
        setIdentities(pendingList);
      })
      .catch(() => setIdentities([]));
  }, []);

  const { filtered, handleSearch } = useSearchFilter<IdentityRow>(
    identities as IdentityRow[],
    (i) => i,
  );

  // Step 1: fetch the EIP-712 schema from the API, then open the modal with real data
  const handleIssueClick = async (identity: PendingIdentity) => {
    if (identity.status !== 'waiting') return;
    setSchemaLoading(true);
    setSchemaError(null);

    try {
      const fetchSchema = identity.role === 'Professor'
        ? fetchProfessorIdentitySchema
        : fetchStudentIdentitySchema;

      const fetchedSchema = await fetchSchema(identity.walletAddress);
      setSchema(fetchedSchema);

      const msg = fetchedSchema.message;

      // Build the SignAndIssueData from the real schema message
      const built: SignAndIssueData = {
        credentialType: identity.role,
        title: identity.name,
        code: identity.role === 'Student' ? 'STU' : 'PRF',
        authorizedBy: msg.academyName || '—',
        authorizerWalletAddress: msg.academyWalletAddress,
        studentName: msg.fullName || identity.name,
        studentWallet: identity.walletAddress,
        payloadHash: identity.role === 'Professor'
          ? (msg.professorIdHash || '—')
          : (msg.studentIdHash || '—'),
        nationalIdHash: msg.nationalIdHash,
        publicKey: msg.publicKey,
        hireDate: msg.hireDate,
        enrollmentDate: msg.enrollmentDate,
        department: msg.department,
      };

      setSignTarget(identity);
      setSignData(built);
    } catch (err: any) {
      setSchemaError(err.message || 'Failed to load signing schema. Please try again.');
    } finally {
      setSchemaLoading(false);
    }
  };

  // Step 2: ensure correct chain, sign the EIP-712 typed data, then POST to issue endpoint
  const handleSignConfirm = async () => {
    if (!signTarget || !schema) return;
    setSigningLoading(true);

    try {
      if (!window.ethereum) {
        showAlert({
          type: 'error',
          title: 'MetaMask Required',
          message: 'Please install MetaMask to issue identities.'
        });
        return;
      }

      const accounts: string[] = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      const expectedChainId = `0x${schema.domain.chainId.toString(16)}`;
      const currentChainId: string = await window.ethereum.request({ method: 'eth_chainId' });

      if (currentChainId.toLowerCase() !== expectedChainId.toLowerCase()) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: expectedChainId }],
          });
        } catch (switchErr: any) {
          showAlert({
            type: 'error',
            title: 'Wrong Network',
            message: `Wrong network. Please switch MetaMask to chainId ${schema.domain.chainId} and try again.`
          });
          return;
        }
      }

      const { ethers } = await import('ethers');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const { EIP712Domain: _, ...typesWithoutDomain } = schema.types as any;

      const signature = await signer.signTypedData(
        schema.domain,
        typesWithoutDomain,
        schema.message,
      );

      const recovered = ethers.verifyTypedData(
        schema.domain,
        typesWithoutDomain,
        schema.message,
        signature,
      );

      if (signTarget.role === 'Professor') {
        await issueProfessorIdentity(signTarget.walletAddress, signature);
      } else {
        await issueStudentIdentity(signTarget.walletAddress, signature);
      }

      setIdentities((prev) => prev.filter((i) => i.id !== signTarget.id));
      setStats((prev) => ({ ...prev, waiting: Math.max(0, prev.waiting - 1) }));

      showAlert({
        type: 'success',
        title: 'Identity Issued',
        message: `Identity for ${signTarget.name} has been successfully issued on-chain.`
      });

    } catch (err: any) {
      showAlert({
        type: 'error',
        title: 'Issuance Failed',
        message: getFriendlyErrorMessage(err, 'Failed to issue identity.')
      });
    } finally {
      setSigningLoading(false);
      setSignTarget(null);
      setSignData(null);
      setSchema(null);
    }
  };

  const handleCancel = () => {
    setSignTarget(null);
    setSignData(null);
    setSchema(null);
    setSchemaError(null);
  };

  return (
    <>
      {/* Schema loading overlay */}
      {schemaLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-card border border-borderLine rounded-2xl px-8 py-6 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-mint border-t-transparent rounded-full animate-spin" />
            <p className="text-textMuted text-sm">Loading signing schema…</p>
          </div>
        </div>
      )}

      {/* Schema error */}
      {schemaError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-card border border-red-500/30 rounded-2xl px-8 py-6 max-w-sm w-full mx-4 flex flex-col gap-4">
            <p className="text-red-400 font-semibold">Failed to load schema</p>
            <p className="text-textMuted text-sm">{schemaError}</p>
            <button
              onClick={() => setSchemaError(null)}
              className="w-full py-2 rounded-lg bg-surface border border-borderLine text-textMuted hover:text-textLight transition text-sm font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Sign modal — only opens after schema is successfully fetched */}
      {signTarget && signData && (
        <SignAndIssueModal
          data={signData}
          onConfirm={handleSignConfirm}
          onCancel={handleCancel}
          loading={signingLoading}
        />
      )}

      <div className="flex flex-col h-full">
        <PageHeader title="Issue identities" />

        <div className="p-6 space-y-6">

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Pending issuance" value={stats.waiting} sub="wallet connected" subColor="text-yellow-400" />
            <StatCard label="No wallet yet" value={stats.noWallet} sub="awaiting" />
            <StatCard label="Already issued" value={stats.issued} sub="on-chain" subColor="text-mint" />
            <StatCard label="Revoked" value={stats.revoked} sub="flagged" subColor="text-red-400" />
          </div>

          <div className="flex items-center gap-3 bg-yellow-400/5 border border-yellow-400/20 rounded-xl px-4 py-3">
            <svg className="w-4 h-4 text-yellow-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
            </svg>
            <p className="text-textMuted text-sm">
              Students and Professors who have connected a wallet but haven&apos;t been issued a blockchain identity yet.
            </p>
          </div>

          <div className="bg-card border border-borderLine rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-borderLine">
              <h3 className="text-textMuted text-sm font-bold uppercase tracking-widest">
                Pending identity issuance
                {filtered.length !== identities.length && (
                  <span className="ml-2 text-mint normal-case font-normal">
                    — {filtered.length} result{filtered.length !== 1 ? 's' : ''}
                  </span>
                )}
              </h3>
            </div>

            <div className="px-6 py-4 border-b border-borderLine">
              <SearchFilter
                placeholder="Search by name, email, role…"
                filterKeys={[
                  { label: 'Name', value: 'name' },
                  { label: 'Email', value: 'email' },
                  { label: 'Role', value: 'role' },
                  { label: 'Status', value: 'status' },
                ]}
                onSearch={handleSearch}
              />
            </div>

            {identities.length === 0 ? (
              <div className="flex items-center justify-center min-h-48 py-12">
                <p className="text-textMuted text-sm">No pending identities. All users have been issued.</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-48 py-12 gap-2">
                <p className="text-textMuted">No identities match your search.</p>
                <p className="text-textMuted text-sm">Try a different keyword or filter.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-borderLine">
                      {['Name', 'Role', 'Email', 'Wallet address', 'Status', 'Action'].map((h) => (
                        <th key={h} className="text-left text-textMuted text-xs font-bold uppercase tracking-wider px-6 py-3">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((identity) => (
                      <tr key={identity.id} className="border-b border-borderLine last:border-0 hover:bg-surface/50 transition">
                        <td className="px-6 py-4 text-textLight text-sm font-semibold">{identity.name}</td>
                        <td className="px-6 py-4"><RoleBadge role={identity.role} /></td>
                        <td className="px-6 py-4 text-textMuted text-sm">{identity.email}</td>
                        <td className="px-6 py-4 text-textMuted text-xs font-mono">{identity.walletAddress}</td>
                        <td className="px-6 py-4"><StatusBadge status={identity.status} /></td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleIssueClick(identity)}
                            disabled={identity.status === 'pending' || schemaLoading}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition
                              ${identity.status === 'pending'
                                ? 'bg-surface text-textMuted border border-borderLine cursor-not-allowed'
                                : 'bg-mint text-navy hover:opacity-90 disabled:opacity-50'
                              }`}
                          >
                            {identity.status === 'pending' ? 'Processing…' : 'Issue identity'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}