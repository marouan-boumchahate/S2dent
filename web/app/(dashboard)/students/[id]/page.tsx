'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { store, Student } from '@/lib/store';
import FormField from '@/components/FormField';
import Button from '@/components/Button';

// mock on-chain data — replace with API when ready
const MOCK_ONCHAIN = {
  walletAddress: '0x4f2aB8c3...c3b1',
  identityStatus: 'Active' as 'Active' | 'Inactive' | 'Revoked',
  issuedDate: 'Jan 15, 2025',
  blockNumber: '#21,430,882',
  transactionHash: '0xab12cd34ef56ab12cd34ef56ab12cd34ef56ff3e',
  certificateHash: 'e3b0c44298fc1c149afb...27ae41e4649b',
};

// mock certificates — replace with API when ready
const MOCK_CERTS = [
  { id: '1', name: 'Bachelor of CS', date: 'Mar 20, 2025', type: 'Degree' },
  { id: '2', name: "Dean's List 2024", date: 'Jan 10, 2025', type: 'Achievement' },
];

// helpers
function getInitials(s: Student) {
  return [s.firstName, s.lastName].filter(Boolean).map(n => n[0].toUpperCase()).join('');
}
function maskNationalId(id: string) {
  if (!id || id.length < 8) return id;
  return id.slice(0, 6) + '****' + id.slice(-4);
}
function formatEnrolled(dateStr: string) {
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

// Update modal — CGPA only
function UpdateModal({
  currentCgpa,
  onConfirm,
  onCancel,
}: {
  currentCgpa: string;
  onConfirm: (cgpa: string) => void;
  onCancel: () => void;
}) {
  const [cgpa, setCgpa] = useState(currentCgpa || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const val = parseFloat(cgpa);
    if (isNaN(val) || val < 0 || val > 4) {
      setError('CGPA must be between 0.00 and 4.00');
      return;
    }
    setError('');
    setLoading(true);
    // TODO: replace with real blockchain update call
    await new Promise(r => setTimeout(r, 800));
    setLoading(false);
    onConfirm(cgpa);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">

        <h3 className="text-gray-900 text-xl font-bold mb-1">Update Student Record</h3>
        <p className="text-gray-500 text-sm mb-6">
          Changes will be submitted as a new on-chain transaction.
        </p>

        <FormField
          label="CGPA (0.00 – 4.00)"
          type="number"
          value={cgpa}
          onChange={(v) => { setCgpa(v); setError(''); }}
          placeholder="e.g. 3.90"
        />
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}

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
            This action is permanent on-chain. The student will lose their verified status and be notified immediately.
          </p>
        </div>

        <FormField
          label="Reason for revocation"
          value={reason}
          onChange={setReason}
          placeholder="e.g. Enrollment cancelled"
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
export default function StudentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [cgpa, setCgpa] = useState('');

  useEffect(() => {
    const found = store.students.find(s => s.id === id);
    if (!found) { router.push('/students'); return; }
    setStudent(found);
    setCgpa((found as any).cgpa ?? '');
  }, [id, router]);

  if (!student) {
    return <div className="flex items-center justify-center h-full"><p className="text-textMuted">Loading…</p></div>;
  }

  const fullName = [student.firstName, student.middleName, student.lastName].filter(Boolean).join(' ');
  const initials = getInitials(student);

  const handleUpdate = (newCgpa: string) => {
    (student as any).cgpa = newCgpa;
    setCgpa(newCgpa);
    setShowUpdateModal(false);
  };

  const handleRevoke = (reason: string) => {
    console.log('Revoke reason:', reason);
    store.removeStudent(student.id);
    router.push('/students');
  };

  return (
    <>
      {showUpdateModal && (
        <UpdateModal
          currentCgpa={cgpa}
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
        {/* back nav */}
        <button
          onClick={() => router.push('/students')}
          className="flex items-center gap-2 text-textMuted hover:text-textLight transition text-sm mb-6 w-fit"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Students
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
                STU-{new Date(student.createdAt).getFullYear()}-{student.id.slice(0, 5).toUpperCase()}
              </p>
              <span className="mt-2 px-3 py-0.5 rounded-full text-xs font-semibold border border-mint text-mint bg-mint/5">
                Verified
              </span>

              <div className="w-full mt-5">
                <InfoRow label="Email" value={student.email} />
                <InfoRow label="Phone" value={student.phone} />
                <InfoRow label="Date of Birth" value={student.dateOfBirth} />
                <InfoRow label="Gender" value={student.gender} />
                <InfoRow label="Nationality" value={student.nationality} />
                <InfoRow label="National ID" value={maskNationalId(student.nationalId)} />
                <InfoRow label="Department" value={student.department} />
                <InfoRow label="Enrolled" value={formatEnrolled(student.enrollmentDate)} />
                <InfoRow label="Enrollment Status" value={student.enrollmentStatus} />
                <InfoRow label="CGPA" value={cgpa ? `${cgpa} / 4.00` : '—'} />
                <InfoRow label="Expected Graduation" value={student.actualGraduationDate || '—'} />
                <InfoRow label="Year" value={student.currentLevel} />
              </div>

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
            </div>
          </div>

          {/* RIGHT: on-chain + certificates */}
          <div className="flex-1 space-y-6 overflow-y-auto">
            <div className="bg-card border border-borderLine rounded-2xl p-6">
              <h3 className="text-textMuted text-xs font-bold uppercase tracking-widest mb-4">On-Chain Information</h3>
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