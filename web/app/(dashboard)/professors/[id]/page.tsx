'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { store, Professor } from '@/lib/store';
import FormField from '@/components/FormField';
import Button from '@/components/Button';
import { fetchProfessorById, updateProfessor, revokeProfessorIdentity, fetchProfessors, fetchStudentOnChain as fetchIdentityOnChain, ApiProfessorDetail, OnChainStudent } from '@/lib/api';





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

// Update modal — rank, employment type, office location, office hours
function UpdateModal({
  current,
  onConfirm,
  onCancel,
}: {
  current: { rank: string; employmentType: string; officeLocation: string; officeHours: string };
  onConfirm: (data: { rank: string; employmentType: string; officeLocation: string; officeHours: string }) => void;
  onCancel: () => void;
}) {
  const [rank, setRank] = useState(current.rank || '');
  const [employmentType, setEmploymentType] = useState(current.employmentType || '');
  const [officeLocation, setOfficeLocation] = useState(current.officeLocation || '');
  const [officeHours, setOfficeHours] = useState(current.officeHours || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    // TODO: replace with real blockchain update call
    await new Promise(r => setTimeout(r, 800));
    setLoading(false);
    onConfirm({ rank, employmentType, officeLocation, officeHours });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">

        <h3 className="text-gray-900 text-xl font-bold mb-1">Update Professor Record</h3>
        <p className="text-gray-500 text-sm mb-6">
          Changes will be submitted as a new on-chain transaction.
        </p>

        <div className="space-y-4">
          <FormField
            label="Rank"
            value={rank}
            onChange={setRank}
            options={['', 'Assist. Prof', 'Assoc. Prof', 'Prof', 'Lecturer', 'Instructor']}
          />
          <FormField
            label="Employment type"
            value={employmentType}
            onChange={setEmploymentType}
            options={['', 'full_time', 'part_time', 'adjunct', 'visiting', 'contract']}
          />
          <FormField
            label="Office location"
            value={officeLocation}
            onChange={setOfficeLocation}
            placeholder="e.g. Room C-03, Medical Bldg"
          />
          <FormField
            label="Office hours"
            value={officeHours}
            onChange={setOfficeHours}
            placeholder="e.g. Thu 09:00–11:00"
          />
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 p-3 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition font-semibold text-sm"
          >
            Cancel
          </button>
          <Button
            title={loading ? 'Submitting…' : 'Submit tx'}
            onClick={handleSubmit}
            variant="primary"
            className="flex-1 bg-mint text-navy rounded-xl font-semibold text-sm disabled:opacity-60"
          />
        </div>
      </div>
    </div>
  );
}

// Revoke modal
function RevokeModal({
  name,
  onConfirm,
  onCancel,
}: {
  name: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    // TODO: replace with real blockchain revoke call
    await new Promise(r => setTimeout(r, 800));
    setLoading(false);
    onConfirm(reason);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">

        <h3 className="text-gray-900 text-xl font-bold mb-1">Revoke Identity</h3>
        <p className="text-gray-500 text-sm mb-5">
          Revoke blockchain identity for{' '}
          <span className="font-semibold text-gray-700">{name}</span>.
        </p>

        <div className="flex gap-3 bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-5">
          <svg className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <p className="text-yellow-800 text-sm leading-relaxed">
            This action is permanent on-chain. The professor will lose their verified status and be notified immediately.
          </p>
        </div>

        <FormField
          label="Reason for revocation"
          value={reason}
          onChange={setReason}
          placeholder="e.g. Contract ended"
        />

        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 p-3 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition font-semibold text-sm"
          >
            Cancel
          </button>
          <Button
            title={loading ? 'Revoking…' : 'Confirm revoke'}
            onClick={handleConfirm}
            variant="danger"
            className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold text-sm"
          />
        </div>
      </div>
    </div>
  );
}

