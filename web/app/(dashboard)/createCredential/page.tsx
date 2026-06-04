'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { store } from '@/lib/store';
import FormField from '@/components/FormField';
import Button from '@/components/Button';
import { createCredential } from '@/lib/api';

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

// review and sign modal
function ReviewModal({
  data,
  onConfirm,
  onCancel,
  loading,
}: {
  data: {
    title: string;
    code: string;
    credType: string;
    studentName: string;
    studentWallet: string;
    payload: Record<string, string>;
  };
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [humanView, setHumanView] = useState(true);

  // here using the EIP-712-style signing object as required and it will be conected to api and block chian to get the real data
  const signingData = {
    domain: {
      name: 'S2dent',
      version: '1',
      chainId: 1,
      verifyingContract: '0x414d72aFC5bEaBC9FF42110f6BBD19570006c620',
    },
    types: {
      Credential: [
        { name: 'credentialHash', type: 'bytes32' },
        { name: 'title', type: 'string' },
        { name: 'code', type: 'string' },
        { name: 'credentialType', type: 'string' },
        { name: 'authorizerWalletAddress', type: 'address' },
        { name: 'authorizerName', type: 'string' },
        { name: 'issuerWalletAddress', type: 'address' },
        { name: 'studentWalletAddress', type: 'address' },
        { name: 'studentName', type: 'string' },
        { name: 'payloadHash', type: 'bytes32' },
      ],
    },
    message: {
      credentialHash: '0x' + Math.random().toString(16).slice(2).padEnd(64, '0'),
      title: data.title,
      code: data.code,
      credentialType: data.credType.toLowerCase(),
      authorizerWalletAddress: '0x414d72aFC5bEaBC9FF42110f6BBD19570006c620',
      authorizerName: 'Fenerbahçe University',
      issuerWalletAddress: '0xAdm1nIssuer000000000000000000000000f4e3',
      studentWalletAddress: data.studentWallet || '',
      studentName: data.studentName || '—',
      payloadHash: '0x' + Math.random().toString(16).slice(2).padEnd(64, '0'),
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl max-w-lg w-full mx-4 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

        {/*header*/}
        <div className="px-6 pt-6 pb-4">
          <h3 className="text-gray-900 text-lg font-bold">Sign & Issue Credential</h3>
          <p className="text-gray-500 text-sm mt-0.5">Review the signing data before authorizing on-chain.</p>
        </div>

        {/*warning*/}
        <div className="mx-6 mb-4 flex gap-3 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <span className="text-lg shrink-0">🔒</span>
          <p className="text-yellow-800 text-sm leading-relaxed">
            <span className="font-bold">Signature required.</span> You are about to authorize the issuance of a verifiable credential. Once signed and submitted, this action is permanent on the blockchain.
          </p>
        </div>

        {/* toggle for viwe and details content */}
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
            // human view section and details table            
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-blue-600 px-4 py-2">
                <p className="text-white text-sm font-semibold">Credential details</p>
              </div>
              <table className="w-full">
                <tbody>
                  {[
                    ['Credential type', data.credType],
                    ['Title / code', `${data.title} — ${data.code}`],
                    ['Authorized by', 'Fenerbahçe University'],
                    ['Student name', data.studentName || '—'],
                    ['Student wallet', data.studentWallet || '—'],
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
            // actual view details and with same asked information form marouan flat string for esay look and i added a highlighted values i dont know if thay required or not but i think they will be good            
            <div className="bg-gray-900 text-xs rounded-xl p-4 leading-relaxed break-all font-mono text-gray-300 overflow-y-auto max-h-48">
              {'{ '}
              {Object.entries(signingData.message).map(([k, v], i) => (
                <span key={k}>
                  <span className="text-white font-semibold">{k}</span>
                  <span className="text-gray-400">: </span>
                  <span className="text-cyan-400">{String(v)}</span>
                  {i < Object.entries(signingData.message).length - 1 ? ' ' : ''}
                </span>
              ))}
              {' }'}
            </div>
          )}
        </div>

        {/* last step confirmation */}
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

  // base fields
  const [title, setTitle] = useState('');
  const [credType, setCredType] = useState('');
  const [code, setCode] = useState('');
  const [studentWallet, setStudentWallet] = useState('');
  const [studentName, setStudentName] = useState('');
  const [locale, setLocale] = useState('English (en)');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [showReview, setShowReview] = useState(false);
  const [loading, setLoading] = useState(false);

  // dynamic payload state keyed by field types
  const [payload, setPayload] = useState<Record<string, string>>({});
  const setPayloadField = (id: string, val: string) =>
    setPayload(prev => ({ ...prev, [id]: val }));

  // reset payload when type changes
  const handleTypeChange = (val: string) => {
    setCredType(val);
    setPayload({});
  };

  const handleSubmit = () => {
    if (!title || !credType) {
      setError(!credType ? 'Please select a credential type.' : 'Please enter a title.');
      return;
    }
    setError('');
    setShowReview(true);
  };

  const handleConfirmSign = async () => {
    if (loading) return; // JS guard block clause to prevent duplicate processing flights
    setLoading(true);

    try {
      // Commit parameters seamlessly down to running Docker network setups
      await createCredential({
        title,
        type: credType,
        code,
        student_wallet: studentWallet,
        student_name: studentName,
        locale,
        description,
        payload,
      });

      store.addCredential({
        title,
        issuedTo: studentWallet,
        studentName,
        type: credType as any,
        code,
        locale,
        description,
        date: new Date().toISOString().split('T')[0],
        status: 'Pending',
        payload,
      });

      setShowReview(false);
      router.push('/credentials');
      router.refresh();
    } catch (error) {
      console.error('Error issuing credential:', error);
      alert('Failed to issue smart contract record. Verify node connectivity clusters.');
    } finally {
      setLoading(false);
    }
  };

  const fields = credType ? PAYLOAD_FIELDS[credType] ?? [] : [];

  return (
    <>
      {showReview && (
        <ReviewModal
          data={{ title, code, credType, studentName, studentWallet, payload }}
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
              onChange={setTitle}
              placeholder="e.g. Bachelor of Computer Science"
              required
            />

            {/* type and code */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <FormField
                  label="Credential type"
                  value={credType}
                  onChange={(v) => { handleTypeChange(v); setError(''); }}
                  options={['', ...CREDENTIAL_TYPES]}
                  required
                />
                {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
              </div>
              <FormField
                label="Credential code"
                value={code}
                onChange={setCode}
                placeholder="e.g. CRED-2025-001"
              />
            </div>

            {/* student wallet and name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <FormField
                label="Student wallet address"
                value={studentWallet}
                onChange={setStudentWallet}
                placeholder="0x..."
              />
              <FormField
                label="Student name"
                value={studentName}
                onChange={setStudentName}
                placeholder="e.g. Ahmed Hassan"
              />
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
                      onChange={val => setPayloadField(f.id, val)}
                      placeholder={f.ph}
                      type={f.type === 'date' || f.type === 'number' ? f.type : 'text'}
                      options={f.type === 'select' ? ['', ...(f.options ?? [])] : undefined}
                      isDate={f.type === 'date'}
                      required={f.req}
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
              title="Review & Sign"
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