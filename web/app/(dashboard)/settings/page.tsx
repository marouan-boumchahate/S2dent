'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader';

// pages

type Role = 'admin' | 'professor';
type Tab = { id: string; label: string };

const ADMIN_TABS: Tab[] = [
  { id: 'academy',   label: 'Academy profile'  },
  { id: 'professor', label: 'Professor profile' },
];

const PROFESSOR_TABS: Tab[] = [
  { id: 'professor', label: 'Professor profile' },
];

// primitives

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-card border border-borderLine rounded-2xl p-6 mb-6 w-full">
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-textMuted uppercase tracking-widest mb-3 mt-6 first:mt-0">
      {children}
    </p>
  );
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {children}
    </div>
  );
}

// fields — can be editble by click on edit profile
function Field({
  label,
  value,
  onChange,
  editing,
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  editing: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 w-full">
      <span className="text-[10px] font-semibold text-textMuted uppercase tracking-wider">
        {label}
      </span>
      {editing ? (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`text-sm text-textLight bg-navy border border-mint/60 rounded-xl px-3 py-2 outline-none focus:border-mint transition-colors w-full ${
            mono ? 'font-mono text-xs' : ''
          }`}
        />
      ) : (
        <span
          className={`text-sm text-textLight bg-navy border border-borderLine rounded-xl px-3 py-2 w-full block min-h-9.5 ${
            mono ? 'font-mono text-xs' : ''
          }`}
        >
          {value}
        </span>
      )}
    </div>
  );
}

function OutlineButton({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-xs font-semibold text-textLight border border-borderLine rounded-lg px-3 py-1.5 hover:border-mint hover:text-mint transition-colors whitespace-nowrap"
    >
      {children}
    </button>
  );
}

function Badge({ children, variant }: { children: React.ReactNode; variant: 'mint' | 'amber' | 'violet' }) {
  const styles = {
    mint:   'bg-mint/10 text-mint border-mint/20',
    amber:  'bg-amber-400/10 text-amber-400 border-amber-400/20',
    violet: 'bg-violet-500/10 text-violet-400 border-violet-400/20',
  };
  return (
    <span className={`text-xs font-semibold px-3 py-1 rounded-full border whitespace-nowrap ${styles[variant]}`}>
      {children}
    </span>
  );
}

function SettingsRow({ label, sub, action }: { label: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-4 border-b border-borderLine last:border-0 gap-2">
      <div>
        <p className="text-sm font-semibold text-textLight">{label}</p>
        {sub && <p className="text-xs text-textMuted mt-0.5 font-mono break-all">{sub}</p>}
      </div>
      {action && <div className="sm:ml-4 shrink-0 flex items-center">{action}</div>}
    </div>
  );
}

