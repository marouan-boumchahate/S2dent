'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import { store, Student } from '@/lib/store';

export default function StudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);

  // reseting the list avrery time open the page 
  useEffect(() => {
    setStudents([...store.students]);
  }, []);

  const total = students.length;
  const active = students.filter(s => s.enrollmentStatus === 'active').length;
  const graduated = students.filter(s => s.enrollmentStatus === 'graduated').length;
  const departments = new Set(students.map(s => s.department).filter(Boolean)).size;

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Students" />

      <div className="p-6 space-y-6">

        {/* stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Students" value={total} sub="+0 this week" />
          <StatCard label="Active" value={active} sub={total ? `${Math.round(active / total * 100)}%` : '0%'} subColor="text-mint" />
          <StatCard label="Graduated" value={graduated} sub="completed" />
          <StatCard label="Departments" value={departments} sub="active" />
        </div>

        {/* table */}
        <div className="bg-card rounded-2xl border border-borderLine overflow-hidden">
          <div className="px-6 py-4 border-b border-borderLine">
            <h3 className="text-textMuted text-sm font-bold uppercase tracking-wider">All Students</h3>
          </div>

          {students.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <p className="text-textMuted">No students yet. Click <span className="text-mint font-bold">+ Add New</span> to create one.</p>
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
                        <StatusBadge status={s.enrollmentStatus} />
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-mint/20 text-mint',
    graduated: 'bg-blue-500/20 text-blue-400',
    inactive: 'bg-gray-500/20 text-gray-400',
    suspended: 'bg-red-500/20 text-red-400',
    withdrawn: 'bg-orange-500/20 text-orange-400',
  };
  const cls = map[status] || 'bg-yellow-500/20 text-yellow-400';
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${cls}`}>
      {status || 'Pending'}
    </span>
  );
}