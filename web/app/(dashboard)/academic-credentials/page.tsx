'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import SearchFilter, { useSearchFilter } from '@/components/SearchFilter';
import { fetchCredentials, ApiCredential } from '@/lib/api';


function TypeBadge({ type }: { type: Credential['type'] }) {
  const colors: Record<string, string> = {
    Degree: 'bg-mint/10 text-mint border-mint/30',
    Achievement: 'bg-orange-400/10 text-orange-400 border-orange-400/30',
    Certificate: 'bg-purple-400/10 text-purple-400 border-purple-400/30',
    Enrollment: 'bg-blue-400/10 text-blue-400 border-blue-400/30',
    Attendance: 'bg-cyan-400/10 text-cyan-400 border-cyan-400/30',
    Transcript: 'bg-yellow-400/10 text-yellow-500 border-yellow-400/30',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colors[type] ?? colors.Certificate}`}>
      {type}
    </span>
  );
}

function StatusBadge({ status, loading = false }: { status: string; loading?: boolean }) {
  if (loading) {
    return <span className="inline-block w-16 h-5 rounded-full bg-borderLine animate-pulse" />;
  }
  const colors: Record<string, string> = {
    Verified: 'bg-mint/10 text-mint border border-mint/20',
    Issued: 'bg-mint/10 text-mint border border-mint/20',
    Pending: 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20',
    Failed: 'bg-red-500/10 text-red-400 border border-red-500/20',
    Revoked: 'bg-red-500/10 text-red-400 border border-red-500/20',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colors[status] ?? colors.Pending}`}>
      {status}
    </span>
  );
}

function StatCard({ label, value, sub, subColor }: {
  label: string; value: string | number; sub: string; subColor?: string;
}) {
  return (
    <div className="bg-card border border-borderLine rounded-2xl p-5">
      <p className="text-textMuted text-sm mb-1">{label}</p>
      <p className="text-textLight text-3xl font-bold">{value}</p>
      <p className={`text-xs mt-1 font-medium ${subColor ?? 'text-textMuted'}`}>{sub}</p>
    </div>
  );
}

type CredentialRow = Credential & { studentName: string };

export default function CredentialsPage() {
  const router = useRouter();
  const [credentials, setCredentials] = useState<ApiCredential[]>([]);
  const [apiLoading, setApiLoading] = useState(true);

  useEffect(() => {
    fetchCredentials()
      .then((data) => setCredentials(data))
      .catch((err) => console.error('Failed to fetch credentials:', err))
      .finally(() => setApiLoading(false));
  }, []);

  const { filtered, handleSearch } = useSearchFilter<any>(
    credentials as any,
    (c) => c
  );

  const total = credentials.length;
  const revoked = credentials.filter(c => c.is_revoked).length;
  const pending = credentials.filter(c => c.status === 'pending').length;
  const verified = credentials.filter(c => c.status === 'verified' && !c.is_revoked).length;

  return (
    <div className="flex flex-col h-full">

      <PageHeader title="Academic Credentials" onAddNew={() => router.push('/createCredential')} />

      <div className="p-6 space-y-6">

        {/* stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Academic Credentials" value={total} sub="on blockchain" />
          <StatCard label="Verified Credentials" value={verified} sub="valid" subColor="text-mint" />
          <StatCard label="Pending Issuance" value={pending} sub="awaiting tx" subColor="text-yellow-400" />
          <StatCard label="Revoked Credentials" value={revoked} sub="flagged" subColor="text-red-400" />
        </div>

        {/* table */}
        <div className="bg-card rounded-2xl border border-borderLine overflow-hidden flex-1">
          <div className="px-6 py-4 border-b border-borderLine">
            <h3 className="text-textMuted text-sm font-bold uppercase tracking-widest">
              All Credentials

              {/* for filter */}
              {filtered.length !== credentials.length && (
                <span className="ml-2 text-mint normal-case font-normal">
                  — {filtered.length} result{filtered.length !== 1 ? 's' : ''}
                </span>
              )}
            </h3>
          </div>

          {/* SearchFilter */}
          <div className="px-6 py-4 border-b border-borderLine">
            <SearchFilter
              placeholder="Search credentials by title, student, type…"
              filterKeys={[
                { label: 'Title', value: 'title' },
                { label: 'Student', value: 'student_name' }, // تم التعديل هنا
                { label: 'Type', value: 'type' },
                { label: 'Code', value: 'code' },
                { label: 'Status', value: 'status' },
              ]}
              onSearch={handleSearch}
            />
          </div>

          {credentials.length === 0 ? (
            <div className="flex items-center justify-center min-h-48 py-12">
              <p className="text-textMuted px-4">No credentials yet. Click <span className="text-mint font-bold">+ Add New</span> to create one.</p>
            </div>

          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-48 py-12 gap-2">
              <p className="text-textMuted">No credentials match your search.</p>
              <p className="text-textMuted text-sm">Try a different keyword or filter.</p>
            </div>
          ) : (

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-borderLine">
                    {['Title', 'Issued to', 'Type', 'Code', 'Date', 'Status', ''].map(h => (
                      <th key={h} className="text-left text-textMuted text-xs font-bold uppercase tracking-wider px-6 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(cred => {
                    let displayStatus: any = 'Pending';
                    if (cred.is_revoked) displayStatus = 'Revoked';
                    else displayStatus = 'Issued';

                    const displayType = cred.type ? cred.type.charAt(0).toUpperCase() + cred.type.slice(1) : 'Certificate';

                    return (
                      <tr key={cred.id} className="border-b border-borderLine hover:bg-surface/50 transition">
                        <td className="px-6 py-4 text-textLight text-sm font-semibold">{cred.title}</td>
                        <td className="px-6 py-4 text-textLight text-sm">{cred.student_name || '—'}</td>
                        <td className="px-6 py-4"><TypeBadge type={displayType as any} /></td>
                        <td className="px-6 py-4 text-textMuted text-sm font-mono">{cred.code || '—'}</td>
                        <td className="px-6 py-4 text-textMuted text-sm">
                          {cred.issued_at ? new Date(cred.issued_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={displayStatus} loading={apiLoading} />
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => router.push(`/academic-credentials/${cred.id}`)}
                            className="text-xs border border-borderLine text-textMuted hover:text-textLight hover:border-mint px-3 py-1 rounded-lg transition"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}