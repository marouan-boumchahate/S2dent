'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import { store, Student } from '@/lib/store';

export default function StudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);

  const [role, setRole] = useState<string>('admin');

  useEffect(() => {
    const stored = localStorage.getItem('userRole');
    if (stored) setRole(stored);
  }, []);

  useEffect(() => {
    setStudents([...store.students]);
  }, []);

  const total = students.length;
  const departments = new Set(students.map(s => s.department).filter(Boolean)).size;

  // TODO: replace with the API for blockchain status
  const verifiedOnChain = 0;
  const pending = 0;

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Students" onAddNew={role === 'admin' ? () => router.push('/createStudent') : undefined} />

      <div className="p-6 space-y-6">

        {/* stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Students" value={total} sub="+0 this week" subColor="text-purple-500" />
          <StatCard label="Verified on-chain" value={verifiedOnChain} sub={total ? `${Math.round(verifiedOnChain / total * 100)}%` : '0%'} subColor="text-mint" />
          <StatCard label="Pending" value={pending} sub="awaiting wallet" subColor="text-yellow-500" />
          <StatCard label="Departments" value={departments} sub="active" subColor="text-mint" />
        </div>

        {/* table */}
        <div className="bg-card rounded-2xl border border-borderLine overflow-hidden flex-1">
          <div className="px-6 py-4 border-b border-borderLine">
            <h3 className="text-textMuted text-sm font-bold uppercase tracking-wider">All Students</h3>
          </div>

          {students.length === 0 ? (
            <div className="flex items-center justify-center min-h-48 py-12">
              <p className="text-textMuted px-4">
                {role === 'admin'
                  ? <>No students yet. Click <span className="text-mint font-bold">+ Add New</span> to create one.</>
                  : 'No students found.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-borderLine">
                    <th className="text-left px-6 py-3 text-textMuted text-sm font-semibold">Name</th>
                    <th className="text-left px-6 py-3 text-textMuted text-sm font-semibold">Email</th>
                    <th className="text-left px-6 py-3 text-textMuted text-sm font-semibold">Department</th>
                    <th className="text-left px-6 py-3 text-textMuted text-sm font-semibold">Level</th>
                    <th className="text-left px-6 py-3 text-textMuted text-sm font-semibold">Status</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, i) => (
                    <tr key={s.id} className={`border-b border-borderLine hover:bg-surface transition ${i % 2 === 0 ? '' : 'bg-surface/30'}`}>
                      <td className="px-6 py-4 text-textLight font-medium">
                        {[s.firstName, s.middleName, s.lastName].filter(Boolean).join(' ')}
                      </td>
                      <td className="px-6 py-4 text-textMuted text-sm">{s.email}</td>
                      <td className="px-6 py-4 text-textMuted text-sm">{s.department || '—'}</td>
                      <td className="px-6 py-4 text-textMuted text-sm">{s.currentLevel || '—'}</td>
                      <td className="px-6 py-4">
                        {/* TODO: replace with the API for status */}
                        <StatusBadge status="pending" />
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => router.push(`/students/${s.id}`)}
                          className="text-sm border border-borderLine text-textMuted hover:text-textLight hover:border-mint px-3 py-1 rounded-lg transition"
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

// blockchain status will be set by API
function StatusBadge({ status }: { status: 'pending' | 'failed' | 'verified' }) {
  const map = {
    verified: 'bg-green-100 text-green-600 border border-green-200',
    pending: 'bg-yellow-100 text-yellow-600 border border-yellow-200',
    failed: 'bg-red-100 text-red-500 border border-red-200',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${map[status]}`}>
      {status}
    </span>
  );
}