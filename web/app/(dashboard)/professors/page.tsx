'use client';

import { useState, useEffect } from 'react';
import { redirect, useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import { store, Professor } from '@/lib/store';

export default function ProfessorsPage() {
  const router = useRouter();
  const [professors, setProfessors] = useState<Professor[]>([]);

  useEffect(() => {
    setProfessors([...store.professors]);
  }, []);

  const total = professors.length;
  const departments = new Set(professors.map(p => p.department).filter(Boolean)).size;

  // TODO: replace with the API for blockchain status
  const verified = 0;

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Professors" onAddNew={() => redirect('/createProfessor')} />

      <div className="p-6 space-y-6">

        {/* stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Professors" value={total} sub="+0 this month" subColor="text-purple-500" />
          <StatCard label="Verified" value={verified} sub={total ? `${Math.round(verified / total * 100)}%` : '0%'} subColor="text-mint" />
          <StatCard label="Departments" value={departments} sub="active" subColor="text-orange-400" />
          <StatCard label="Certs Issued" value={0} sub="total" subColor="text-blue-400" />
        </div>

        {/* table */}
        <div className="bg-card rounded-2xl border border-borderLine overflow-hidden">
          <div className="px-6 py-4 border-b border-borderLine">
            <h3 className="text-textMuted text-sm font-bold uppercase tracking-wider">All Professors</h3>
          </div>

          {professors.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <p className="text-textMuted">No professors yet. Click <span className="text-mint font-bold">+ Add New</span> to create one.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-borderLine">
                    <th className="text-left px-6 py-3 text-textMuted text-sm font-semibold">Name</th>
                    <th className="text-left px-6 py-3 text-textMuted text-sm font-semibold">Email</th>
                    <th className="text-left px-6 py-3 text-textMuted text-sm font-semibold">Department</th>
                    <th className="text-left px-6 py-3 text-textMuted text-sm font-semibold">Rank</th>
                    <th className="text-left px-6 py-3 text-textMuted text-sm font-semibold">Status</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {professors.map((p, i) => (
                    <tr key={p.id} className={`border-b border-borderLine hover:bg-surface transition ${i % 2 === 0 ? '' : 'bg-surface/30'}`}>
                      <td className="px-6 py-4 text-textLight font-medium">
                        {[p.title, p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ')}
                      </td>
                      <td className="px-6 py-4 text-textMuted text-sm">{p.email}</td>
                      <td className="px-6 py-4 text-textMuted text-sm">{p.department || '—'}</td>
                      <td className="px-6 py-4 text-textMuted text-sm">{p.rank || '—'}</td>
                      <td className="px-6 py-4">
                        {/* TODO: replace with the API for status */}
                        <StatusBadge status="pending" />
                      </td>
                      <td className="px-6 py-4">
                        <button className="text-sm border border-borderLine text-textMuted hover:text-textLight hover:border-electric px-3 py-1 rounded-lg transition">
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
    </div>
  );
}

function StatCard({ label, value, sub, subColor = 'text-textMuted' }: { label: string; value: number; sub: string; subColor?: string }) {
  return (
    <div className="bg-card border border-borderLine rounded-2xl p-5">
      <p className="text-textMuted text-sm mb-1">{label}</p>
      <p className="text-textLight text-3xl font-bold">{value}</p>
      <p className={`text-sm mt-1 ${subColor}`}>{sub}</p>
    </div>
  );
}

// blockchain status will set by API
function StatusBadge({ status }: { status: 'pending' | 'failed' | 'verified' }) {
  const map = {
    verified: 'bg-green-100 text-green-600 border border-green-200',
    pending:  'bg-yellow-100 text-yellow-600 border border-yellow-200',
    failed:   'bg-red-100 text-red-500 border border-red-200',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${map[status]}`}>
      {status}
    </span>
  );
}