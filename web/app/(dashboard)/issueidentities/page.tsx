'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader';
import SignAndIssueModal, { SignAndIssueData } from '@/components/SignAndIssueModal';
import SearchFilter, { useSearchFilter } from '@/components/SearchFilter';

// Types
type IdentityStatus = 'waiting' | 'pending';

interface PendingIdentity {
  id: string;
  firstName: string;
  lastName: string;
  role: 'Student' | 'Professor';
  email: string;
  walletAddress: string;
  status: IdentityStatus;
}

type IdentityRow = PendingIdentity & { name: string; [key: string]: unknown };

//subcomponents

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

//mock data should be replaced with API
const MOCK_PENDING: PendingIdentity[] = [
  { id: '1', firstName: 'Ahmed', lastName: 'Hassan', role: 'Student', email: 'ahmed@cu.edu.eg', walletAddress: '0x4f2aB8...c3b1', status: 'waiting' },
  { id: '2', firstName: 'Nour', lastName: 'Ali', role: 'Student', email: 'nour@cu.edu.eg', walletAddress: '0x7e3dC2...a1c5', status: 'waiting' },
  { id: '3', firstName: 'Sara', lastName: 'Mohamed', role: 'Student', email: 'sara@cu.edu.eg', walletAddress: '0x9c1bF4...f4d2', status: 'pending' },
  { id: '4', firstName: 'Khaled', lastName: 'Mansour', role: 'Professor', email: 'k.mansour@cu.edu.eg', walletAddress: '0x2a1bD9...e2f4', status: 'waiting' },
  { id: '5', firstName: 'Hana', lastName: 'Farouk', role: 'Professor', email: 'h.farouk@cu.edu.eg', walletAddress: '0x6c2dF1...b3a1', status: 'pending' },
];

// Page

export default function IssueIdentitiesPage() {
  const [identities, setIdentities] = useState<PendingIdentity[]>([]);
  const [signTarget, setSignTarget] = useState<PendingIdentity | null>(null);
  const [signingLoading, setSigningLoading] = useState(false);

  useEffect(() => {
    // TODO: for api 
    setIdentities(MOCK_PENDING);
  }, []);

  // flatten full name so it's searchable as a single field
  const { filtered, handleSearch } = useSearchFilter<IdentityRow>(
    identities as IdentityRow[],
    (i) => ({
      ...i,
      name: [i.firstName, i.lastName].filter(Boolean).join(' '),
    }),
  );

  const waitingCount = identities.filter((i) => i.status === 'waiting').length;

  const buildSignData = (identity: PendingIdentity): SignAndIssueData => ({
    credentialType: identity.role,// "Student" or "Professor"
    title: `${identity.firstName} ${identity.lastName}`,
    code: identity.role === 'Student' ? 'STU' : 'PRF',
    authorizedBy: 'Fenerbahçe University',
    studentName: `${identity.firstName} ${identity.lastName}`,
    studentWallet: identity.walletAddress,
    payloadHash: '0x' + Math.random().toString(16).slice(2, 18) + '...',
  });

  const handleIssueClick = (identity: PendingIdentity) => {
    if (identity.status !== 'waiting') return;
    setSignTarget(identity);
  };

  const handleSignConfirm = async () => {
    if (!signTarget) return;
    setSigningLoading(true);

    // TODO: call your smart contract
    await new Promise((r) => setTimeout(r, 1200));

    setSigningLoading(false);
    setSignTarget(null);

    // flip to pending while blockchain under confirms
    setIdentities((prev) =>
      prev.map((i) => (i.id === signTarget.id ? { ...i, status: 'pending' } : i))
    );

    // TODO: will be removed or updated later
    setTimeout(() => {
      setIdentities((prev) => prev.filter((i) => i.id !== signTarget.id));
    }, 3000);
  };

  return (
    <>
      {signTarget && (
        <SignAndIssueModal
          data={buildSignData(signTarget)}
          onConfirm={handleSignConfirm}
          onCancel={() => setSignTarget(null)}
          loading={signingLoading}
        />
      )}

      <div className="flex flex-col h-full">
        <PageHeader title="Issue identities" />

        <div className="p-6 space-y-6">

          {/* stat cards later will be taakes the api for data !!!!!!!! */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Pending issuance" value={waitingCount} sub="wallet connected" subColor="text-yellow-400" />
            <StatCard label="No wallet yet" value={6} sub="awaiting" />
            <StatCard label="Already issued" value={22} sub="on-chain" subColor="text-mint" />
            <StatCard label="Revoked" value={1} sub="flagged" subColor="text-red-400" />
          </div>

          {/* banner message*/}
          <div className="flex items-center gap-3 bg-yellow-400/5 border border-yellow-400/20 rounded-xl px-4 py-3">
            <svg className="w-4 h-4 text-yellow-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
            </svg>
            <p className="text-textMuted text-sm">
              Showing users who have connected a wallet but haven&apos;t been issued a blockchain identity yet.
            </p>
          </div>

          {/* table */}
          <div className="bg-card border border-borderLine rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-borderLine">
              <h3 className="text-textMuted text-sm font-bold uppercase tracking-widest">
                Pending identity issuance

                {/* for filter */}
                {filtered.length !== identities.length && (
                  <span className="ml-2 text-mint normal-case font-normal">
                    — {filtered.length} result{filtered.length !== 1 ? 's' : ''}
                  </span>
                )}
              </h3>
            </div>

            {/* SearchFilter */}
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
                    {filtered.map(identity => (
                      <tr key={identity.id} className="border-b border-borderLine last:border-0 hover:bg-surface/50 transition">
                        <td className="px-6 py-4 text-textLight text-sm font-semibold">{identity.name}</td>
                        <td className="px-6 py-4"><RoleBadge role={identity.role} /></td>
                        <td className="px-6 py-4 text-textMuted text-sm">{identity.email}</td>
                        <td className="px-6 py-4 text-textMuted text-xs font-mono">{identity.walletAddress}</td>
                        <td className="px-6 py-4"><StatusBadge status={identity.status} /></td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleIssueClick(identity)}
                            disabled={identity.status === 'pending'}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition
                              ${identity.status === 'pending'
                                ? 'bg-surface text-textMuted border border-borderLine cursor-not-allowed'
                                : 'bg-mint text-navy hover:opacity-90'
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