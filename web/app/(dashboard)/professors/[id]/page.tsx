'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { store, Professor } from '@/lib/store';

// mock on-chain data!!replace with API when ready
const MOCK_ONCHAIN = {
  walletAddress: '0x7a3cD9f1...b2e4',
  identityStatus: 'Active' as 'Active' | 'Inactive' | 'Revoked',
  issuedDate: 'Feb 10, 2024',
  blockNumber: '#20,115,443',
  transactionHash: '0xfe98ba76cd54fe98ba76cd54fe98ba76cd54aa1b',
  certificateHash: 'f1c2d3e4a5b6c7d8e9f0...1a2b3c4d5e6f',
};

// mock certificates !replace with API when ready
const MOCK_CERTS = [
  { id: '1', name: 'Teaching Excellence 2024', date: 'Dec 15, 2024', type: 'Achievement' },
];

function getInitials(p: Professor) {
  return [p.firstName, p.lastName].filter(Boolean).map(n => n[0].toUpperCase()).join('');
}
function maskNationalId(id: string) {
  if (!id || id.length < 8) return id;
  return id.slice(0, 6) + '****' + id.slice(-4);
}
function formatDate(dateStr: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-borderLine last:border-0">
      <span className="text-textMuted text-sm">{label}</span>
      <span className="text-textLight text-sm font-medium text-right max-w-[60%] break-all">{value || '—'}</span>
    </div>
  );
}

function OnChainField({ label, value, fullWidth = false }: { label: string; value: string; fullWidth?: boolean }) {
  return (
    <div className={`bg-navy border border-borderLine rounded-xl p-4 ${fullWidth ? 'col-span-2' : ''}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-textMuted mb-1">{label}</p>
      <p className="text-textLight text-sm font-medium break-all">{value}</p>
    </div>
  );
}

function CertTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    Degree: 'bg-mint/10 text-mint border border-mint/30',
    Achievement: 'bg-blue-500/10 text-blue-400 border border-blue-400/30',
    Honor: 'bg-purple-500/10 text-purple-400 border border-purple-400/30',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors[type] ?? colors.Achievement}`}>
      {type}
    </span>
  );
}

