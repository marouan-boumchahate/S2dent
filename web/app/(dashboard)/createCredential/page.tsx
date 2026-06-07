'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { store } from '@/lib/store';
import FormField from '@/components/FormField';
import Button from '@/components/Button';
import { BrowserProvider } from 'ethers';
import { apiFetch, createCredential, fetchStudents } from '@/lib/api';
import { useAlert } from '@/components/AlertContext';
import { getFriendlyErrorMessage } from '@/lib/utils';

// payload fields for different types
type FieldDef = {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select';
  ph?: string;
  req?: boolean;
  options?: string[];
};

const PAYLOAD_FIELDS: Record<string, FieldDef[]> = {
  Enrollment: [
    { id: 'course_name', label: 'Course name', type: 'text', ph: 'e.g. Advanced Algorithms', req: true },
    { id: 'course_code', label: 'Course code', type: 'text', ph: 'e.g. CS-401', req: true },
    { id: 'academic_year', label: 'Academic year', type: 'text', ph: 'e.g. 2024-2025', req: true },
    { id: 'semester', label: 'Semester', type: 'select', options: ['fall', 'spring', 'summer'], req: true },
    { id: 'enrollment_date', label: 'Enrollment date', type: 'date', req: true },
  ],
  Attendance: [
    { id: 'course_code', label: 'Course code', type: 'text', ph: 'e.g. CS-401', req: true },
    { id: 'course_name', label: 'Course name', type: 'text', ph: 'e.g. Advanced Algorithms', req: true },
    { id: 'academic_year', label: 'Academic year', type: 'text', ph: '2024-2025', req: true },
    { id: 'semester', label: 'Semester', type: 'select', options: ['fall', 'spring', 'summer'], req: true },
    { id: 'total_sessions', label: 'Total sessions', type: 'number', ph: 'e.g. 30', req: true },
    { id: 'attended_sessions', label: 'Attended sessions', type: 'number', ph: 'e.g. 27', req: true },
    { id: 'excused_absences', label: 'Excused absences', type: 'number', ph: 'e.g. 2', req: true },
    { id: 'period_from', label: 'Period from', type: 'date', req: true },
    { id: 'period_to', label: 'Period to', type: 'date', req: true },
  ],
  Degree: [
    { id: 'degree_title', label: 'Degree title', type: 'text', ph: 'e.g. Bachelor of Computer Science', req: true },
    { id: 'degree_level', label: 'Degree level', type: 'select', options: ['bachelor', 'master', 'phd'], req: true },
    { id: 'major', label: 'Major', type: 'text', ph: 'e.g. Computer Science', req: true },
    { id: 'program_code', label: 'Program code', type: 'text', ph: 'e.g. CS-UG-001', req: true },
    { id: 'faculty', label: 'Faculty', type: 'text', ph: 'e.g. Faculty of Engineering', req: true },
    { id: 'department', label: 'Department', type: 'text', ph: 'e.g. Computer Science', req: true },
    { id: 'graduation_date', label: 'Graduation date', type: 'date', req: true },
    { id: 'gpa', label: 'GPA', type: 'number', ph: 'e.g. 3.82', req: true },
    { id: 'gpa_scale', label: 'GPA scale', type: 'select', options: ['4.0', '5.0', '100'], req: true },
    { id: 'class_rank', label: 'Class rank', type: 'number', ph: 'e.g. 12' },
    { id: 'class_size', label: 'Class size', type: 'number', ph: 'e.g. 180' },
    { id: 'honors', label: 'Honors', type: 'select', options: ['with_honors', 'great_honors', 'highest_honors'], req: true },
    { id: 'total_credits_earned', label: 'Credits earned', type: 'number', ph: 'e.g. 132', req: true },
    { id: 'required_credits', label: 'Required credits', type: 'number', ph: 'e.g. 132', req: true },
  ],
  Certificate: [
    { id: 'certificate_name', label: 'Certificate name', type: 'text', ph: 'e.g. Machine Learning Fundamentals', req: true },
    { id: 'certificate_code', label: 'Certificate code', type: 'text', ph: 'e.g. ML-INT-2025', req: true },
    { id: 'certificate_category', label: 'Category', type: 'select', options: ['professional', 'academic', 'language', 'technical', 'compliance', 'safety'], req: true },
    { id: 'program_duration_hours', label: 'Duration (hours)', type: 'number', ph: 'e.g. 120' },
    { id: 'delivery_mode', label: 'Delivery mode', type: 'select', options: ['online', 'in_person', 'hybrid'], req: true },
    { id: 'start_date', label: 'Start date', type: 'date', req: true },
    { id: 'end_date', label: 'End date', type: 'date', req: true },
    { id: 'final_score', label: 'Final score', type: 'number', ph: '0–100' },
    { id: 'passing_score', label: 'Passing score', type: 'number', ph: '0–100' },
    { id: 'instructor_name', label: 'Instructor name', type: 'text', ph: 'e.g. Dr. Khaled Mansour', req: true },
  ],
  Achievement: [
    { id: 'achievement_title', label: 'Achievement title', type: 'text', ph: 'e.g. First Place – Hackathon', req: true },
    { id: 'achievement_type', label: 'Achievement type', type: 'select', options: ['award', 'honor', 'competition', 'publication', 'patent', 'scholarship', 'recognition', 'extracurricular'], req: true },
    { id: 'event_name', label: 'Event name', type: 'text', ph: 'e.g. Cairo University Hackathon 2025', req: true },
    { id: 'event_type', label: 'Event type', type: 'select', options: ['hackathon', 'conference', 'olympiad', 'contest', 'exhibition', 'ceremony'], req: true },
    { id: 'event_organizer', label: 'Event organizer', type: 'text', ph: 'e.g. Cairo University', req: true },
    { id: 'event_date', label: 'Event date', type: 'date', req: true },
    { id: 'event_location', label: 'Event location', type: 'text', ph: 'e.g. Cairo University Main Hall' },
    { id: 'score', label: 'Score', type: 'number', ph: 'optional' },
    { id: 'placement', label: 'Placement', type: 'text', ph: 'e.g. 1st place' },
    { id: 'team_name', label: 'Team name', type: 'text', ph: 'optional' },
    { id: 'project_title', label: 'Project title', type: 'text', ph: 'optional' },
    { id: 'project_description', label: 'Project description', type: 'text', ph: 'optional' },
  ],
  Transcript: [
    { id: 'academic_year_from', label: 'Academic year from', type: 'text', ph: 'e.g. 2023-2024', req: true },
    { id: 'academic_year_to', label: 'Academic year to', type: 'text', ph: 'e.g. 2023-2024', req: true },
    { id: 'program_name', label: 'Program name', type: 'text', ph: 'e.g. Computer Science BSc', req: true },
    { id: 'degree_level', label: 'Degree level', type: 'select', options: ['bachelor', 'master', 'phd'], req: true },
    { id: 'cumulative_gpa', label: 'Cumulative GPA', type: 'number', ph: 'e.g. 3.95', req: true },
    { id: 'gpa_scale', label: 'GPA scale', type: 'select', options: ['4.0', '5.0', '100'], req: true },
    { id: 'total_credits_attempted', label: 'Credits attempted', type: 'number', ph: 'e.g. 36', req: true },
    { id: 'total_credits_earned', label: 'Credits earned', type: 'number', ph: 'e.g. 36', req: true },
  ],
};