// save and edit button section 
function EditBar({
  editing,
  onEdit,
  onSave,
  onCancel,
}: {
  editing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  if (!editing) {
    return (
      <div className="flex justify-end mb-4">
        <button
          onClick={onEdit}
          className="text-sm font-semibold text-white bg-mint rounded-xl px-5 py-2.5 shadow-sm hover:opacity-95 active:scale-[0.99] transition-all flex items-center gap-2"
        >
          Edit profile
        </button>
      </div>
    );
  }
  return (
    <div className="flex justify-end gap-2 mb-4">
      <button
        onClick={onCancel}
        className="text-sm font-semibold text-textMuted border border-borderLine rounded-lg px-4 py-2 hover:border-red-500 hover:text-red-400 transition-colors"
      >
        Cancel
      </button>
      <button
        onClick={onSave}
        className="text-sm font-semibold bg-mint text-navy rounded-lg px-4 py-2 hover:opacity-90 transition-opacity"
      >
        Save changes
      </button>
    </div>
  );
}

// profile avatar header can be changed to something better later
function ProfileHeader({
  initials,
  name,
  sub,
  color,
}: {
  initials: string;
  name: string;
  sub: string;
  color: 'mint' | 'violet';
}) {
  const ring =
    color === 'mint'
      ? 'border-mint text-mint bg-mint/10'
      : 'border-violet-500 text-violet-400 bg-violet-500/10';
  return (
    <div className="flex items-center gap-4 mb-5 p-4 bg-navy border border-borderLine rounded-2xl w-full">
      <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center text-base font-bold shrink-0 ${ring}`}>
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-base font-bold text-textLight">{name}</p>
        <p className="text-xs text-textMuted mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

// academy profile tab for admin

function AcademyProfileTab() {
  const initial = {
    fullName: 'Cairo University',
    shortName: 'CU',
    academyNumber: 'ACU-2024-001',
    type: 'University',
    email: 'admin@cu.edu.eg',
    phone: '+20 2 35676601',
    website: 'https://cu.edu.eg',
    legalName: 'Cairo University — جامعة القاهرة',
    registrationNumber: 'EG-0001-1908',
    taxId: '100-234-567',
    billingEmail: 'billing@cu.edu.eg',
  };

  const [data, setData] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [editing, setEditing] = useState(false);

  const set = (key: keyof typeof draft) => (v: string) =>
    setDraft((d) => ({ ...d, [key]: v }));

  const handleSave = () => { setData(draft); setEditing(false); };
  const handleCancel = () => { setDraft(data); setEditing(false); };

  return (
    <div className="w-full">
      <ProfileHeader
        initials={data.shortName.slice(0, 2)}
        name={data.fullName}
        sub={`Academy #ACU-2024 · ${data.type}`}
        color="mint"
      />

      <EditBar editing={editing} onEdit={() => setEditing(true)} onSave={handleSave} onCancel={handleCancel} />

      <SectionTitle>General information</SectionTitle>
      <Card>
        <FieldGrid>
          <Field label="Full name"      value={draft.fullName}      onChange={set('fullName')}      editing={editing} />
          <Field label="Short name"     value={draft.shortName}     onChange={set('shortName')}     editing={editing} />
          <Field label="Academy number" value={draft.academyNumber} onChange={set('academyNumber')} editing={editing} mono />
          <Field label="Type"           value={draft.type}          onChange={set('type')}          editing={editing} />
          <Field label="Email"          value={draft.email}         onChange={set('email')}         editing={editing} />
          <Field label="Phone"          value={draft.phone}         onChange={set('phone')}         editing={editing} />
          <Field label="Website"        value={draft.website}       onChange={set('website')}       editing={editing} />
        </FieldGrid>
      </Card>

      <SectionTitle>Legal &amp; billing</SectionTitle>
      <Card>
        <FieldGrid>
          <Field label="Legal name"          value={draft.legalName}          onChange={set('legalName')}          editing={editing} />
          <Field label="Registration number" value={draft.registrationNumber} onChange={set('registrationNumber')} editing={editing} mono />
          <Field label="Tax ID"              value={draft.taxId}              onChange={set('taxId')}              editing={editing} mono />
          <Field label="Billing email"       value={draft.billingEmail}       onChange={set('billingEmail')}       editing={editing} />
        </FieldGrid>
      </Card>

      <SectionTitle>Blockchain identity</SectionTitle>
      <Card>
        <SettingsRow label="Academy wallet address" sub="0xAdm1n...f4e3"    action={<OutlineButton>Change</OutlineButton>} />
        <SettingsRow label="Identity role"          sub="Issued role on-chain" action={<Badge variant="amber">academy</Badge>} />
        <SettingsRow label="Issue tx hash"          sub="0xdeadbee...4f3a"  action={<OutlineButton>View on explorer</OutlineButton>} />
      </Card>

      <SectionTitle>Network configuration</SectionTitle>
      <Card>
        <SettingsRow label="Smart contract address" sub="0x414d72aFC5bEeBC9FF42110f6BBD19570006c620" action={<OutlineButton>Edit</OutlineButton>} />
        <SettingsRow label="Network"                sub="Ethereum mainnet"                          action={<OutlineButton>Change</OutlineButton>} />
      </Card>

      <SectionTitle>Email configuration</SectionTitle>
      <Card>
        <SettingsRow label="OTP expiry"          sub="How long OTP codes remain valid"              action={<span className="text-xs font-semibold text-mint">10 minutes</span>} />
        <SettingsRow label="Allowed email domain" sub="Only allow university-issued emails to register" action={<span className="text-xs font-semibold text-mint">@cu.edu.eg</span>} />
      </Card>
    </div>
  );
}

// professor profile tab for professor only it should be but for now for both to make things esay on me in editing and testing the page

function ProfessorProfileTab() {
  const initial = {
    firstName: 'Khaled',
    lastName: 'Mansour',
    dateOfBirth: '12 Mar 1978',
    gender: 'Male',
    nationalId: '27803121234567',
    nationality: 'Egyptian',
    email: 'k.mansour@cu.edu.eg',
    phone: '+20 100 000 0042',
    title: 'Dr.',
    rank: 'Assoc. Prof',
    department: 'Computer Science',
    faculty: 'Engineering & Computing',
    specialization: 'Distributed Systems',
    employmentType: 'Full-time',
    hireDate: '01 Sep 2015',
    officeLocation: 'Building C, Room 214',
  };

  const [data, setData] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [editing, setEditing] = useState(false);

  const set = (key: keyof typeof draft) => (v: string) =>
    setDraft((d) => ({ ...d, [key]: v }));

  const handleSave = () => { setData(draft); setEditing(false); };
  const handleCancel = () => { setDraft(data); setEditing(false); };

  return (
    <div className="w-full">
      <ProfileHeader
        initials={`${data.firstName[0]}${data.lastName[0]}`}
        name={`${data.title} ${data.firstName} ${data.lastName}`}
        sub={`Employee #EMP-0042 · ${data.rank} · ${data.department}`}
        color="violet"
      />

      <EditBar editing={editing} onEdit={() => setEditing(true)} onSave={handleSave} onCancel={handleCancel} />

      <SectionTitle>Personal information</SectionTitle>
      <Card>
        <FieldGrid>
          <Field label="First name"    value={draft.firstName}   onChange={set('firstName')}   editing={editing} />
          <Field label="Last name"     value={draft.lastName}    onChange={set('lastName')}    editing={editing} />
          <Field label="Date of birth" value={draft.dateOfBirth} onChange={set('dateOfBirth')} editing={editing} />
          <Field label="Gender"        value={draft.gender}      onChange={set('gender')}      editing={editing} />
          <Field label="National ID"   value={draft.nationalId}  onChange={set('nationalId')}  editing={editing} mono />
          <Field label="Nationality"   value={draft.nationality} onChange={set('nationality')} editing={editing} />
          <Field label="Email"         value={draft.email}       onChange={set('email')}       editing={editing} />
          <Field label="Phone"         value={draft.phone}       onChange={set('phone')}       editing={editing} />
        </FieldGrid>
      </Card>

      <SectionTitle>Academic details</SectionTitle>
      <Card>
        <FieldGrid>
          <Field label="Title"           value={draft.title}          onChange={set('title')}          editing={editing} />
          <Field label="Rank"            value={draft.rank}           onChange={set('rank')}           editing={editing} />
          <Field label="Department"      value={draft.department}     onChange={set('department')}     editing={editing} />
          <Field label="Faculty"         value={draft.faculty}        onChange={set('faculty')}        editing={editing} />
          <Field label="Specialization"  value={draft.specialization} onChange={set('specialization')} editing={editing} />
          <Field label="Employment type" value={draft.employmentType} onChange={set('employmentType')} editing={editing} />
          <Field label="Hire date"       value={draft.hireDate}       onChange={set('hireDate')}       editing={editing} />
          <Field label="Office location" value={draft.officeLocation} onChange={set('officeLocation')} editing={editing} />
        </FieldGrid>
      </Card>

      <SectionTitle>Blockchain identity</SectionTitle>
      <Card>
        <SettingsRow label="Wallet address" sub="0x3a1bD9...e2f4"        action={<Badge variant="mint">Linked</Badge>} />
        <SettingsRow label="Identity role"  sub="Issued role on-chain"   action={<Badge variant="violet">professor</Badge>} />
        <SettingsRow label="Issued at"      sub="Jan 10, 2025 — 14:22 UTC" action={<OutlineButton>View on explorer</OutlineButton>} />
      </Card>

      <SectionTitle>Network configuration</SectionTitle>
      <Card>
        <SettingsRow label="Smart contract address" sub="0x414d72aFC5bEeBC9FF42110f6BBD19570006c620" action={<OutlineButton>Edit</OutlineButton>} />
        <SettingsRow label="Network"                sub="Ethereum mainnet"                          action={<OutlineButton>Change</OutlineButton>} />
      </Card>

      <SectionTitle>Email configuration</SectionTitle>
      <Card>
        <SettingsRow label="OTP expiry"           sub="How long OTP codes remain valid"                 action={<span className="text-xs font-semibold text-mint">10 minutes</span>} />
        <SettingsRow label="Allowed email domain" sub="Only allow university-issued emails to register" action={<span className="text-xs font-semibold text-mint">@cu.edu.eg</span>} />
      </Card>
    </div>
  );
}

// main page

export default function SettingsPage() {
  const [role, setRole] = useState<Role>('admin');
  const [activeTab, setActiveTab] = useState<string>('');

  useEffect(() => {
    const stored = localStorage.getItem('userRole') as Role | null;
    const resolvedRole: Role = stored === 'professor' ? 'professor' : 'admin';
    setRole(resolvedRole);
    const tabs = resolvedRole === 'professor' ? PROFESSOR_TABS : ADMIN_TABS;
    setActiveTab(tabs[0].id);
  }, []);

  const tabs = role === 'professor' ? PROFESSOR_TABS : ADMIN_TABS;

  const renderContent = () => {
    switch (activeTab) {
      case 'academy':   return <AcademyProfileTab />;
      case 'professor': return <ProfessorProfileTab />;
      default:          return null;
    }
  };

  if (!activeTab) return null;

  return (
    <div className="flex flex-col h-full w-full">
      <PageHeader title="Settings" />

      <div className="flex-1 overflow-y-auto w-full">
        {/* tab bar only shows when there a multiple tabs (admin) */}
        {tabs.length > 1 && (
          <div className="flex gap-1 border-b border-borderLine mb-6 px-1 w-full">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                  activeTab === tab.id
                    ? 'text-mint border-mint'
                    : 'text-textMuted border-transparent hover:text-textLight'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
        
        <div className="flex flex-col h-full">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