// revoke moda
function RevokeModal({
  name,
  role = 'professor',
  onConfirm,
  onCancel,
}: {
  name: string;
  role?: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    // TODO: replace with real blockchain revoke call, e.g.:
    // await revokeIdentityOnChain({ walletAddress: MOCK_ONCHAIN.walletAddress, reason });
    await new Promise(r => setTimeout(r, 800)); // simulate network delay
    setLoading(false);
    onConfirm(reason);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />

      {/* modal card */}
      <div className="relative bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">

        <h3 className="text-gray-900 text-xl font-bold mb-1">Revoke Identity</h3>
        <p className="text-gray-500 text-sm mb-5">
          Revoke blockchain identity for{' '}
          <span className="font-semibold text-gray-700">{name}</span>.
        </p>

        {/* warning banner */}
        <div className="flex gap-3 bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-5">
          <svg className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <p className="text-yellow-800 text-sm leading-relaxed">
            This action is permanent on-chain. The {role} will lose their verified status and be notified immediately.
          </p>
        </div>

        {/* reason field */}
        <label className="block text-gray-700 text-sm font-medium mb-2">
          Reason for revocation
        </label>
        <input
          type="text"
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="e.g. Contract ended"
          className="w-full border border-gray-300 focus:border-green-400 outline-none rounded-xl px-4 py-3 text-gray-800 text-sm placeholder-gray-400 transition mb-6"
        />

        {/* buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 p-3 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition font-semibold text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 p-3 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white transition font-semibold text-sm flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Revoking…
              </>
            ) : (
              'Confirm revoke'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// main page
export default function ProfessorDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [professor, setProfessor] = useState<Professor | null>(null);
  const [showRevokeModal, setShowRevokeModal] = useState(false);

  useEffect(() => {
    const found = store.professors.find(p => p.id === id);
    if (!found) { router.push('/professors'); return; }
    setProfessor(found);
  }, [id, router]);

  if (!professor) {
    return <div className="flex items-center justify-center h-full"><p className="text-textMuted">Loading…</p></div>;
  }

  const fullName = [professor.title, professor.firstName, professor.middleName, professor.lastName].filter(Boolean).join(' ');
  const initials = getInitials(professor);

  const handleRevoke = (reason: string) => {
    // TODO: reason is passed to blockchain API once ready
    console.log('Revoke reason:', reason);
    store.removeProfessor(professor.id);
    router.push('/professors');
  };

  return (
    <>
      {showRevokeModal && (
        <RevokeModal
          name={fullName}
          role="professor"
          onConfirm={handleRevoke}
          onCancel={() => setShowRevokeModal(false)}
        />
      )}

      <div className="flex flex-col h-full">
        <button
          onClick={() => router.push('/professors')}
          className="flex items-center gap-2 text-textMuted hover:text-textLight transition text-sm mb-6 w-fit"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Professors
        </button>

        <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">

          {/* LEFT: profile card */}
          <div className="lg:w-72 xl:w-80 shrink-0">
            <div className="bg-card border border-borderLine rounded-2xl p-6 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-mint/10 border-2 border-mint flex items-center justify-center mb-3">
                <span className="text-mint text-2xl font-bold">{initials}</span>
              </div>
              <h2 className="text-textLight text-lg font-bold">{fullName}</h2>
              <p className="text-textMuted text-xs mt-0.5">
                PRF-{new Date(professor.createdAt).getFullYear()}-{professor.id.slice(0, 5).toUpperCase()}
              </p>
              <span className="mt-2 px-3 py-0.5 rounded-full text-xs font-semibold border border-mint text-mint bg-mint/5">
                Verified
              </span>

              <div className="w-full mt-5">
                <InfoRow label="Email" value={professor.email} />
                <InfoRow label="Department" value={professor.department} />
                <InfoRow label="Nationality" value={professor.nationality} />
                <InfoRow label="National ID" value={maskNationalId(professor.nationalId)} />
                <InfoRow label="Rank" value={professor.rank} />
                <InfoRow label="Specialization" value={professor.specialization} />
                <InfoRow label="Hire Date" value={formatDate(professor.hireDate)} />
                <InfoRow label="Employment" value={professor.employmentType} />
                <InfoRow label="Office" value={professor.officeLocation} />
                <InfoRow label="Office Hours" value={professor.officeHours} />
              </div>

              <div className="w-full mt-6 space-y-3">
                <button
                  disabled
                  title="Coming soon"
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-mint/40 text-navy font-semibold text-sm cursor-not-allowed opacity-60"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.5-6.5a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2a2 2 0 01.586-1.414z" />
                  </svg>
                  Update Identity
                </button>
                <button
                  onClick={() => setShowRevokeModal(true)}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition font-semibold text-sm"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Revoke Identity
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: on-chain + certificates */}
          <div className="flex-1 space-y-6 overflow-y-auto">
            <div className="bg-card border border-borderLine rounded-2xl p-6">
              <h3 className="text-textMuted text-xs font-bold uppercase tracking-widest mb-4">On-Chain Information</h3>
              {/* TODO: replace with real API data */}
              <div className="grid grid-cols-2 gap-3">
                <OnChainField label="Wallet Address" value={MOCK_ONCHAIN.walletAddress} />
                <OnChainField label="Identity Status" value={MOCK_ONCHAIN.identityStatus} />
                <OnChainField label="Issued Date" value={MOCK_ONCHAIN.issuedDate} />
                <OnChainField label="Block Number" value={MOCK_ONCHAIN.blockNumber} />
                <OnChainField label="Transaction Hash" value={MOCK_ONCHAIN.transactionHash} fullWidth />
                <OnChainField label="Certificate Hash (SHA-256)" value={MOCK_ONCHAIN.certificateHash} fullWidth />
              </div>
            </div>

            <div className="bg-card border border-borderLine rounded-2xl p-6">
              <h3 className="text-textMuted text-xs font-bold uppercase tracking-widest mb-4">Certificates</h3>
              {/* TODO: replace with real API data */}
              {MOCK_CERTS.length === 0 ? (
                <p className="text-textMuted text-sm py-4 text-center">No certificates issued yet.</p>
              ) : (
                <div className="space-y-3">
                  {MOCK_CERTS.map(cert => (
                    <div key={cert.id} className="flex items-center justify-between py-3 px-4 rounded-xl border border-borderLine hover:bg-surface/50 transition">
                      <div>
                        <p className="text-textLight text-sm font-semibold">{cert.name}</p>
                        <p className="text-textMuted text-xs mt-0.5">{cert.date}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <CertTypeBadge type={cert.type} />
                        <button className="text-xs border border-borderLine text-textMuted hover:text-textLight hover:border-mint px-3 py-1 rounded-lg transition">
                          View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}