const TYPE_ICONS: Record<string, string> = {
  Enrollment: '📋',
  Attendance: '📅',
  Degree: '🎓',
  Certificate: '📜',
  Achievement: '🏆',
  Transcript: '📄',
};

const CREDENTIAL_TYPES = ['Enrollment', 'Attendance', 'Degree', 'Certificate', 'Achievement', 'Transcript'];
const LOCALES = ['English (en)', 'Arabic (ar)', 'French (fr)'];

function highlightJson(data: any): string {
  const json = JSON.stringify(data);
  return json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g, (match) => {
      let style = 'color: #fbbf24;';
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          style = 'color: #f8fafc; font-weight: 600;';
        } else {
          style = 'color: #34d399;';
        }
      } else if (/true|false/.test(match)) {
        style = 'color: #a78bfa; font-weight: 600;';
      } else if (/null/.test(match)) {
        style = 'color: #64748b;';
      }
      return `<span style="${style}">${match}</span>`;
    });
}

// review and sign modal
function ReviewModal({
  signingData,
  studentName,
  onConfirm,
  onCancel,
  loading,
}: {
  signingData: any;
  studentName: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [humanView, setHumanView] = useState(true);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl max-w-lg w-full mx-4 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

        <div className="px-6 pt-6 pb-4">
          <h3 className="text-gray-900 text-lg font-bold">Sign & Issue Credential</h3>
          <p className="text-gray-500 text-sm mt-0.5">Review the signing data before authorizing on-chain.</p>
        </div>

        <div className="mx-6 mb-4 flex gap-3 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <span className="text-lg shrink-0">🔒</span>
          <p className="text-yellow-800 text-sm leading-relaxed">
            <span className="font-bold">Signature required.</span> You are about to authorize the issuance of a verifiable credential. Once signed and submitted, this action is permanent on the blockchain.
          </p>
        </div>

        <div className="mx-6 mb-4 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Message to Sign</p>
            <button
              onClick={() => setHumanView(v => !v)}
              className="px-3 py-1 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition"
            >
              {humanView ? 'Actual view' : 'Human view'}
            </button>
          </div>

          {humanView ? (
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-blue-600 px-4 py-2">
                <p className="text-white text-sm font-semibold">Credential details</p>
              </div>
              <table className="w-full">
                <tbody>
                  {[
                    ['Credential type', signingData.message.credentialType],
                    ['Title / code', `${signingData.message.title} — ${signingData.message.code}`],
                    ['Authorized by', signingData.message.authorizerName],
                    ['Student name', studentName || signingData.message.studentName || '—'],
                    ['Student wallet', signingData.message.studentWalletAddress || '—'],
                    ['Payload hash', signingData.message.payloadHash.slice(0, 18) + '…'],
                  ].map(([label, value]) => (
                    <tr key={label} className="border-b border-gray-100 last:border-0">
                      <td className="px-4 py-2.5 text-gray-500 text-sm w-1/3">{label}</td>
                      <td className="px-4 py-2.5 text-gray-800 text-sm font-medium break-all">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <pre
              className="bg-gray-900 text-xs rounded-xl p-4 leading-relaxed break-all font-mono text-gray-300 overflow-y-auto max-h-48 whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: highlightJson(signingData) }}
            />
          )}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 p-3 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition font-semibold text-sm disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 p-3 rounded-xl bg-mint text-navy font-semibold text-sm hover:bg-mint/90 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Issuing On-Chain...' : 'Sign & Issue Credential'}
          </button>
        </div>
      </div>
    </div>
  );
}

// main page
export default function NewCredentialPage() {
  const router = useRouter();
  const { showAlert } = useAlert();

  // base fields
  const [title, setTitle] = useState('');
  const [credType, setCredType] = useState('');
  const [studentWallet, setStudentWallet] = useState('');
  const [studentLookup, setStudentLookup] = useState<{ name: string } | null>(null);
  const [walletLookupLoading, setWalletLookupLoading] = useState(false);
  const [walletError, setWalletError] = useState('');
  const [locale, setLocale] = useState('English (en)');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [showReview, setShowReview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signingData, setSigningData] = useState<any>(null);
  const [createdCredentialId, setCreatedCredentialId] = useState<string>('');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [payload, setPayload] = useState<Record<string, string>>({});
  const [role, setRole] = useState<string>('admin');

  useEffect(() => {
    const stored = localStorage.getItem('userRole');
    if (stored) {
      setRole(stored);
    }
  }, []);

  const allowedTypes = role === 'professor'
    ? ['Attendance']
    : ['Enrollment', 'Degree', 'Certificate', 'Achievement', 'Transcript'];

  const handleTitleChange = (val: string) => {
    setTitle(val.slice(0, 255));
  };

  const handleStudentWalletChange = (val: string) => {
    const cleaned = val.replace(/[^a-fA-F0-9xX]/g, '').slice(0, 42);
    setStudentWallet(cleaned);
    setStudentLookup(null);
    setWalletError('');
  };

  const handlePayloadFieldChange = (field: FieldDef, val: string) => {
    let sanitized = val;

    if (field.type === 'number') {
      if (['gpa', 'cumulative_gpa', 'final_score', 'passing_score', 'score'].includes(field.id)) {
        sanitized = val.replace(/[^0-9.]/g, '');
        const dots = sanitized.split('.');
        if (dots.length > 2) {
          sanitized = dots[0] + '.' + dots.slice(1).join('');
        }
      } else {
        sanitized = val.replace(/[^0-9]/g, '');
      }
    } else if (field.id.includes('academic_year')) {
      sanitized = val.replace(/[^0-9-]/g, '').slice(0, 9);
    } else if (field.type === 'text') {
      sanitized = val.slice(0, 255);
    }

    setPayload(prev => ({ ...prev, [field.id]: sanitized }));

    if (sanitized.trim()) {
      setFieldErrors(prev => {
        const copy = { ...prev };
        delete copy[field.id];
        return copy;
      });
    }
  };

  // reset payload when type changes
  const handleTypeChange = (val: string) => {
    setCredType(val);
    setPayload({});
    setFieldErrors({});
  };

  const validateForm = (): boolean => {
    const newFieldErrors: Record<string, string> = {};
    setError('');

    if (!title.trim()) {
      newFieldErrors.title = 'Please enter a title.';
    } else if (title.length > 255) {
      newFieldErrors.title = 'Title cannot exceed 255 characters.';
    }

    if (!credType) {
      setError('Please select a credential type.');
      return false;
    }

    if (!studentWallet || !/^0x[a-fA-F0-9]{40}$/.test(studentWallet)) {
      newFieldErrors.studentWallet = 'Student wallet address must be a valid Ethereum address (0x...).';
    } else if (!studentLookup) {
      newFieldErrors.studentWallet = 'Please enter a valid student wallet address and wait for lookup.';
    }

    const currentFields = PAYLOAD_FIELDS[credType] ?? [];

    for (const f of currentFields) {
      const val = payload[f.id] ?? '';

      if (f.req && !val.trim()) {
        newFieldErrors[f.id] = `${f.label} is required.`;
        continue;
      }

      if (val) {
        if (f.id.includes('academic_year') && !/^\d{4}-\d{4}$/.test(val)) {
          newFieldErrors[f.id] = 'Must be in YYYY-YYYY format (e.g. 2025-2026).';
          continue;
        }

        if (f.id === 'gpa' || f.id === 'cumulative_gpa') {
          const scale = Number(payload['gpa_scale'] || 4.0);
          const gpaNum = Number(val);
          if (isNaN(gpaNum) || gpaNum < 0 || gpaNum > scale) {
            newFieldErrors[f.id] = `GPA must be between 0 and the GPA scale (${scale}).`;
            continue;
          }
        }

        if (f.id === 'final_score' || f.id === 'passing_score') {
          const scoreNum = Number(val);
          if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
            newFieldErrors[f.id] = 'Score must be between 0 and 100.';
            continue;
          }
        }

        if (credType === 'Attendance') {
          const total = Number(payload['total_sessions'] || 0);
          if (f.id === 'attended_sessions') {
            const attended = Number(val);
            if (attended > total) {
              newFieldErrors[f.id] = 'Attended sessions cannot exceed total sessions.';
              continue;
            }
          }
          if (f.id === 'excused_absences') {
            const excused = Number(val);
            if (excused > total) {
              newFieldErrors[f.id] = 'Excused absences cannot exceed total sessions.';
              continue;
            }
          }
        }
      }
    }

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      setError('Please fix the errors in the fields.');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setLoading(true);
    setError('');
    try {
      const typedPayload: Record<string, any> = {};
      const currentFields = PAYLOAD_FIELDS[credType] ?? [];
      for (const field of currentFields) {
        const val = payload[field.id];
        if (val === undefined || val === '') continue;
        typedPayload[field.id] = field.type === 'number' ? Number(val) : val;
      }
      const draftPayload: Record<string, any> = {
        title,
        credential_type: credType.toLowerCase(),
        student_address: studentWallet,
        payload: typedPayload,
      };
      if (description.trim() !== '') {
        draftPayload.description = description;
      }
      const draftData = await apiFetch<any>('/credentials', {
        method: 'POST',
        body: JSON.stringify(draftPayload)
      });
      setCreatedCredentialId(draftData.credential_id);
      setSigningData(draftData.signing_data);
      setShowReview(true);
    } catch (error: any) {
      console.error(error);
      showAlert({
        type: 'error',
        title: 'Submission Failed',
        message: getFriendlyErrorMessage(error, 'Failed to submit credential data.')
      });
    } finally {
      setLoading(false);
    }
  };

  const handleWalletBlur = async () => {
    if (!studentWallet || !/^0x[a-fA-F0-9]{40}$/.test(studentWallet)) {
      setStudentLookup(null);
      return;
    }
    setWalletLookupLoading(true);
    setWalletError('');
    try {
      const students = await fetchStudents();
      const match = students.find(s => s.wallet_address?.toLowerCase() === studentWallet.toLowerCase());
      if (match) {
        setStudentLookup({ name: match.name });
        setWalletError('');
      } else {
        setStudentLookup(null);
        setWalletError('No student found with this wallet address.');
      }
    } catch {
      setWalletError('Failed to look up student.');
    }
    setWalletLookupLoading(false);
  };

  const handleConfirmSign = async () => {
    if (loading) return;
    setLoading(true);
    try {
      if (!window.ethereum) throw new Error("MetaMask is required");
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x7a69' }],
        });
      } catch (switchError) {
        console.warn(switchError);
      }
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const signature = await signer.signTypedData(
        signingData.domain,
        signingData.types,
        signingData.message
      );
      await apiFetch<any>(`/credentials/${createdCredentialId}/issue`, {
        method: 'POST',
        body: JSON.stringify({ signature })
      });
      showAlert({
        type: 'success',
        title: 'Credential Issued',
        message: 'The verifiable credential has been successfully signed and issued on-chain.',
        onConfirm: () => {
          setShowReview(false);
          router.push('/credentials');
          router.refresh();
        }
      });
    } catch (error: any) {
      console.error(error);
      showAlert({
        type: 'error',
        title: 'Issuance Failed',
        message: getFriendlyErrorMessage(error, 'Failed to issue credential.')
      });
    } finally {
      setLoading(false);
    }
  };

  const fields = credType ? PAYLOAD_FIELDS[credType] ?? [] : [];

  return (
    <>
      {showReview && signingData && (
        <ReviewModal
          signingData={signingData}
          studentName={studentLookup?.name ?? ''}
          onConfirm={handleConfirmSign}
          onCancel={() => setShowReview(false)}
          loading={loading}
        />
      )}
      <div className="flex flex-col min-h-0 flex-1">

        {/* back nav button*/}
        <button
          onClick={() => router.push('/credentials')}
          className="flex items-center gap-2 text-textMuted hover:text-textLight transition text-sm mb-6 w-fit"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Credentials
        </button>

        <div className="bg-card border border-borderLine rounded-2xl overflow-y-auto flex-1">

          {/* form header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-borderLine bg-surface/30">
            <div>
              <p className="text-textLight text-xl font-bold">New Credential</p>
              <p className="text-textMuted text-xs">Issue a verifiable on-chain credential to a student</p>
            </div>
          </div>

          {/* form body */}
          <div className="p-6 space-y-6">

            {/* title */}
            <FormField
              label="Title"
              value={title}
              onChange={handleTitleChange}
              placeholder="e.g. Bachelor of Computer Science"
              required
              maxLength={255}
              error={fieldErrors.title}
            />

            {/* type only — code is auto-generated by API */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <FormField
                  label="Credential type"
                  value={credType}
                  onChange={(v) => { handleTypeChange(v); setError(''); }}
                  options={['', ...allowedTypes]}
                  required
                />
                {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
              </div>
            </div>

            {/* student wallet — auto-resolves student name */}
            <div onBlur={handleWalletBlur}>
              <FormField
                label="Student wallet address"
                value={studentWallet}
                onChange={handleStudentWalletChange}
                placeholder="0x..."
                required
                maxLength={42}
                error={fieldErrors.studentWallet}
              />
              {walletLookupLoading && (
                <p className="text-xs text-textMuted mt-1">Looking up student…</p>
              )}
              {studentLookup && (
                <p className="text-xs text-mint mt-1 font-semibold">✓ {studentLookup.name}</p>
              )}
              {walletError && (
                <p className="text-xs text-red-400 mt-1">{walletError}</p>
              )}
            </div>

            {/* local */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <FormField
                label="Locale"
                value={locale}
                onChange={setLocale}
                options={LOCALES}
              />
            </div>

            {/* description */}
            <FormField
              label="Description"
              value={description}
              onChange={setDescription}
              placeholder="Optional description"
            />

            {/* dynamic payload section */}
            {credType && fields.length > 0 && (
              <div>

                {/* divider between sections */}
                <div className="flex items-center gap-3 my-2">
                  <div className="flex-1 h-px bg-borderLine" />
                  <span className="text-textMuted text-xs font-bold uppercase tracking-widest whitespace-nowrap">
                    {TYPE_ICONS[credType]} {credType} — Payload
                  </span>
                  <div className="flex-1 h-px bg-borderLine" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4">
                  {fields.map(f => (
                    <FormField
                      key={f.id}
                      label={f.label + (f.req ? ' *' : '')}
                      value={payload[f.id] ?? ''}
                      onChange={val => handlePayloadFieldChange(f, val)}
                      placeholder={f.ph}
                      type={f.type === 'date' || f.type === 'number' ? f.type : 'text'}
                      options={f.type === 'select' ? ['', ...(f.options ?? [])] : undefined}
                      isDate={f.type === 'date'}
                      required={f.req}
                      error={fieldErrors[f.id]}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* form for last step in bottom the name of it should be FOOTER as i read */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-borderLine bg-surface/30">
            <button
              onClick={() => router.push('/credentials')}
              className="px-5 py-2 rounded-xl border border-borderLine text-textMuted hover:bg-surface transition font-semibold text-sm"
            >
              Cancel
            </button>
            <Button
              title="Submit"
              onClick={handleSubmit}
              variant="primary"
              className="px-5 py-2 bg-mint text-navy rounded-xl font-semibold text-sm"
            />
          </div>
        </div>
      </div>
    </>
  );
}