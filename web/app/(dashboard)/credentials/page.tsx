'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader';
import { store, Credential } from '@/lib/store';

// helpers
function getStudentName(studentId: string) {
  const s = store.students.find(s => s.id === studentId);
  return s ? [s.firstName, s.lastName].filter(Boolean).join(' ') : '—';
}

function TypeBadge({ type }: { type: Credential['type'] }) {
  const colors: Record<string, string> = {
    Degree:      'bg-mint/10 text-mint border-mint/30',
    Achievement: 'bg-orange-400/10 text-orange-400 border-orange-400/30',
    Certificate: 'bg-purple-400/10 text-purple-400 border-purple-400/30',
    Enrollment:  'bg-blue-400/10 text-blue-400 border-blue-400/30',
    Attendance:  'bg-cyan-400/10 text-cyan-400 border-cyan-400/30',
    Transcript:  'bg-yellow-400/10 text-yellow-500 border-yellow-400/30',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colors[type] ?? colors.Certificate}`}>
      {type}
    </span>
  );
}

function StatusBadge({ status }: { status: Credential['status'] }) {
  const colors: Record<string, string> = {
    Verified: 'bg-mint/10 text-mint border-mint/30',
    Pending:  'bg-yellow-400/10 text-yellow-500 border-yellow-400/30',
    Failed:   'bg-red-400/10 text-red-400 border-red-400/30',
    Revoked:  'bg-red-400/10 text-red-400 border-red-400/30',
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
    <div className="bg-card border border-borderLine rounded-2xl p-5 flex-1">
      <p className="text-textMuted text-sm mb-1">{label}</p>
      <p className="text-textLight text-3xl font-bold">{value}</p>
      <p className={`text-xs mt-1 font-medium ${subColor ?? 'text-textMuted'}`}>{sub}</p>
    </div>
  );
}

export default function CredentialsPage() {
  const [credentials, setCredentials] = useState<Credential[]>([]);

  useEffect(() => {
    setCredentials([...store.credentials]);
  }, []);

  // stats
  const total    = credentials.length;
  const verified = credentials.filter(c => c.status === 'Verified').length;
  const pending  = credentials.filter(c => c.status === 'Pending').length;
  const revoked  = credentials.filter(c => c.status === 'Revoked').length;

  return (
    <div className="flex flex-col h-full">

      {/* header */}
      <PageHeader title="Credentials" onAddNew={() => {}} />

      {/* stat cards */}
      <div className="flex gap-4 mb-6">
        <StatCard label="Total credentials" value={total}    sub="on blockchain" />
        <StatCard label="Verified"          value={verified} sub="valid"         subColor="text-mint" />
        <StatCard label="Pending"           value={pending}  sub="awaiting tx"   subColor="text-yellow-400" />
        <StatCard label="Revoked"           value={revoked}  sub="flagged"       subColor="text-red-400" />
      </div>

      {/* table */}
      <div className="bg-card border border-borderLine rounded-2xl flex-1 overflow-hidden">
        <div className="px-6 py-4 border-b border-borderLine">
          <p className="text-textMuted text-xs font-bold uppercase tracking-widest">All Credentials</p>
        </div>

        {credentials.length === 0 ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-textMuted text-sm">No credentials yet.</p>
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
                {credentials.map(cred => (
                  <tr key={cred.id} className="border-b border-borderLine hover:bg-surface/50 transition">
                    <td className="px-6 py-4 text-textLight text-sm font-semibold">{cred.title}</td>
                    <td className="px-6 py-4 text-textLight text-sm">{getStudentName(cred.issuedTo)}</td>
                    <td className="px-6 py-4"><TypeBadge type={cred.type} /></td>
                    <td className="px-6 py-4 text-textMuted text-sm font-mono">{cred.code || '—'}</td>
                    <td className="px-6 py-4 text-textMuted text-sm">
                      {cred.date ? new Date(cred.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-6 py-4"><StatusBadge status={cred.status} /></td>
                    <td className="px-6 py-4">
                      <button
                        disabled
                        title="Coming soon"
                        className="text-xs border border-borderLine text-textMuted px-3 py-1 rounded-lg opacity-50 cursor-not-allowed"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}