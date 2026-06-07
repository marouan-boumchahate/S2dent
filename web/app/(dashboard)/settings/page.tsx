'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader';
import { useLogo } from '@/lib/logoContext';
import {
  fetchAcademyMe,
  fetchAcademyIdentityMe,
  updateAcademyMe,
  fetchProfessorMe,
  fetchUserMe,
  fetchProfessorIdentityMe,
  updateUserMe,
  uploadMedia,
  fetchMyDepartment,
  fetchAcademySummary
} from '@/lib/api';

// date formatting helper
function formatDate(dateStr?: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

type Role = 'admin' | 'professor';
type Tab = { id: string; label: string };

const ADMIN_TABS: Tab[] = [
  { id: 'academy', label: 'Academy profile' },
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

// buttons & status indicators

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

function SettingsRow({
  label,
  sub,
  icon,
  action,
  copyValue,
}: {
  label: string;
  sub?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  copyValue?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!copyValue) return;
    try {
      await navigator.clipboard.writeText(copyValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-4 border-b border-borderLine last:border-0 gap-4">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        {icon && (
          <div className="text-textMuted shrink-0 mt-0.5">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-textLight">{label}</p>
          {sub && (
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-textMuted font-mono break-all leading-relaxed">
                {sub}
              </p>
              {copyValue && sub !== '—' && (
                <button
                  onClick={handleCopy}
                  className="shrink-0 text-textMuted hover:text-mint p-1 rounded hover:bg-navy/50 transition-colors"
                  title="Copy to clipboard"
                >
                  {copied ? (
                    <svg className="w-[18px] h-[18px] text-mint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      {action && <div className="sm:ml-4 shrink-0 flex items-center">{action}</div>}
    </div>
  );
}

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

function ProcessingModal({ imageUrl, message = 'Processing and saving changes...' }: { imageUrl: string; message?: string }) {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* CSS Stylesheet Injector */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spinSlow 4s linear infinite;
        }
      `}</style>

      {/* Backdrop */}
      <div className="absolute inset-0 bg-navy/85 backdrop-blur-md" />
      
      {/* Modal Container */}
      <div className="relative bg-card border border-borderLine rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center gap-6 animate-fadeIn">
        
        {/* Stable Image with Spinning Gradient Ring */}
        <div className="relative w-28 h-28 flex items-center justify-center">
          {/* Spinning Gradient Border Ring */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-mint to-violet-500 animate-spin-slow" />
          
          {/* Stable Inner Image */}
          <div className="absolute w-[calc(100%-6px)] h-[calc(100%-6px)] rounded-full overflow-hidden bg-navy p-0.5 flex items-center justify-center">
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-navy rounded-full">
                <svg className="animate-spin h-6 w-6 text-mint" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            )}
            <img
              src={imageUrl}
              alt="Uploading preview"
              className={`w-full h-full object-cover rounded-full transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setImageLoaded(true)}
            />
          </div>
        </div>

        {/* Loading Spinner and Text */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <svg className="animate-spin h-5 w-5 text-mint" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-sm font-semibold text-textLight">{message}</span>
          </div>
          <p className="text-xs text-textMuted max-w-[200px]">
            Please wait while we upload and secure your profile changes on-chain and in our databases.
          </p>
        </div>
      </div>
    </div>
  );
}

function ProfileHeader({
  initials,
  name,
  sub,
  color,
  allowLogoUpload = false,
  imageSrc,
  onImageUpload,
}: {
  initials: string;
  name: string;
  sub: string;
  color: 'mint' | 'violet';
  allowLogoUpload?: boolean;
  imageSrc?: string;
  onImageUpload?: (file: File) => void;
}) {
  const ring =
    color === 'mint'
      ? 'from-mint to-teal-400 border-mint/20 text-mint bg-mint/10'
      : 'from-violet-500 to-fuchsia-400 border-violet-500/20 text-violet-400 bg-violet-500/10';

  const { logoUrl, setLogoUrl } = useLogo();
  const displayImage = color === 'mint' ? (imageSrc || logoUrl) : imageSrc;

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (onImageUpload) {
      onImageUpload(file);
    } else {
      const url = URL.createObjectURL(file);
      setLogoUrl(url);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5 mb-6 p-5 bg-gradient-to-br from-card to-navy/40 border border-borderLine/80 rounded-3xl w-full shadow-lg backdrop-blur-sm relative overflow-hidden">
      {/* Decorative background glow */}
      <div className={`absolute -right-16 -top-16 w-32 h-32 rounded-full blur-3xl opacity-20 bg-gradient-to-br ${color === 'mint' ? 'from-mint' : 'from-violet-500'}`} />

      {/* Avatar Container */}
      <label className={`shrink-0 relative rounded-full p-1 bg-gradient-to-tr ${ring} shadow-md transition-all duration-300 ${allowLogoUpload ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : 'cursor-default'}`}>
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-navy flex items-center justify-center relative">
          {displayImage && displayImage !== '/logo.png' ? (
            <img 
              src={displayImage} 
              alt="profile" 
              className="w-full h-full object-cover" 
            />
          ) : (
            <div className={`w-full h-full flex items-center justify-center text-xl sm:text-2xl font-black bg-gradient-to-br ${color === 'mint' ? 'from-mint/10 to-mint/5' : 'from-violet-500/10 to-violet-500/5'}`}>
              {initials}
            </div>
          )}
        </div>

        {allowLogoUpload && (
          <div className="absolute inset-1 rounded-full bg-black/60 opacity-0 hover:opacity-100 flex flex-col items-center justify-center transition-opacity duration-200 backdrop-blur-[2px]">
            <svg className="w-6 h-6 text-white mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-[9px] font-bold text-white uppercase tracking-wider">Update</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          </div>
        )}
      </label>

      {/* Information Container */}
      <div className="flex-1 min-w-0 text-center sm:text-left flex flex-col gap-1.5 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 justify-center sm:justify-start">
          <h1 className="text-lg sm:text-xl font-extrabold text-textLight tracking-tight leading-tight">
            {name}
          </h1>
          <span className={`self-center text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border shadow-sm ${
            color === 'mint'
              ? 'bg-mint/10 text-mint border-mint/20'
              : 'bg-violet-500/10 text-violet-400 border-violet-500/20'
          }`}>
            {color === 'mint' ? 'Academy' : 'Professor'}
          </span>
        </div>
        <p className="text-xs sm:text-sm text-textMuted font-medium leading-relaxed max-w-xl">
          {sub}
        </p>
      </div>
    </div>
  );
}

// Academy profile tab for admin configuration

function AcademyProfileTab() {
  const initial = {
    fullName: '',
    shortName: '',
    academyNumber: '',
    type: '',
    email: '',
    phone: '',
    website: '',
    legalName: '',
    registrationNumber: '',
    taxId: '',
    billingEmail: '',
    logoUrl: '',
  };

  const [data, setData] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [identity, setIdentity] = useState<any>(null);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const { setLogoUrl } = useLogo();

  const set = (key: keyof typeof draft) => (v: string) =>
    setDraft((d) => ({ ...d, [key]: v }));

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      fetchAcademyMe(),
      fetchAcademyIdentityMe()
    ]).then(([academyResult, identityResult]) => {
      let mapped = { ...initial };
      if (academyResult.status === 'fulfilled' && academyResult.value) {
        const academy = academyResult.value;
        mapped = {
          fullName: academy.name || '',
          shortName: academy.short_name || '',
          academyNumber: academy.serial_number || '',
          type: academy.type || '',
          email: academy.email || '',
          phone: academy.phone || '',
          website: academy.website || '',
          legalName: academy.legal_name || '',
          registrationNumber: academy.registration_number || '',
          taxId: academy.tax_id || '',
          billingEmail: academy.billing_email || '',
          logoUrl: academy.logo_url || '',
        };
        if (academy.logo_url) {
          setLogoUrl(academy.logo_url);
        }
      }
      if (identityResult.status === 'fulfilled' && identityResult.value) {
        setIdentity(identityResult.value);
      }
      setData(mapped);
      setDraft(mapped);
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    try {
      await updateAcademyMe({
        phone: draft.phone,
        website: draft.website,
        logo_url: draft.logoUrl || undefined,
      });
      setData(draft);
      setEditing(false);
    } catch (err: any) {
      alert(`Failed to save changes: ${err.message}`);
    }
  };

  const handleCancel = () => {
    setDraft(data);
    setEditing(false);
  };

  const handleLogoUpload = async (file: File) => {
    const previewUrl = URL.createObjectURL(file);
    setUploadingImage(previewUrl);
    try {
      const url = await uploadMedia(file);
      setLogoUrl(url);
      setDraft((d) => ({ ...d, logoUrl: url }));
      setData((d) => ({ ...d, logoUrl: url }));
      await updateAcademyMe({ logo_url: url });
    } catch (err: any) {
      alert(`Logo upload failed: ${err.message}`);
    } finally {
      setUploadingImage(null);
    }
  };

  if (loading) {
    return <div className="text-textMuted text-sm py-8 text-center animate-pulse">Loading academy profile...</div>;
  }

  return (
    <div className="w-full">
      {uploadingImage && <ProcessingModal imageUrl={uploadingImage} />}
      <ProfileHeader
        initials={data.shortName ? data.shortName.slice(0, 2) : 'AC'}
        name={data.fullName}
        sub={`Academy #${data.academyNumber || 'ACU-2024'} · ${data.type}`}
        color="mint"
        allowLogoUpload={true}
        imageSrc={draft.logoUrl}
        onImageUpload={handleLogoUpload}
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
        <SettingsRow
          label="Academy wallet address"
          sub={identity?.wallet_address || '—'}
          copyValue={identity?.wallet_address}
        />
        <SettingsRow label="Identity role" sub="Issued role on-chain" action={<Badge variant="amber">academy</Badge>} />
        <SettingsRow label="Issued at" sub={formatDate(identity?.status?.issued_at)} />
      </Card>

      <SectionTitle>Network configuration</SectionTitle>
      <Card>
        <SettingsRow label="Smart contract address" sub="0x414d72aFC5bEeBC9FF42110f6BBD19570006c620" action={<OutlineButton onClick={() => window.open('https://sepolia.etherscan.io/address/0x414d72aFC5bEeBC9FF42110f6BBD19570006c620', '_blank')}>View contract</OutlineButton>} />
        <SettingsRow label="Network" sub="Ethereum mainnet" />
      </Card>
    </div>
  );
}

// Professor self-service settings view

function ProfessorProfileTab() {
  const initialData = {
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    nationalId: '',
    nationality: '',
    email: '',
    phone: '',
    title: '',
    rank: '',
    department: '',
    faculty: '',
    specialization: '',
    employmentType: '',
    hireDate: '',
    officeLocation: '',
    officeHours: '',
    photoUrl: '',
  };

  const [data, setData] = useState(initialData);
  const [draft, setDraft] = useState(initialData);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [identity, setIdentity] = useState<any>(null);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const { logoUrl, setLogoUrl } = useLogo();

  const set = (key: keyof typeof draft) => (v: string) =>
    setDraft((d) => ({ ...d, [key]: v }));

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      fetchProfessorMe(),
      fetchUserMe(),
      fetchProfessorIdentityMe(),
      fetchMyDepartment(),
      fetchAcademySummary(),
    ]).then(([profRes, userRes, identityRes, deptRes, academyRes]) => {
      let mapped = { ...initialData };
      let resolvedDept = '';
      let resolvedFaculty = '';

      if (deptRes.status === 'fulfilled' && deptRes.value) {
        resolvedDept = deptRes.value.name;
        resolvedFaculty = deptRes.value.faculty;
      }

      if (academyRes.status === 'fulfilled' && academyRes.value) {
        if (academyRes.value.logo_url) {
          setLogoUrl(academyRes.value.logo_url);
        }
      }

      if (userRes.status === 'fulfilled' && userRes.value) {
        const u = userRes.value;
        mapped.firstName = u.first_name || '';
        mapped.lastName = u.last_name || '';
        mapped.dateOfBirth = formatDate(u.date_of_birth);
        mapped.gender = u.gender || '';
        mapped.nationalId = u.national_id || '';
        mapped.nationality = u.nationality || '';
        mapped.email = u.email || '';
        mapped.phone = u.phone || '';
        mapped.photoUrl = u.photo_url || '';
      }

      if (profRes.status === 'fulfilled' && profRes.value) {
        const p = profRes.value;
        mapped.title = p.title || '';
        mapped.rank = p.rank || '';
        mapped.specialization = p.specialization || '';
        mapped.employmentType = p.employment_type || '';
        mapped.hireDate = formatDate(p.hire_date);
        mapped.officeLocation = p.office_location || '';
        mapped.officeHours = p.office_hours || '';
      }

      mapped.department = resolvedDept;
      mapped.faculty = resolvedFaculty;

      if (identityRes.status === 'fulfilled' && identityRes.value) {
        setIdentity(identityRes.value);
      }

      setData(mapped);
      setDraft(mapped);
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    try {
      await updateUserMe({ phone: draft.phone });
      setData(draft);
      setEditing(false);
    } catch (err: any) {
      alert(`Failed to save changes: ${err.message}`);
    }
  };

  const handleCancel = () => {
    setDraft(data);
    setEditing(false);
  };

  const handlePhotoUpload = async (file: File) => {
    const previewUrl = URL.createObjectURL(file);
    setUploadingImage(previewUrl);
    try {
      const url = await uploadMedia(file);
      await updateUserMe({ photo_url: url });
      setData((prev) => ({ ...prev, photoUrl: url }));
      setDraft((prev) => ({ ...prev, photoUrl: url }));
    } catch (err: any) {
      alert(`Photo upload failed: ${err.message}`);
    } finally {
      setUploadingImage(null);
    }
  };

  if (loading) {
    return <div className="text-textMuted text-sm py-8 text-center animate-pulse">Loading professor profile...</div>;
  }

  return (
    <div className="w-full">
      {uploadingImage && <ProcessingModal imageUrl={uploadingImage} />}
      <ProfileHeader
        initials={`${draft.firstName ? draft.firstName[0] : ''}${draft.lastName ? draft.lastName[0] : ''}`}
        name={`${draft.title} ${draft.firstName} ${draft.lastName}`}
        sub={`Employee #${identity?.identity?.employee_id_hash ? identity.identity.employee_id_hash.slice(0, 8).toUpperCase() : 'EMP-0042'} · ${draft.rank} · ${draft.department}`}
        color="violet"
        imageSrc={draft.photoUrl}
        allowLogoUpload={true}
        onImageUpload={handlePhotoUpload}
      />

      <EditBar editing={editing} onEdit={() => setEditing(true)} onSave={handleSave} onCancel={handleCancel} />

      <SectionTitle>Personal information</SectionTitle>
      <Card>
        <FieldGrid>
          <Field label="First name" value={draft.firstName} onChange={set('firstName')} editing={editing} readOnly />
          <Field label="Last name" value={draft.lastName} onChange={set('lastName')} editing={editing} readOnly />
          <Field label="Date of birth" value={draft.dateOfBirth} onChange={set('dateOfBirth')} editing={editing} readOnly />
          <Field label="Gender" value={draft.gender} onChange={set('gender')} editing={editing} readOnly />
          <Field label="National ID" value={draft.nationalId} onChange={set('nationalId')} editing={editing} readOnly mono />
          <Field label="Nationality" value={draft.nationality} onChange={set('nationality')} editing={editing} readOnly />
          <Field label="Email" value={draft.email} onChange={set('email')} editing={editing} readOnly />
          <Field label="Phone" value={draft.phone} onChange={set('phone')} editing={editing} />
        </FieldGrid>
      </Card>

      <SectionTitle>Academic details</SectionTitle>
      <Card>
        <FieldGrid>
          <Field label="Title" value={draft.title} onChange={set('title')} editing={editing} readOnly />
          <Field label="Rank" value={draft.rank} onChange={set('rank')} editing={editing} readOnly />
          <Field label="Department" value={draft.department} onChange={set('department')} editing={editing} readOnly />
          <Field label="Faculty" value={draft.faculty} onChange={set('faculty')} editing={editing} readOnly />
          <Field label="Specialization" value={draft.specialization} onChange={set('specialization')} editing={editing} readOnly />
          <Field label="Employment type" value={draft.employmentType} onChange={set('employmentType')} editing={editing} readOnly />
          <Field label="Hire date" value={draft.hireDate} onChange={set('hireDate')} editing={editing} readOnly />
          <Field label="Office location" value={draft.officeLocation} onChange={set('officeLocation')} editing={editing} readOnly />
          <Field label="Office hours" value={draft.officeHours} onChange={set('officeHours')} editing={editing} readOnly />
        </FieldGrid>
      </Card>

      <SectionTitle>Blockchain identity</SectionTitle>
      <Card>
        <SettingsRow
          label="Wallet address"
          sub={identity?.wallet_address || '—'}
          copyValue={identity?.wallet_address}
          action={<Badge variant={identity ? "mint" : "amber"}>{identity ? "Linked" : "Pending"}</Badge>}
        />
        <SettingsRow label="Identity role" sub="Issued role on-chain" action={<Badge variant="violet">professor</Badge>} />
        <SettingsRow label="Issued at" sub={formatDate(identity?.status?.issued_at)} />
      </Card>

      <SectionTitle>Network configuration</SectionTitle>
      <Card>
        <SettingsRow label="Smart contract address" sub="0x414d72aFC5bEeBC9FF42110f6BBD19570006c620" action={<OutlineButton onClick={() => window.open('https://sepolia.etherscan.io/address/0x414d72aFC5bEeBC9FF42110f6BBD19570006c620', '_blank')}>View contract</OutlineButton>} />
        <SettingsRow label="Network" sub="Ethereum mainnet" />
      </Card>
    </div>
  );
}

// Main root page framework

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