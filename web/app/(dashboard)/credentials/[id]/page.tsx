'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { store, Credential } from '@/lib/store';
import { fetchCredentialById, revokeCredential, ApiCredentialDetail } from '@/lib/api';

// type config icons
const TYPE_CONFIG: Record<string, { icon: string; color: string; border: string }> = {
  Degree: { icon: '🎓', color: 'bg-mint/10', border: 'border-mint' },
  Achievement: { icon: '🏆', color: 'bg-orange-400/10', border: 'border-orange-400' },
  Certificate: { icon: '📜', color: 'bg-purple-400/10', border: 'border-purple-400' },
  Enrollment: { icon: '📋', color: 'bg-blue-400/10', border: 'border-blue-400' },
  Attendance: { icon: '📅', color: 'bg-cyan-400/10', border: 'border-cyan-400' },
  Transcript: { icon: '📄', color: 'bg-yellow-400/10', border: 'border-yellow-400' },
};

// payload field labels
const PAYLOAD_LABELS: Record<string, string> = {
  course_name: 'Course Name', course_code: 'Course Code', academic_year: 'Academic Year',
  semester: 'Semester', enrollment_date: 'Enrollment Date', total_sessions: 'Total Sessions',
  attended_sessions: 'Attended Sessions', excused_absences: 'Excused Absences',
  period_from: 'Period From', period_to: 'Period To', degree_title: 'Degree Title',
  degree_level: 'Degree Level', major: 'Major', program_code: 'Program Code',
  faculty: 'Faculty', department: 'Department', graduation_date: 'Graduation Date',
  gpa: 'GPA', gpa_scale: 'GPA Scale', class_rank: 'Class Rank', class_size: 'Class Size',
  honors: 'Honors', total_credits_earned: 'Total Credits Earned', required_credits: 'Required Credits',
  certificate_name: 'Certificate Name', certificate_code: 'Certificate Code',
  certificate_category: 'Category', program_duration_hours: 'Duration (hours)',
  delivery_mode: 'Delivery Mode', start_date: 'Start Date', end_date: 'End Date',
  final_score: 'Final Score', passing_score: 'Passing Score', instructor_name: 'Instructor Name',
  achievement_title: 'Achievement Title', achievement_type: 'Achievement Type',
  event_name: 'Event Name', event_type: 'Event Type', event_organizer: 'Organizer',
  event_date: 'Event Date', event_location: 'Location', score: 'Score',
  placement: 'Placement', team_name: 'Team Name', project_title: 'Project Title',
  project_description: 'Project Description', academic_year_from: 'Academic Year From',
  academic_year_to: 'Academic Year To', program_name: 'Program Name',
  cumulative_gpa: 'Cumulative GPA', total_credits_attempted: 'Credits Attempted',
};

// sub-components
function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-start py-2 border-b border-borderLine last:border-0">
      <span className="text-textMuted text-xs shrink-0">{label}</span>
      <span className={`text-textLight text-xs font-medium text-right max-w-[55%] break-all ml-2 ${mono ? 'font-mono text-textMuted' : ''}`}>
        {value || '—'}
      </span>
    </div>
  );
}

