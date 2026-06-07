'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import FormField from '@/components/FormField';
import Button from '@/components/Button';
import {
  fetchProfessorById,
  fetchProfessorIdentity,
  fetchDepartments,
  fetchUserById,
  updateProfessor,
  revokeProfessorIdentity,
  ApiProfessorDetail,
  ApiProfessorIdentity,
  ApiDepartment,
  ApiUser,
} from '@/lib/api';

// helpers
function formatDate(dateStr?: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-borderLine last:border-0">
      <span className="text-textMuted text-sm">{label}</span>
      <span className="text-textLight text-sm font-medium text-right max-w-[60%] break-all">{value || '—'}</span>
    </div>
  );
}

function OnChainField({ label, value, fullWidth = false, mono = false }: {
  label: string; value: string; fullWidth?: boolean; mono?: boolean;
}) {
  return (
    <div className={`bg-navy border border-borderLine rounded-xl p-4 ${fullWidth ? 'col-span-2' : ''}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-textMuted mb-1">{label}</p>
      <p className={`text-textLight text-sm font-medium break-all ${mono ? 'font-mono text-xs' : ''}`}>{value || '—'}</p>
    </div>
  );
}

// Update modal
function UpdateModal({ currentRank, currentEmployment, currentLocation, currentHours, onConfirm, onCancel }: {
  currentRank: string; currentEmployment: string; currentLocation: string; currentHours: string;
  onConfirm: (rank: string, emp: string, loc: string, hours: string) => void; onCancel: () => void;
}) {
  const [rank, setRank] = useState(currentRank || '');
  const [employmentType, setEmploymentType] = useState(currentEmployment || '');
  const [officeLocation, setOfficeLocation] = useState(currentLocation || '');
  const [officeHours, setOfficeHours] = useState(currentHours || '');
  const [loading, setLoading] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <h3 className="text-gray-900 text-xl font-bold mb-1">Update Professor Record</h3>
        <p className="text-gray-500 text-sm mb-6">Changes will be updated in the database.</p>
        <div className="space-y-4">
          <FormField label="Rank" value={rank} onChange={setRank}
            options={['', 'Assist. Prof', 'Assoc. Prof', 'Prof', 'Lecturer', 'Instructor']} />
          <FormField label="Employment type" value={employmentType} onChange={setEmploymentType}
            options={['', 'full_time', 'part_time', 'adjunct', 'visiting', 'contract']} />
          <FormField label="Office location" value={officeLocation} onChange={setOfficeLocation}
            placeholder="e.g. Room C-03, Medical Bldg" />
          <FormField label="Office hours" value={officeHours} onChange={setOfficeHours}
            placeholder="e.g. Thu 09:00–11:00" />
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 p-3 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition font-semibold text-sm">
            Cancel
          </button>
          <Button title={loading ? 'Submitting…' : 'Submit'} onClick={async () => {
            setLoading(true);
            await onConfirm(rank, employmentType, officeLocation, officeHours);
            setLoading(false);
          }} variant="primary" className="flex-1 bg-mint text-navy rounded-xl font-semibold text-sm disabled:opacity-60" />
        </div>
      </div>
    </div>
  );
}

// Revoke modal
function RevokeModal({ name, onConfirm, onCancel }: {
  name: string; onConfirm: (reason: string) => void; onCancel: () => void;
}) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <h3 className="text-gray-900 text-xl font-bold mb-1">Revoke Identity</h3>
        <p className="text-gray-500 text-sm mb-5">
          Revoke blockchain identity for <span className="font-semibold text-gray-700">{name}</span>.
        </p>
        <div className="flex gap-3 bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-5">
          <svg className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <p className="text-yellow-800 text-sm leading-relaxed">
            This action is permanent on-chain. The professor will lose their verified status and be notified immediately.
          </p>
        </div>
        <FormField label="Reason for revocation" value={reason} onChange={setReason} placeholder="e.g. Contract ended" />
        <div className="flex gap-3 mt-6">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 p-3 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition font-semibold text-sm">
            Cancel
          </button>
          <Button title={loading ? 'Revoking…' : 'Confirm revoke'} onClick={async () => {
            setLoading(true);
            await onConfirm(reason);
            setLoading(false);
          }} variant="danger" className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold text-sm" />
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ProfessorDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [professor, setProfessor] = useState<ApiProfessorDetail | null>(null);
  const [user, setUser] = useState<ApiUser | null>(null);           // full_name, photo_url
  const [onChain, setOnChain] = useState<ApiProfessorIdentity | null>(null);
  const [deptName, setDeptName] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [onChainLoading, setOnChainLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<string>('admin');
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('userRole');
    if (stored) setRole(stored);
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setOnChainLoading(true);

    fetchProfessorById(id)
      .then(async (detail) => {
        setProfessor(detail);
        setError(null);

        // Parallel: user record, departments, on-chain identity
        const [userRecord, depts, identity] = await Promise.allSettled([
          fetchUserById(detail.user_id),
          fetchDepartments(),
          fetchProfessorIdentity(detail.user_id),
        ]);

        if (userRecord.status === 'fulfilled' && userRecord.value) setUser(userRecord.value);
        if (depts.status === 'fulfilled') {
          const match = depts.value.find((d: ApiDepartment) => d.id === detail.department_id);
          if (match) setDeptName(match.name);
        }
        if (identity.status === 'fulfilled') setOnChain(identity.value);
        setOnChainLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to connect to the backend API');
        setOnChainLoading(false);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-textMuted animate-pulse">Loading live professor data...</p>
    </div>
  );

  if (error || !professor) return (
    <div className="flex flex-col items-center justify-center min-h-48 py-12 gap-2">
      <p className="text-red-500 font-medium px-4">Error: {error}</p>
      <p className="text-textMuted text-sm">Please ensure the Docker API container is running.</p>
    </div>
  );

  const handleUpdate = async (rank: string, emp: string, loc: string, hours: string) => {
    try {
      await updateProfessor(id, {
        rank: rank || undefined, employment_type: emp || undefined,
        office_location: loc || undefined, office_hours: hours || undefined,
      });
      setShowUpdateModal(false);
      window.location.reload();
    } catch (err) { console.error(err); }
  };

  const handleRevoke = async (reason: string) => {
    try {
      if (onChain?.wallet_address) await revokeProfessorIdentity(onChain.wallet_address, reason);
      router.push('/professors');
    } catch (err) { console.error(err); }
  };

  const displayName = user?.full_name
    ? `${professor.title ? professor.title + ' ' : ''}${user.full_name}`
    : `${professor.title ? professor.title + ' ' : ''}${professor.serial_number}`;

  return (
    <>
      {showUpdateModal && (
        <UpdateModal
          currentRank={professor.rank} currentEmployment={professor.employment_type}
          currentLocation={professor.office_location} currentHours={professor.office_hours}
          onConfirm={handleUpdate} onCancel={() => setShowUpdateModal(false)}
        />
      )}
      {showRevokeModal && (
        <RevokeModal name={displayName} onConfirm={handleRevoke} onCancel={() => setShowRevokeModal(false)} />
      )}

      <div className="flex flex-col h-full">
        <button onClick={() => router.push('/professors')}
          className="flex items-center gap-2 text-textMuted hover:text-textLight transition text-sm mb-6 w-fit">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Professors
        </button>

        <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">

          {/* ── LEFT: Profile Card ── */}
          <div className="lg:w-72 xl:w-80 shrink-0">
            <div className="bg-card border border-borderLine rounded-2xl p-6 flex flex-col items-center text-center">

              {/* Photo or avatar fallback */}
              {user?.photo_url && !imgError ? (
                <img
                  src={user.photo_url}
                  alt={displayName}
                  className="w-20 h-20 rounded-full object-cover border-2 border-mint mb-3"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="w-20 h-20 rounded-full border-2 border-mint bg-mint/5 flex items-center justify-center mb-3">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-10 h-10 text-mint"
                  >
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                  </svg>
                </div>
              )}

              <h2 className="text-textLight text-lg font-bold">{displayName}</h2>
              <p className="text-textMuted text-sm mt-0.5">{professor.serial_number}</p>

              <span className={`mt-2 px-3 py-0.5 rounded-full text-xs font-semibold border ${onChain?.status?.is_revoked
                  ? 'border-red-400 text-red-400 bg-red-500/5'
                  : 'border-mint text-mint bg-mint/5'
                }`}>
                {onChainLoading ? '…' : onChain?.status?.is_revoked ? 'Revoked' : onChain ? 'Verified' : 'Unissued'}
              </span>

              <div className="w-full mt-5">
                <InfoRow label="Serial Number" value={professor.serial_number} />
                <InfoRow label="Department" value={deptName || '—'} />
                <InfoRow label="Rank" value={professor.rank} />
                <InfoRow label="Specialization" value={professor.specialization} />
                <InfoRow label="Hire Date" value={formatDate(professor.hire_date)} />
                <InfoRow label="Employment" value={professor.employment_type} />
                <InfoRow label="Office" value={professor.office_location} />
                <InfoRow label="Office Hours" value={professor.office_hours} />
              </div>

              {role === 'admin' && (
                <div className="w-full mt-6 space-y-3">
                  <Button title="Update Details" onClick={() => setShowUpdateModal(true)}
                    variant="primary" className="w-full bg-mint text-navy rounded-xl font-semibold text-sm" />
                  <button onClick={() => setShowRevokeModal(true)}
                    className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition font-semibold text-sm">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Revoke Identity
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT: On-Chain + Bio ── */}
          <div className="flex-1 space-y-6 overflow-y-auto">
            <div className="bg-card border border-borderLine rounded-2xl p-6">
              <h3 className="text-textMuted text-xs font-bold uppercase tracking-widest mb-4">On-Chain Information</h3>

              {onChainLoading ? (
                <div className="grid grid-cols-2 gap-3">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className={`bg-navy border border-borderLine rounded-xl p-4 h-16 animate-pulse ${i >= 6 ? 'col-span-2' : ''}`} />
                  ))}
                </div>
              ) : onChain ? (
                <div className="grid grid-cols-2 gap-3">
                  <OnChainField label="Wallet Address" value={onChain.wallet_address} fullWidth mono />
                  <OnChainField label="Issued Date" value={formatDate(onChain.status.issued_at)} />
                  <OnChainField label="Issuer" value={onChain.status.issuer} fullWidth mono />
                  <OnChainField label="Public Key" value={onChain.identity.public_key} fullWidth mono />
                  <OnChainField label="Signature" value={onChain.identity.signature} fullWidth mono />
                </div>
              ) : (
                <p className="text-textMuted text-sm">No on-chain identity found for this professor.</p>
              )}
            </div>

            {professor.bio && (
              <div className="bg-card border border-borderLine rounded-2xl p-6">
                <h3 className="text-textMuted text-xs font-bold uppercase tracking-widest mb-4">Bio</h3>
                <p className="text-textLight text-sm leading-relaxed">{professor.bio}</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}