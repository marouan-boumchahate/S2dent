'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader';
import { useLogo } from '@/lib/logoContext';

// pages

type Role = 'admin' | 'professor';
type Tab = { id: string; label: string };

const ADMIN_TABS: Tab[] = [
  { id: 'academy', label: 'Academy profile' },
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
  readOnly,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  editing: boolean;
  mono?: boolean;
  readOnly?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 w-full">
      <span className="text-[10px] font-semibold text-textMuted uppercase tracking-wider">
        {label}
      </span>
      {editing && !readOnly ? (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`text-sm text-textLight bg-navy border border-mint/60 rounded-xl px-3 py-2 outline-none focus:border-mint transition-colors w-full ${mono ? 'font-mono text-xs' : ''
            }`}
        />
      ) : (
        <span
          className={`text-sm text-textLight bg-navy border border-borderLine rounded-xl px-3 py-2 w-full block min-h-9.5 ${mono ? 'font-mono text-xs' : ''
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
    mint: 'bg-mint/10 text-mint border-mint/20',
    amber: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
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

function ProfileHeader({
  initials,
  name,
  sub,
  color,
  allowLogoUpload = false,
}: {
  initials: string;
  name: string;
  sub: string;
  color: 'mint' | 'violet';
  allowLogoUpload?: boolean;
}) {
  const ring =
    color === 'mint'
      ? 'border-mint text-mint bg-mint/10'
      : 'border-violet-500 text-violet-400 bg-violet-500/10';

  const { logoUrl, setLogoUrl } = useLogo();

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setLogoUrl(url);
  };

  return (
    <div className="flex items-center gap-4 mb-5 p-4 bg-navy border border-borderLine rounded-2xl w-full">
      <label className={`shrink-0 relative group ${allowLogoUpload ? 'cursor-pointer' : 'cursor-default'}`}>
        <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center text-base font-bold overflow-hidden ${ring}`}>
          {logoUrl !== '/logo.png'
            ? <img src={logoUrl} alt="logo" className="w-full h-full object-contain p-1" />
            : <span>{initials}</span>
          }
        </div>

        {allowLogoUpload && (
          <>
            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          </>
        )}
      </label>
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
        allowLogoUpload={true}
      />

      <EditBar editing={editing} onEdit={() => setEditing(true)} onSave={handleSave} onCancel={handleCancel} />

      <SectionTitle>General information</SectionTitle>
      <Card>
        <FieldGrid>
          <Field label="Full name" value={draft.fullName} onChange={set('fullName')} editing={editing} readOnly />
          <Field label="Short name" value={draft.shortName} onChange={set('shortName')} editing={editing} readOnly />
          <Field label="Academy number" value={draft.academyNumber} onChange={set('academyNumber')} editing={editing} readOnly mono />
          <Field label="Type" value={draft.type} onChange={set('type')} editing={editing} readOnly />
          <Field label="Email" value={draft.email} onChange={set('email')} editing={editing} readOnly />
          <Field label="Phone" value={draft.phone} onChange={set('phone')} editing={editing} />
          <Field label="Website" value={draft.website} onChange={set('website')} editing={editing} />
        </FieldGrid>
      </Card>

      <SectionTitle>Legal &amp; billing</SectionTitle>
      <Card>
        <FieldGrid>
          <Field label="Legal name" value={draft.legalName} onChange={set('legalName')} editing={editing} readOnly />
          <Field label="Registration number" value={draft.registrationNumber} onChange={set('registrationNumber')} editing={editing} readOnly />
          <Field label="Tax ID" value={draft.taxId} onChange={set('taxId')} editing={editing} readOnly />
          <Field label="Billing email" value={draft.billingEmail} onChange={set('billingEmail')} editing={editing} readOnly />
        </FieldGrid>
      </Card>

      <SectionTitle>Blockchain identity</SectionTitle>
      <Card>
        <SettingsRow label="Academy wallet address" sub="0xAdm1n...f4e3" action={<OutlineButton>Change</OutlineButton>} />
        <SettingsRow label="Identity role" sub="Issued role on-chain" action={<Badge variant="amber">academy</Badge>} />
        <SettingsRow label="Issue tx hash" sub="0xdeadbee...4f3a" action={<OutlineButton>View on explorer</OutlineButton>} />
      </Card>

      <SectionTitle>Network configuration</SectionTitle>
      <Card>
        <SettingsRow label="Smart contract address" sub="0x414d72aFC5bEeBC9FF42110f6BBD19570006c620" action={<OutlineButton>Edit</OutlineButton>} />
        <SettingsRow label="Network" sub="Ethereum mainnet" action={<OutlineButton>Change</OutlineButton>} />
      </Card>
    </div>
  );
}

