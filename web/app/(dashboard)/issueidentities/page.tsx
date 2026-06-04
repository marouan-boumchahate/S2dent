'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader';
import SignAndIssueModal, { SignAndIssueData } from '@/components/SignAndIssueModal';
import SearchFilter, { useSearchFilter } from '@/components/SearchFilter';
import { fetchStudents, fetchProfessors, ApiStudent, ApiProfessor } from '@/lib/api';

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



// Page

export default function IssueIdentitiesPage() {
  const [identities, setIdentities] = useState<PendingIdentity[]>([]);
  const [stats, setStats] = useState({ waiting: 0, noWallet: 0, issued: 0, revoked: 0 });
  const [signTarget, setSignTarget] = useState<PendingIdentity | null>(null);
  const [signingLoading, setSigningLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchStudents().catch(() => [] as ApiStudent[]),
      fetchProfessors().catch(() => [] as ApiProfessor[])
    ]).then(([students, professors]) => {
      let waiting = 0, noWallet = 0, issued = 0, revoked = 0;
      const pendingList: PendingIdentity[] = [];

      const processUser = (u: ApiStudent | ApiProfessor, role: 'Student' | 'Professor') => {
        if (u.is_revoked) { revoked++; return; }
        if (u.last_transaction_status === 'verified') { issued++; return; }
        if (!u.wallet_address) { noWallet++; return; }

        const status: IdentityStatus = u.last_transaction_status === 'pending' ? 'pending' : 'waiting';
        if (status === 'waiting') waiting++;

        pendingList.push({
          id: u.id,
          name: u.name,
          role,
          email: u.email,
          walletAddress: u.wallet_address,
          status
        });
      };

      students.forEach(s => processUser(s, 'Student'));
      professors.forEach(p => processUser(p, 'Professor'));

      setStats({ waiting, noWallet, issued, revoked });
      setIdentities(pendingList);
    });
  }, []);

  const { filtered, handleSearch } = useSearchFilter<IdentityRow>(
    identities as IdentityRow[],
    (i) => i
  );

  const buildSignData = (identity: PendingIdentity): SignAndIssueData => ({
    credentialType: identity.role,
    title: identity.name,
    code: identity.role === 'Student' ? 'STU' : 'PRF',
    authorizedBy: 'Fenerbahçe University',
    studentName: identity.name,
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

    try {
      const endpoint = signTarget.role === 'Student'
        ? '/identity/students/issue'
        : '/identity/professors/issue';

      const token = localStorage.getItem('access_token');
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

      await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          [`${signTarget.role.toLowerCase()}_address`]: signTarget.walletAddress
        })
      });
    } catch {
      // Proceed with local UI update even if API call fails
    }

    setSigningLoading(false);
    setSignTarget(null);

    setIdentities((prev) =>
      prev.map((i) => (i.id === signTarget.id ? { ...i, status: 'pending' } : i))
    );
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
            <StatCard label="Pending issuance" value={stats.waiting} sub="wallet connected" subColor="text-yellow-400" />
            <StatCard label="No wallet yet" value={stats.noWallet} sub="awaiting" />
            <StatCard label="Already issued" value={stats.issued} sub="on-chain" subColor="text-mint" />
            <StatCard label="Revoked" value={stats.revoked} sub="flagged" subColor="text-red-400" />
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