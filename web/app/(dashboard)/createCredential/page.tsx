'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { store } from '@/lib/store';
import FormField from '@/components/FormField';
import Button from '@/components/Button';

// ─── Payload field definitions per type ───────────────────────
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
    { id: 'course_name',     label: 'Course name',     type: 'text',   ph: 'e.g. Advanced Algorithms', req: true },
    { id: 'course_code',     label: 'Course code',     type: 'text',   ph: 'e.g. CS-401',              req: true },
    { id: 'academic_year',   label: 'Academic year',   type: 'text',   ph: 'e.g. 2024-2025',           req: true },
    { id: 'semester',        label: 'Semester',        type: 'select', options: ['fall', 'spring', 'summer'], req: true },
    { id: 'enrollment_date', label: 'Enrollment date', type: 'date',   req: true },
  ],
  Attendance: [
    { id: 'course_code',       label: 'Course code',       type: 'text',   ph: 'e.g. CS-401',    req: true },
    { id: 'course_name',       label: 'Course name',       type: 'text',   ph: 'e.g. Advanced Algorithms', req: true },
    { id: 'academic_year',     label: 'Academic year',     type: 'text',   ph: '2024-2025',      req: true },
    { id: 'semester',          label: 'Semester',          type: 'select', options: ['fall', 'spring', 'summer'], req: true },
    { id: 'total_sessions',    label: 'Total sessions',    type: 'number', ph: 'e.g. 30',        req: true },
    { id: 'attended_sessions', label: 'Attended sessions', type: 'number', ph: 'e.g. 27',        req: true },
    { id: 'excused_absences',  label: 'Excused absences',  type: 'number', ph: 'e.g. 2',         req: true },
    { id: 'period_from',       label: 'Period from',       type: 'date',   req: true },
    { id: 'period_to',         label: 'Period to',         type: 'date',   req: true },
  ],
  Degree: [
    { id: 'degree_title',         label: 'Degree title',     type: 'text',   ph: 'e.g. Bachelor of Computer Science', req: true },
    { id: 'degree_level',         label: 'Degree level',     type: 'select', options: ['bachelor', 'master', 'phd'], req: true },
    { id: 'major',                label: 'Major',            type: 'text',   ph: 'e.g. Computer Science', req: true },
    { id: 'program_code',         label: 'Program code',     type: 'text',   ph: 'e.g. CS-UG-001',        req: true },
    { id: 'faculty',              label: 'Faculty',          type: 'text',   ph: 'e.g. Faculty of Engineering', req: true },
    { id: 'department',           label: 'Department',       type: 'text',   ph: 'e.g. Computer Science', req: true },
    { id: 'graduation_date',      label: 'Graduation date',  type: 'date',   req: true },
    { id: 'gpa',                  label: 'GPA',              type: 'number', ph: 'e.g. 3.82', req: true },
    { id: 'gpa_scale',            label: 'GPA scale',        type: 'select', options: ['4.0', '5.0', '100'], req: true },
    { id: 'class_rank',           label: 'Class rank',       type: 'number', ph: 'e.g. 12' },
    { id: 'class_size',           label: 'Class size',       type: 'number', ph: 'e.g. 180' },
    { id: 'honors',               label: 'Honors',           type: 'select', options: ['with_honors', 'great_honors', 'highest_honors'], req: true },
    { id: 'total_credits_earned', label: 'Credits earned',   type: 'number', ph: 'e.g. 132', req: true },
    { id: 'required_credits',     label: 'Required credits', type: 'number', ph: 'e.g. 132', req: true },
  ],
  Certificate: [
    { id: 'certificate_name',        label: 'Certificate name',  type: 'text',   ph: 'e.g. Machine Learning Fundamentals', req: true },
    { id: 'certificate_code',        label: 'Certificate code',  type: 'text',   ph: 'e.g. ML-INT-2025', req: true },
    { id: 'certificate_category',    label: 'Category',          type: 'select', options: ['professional', 'academic', 'language', 'technical', 'compliance', 'safety'], req: true },
    { id: 'program_duration_hours',  label: 'Duration (hours)',  type: 'number', ph: 'e.g. 120' },
    { id: 'delivery_mode',           label: 'Delivery mode',     type: 'select', options: ['online', 'in_person', 'hybrid'], req: true },
    { id: 'start_date',              label: 'Start date',        type: 'date',   req: true },
    { id: 'end_date',                label: 'End date',          type: 'date',   req: true },
    { id: 'final_score',             label: 'Final score',       type: 'number', ph: '0–100' },
    { id: 'passing_score',           label: 'Passing score',     type: 'number', ph: '0–100' },
    { id: 'instructor_name',         label: 'Instructor name',   type: 'text',   ph: 'e.g. Dr. Khaled Mansour', req: true },
  ],
  Achievement: [
    { id: 'achievement_title', label: 'Achievement title', type: 'text',   ph: 'e.g. First Place – Hackathon', req: true },
    { id: 'achievement_type',  label: 'Achievement type',  type: 'select', options: ['award', 'honor', 'competition', 'publication', 'patent', 'scholarship', 'recognition', 'extracurricular'], req: true },
    { id: 'event_name',        label: 'Event name',        type: 'text',   ph: 'e.g. Cairo University Hackathon 2025', req: true },
    { id: 'event_type',        label: 'Event type',        type: 'select', options: ['hackathon', 'conference', 'olympiad', 'contest', 'exhibition', 'ceremony'], req: true },
    { id: 'event_organizer',   label: 'Event organizer',   type: 'text',   ph: 'e.g. Cairo University', req: true },
    { id: 'event_date',        label: 'Event date',        type: 'date',   req: true },
    { id: 'event_location',    label: 'Event location',    type: 'text',   ph: 'e.g. Cairo University Main Hall' },
    { id: 'score',             label: 'Score',             type: 'number', ph: 'optional' },
    { id: 'placement',         label: 'Placement',         type: 'text',   ph: 'e.g. 1st place' },
    { id: 'team_name',         label: 'Team name',         type: 'text',   ph: 'optional' },
    { id: 'project_title',     label: 'Project title',     type: 'text',   ph: 'optional' },
    { id: 'project_description', label: 'Project description', type: 'text', ph: 'optional' },
  ],
  Transcript: [
    { id: 'academic_year_from',       label: 'Academic year from', type: 'text',   ph: 'e.g. 2023-2024', req: true },
    { id: 'academic_year_to',         label: 'Academic year to',   type: 'text',   ph: 'e.g. 2023-2024', req: true },
    { id: 'program_name',             label: 'Program name',       type: 'text',   ph: 'e.g. Computer Science BSc', req: true },
    { id: 'degree_level',             label: 'Degree level',       type: 'select', options: ['bachelor', 'master', 'phd'], req: true },
    { id: 'cumulative_gpa',           label: 'Cumulative GPA',     type: 'number', ph: 'e.g. 3.95', req: true },
    { id: 'gpa_scale',                label: 'GPA scale',          type: 'select', options: ['4.0', '5.0', '100'], req: true },
    { id: 'total_credits_attempted',  label: 'Credits attempted',  type: 'number', ph: 'e.g. 36', req: true },
    { id: 'total_credits_earned',     label: 'Credits earned',     type: 'number', ph: 'e.g. 36', req: true },
  ],
};