// Main page
export default function ProfessorDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [professor, setProfessor] = useState<Professor | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);

  const [rank, setRank] = useState('');
  const [employmentType, setEmploymentType] = useState('');
  const [officeLocation, setOfficeLocation] = useState('');
  const [officeHours, setOfficeHours] = useState('');

  const [role, setRole] = useState<string>('admin');
  const [apiDetail, setApiDetail] = useState<ApiProfessorDetail | null>(null);
  const [onChain, setOnChain] = useState<OnChainStudent | null>(null);
  const [onChainLoading, setOnChainLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('userRole');
    if (stored) setRole(stored);
  }, []);

  useEffect(() => {
    const found = store.professors.find(p => p.id === id);
    if (!found) { router.push('/professors'); return; }
    setProfessor(found);
    setRank(found.rank ?? '');
    setEmploymentType(found.employmentType ?? '');
    setOfficeLocation(found.officeLocation ?? '');
    setOfficeHours(found.officeHours ?? '');

    setOnChainLoading(true);
    fetchProfessorById(id)
      .then(detail => {
        setApiDetail(detail);
        if (detail.rank) setRank(detail.rank);
        if (detail.employment_type) setEmploymentType(detail.employment_type);
        if (detail.office_location) setOfficeLocation(detail.office_location);
        if (detail.office_hours) setOfficeHours(detail.office_hours);
        return fetchProfessors();
      })
      .then(list => {
        const match = list?.find(p => p.id === id);
        if (match?.wallet_address) {
          return fetchIdentityOnChain(match.wallet_address);
        }
      })
      .then(onChainData => {
        if (onChainData) setOnChain(onChainData);
      })
      .catch(() => { })
      .finally(() => setOnChainLoading(false));
  }, [id, router]);

  if (!professor) {
    return <div className="flex items-center justify-center h-full"><p className="text-textMuted">Loading…</p></div>;
  }

  const fullName = [professor.title, professor.firstName, professor.middleName, professor.lastName].filter(Boolean).join(' ');
  const initials = getInitials(professor);

  const handleUpdate = async (data: { rank: string; employmentType: string; officeLocation: string; officeHours: string }) => {
    try {
      await updateProfessor(id, {
        rank: data.rank || undefined,
        employment_type: data.employmentType || undefined,
        office_location: data.officeLocation || undefined,
        office_hours: data.officeHours || undefined,
      });
    } catch {
      // fallback to local update if API fails
    }
    (professor as any).rank = data.rank;
    (professor as any).employmentType = data.employmentType;
    (professor as any).officeLocation = data.officeLocation;
    (professor as any).officeHours = data.officeHours;
    setRank(data.rank);
    setEmploymentType(data.employmentType);
    setOfficeLocation(data.officeLocation);
    setOfficeHours(data.officeHours);
    setShowUpdateModal(false);
  };

  const handleRevoke = async (reason: string) => {
    try {
      if (onChain?.identity?.wallet_address) {
        await revokeProfessorIdentity(onChain.identity.wallet_address, reason);
      }
    } catch {
      // proceed even if API fails
    }
    store.removeProfessor(professor.id);
    router.push('/professors');
  };

  return (
    <>
      {showUpdateModal && (
        <UpdateModal
          current={{ rank, employmentType, officeLocation, officeHours }}
          onConfirm={handleUpdate}
          onCancel={() => setShowUpdateModal(false)}
        />
      )}
      {showRevokeModal && (
        <RevokeModal
          name={fullName}
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
              <span className={`mt-2 px-3 py-0.5 rounded-full text-xs font-semibold border ${onChain?.status.is_revoked
                ? 'border-red-400 text-red-400 bg-red-500/5'
                : 'border-mint text-mint bg-mint/5'
                }`}>
                {onChainLoading ? '…' : onChain?.status.is_revoked ? 'Revoked' : onChain ? 'Verified' : 'Unissued'}
              </span>

              <div className="w-full mt-5">
                <InfoRow label="Email" value={professor.email} />
                <InfoRow label="Department" value={professor.department} />
                <InfoRow label="Nationality" value={professor.nationality} />
                <InfoRow label="National ID" value={maskNationalId(professor.nationalId)} />
                <InfoRow label="Rank" value={rank} />
                <InfoRow label="Specialization" value={professor.specialization} />
                <InfoRow label="Hire Date" value={formatDate(professor.hireDate)} />
                <InfoRow label="Employment" value={employmentType} />
                <InfoRow label="Office" value={officeLocation} />
                <InfoRow label="Office Hours" value={officeHours} />
              </div>

              {role === 'admin' && (
                <div className="w-full mt-6 space-y-3">
                  <Button
                    title="Update Identity"
                    onClick={() => setShowUpdateModal(true)}
                    variant="primary"
                    className="w-full bg-mint text-navy rounded-xl font-semibold text-sm"
                  />
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
              )}
            </div>
          </div>

          {/* RIGHT: on-chain + certificates */}
          <div className="flex-1 space-y-6 overflow-y-auto">
            <div className="bg-card border border-borderLine rounded-2xl p-6">
              <h3 className="text-textMuted text-xs font-bold uppercase tracking-widest mb-4">On-Chain Information</h3>

              {onChainLoading ? (
                <div className="grid grid-cols-2 gap-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className={`bg-navy border border-borderLine rounded-xl p-4 h-16 animate-pulse ${i >= 4 ? 'col-span-2' : ''}`} />
                  ))}
                </div>
              ) : onChain ? (
                <div className="grid grid-cols-2 gap-3">
                  <OnChainField label="Wallet Address" value={onChain.identity.wallet_address} />
                  <OnChainField label="Identity Status" value={onChain.status.is_revoked ? 'Revoked' : 'Active'} />
                  <OnChainField label="Issued Date" value={new Date(onChain.status.issued_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} />
                  <OnChainField label="Issuer" value={onChain.status.issuer} />
                  <OnChainField label="Department" value={onChain.identity.department} fullWidth />
                  <OnChainField label="Academy" value={onChain.identity.academy_name} fullWidth />
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