// professor profile tab for professor only it should be but for now for both to make things esay on me in editing and testing the page

function ProfessorProfileTab() {
  const data = {
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

  const noop = () => { };

  return (
    <div className="w-full">
      <ProfileHeader
        initials={`${data.firstName[0]}${data.lastName[0]}`}
        name={`${data.title} ${data.firstName} ${data.lastName}`}
        sub={`Employee #EMP-0042 · ${data.rank} · ${data.department}`}
        color="violet"
      />

      <SectionTitle>Personal information</SectionTitle>
      <Card>
        <FieldGrid>
          <Field label="First name" value={data.firstName} onChange={noop} editing={false} />
          <Field label="Last name" value={data.lastName} onChange={noop} editing={false} />
          <Field label="Date of birth" value={data.dateOfBirth} onChange={noop} editing={false} />
          <Field label="Gender" value={data.gender} onChange={noop} editing={false} />
          <Field label="National ID" value={data.nationalId} onChange={noop} editing={false} mono />
          <Field label="Nationality" value={data.nationality} onChange={noop} editing={false} />
          <Field label="Email" value={data.email} onChange={noop} editing={false} />
          <Field label="Phone" value={data.phone} onChange={noop} editing={false} />
        </FieldGrid>
      </Card>

      <SectionTitle>Academic details</SectionTitle>
      <Card>
        <FieldGrid>
          <Field label="Title" value={data.title} onChange={noop} editing={false} />
          <Field label="Rank" value={data.rank} onChange={noop} editing={false} />
          <Field label="Department" value={data.department} onChange={noop} editing={false} />
          <Field label="Faculty" value={data.faculty} onChange={noop} editing={false} />
          <Field label="Specialization" value={data.specialization} onChange={noop} editing={false} />
          <Field label="Employment type" value={data.employmentType} onChange={noop} editing={false} />
          <Field label="Hire date" value={data.hireDate} onChange={noop} editing={false} />
          <Field label="Office location" value={data.officeLocation} onChange={noop} editing={false} />
        </FieldGrid>
      </Card>

      <SectionTitle>Blockchain identity</SectionTitle>
      <Card>
        <SettingsRow label="Wallet address" sub="0x3a1bD9...e2f4" action={<Badge variant="mint">Linked</Badge>} />
        <SettingsRow label="Identity role" sub="Issued role on-chain" action={<Badge variant="violet">professor</Badge>} />
        <SettingsRow label="Issued at" sub="Jan 10, 2025 — 14:22 UTC" action={<OutlineButton>View on explorer</OutlineButton>} />
      </Card>

      <SectionTitle>Network configuration</SectionTitle>
      <Card>
        <SettingsRow label="Smart contract address" sub="0x414d72aFC5bEeBC9FF42110f6BBD19570006c620" action={<OutlineButton>Edit</OutlineButton>} />
        <SettingsRow label="Network" sub="Ethereum mainnet" action={<OutlineButton>Change</OutlineButton>} />
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
      case 'academy': return <AcademyProfileTab />;
      case 'professor': return <ProfessorProfileTab />;
      default: return null;
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
                className={`px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${activeTab === tab.id
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
