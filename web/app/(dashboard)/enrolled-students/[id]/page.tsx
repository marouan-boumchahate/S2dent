'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import FormField from '@/components/FormField';
import Button from '@/components/Button';
import {
  fetchStudentById,
  fetchStudents,
  fetchStudentOnChain,
  fetchDepartments,
  fetchProfessors,
  fetchUserById,
  updateStudent,
  revokeStudentIdentity,
  ApiStudentDetail,
  OnChainStudent,
  ApiDepartment,
  ApiProfessor,
  ApiUser,
} from '@/lib/api';
import { useAlert } from '@/components/AlertContext';
import { getFriendlyErrorMessage } from '@/lib/utils';

// helpers
function formatDate(dateStr?: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function formatEnrolled(dateStr?: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
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

// Update modal — CGPA + Adviser dropdown
function UpdateModal({
  currentCgpa,
  currentAdviserId,
  professors,
  onConfirm,
  onCancel,
}: {
  currentCgpa: number | null;
  currentAdviserId: string;
  professors: ApiProfessor[];
  onConfirm: (cgpa: string, adviserId: string) => void;
  onCancel: () => void;
}) {
  const [cgpa, setCgpa] = useState(currentCgpa ? String(currentCgpa) : '');
  const [adviserId, setAdviserId] = useState(currentAdviserId || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const val = parseFloat(cgpa);
    if (isNaN(val) || val < 0 || val > 5) {
      setError('CGPA must be between 0.00 and 5.00');
      return;
    }
    setError('');
    setLoading(true);
    await onConfirm(cgpa, adviserId);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <h3 className="text-gray-900 text-xl font-bold mb-1">Update Student Record</h3>
        <p className="text-gray-500 text-sm mb-6">Changes will be updated in the database.</p>

        <FormField
          label="CGPA (0.00 – 5.00)"
          type="number"
          value={cgpa}
          onChange={(v) => { setCgpa(v); setError(''); }}
          placeholder="e.g. 3.90"
        />
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}

        <div className="mt-4 flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Adviser</label>
          <select
            value={adviserId}
            onChange={(e) => setAdviserId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-gray-800 focus:outline-none focus:border-mint bg-white"
          >
            <option value="">Select adviser…</option>
            {professors.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 p-3 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition font-semibold text-sm">
            Cancel
          </button>
          <Button title={loading ? 'Submitting…' : 'Submit'} onClick={handleSubmit}
            variant="primary" className="flex-1 bg-mint text-navy rounded-xl font-semibold text-sm disabled:opacity-60" />
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
            This action is permanent on-chain. The student will lose their verified status and be notified immediately.
          </p>
        </div>
        <FormField label="Reason for revocation" value={reason} onChange={setReason} placeholder="e.g. Enrollment cancelled" />
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
export default function StudentDetailPage() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const params = useParams();
  const id = params?.id as string;

  const [student, setStudent] = useState<ApiStudentDetail | null>(null);
  const [user, setUser] = useState<ApiUser | null>(null);            // full_name, photo_url
  const [onChain, setOnChain] = useState<OnChainStudent | null>(null);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [deptName, setDeptName] = useState<string>('');
  const [professors, setProfessors] = useState<ApiProfessor[]>([]);

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

    fetchStudentById(id)
      .then(async (detail) => {
        setStudent(detail);
        setError(null);

        // Parallel: user record, departments, professors
        const [userRecord, depts, profs] = await Promise.allSettled([
          fetchUserById(detail.user_id),
          fetchDepartments(),
          fetchProfessors(),
        ]);

        if (userRecord.status === 'fulfilled' && userRecord.value) setUser(userRecord.value);
        if (depts.status === 'fulfilled') {
          const match = depts.value.find((d: ApiDepartment) => d.id === detail.department_id);
          if (match) setDeptName(match.name);
        }
        if (profs.status === 'fulfilled') setProfessors(profs.value);

        // Get wallet from list, then fetch on-chain identity
        try {
          const allStudents = await fetchStudents();
          const match = allStudents.find((s) => s.id === id);
          if (match?.wallet_address) {
            setWalletAddress(match.wallet_address);
            const onChainData = await fetchStudentOnChain(match.wallet_address);
            setOnChain(onChainData);
          }
        } catch (e) {
          console.warn('No on-chain identity:', e);
        } finally {
          setOnChainLoading(false);
        }
      })
      .catch((err) => {
        setError(err.message || 'Failed to connect to the backend API');
        setOnChainLoading(false);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-textMuted animate-pulse">Loading live student data...</p>
    </div>
  );

  if (error || !student) return (
    <div className="flex flex-col items-center justify-center min-h-48 py-12 gap-2">
      <p className="text-red-500 font-medium px-4">Error: {error}</p>
      <p className="text-textMuted text-sm">Please ensure the Docker API container is running.</p>
    </div>
  );

  const handleUpdate = async (newCgpa: string, newAdviserId: string) => {
    try {
      await updateStudent(id, { cgpa: parseFloat(newCgpa), advisor_id: newAdviserId || undefined });
      setShowUpdateModal(false);
      showAlert({
        type: 'success',
        title: 'Student Updated',
        message: 'The student records have been successfully updated.',
        onConfirm: () => {
          window.location.reload();
        }
      });
    } catch (err: any) {
      console.error(err);
      setShowUpdateModal(false);
      showAlert({
        type: 'error',
        title: 'Update Failed',
        message: getFriendlyErrorMessage(err, 'Failed to update student records.')
      });
    }
  };

  const handleRevoke = async (reason: string) => {
    try {
      if (walletAddress) await revokeStudentIdentity(walletAddress, reason);
      setShowRevokeModal(false);
      showAlert({
        type: 'success',
        title: 'Identity Revoked',
        message: 'The student blockchain identity has been successfully revoked.',
        onConfirm: () => {
          router.push('/enrolled-students');
        }
      });
    } catch (err: any) {
      console.error(err);
      setShowRevokeModal(false);
      showAlert({
        type: 'error',
        title: 'Revocation Failed',
        message: getFriendlyErrorMessage(err, 'Failed to revoke student identity.')
      });
    }
  };

  const displayName = user?.full_name || student.student_number;
  const isVerified = !onChain?.status.is_revoked && !!onChain;

  return (
    <>
      {showUpdateModal && (
        <UpdateModal
          currentCgpa={student.cgpa}
          currentAdviserId={student.advisor_id}
          professors={professors}
          onConfirm={handleUpdate}
          onCancel={() => setShowUpdateModal(false)}
        />
      )}
      {showRevokeModal && (
        <RevokeModal
          name={displayName}
          onConfirm={handleRevoke}
          onCancel={() => setShowRevokeModal(false)}
        />
      )}

      <div className="flex flex-col h-full">
        <button onClick={() => router.push('/enrolled-students')}
          className="flex items-center gap-2 text-textMuted hover:text-textLight transition text-sm mb-6 w-fit">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Enrolled Students
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
              <p className="text-textMuted text-sm mt-0.5">{student.student_number}</p>

              <span className={`mt-2 px-3 py-0.5 rounded-full text-xs font-semibold border ${
                onChainLoading
                  ? 'border-borderLine text-textMuted bg-surface/30'
                  : onChain?.status.is_revoked
                  ? 'border-red-500/20 text-red-400 bg-red-500/10'
                  : onChain
                  ? 'border-mint/20 text-mint bg-mint/10'
                  : 'border-yellow-500/20 text-yellow-500 bg-yellow-500/10'
              }`}>
                {onChainLoading ? '…' : onChain?.status.is_revoked ? 'Revoked' : onChain ? 'Verified' : 'Unissued'}
              </span>

              <div className="w-full mt-5">
                <InfoRow label="Student Number"      value={student.student_number} />
                <InfoRow label="Department"          value={deptName || '—'} />
                <InfoRow label="Enrolled"            value={formatEnrolled(student.enrollment_date)} />
                <InfoRow label="Enrollment Status"   value={student.enrollment_status} />
                <InfoRow label="CGPA"                value={student.cgpa ? `${student.cgpa} / 5.00` : '—'} />
                <InfoRow label="Expected Graduation" value={formatEnrolled(student.expected_graduation_date)} />
                <InfoRow label="Actual Graduation"   value={formatEnrolled(student.actual_graduation_date)} />
                <InfoRow label="Year"                value={student.current_level} />
                <InfoRow label="Adviser"             value={student.advisor_name || '—'} />
              </div>

              {role === 'admin' && (
                <div className="w-full mt-6 space-y-3">
                  <Button 
                    title="Update Identity" 
                    onClick={() => setShowUpdateModal(true)}
                    variant="primary" 
                    className="w-full bg-mint text-navy rounded-xl font-semibold text-sm" 
                    disabled={!!onChain?.status.is_revoked}
                  />
                  <button 
                    onClick={() => setShowRevokeModal(true)}
                    disabled={!!onChain?.status.is_revoked}
                    className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
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

          {/* ── RIGHT: On-Chain Information ── */}
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
                  <OnChainField label="Wallet Address"   value={walletAddress}                          fullWidth mono />
                  <OnChainField label="Issued Date"      value={formatDate(onChain.status.issued_at)} />
                  <OnChainField label="Issuer"           value={onChain.status.issuer}                 fullWidth mono />
                  <OnChainField label="Public Key"       value={onChain.identity.public_key}           fullWidth mono />
                  <OnChainField label="Signature"        value={onChain.identity.signature}            fullWidth mono />
                  <OnChainField label="Academy"          value={onChain.identity.academy_name}         fullWidth />
                </div>
              ) : (
                <p className="text-textMuted text-sm">No on-chain identity found for this student.</p>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}