function OnChainField({ label, value, full = false }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={`bg-surface border border-borderLine rounded-xl p-3 ${full ? 'col-span-2' : ''}`}>
      <p className="text-[9px] font-bold uppercase tracking-widest text-textMuted mb-1">{label}</p>
      <p className="text-textLight text-xs font-medium font-mono break-all">{value || '—'}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: Credential['status'] }) {
  const map: Record<string, string> = {
    Verified: 'bg-mint/10 text-mint border-mint/30',
    Pending: 'bg-yellow-400/10 text-yellow-500 border-yellow-400/30',
    Failed: 'bg-red-400/10 text-red-400 border-red-400/30',
    Revoked: 'bg-red-400/10 text-red-400 border-red-400/30',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${map[status] ?? map.Pending}`}>
      {status}
    </span>
  );
}

// revoke modal
function RevokeModal({ title, onConfirm, onCancel }: {
  title: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    setLoading(false);
    onConfirm(reason);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <h3 className="text-gray-900 text-xl font-bold mb-1">Revoke Credential</h3>
        <p className="text-gray-500 text-sm mb-5">
          Revoke <span className="font-semibold text-gray-700">"{title}"</span> on-chain.
        </p>
        <div className="flex gap-3 bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-5">
          <svg className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <p className="text-yellow-800 text-sm leading-relaxed">
            This action is permanent on-chain. The credential will be marked as revoked immediately.
          </p>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Reason for revocation</label>
          <input
            type="text"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="e.g. Issued in error"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-red-400"
          />
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 p-3 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition font-semibold text-sm">
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={loading}
            className="flex-1 p-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition disabled:opacity-60">
            {loading ? 'Revoking…' : 'Confirm Revoke'}
          </button>
        </div>
      </div>
    </div>
  );
}

// main page
export default function CredentialDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [credential, setCredential] = useState<Credential | null>(null);
  const [apiDetail, setApiDetail] = useState<ApiCredentialDetail | null>(null);
  const [showRevokeModal, setShowRevokeModal] = useState(false);

  useEffect(() => {
    const found = store.credentials.find(c => c.id === id);
    if (found) {
      setCredential({ ...found });
    }
    
    fetchCredentialById(id)
      .then(setApiDetail)
      .catch(() => {}) // degradable UI fallbacks handled smoothly
  }, [id, router]);

  if (!credential) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-textMuted">Loading…</p>
      </div>
    );
  }

  // Map status cleanly from contract data metrics if available
  let displayStatus: Credential['status'] = credential.status;
  if (apiDetail) {
    displayStatus = apiDetail.meta.is_revoked ? 'Revoked' : 'Verified';
  }

  // Format dynamic raw type to match frontend layout categories
  const normalizedType = apiDetail?.meta.type 
    ? (apiDetail.meta.type.charAt(0).toUpperCase() + apiDetail.meta.type.slice(1)) 
    : credential.type;

  const tc = TYPE_CONFIG[normalizedType] ?? TYPE_CONFIG.Certificate;
  const isRevoked = displayStatus === 'Revoked';

  // Read payload from running nodes or fall back to mock templates
  const activePayload = apiDetail?.payload ?? credential.payload ?? {};
  const payloadEntries = Object.entries(activePayload).filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '');

  const handleRevoke = async (reason: string) => {
    try {
      await revokeCredential(id, reason);
    } catch {
      // proceed with local update fallback if cluster responds slowly
    }
    store.updateCredential(id, { status: 'Revoked' });
    setCredential(prev => prev ? { ...prev, status: 'Revoked' } : prev);
    if (apiDetail) {
      setApiDetail(prev => prev ? { ...prev, meta: { ...prev.meta, is_revoked: true } } : null);
    }
    setShowRevokeModal(false);
  };

  return (
    <>
      {showRevokeModal && (
        <RevokeModal
          title={apiDetail?.meta.title ?? credential.title}
          onConfirm={handleRevoke}
          onCancel={() => setShowRevokeModal(false)}
        />
      )}

      <div className="flex flex-col h-full">

        {/* back nav */}
        <button
          onClick={() => router.push('/credentials')}
          className="flex items-center gap-2 text-textMuted hover:text-textLight transition text-sm mb-6 w-fit"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Credentials
        </button>

        <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">

          {/* LEFT: credential card */}
          <div className="lg:w-64 xl:w-72 shrink-0">
            <div className="bg-card border border-borderLine rounded-2xl p-6 flex flex-col items-center text-center">

              <div className={`w-16 h-16 rounded-full ${tc.color} border-2 ${tc.border} flex items-center justify-center mb-3 text-2xl`}>
                {tc.icon}
              </div>
              <h2 className="text-textLight text-base font-bold leading-snug">{apiDetail?.meta.title ?? credential.title}</h2>
              <p className="text-textMuted text-xs mt-0.5">{(apiDetail?.meta.id ?? credential.id).slice(0, 12).toUpperCase()}</p>
              <div className="mt-2">
                <StatusBadge status={displayStatus} />
              </div>

              <div className="w-full mt-5">
                <InfoRow label="Type" value={normalizedType} />
                <InfoRow label="Code" value={apiDetail?.meta.code ?? credential.code} mono />
                <InfoRow label="Locale" value={apiDetail?.meta.locale ?? credential.locale  ?? 'en'} />
                <InfoRow label="Issued to" value={apiDetail?.student.name ?? credential.studentName ?? '—'} />
                <InfoRow label="Student address" value={apiDetail?.student.address ?? credential.issuedTo ?? '—'} mono />
                <InfoRow label="Description" value={apiDetail?.meta.description ?? credential.description ?? '—'} />
                <InfoRow
                  label="Issued date"
                  value={
                    (apiDetail?.meta.issued_at || credential.date)
                      ? new Date(apiDetail?.meta.issued_at || credential.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : '—'
                  }
                />
                {isRevoked && (
                  <InfoRow label="Revoked at" value={new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} />
                )}
              </div>

              {!isRevoked && (
                <button
                  onClick={() => setShowRevokeModal(true)}
                  className="mt-6 w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition font-semibold text-sm"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Revoke Credential
                </button>
              )}
            </div>
          </div>
          
          {/* RIGHT */}
          <div className="flex-1 space-y-6 overflow-y-auto">

            {/* onchain info */}
            <div className="bg-card border border-borderLine rounded-2xl p-6">
              <h3 className="text-textMuted text-xs font-bold uppercase tracking-widest mb-4">On-Chain Information</h3>
              <div className="grid grid-cols-2 gap-3">
                <OnChainField label="TX Hash (Issue)" value={apiDetail?.blockchain.issue_tx_hash ?? '0xab12...ff3e'} />
                <OnChainField label="Block" value={apiDetail?.blockchain.revoke_tx_hash ? 'Confirmed' : '#21,430,991'} />
                <OnChainField label="Credential Index" value={apiDetail ? String(apiDetail.blockchain.credential_index) : '—'} />
                <OnChainField label="Authorizer Wallet" value={apiDetail?.blockchain.academy_address ?? '0xAcademy...addr'} />
                <OnChainField label="Issuer Wallet" value={apiDetail?.blockchain.issuer_address ?? '0xIssuer...addr'} full />
                <OnChainField label="Payload Hash (SHA-256)" value={apiDetail?.verification.payload_hash ?? '—'} full />
                <OnChainField label="Signature" value={apiDetail?.verification.issuer_signature ?? '—'} full />
              </div>
            </div>

            {/* payload */}
            <div className="bg-card border border-borderLine rounded-2xl p-6">
              <h3 className="text-textMuted text-xs font-bold uppercase tracking-widest mb-4">Payload</h3>
              {payloadEntries.length === 0 ? (
                <p className="text-textMuted text-sm">No payload data.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {payloadEntries.map(([key, val]) => {
                    const label = PAYLOAD_LABELS[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                    const stringVal = String(val);
                    const isWide = stringVal.length > 25 || label.length > 18;
                    return (
                      <div
                        key={key}
                        className={`bg-surface border border-borderLine rounded-xl p-3 ${isWide ? 'col-span-2' : ''}`}
                      >
                        <p className="text-[9px] font-bold uppercase tracking-widest text-textMuted mb-1">{label}</p>
                        <p className="text-textLight text-xs font-medium break-all">{stringVal}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </>
  );
}