const TYPE_ICONS: Record<string, string> = {
  Enrollment:  '📋',
  Attendance:  '🗓',
  Degree:      '🎓',
  Certificate: '🏅',
  Achievement: '🏆',
  Transcript:  '📄',
};

const CREDENTIAL_TYPES = ['Enrollment', 'Attendance', 'Degree', 'Certificate', 'Achievement', 'Transcript'];
const LOCALES = ['English (en)', 'Arabic (ar)', 'French (fr)'];

// ─── Main Page ────────────────────────────────────────────────
export default function NewCredentialPage() {
  const router = useRouter();

  // base fields
  const [title,          setTitle]          = useState('');
  const [credType,       setCredType]       = useState('');
  const [code,           setCode]           = useState('');
  const [studentWallet,  setStudentWallet]  = useState('');
  const [studentName,    setStudentName]    = useState('');
  const [locale,         setLocale]         = useState('English (en)');
  const [description,    setDescription]    = useState('');
  const [error, setError] = useState('');

  // dynamic payload state — keyed by field id
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

    store.addCredential({
      title,
      issuedTo: studentWallet, // TODO: link to student id once wallet is wired
      type: credType as any,
      code,
      date: new Date().toISOString().split('T')[0],
      status: 'Pending',
    });

    router.push('/credentials');
  };

  const fields = credType ? PAYLOAD_FIELDS[credType] ?? [] : [];

  return (
    <div className="flex flex-col min-h-0 flex-1">

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

      <div className="bg-card border border-borderLine rounded-2xl overflow-y-auto flex-1">

        {/* form header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-borderLine bg-surface/30">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-400/30 flex items-center justify-center text-lg">
            📜
          </div>
          <div>
            <p className="text-textLight text-sm font-semibold">New Credential</p>
            <p className="text-textMuted text-xs">Issue a verifiable on-chain credential to a student</p>
          </div>
        </div>

        {/* form body */}
        <div className="p-6 space-y-6">

          {/* Title — full width */}
          <FormField
            label="Title"
            value={title}
            onChange={setTitle}
            placeholder="e.g. Bachelor of Computer Science"
            required
          />

          {/* Type + Code */}
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

          {/* Student wallet + name */}
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

          {/* Locale */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <FormField
              label="Locale"
              value={locale}
              onChange={setLocale}
              options={LOCALES}
            />
          </div>

          {/* Description — full width */}
          <FormField
            label="Description"
            value={description}
            onChange={setDescription}
            placeholder="Optional description"
          />

          {/* Dynamic payload section */}
          {credType && fields.length > 0 && (
            <div>
              {/* divider */}
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

        {/* form footer */}
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
  );
}