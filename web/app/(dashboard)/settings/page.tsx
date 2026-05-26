'use client';

import { useState } from 'react';
import PageHeader from '@/components/PageHeader';

// Shared Primitives

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-card border border-borderLine rounded-2xl p-6 mb-4">{children}</div>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold text-textMuted uppercase tracking-widest mb-3 mt-6 first:mt-0">{children}</p>;
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>;
}

function Field({ label, value, onChange, editing, mono }: { label: string; value: string; onChange: (v: string) => void; editing: boolean; mono?: boolean; }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold text-textMuted uppercase tracking-wider">{label}</span>
      {editing ? (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`text-sm text-textLight bg-navy border border-mint/60 rounded-xl px-3 py-2 outline-none focus:border-mint transition-colors ${mono ? 'font-mono text-xs' : ''}`}
        />
      ) : (
        <span className={`text-sm text-textLight bg-navy border border-borderLine rounded-xl px-3 py-2 ${mono ? 'font-mono text-xs' : ''}`}>
          {value}
        </span>
      )}
    </div>
  );
}

function OutlineButton({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="text-xs font-semibold text-textLight border border-borderLine rounded-lg px-3 py-1.5 hover:border-mint hover:text-mint transition-colors">
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
  return <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${styles[variant]}`}>{children}</span>;
}

function SettingsRow({ label, sub, action }: { label: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-borderLine last:border-0">
      <div>
        <p className="text-sm font-semibold text-textLight">{label}</p>
        {sub && <p className="text-xs text-textMuted mt-0.5 font-mono">{sub}</p>}
      </div>
      {action && <div className="ml-4 shrink-0">{action}</div>}
    </div>
  );
}

function EditBar({ editing, onEdit, onSave, onCancel }: { editing: boolean; onEdit: () => void; onSave: () => void; onCancel: () => void; }) {
  if (!editing) {
    return (
      <div className="flex justify-end mb-4">
        <button onClick={onEdit} className="text-xs font-semibold text-textLight border border-borderLine rounded-lg px-4 py-2 hover:border-mint hover:text-mint transition-colors">
          Edit profile
        </button>
      </div>
    );
  }
  return (
    <div className="flex justify-end gap-2 mb-4">
      <button onClick={onCancel} className="text-xs font-semibold text-textMuted border border-borderLine rounded-lg px-4 py-2 hover:border-red-500 hover:text-red-400 transition-colors">
        Cancel
      </button>
      <button onClick={onSave} className="text-xs font-semibold bg-mint text-navy rounded-lg px-4 py-2 hover:opacity-90 transition-opacity">
        Save changes
      </button>
    </div>
  );
}

function ProfileHeader({ initials, name, sub, color }: { initials: string; name: string; sub: string; color: 'mint' | 'violet'; }) {
  const ring = color === 'mint' ? 'border-mint text-mint bg-mint/10' : 'border-violet-500 text-violet-400 bg-violet-500/10';
  return (
    <div className="flex items-center gap-4 mb-5 p-4 bg-navy border border-borderLine rounded-2xl">
      <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center text-base font-bold shrink-0 ${ring}`}>{initials}</div>
      <div className="flex-1 min-w-0">
        <p className="text-base font-bold text-textLight">{name}</p>
        <p className="text-xs text-textMuted mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

// Main Component

export default function AcademySettingsPage() {
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
    <div className="flex flex-col h-full">
      <PageHeader title="Academy Settings" />

      <div className="flex-1 overflow-y-auto max-w-3xl mt-6">
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
    </div>
  );
}